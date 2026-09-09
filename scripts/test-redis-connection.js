import { Redis } from 'ioredis';
import { Queue, Worker } from 'bullmq';

async function testRedisAndBullMQ() {
  const redisUrl = process.env.REDIS_QUEUE_URL;
  if (!redisUrl) {
    console.error('Error: REDIS_QUEUE_URL is required');
    process.exit(1);
  }

  console.log('Testing Redis connection via REDIS_QUEUE_URL...');
  const redis = new Redis(redisUrl);

  try {
    const pong = await redis.ping();
    console.log('Redis ping response:', pong);
    await redis.set('test:key', 'hello_redis');
    const val = await redis.get('test:key');
    console.log('Redis get test:key:', val);
  } finally {
    redis.disconnect();
  }

  console.log('\nTesting BullMQ Queue & Worker on real Redis...');
  const queueName = 'test-verification-queue';
  const queue = new Queue(queueName, { connection: redis });

  let jobProcessed = false;
  const worker = new Worker(
    queueName,
    async (job) => {
      console.log(`BullMQ worker processing job: id=${job.id}, name=${job.name}, data=`, job.data);
      jobProcessed = true;
      return { success: true };
    },
    { connection }
  );

  try {
    // Test custom job ID format without colons
    const customJobId = 'test-job_01jb000000000000000000001';
    const job = await queue.add('test-sync', { tenantId: 'tenant-1', action: 'sync' }, {
      jobId: customJobId,
      removeOnComplete: true,
    });

    console.log(`Job added: id=${job.id}`);

    // Wait up to 3 seconds for job to be processed
    const start = Date.now();
    while (!jobProcessed && Date.now() - start < 3000) {
      await new Promise((r) => setTimeout(r, 100));
    }

    if (!jobProcessed) {
      throw new Error('BullMQ worker did not process job within timeout');
    }
    console.log('BullMQ job processed successfully!');
  } finally {
    await worker.close();
    await queue.close();
  }
}

testRedisAndBullMQ().catch((err) => {
  console.error('Redis / BullMQ test failed:', err);
  process.exit(1);
});
