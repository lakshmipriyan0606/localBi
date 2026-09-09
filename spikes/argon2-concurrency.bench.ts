import argon2 from 'argon2';

interface ConcurrencyResult {
  concurrency: number;
  latenciesMs: number[];
  p50Ms: number;
  p95Ms: number;
  totalDurationMs: number;
  memoryDeltaMb: number;
}

async function benchmarkArgon2(concurrency: number, memoryCostKb: number, timeCost: number): Promise<ConcurrencyResult> {
  const password = 'BenchmarkPassword!2026';
  const initialMemory = process.memoryUsage().heapUsed;

  const tasks: Promise<number>[] = [];
  const startOverall = performance.now();

  for (let i = 0; i < concurrency; i++) {
    tasks.push(
      (async () => {
        const start = performance.now();
        await argon2.hash(password, {
          type: argon2.argon2id,
          memoryCost: memoryCostKb,
          timeCost: timeCost,
          parallelism: 1,
        });
        return performance.now() - start;
      })()
    );
  }

  const latencies = await Promise.all(tasks);
  const totalDuration = performance.now() - startOverall;
  const memoryDeltaMb = (process.memoryUsage().heapUsed - initialMemory) / (1024 * 1024);

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.50)] ?? 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] ?? 0;

  return {
    concurrency,
    latenciesMs: latencies,
    p50Ms: Math.round(p50),
    p95Ms: Math.round(p95),
    totalDurationMs: Math.round(totalDuration),
    memoryDeltaMb: Math.round(memoryDeltaMb * 100) / 100,
  };
}

async function runAllBenchmarks() {
  console.log('=== Argon2id Concurrency Benchmark ===');
  console.log('Testing Profile A: RFC 9106 Baseline (64MB memory, 3 iterations)');
  for (const c of [1, 5, 10]) {
    try {
      const res = await benchmarkArgon2(c, 65536, 3);
      console.log(`[Profile A - 64MB] Concurrency ${c}: P50=${res.p50Ms}ms, P95=${res.p95Ms}ms, Total=${res.totalDurationMs}ms`);
    } catch (err) {
      console.error(`[Profile A - 64MB] Concurrency ${c} Failed:`, err);
    }
  }

  console.log('\nTesting Profile B: Container-Optimized OWASP (19MB memory, 2 iterations)');
  for (const c of [1, 5, 10, 20]) {
    try {
      const res = await benchmarkArgon2(c, 19456, 2);
      console.log(`[Profile B - 19MB] Concurrency ${c}: P50=${res.p50Ms}ms, P95=${res.p95Ms}ms, Total=${res.totalDurationMs}ms`);
    } catch (err) {
      console.error(`[Profile B - 19MB] Concurrency ${c} Failed:`, err);
    }
  }
}

runAllBenchmarks().catch(console.error);
