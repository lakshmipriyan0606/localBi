import { NextResponse } from 'next/server';
import { prisma } from '@/shared/database/client';
import { getRedisClient } from '@/shared/database/redis-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: {
    status: 'ok' | 'degraded';
    timestamp: string;
    database: 'connected' | 'disconnected';
    redis: 'connected' | 'disconnected';
  } = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: 'disconnected',
    redis: 'disconnected',
  };

  // Database readiness check — reuse shared singleton (no new connection pool per request)
  try {
    await prisma.$queryRaw`SELECT 1`;
    results.database = 'connected';
  } catch {
    results.status = 'degraded';
  }

  // Redis readiness check — reuse shared singleton
  try {
    const redis = getRedisClient();
    const pong = await redis.ping();
    if (pong === 'PONG') {
      results.redis = 'connected';
    } else {
      results.status = 'degraded';
    }
  } catch {
    results.status = 'degraded';
  }

  const statusCode = results.status === 'ok' ? 200 : 503;
  return NextResponse.json(results, { status: statusCode });
}
