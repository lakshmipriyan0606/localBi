import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

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

  // Database readiness check
  if (process.env['DATABASE_URL']) {
    const prisma = new PrismaClient();
    try {
      await prisma.$queryRaw`SELECT 1`;
      results.database = 'connected';
    } catch {
      results.status = 'degraded';
    } finally {
      await prisma.$disconnect();
    }
  }

  // Redis readiness check
  if (process.env['REDIS_QUEUE_URL']) {
    const redis = new Redis(process.env['REDIS_QUEUE_URL'], {
      maxRetriesPerRequest: 0,
      connectTimeout: 2000,
      retryStrategy: () => null,
    });
    try {
      const pong = await redis.ping();
      if (pong === 'PONG') {
        results.redis = 'connected';
      } else {
        results.status = 'degraded';
      }
    } catch {
      results.status = 'degraded';
    } finally {
      redis.disconnect();
    }
  }

  const statusCode = results.status === 'ok' ? 200 : 503;
  return NextResponse.json(results, { status: statusCode });
}
