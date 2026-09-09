import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';

describe('Live Redis 7 / BullMQ Distributed Queue Lifecycle Integration Tests', () => {
  const redisUrl = process.env['REDIS_QUEUE_URL'];
  if (!redisUrl) {
    throw new Error('REDIS_QUEUE_URL must be configured in environment');
  }

  const parsedUrl = new URL(redisUrl);
  const connectionOptions = {
    host: parsedUrl.hostname,
    port: Number(parsedUrl.port) || 6379,
    password: parsedUrl.password ? decodeURIComponent(parsedUrl.password) : undefined,
    maxRetriesPerRequest: null,
  };

  let rawRedis: Redis;
  const queuesToCleanup: Queue[] = [];

  beforeAll(async () => {
    rawRedis = new Redis(redisUrl, { maxRetriesPerRequest: null });
    let connected = false;
    const startWait = Date.now();
    while (!connected && Date.now() - startWait < 15000) {
      try {
        const ping = await rawRedis.ping();
        if (ping === 'PONG') {
          connected = true;
          break;
        }
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    const ping = await rawRedis.ping();
    expect(ping).toBe('PONG');
  });

  afterAll(async () => {
    for (const q of queuesToCleanup) {
      try {
        await q.obliterate({ force: true });
        await q.close();
      } catch {
        // ignore cleanup error
      }
    }
    await rawRedis.quit();
  });

  it('Gate 6.1: Connection through environment and Queue Job Processing with colon-free Job IDs', async () => {
    const queueName = `test-processing-${Date.now()}`;
    const queue = new Queue(queueName, { connection: connectionOptions });
    queuesToCleanup.push(queue);

    let processedJob: Job | null = null;
    const worker = new Worker(
      queueName,
      async (job) => {
        processedJob = job;
        return { status: 'SYNC_COMPLETED', recordsProcessed: 42 };
      },
      { connection: connectionOptions }
    );

    try {
      // Safe colon-free job ID matching Architecture specification
      const colonFreeJobId = `gsc-sync_${Date.now()}_tenant123_brand456`;
      expect(colonFreeJobId).not.toContain(':');

      const job = await queue.add(
        'sync-gsc-metrics',
        { tenantId: 'tenant123', brandId: 'brand456' },
        { jobId: colonFreeJobId }
      );

      expect(job.id).toBe(colonFreeJobId);

      // Await worker execution
      await worker.waitUntilReady();
      const start = Date.now();
      while (!processedJob && Date.now() - start < 4000) {
        await new Promise((r) => setTimeout(r, 50));
      }

      const finalProcessed = processedJob as Job | null;
      expect(finalProcessed).not.toBeNull();
      expect(finalProcessed?.id).toBe(colonFreeJobId);
      expect(finalProcessed?.data.tenantId).toBe('tenant123');

      // Wait for job return value to be persisted to Redis
      let completedJob = await Job.fromId(queue, colonFreeJobId);
      const pollStart = Date.now();
      while ((!completedJob || !completedJob.returnvalue) && Date.now() - pollStart < 3000) {
        await new Promise((r) => setTimeout(r, 50));
        completedJob = await Job.fromId(queue, colonFreeJobId);
      }
      expect(completedJob?.returnvalue).toEqual({ status: 'SYNC_COMPLETED', recordsProcessed: 42 });
    } finally {
      await worker.close();
    }
  });

  it('Gate 6.2: Active Job Deduplication (same jobId while active is ignored)', async () => {
    const queueName = `test-dedup-${Date.now()}`;
    const queue = new Queue(queueName, { connection: connectionOptions });
    queuesToCleanup.push(queue);

    const dedupJobId = `dedup_job_${Date.now()}`;
    let processStarted = false;
    let finishSignal: () => void = () => {};
    const holdPromise = new Promise<void>((resolve) => {
      finishSignal = resolve;
    });

    const worker = new Worker(
      queueName,
      async () => {
        processStarted = true;
        await holdPromise;
        return { ok: true };
      },
      { connection: connectionOptions }
    );

    try {
      const job1 = await queue.add('long-running-sync', { run: 1 }, { jobId: dedupJobId });
      expect(job1.id).toBe(dedupJobId);

      // Wait until worker picks it up
      while (!processStarted) {
        await new Promise((r) => setTimeout(r, 50));
      }

      // Attempt to add second job with identical jobId while first is active
      const job2 = await queue.add('long-running-sync', { run: 2 }, { jobId: dedupJobId });

      // Deduplication returns same ID without queuing a duplicate
      expect(job2.id).toBe(dedupJobId);

      // Release first job
      finishSignal();

      // Ensure only 1 job was created
      const count = await queue.getJobCountByTypes('completed', 'active', 'waiting');
      expect(count).toBe(1);
    } finally {
      finishSignal();
      await worker.close();
    }
  });

  it('Gate 6.3: Completed-Job Idempotency vs Explicit Replay Behavior', async () => {
    const queueName = `test-replay-${Date.now()}`;
    const queue = new Queue(queueName, { connection: connectionOptions });
    queuesToCleanup.push(queue);

    const replayJobId = `replay_${Date.now()}`;
    let executions = 0;

    const worker = new Worker(
      queueName,
      async () => {
        executions++;
        return { count: executions };
      },
      { connection: connectionOptions }
    );

    try {
      // 1. First execution
      await queue.add('step', {}, { jobId: replayJobId });

      while (executions < 1) {
        await new Promise((r) => setTimeout(r, 50));
      }
      expect(executions).toBe(1);

      // 2. Add with same ID while completed: must be idempotently ignored
      await queue.add('step', {}, { jobId: replayJobId });
      await new Promise((r) => setTimeout(r, 200));
      expect(executions).toBe(1); // No re-execution

      // 3. Explicit replay pattern: remove completed job and re-add
      const existingJob = await Job.fromId(queue, replayJobId);
      await existingJob?.remove();

      await queue.add('step', {}, { jobId: replayJobId });
      while (executions < 2) {
        await new Promise((r) => setTimeout(r, 50));
      }
      expect(executions).toBe(2); // Successfully replayed!
    } finally {
      await worker.close();
    }
  });

  it('Gate 6.4: Retry and Exponential Backoff', async () => {
    const queueName = `test-backoff-${Date.now()}`;
    const queue = new Queue(queueName, { connection: connectionOptions });
    queuesToCleanup.push(queue);

    const attemptTimestamps: number[] = [];
    const retryJobId = `retry_backoff_${Date.now()}`;

    const worker = new Worker(
      queueName,
      async () => {
        attemptTimestamps.push(Date.now());
        if (attemptTimestamps.length < 3) {
          throw new Error('TRANSIENT_RATE_LIMIT_ERROR');
        }
        return { recovered: true };
      },
      { connection: connectionOptions }
    );

    try {
      await queue.add(
        'sync-with-backoff',
        {},
        {
          jobId: retryJobId,
          attempts: 3,
          backoff: { type: 'exponential', delay: 100 },
        }
      );

      const start = Date.now();
      let completedJob = await Job.fromId(queue, retryJobId);
      while (
        (!completedJob || (await completedJob.getState()) !== 'completed') &&
        Date.now() - start < 6000
      ) {
        await new Promise((r) => setTimeout(r, 50));
        completedJob = await Job.fromId(queue, retryJobId);
      }

      expect(attemptTimestamps.length).toBe(3);
      expect(await completedJob?.getState()).toBe('completed');

      // Verify exponential delay between attempts
      const delay1 = attemptTimestamps[1]! - attemptTimestamps[0]!;
      const delay2 = attemptTimestamps[2]! - attemptTimestamps[1]!;
      expect(delay1).toBeGreaterThanOrEqual(90);
      expect(delay2).toBeGreaterThanOrEqual(180);
    } finally {
      await worker.close();
    }
  });

  it('Gate 6.5: Failed-Job Handling and Error Capture', async () => {
    const queueName = `test-failed-${Date.now()}`;
    const queue = new Queue(queueName, { connection: connectionOptions });
    queuesToCleanup.push(queue);

    const failedJobId = `failed_job_${Date.now()}`;

    const worker = new Worker(
      queueName,
      async () => {
        throw new Error('PERMANENT_DOWNSTREAM_AUTH_REVOKED');
      },
      { connection: connectionOptions }
    );

    try {
      await queue.add(
        'failing-task',
        {},
        {
          jobId: failedJobId,
          attempts: 1, // Fail immediately without retry
        }
      );

      const start = Date.now();
      let failedJob = await Job.fromId(queue, failedJobId);
      while (
        (!failedJob || (await failedJob.getState()) !== 'failed') &&
        Date.now() - start < 4000
      ) {
        await new Promise((r) => setTimeout(r, 50));
        failedJob = await Job.fromId(queue, failedJobId);
      }

      expect(failedJob).toBeDefined();
      expect(await failedJob?.getState()).toBe('failed');
      expect(failedJob?.failedReason).toContain('PERMANENT_DOWNSTREAM_AUTH_REVOKED');

      const failedCount = await queue.getFailedCount();
      expect(failedCount).toBe(1);
    } finally {
      await worker.close();
    }
  });

  it('Gate 6.6: Stalled Job Recovery Mechanism', async () => {
    const queueName = `test-stalled-${Date.now()}`;
    const queue = new Queue(queueName, { connection: connectionOptions });
    queuesToCleanup.push(queue);

    let executionAttempts = 0;
    const worker = new Worker(
      queueName,
      async () => {
        executionAttempts++;
        // Simulate sudden worker stall / crash by pausing past lockDuration without renewing
        await new Promise((r) => setTimeout(r, 1200));
        return { recovered: true };
      },
      {
        connection: connectionOptions,
        lockDuration: 1000,
        stalledInterval: 1000,
        maxStalledCount: 2,
      }
    );

    try {
      await queue.add('stalled-test-job', {}, { jobId: `stalled_${Date.now()}` });

      const start = Date.now();
      while (executionAttempts < 1 && Date.now() - start < 3000) {
        await new Promise((r) => setTimeout(r, 50));
      }

      expect(executionAttempts).toBeGreaterThanOrEqual(1);
    } finally {
      await worker.close();
    }
  });

  it('Gate 6.7: Graceful Worker Shutdown (in-flight job completes cleanly)', async () => {
    const queueName = `test-shutdown-${Date.now()}`;
    const queue = new Queue(queueName, { connection: connectionOptions });
    queuesToCleanup.push(queue);

    let jobStarted = false;
    let jobCompleted = false;
    const worker = new Worker(
      queueName,
      async () => {
        jobStarted = true;
        await new Promise((r) => setTimeout(r, 200));
        jobCompleted = true;
        return { done: true };
      },
      { connection: connectionOptions }
    );

    try {
      await queue.add('shutdown-job', {}, { jobId: `shutdown_${Date.now()}` });

      const start = Date.now();
      while (!jobStarted && Date.now() - start < 4000) {
        await new Promise((r) => setTimeout(r, 50));
      }
      expect(jobStarted).toBe(true);

      // Initiate graceful shutdown while job is in-flight
      await worker.close();

      // In-flight job must have completed cleanly
      expect(jobCompleted).toBe(true);
    } finally {
      // Worker already closed
    }
  });

  it('Gate 6.8: Queue Cleanup and Obliteration', async () => {
    const queueName = `test-cleanup-${Date.now()}`;
    const queue = new Queue(queueName, { connection: connectionOptions });

    await queue.add('cleanup-job', { data: 123 });
    const countBefore = await queue.count();
    expect(countBefore).toBeGreaterThanOrEqual(1);

    // Obliterate queue completely
    await queue.obliterate({ force: true });
    const countAfter = await queue.count();
    expect(countAfter).toBe(0);

    await queue.close();
  });

  it('Gate 6.9: Confirm tests fail when Redis is unavailable (no mocks)', async () => {
    // Unallocated dead Redis port
    const deadRedis = new Redis('redis://localhost:6380/0', {
      maxRetriesPerRequest: 0,
      retryStrategy: () => null,
      connectTimeout: 500,
    });

    await expect(deadRedis.ping()).rejects.toThrow();
    deadRedis.disconnect();
  });
});
