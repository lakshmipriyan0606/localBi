/**
 * localBi — Dedicated BullMQ Sync Worker Process
 *
 * Run as a SEPARATE OS process from the Next.js web server:
 *   npm run worker
 *
 * This isolates CPU-intensive sync jobs (Google API fetching + bulk DB upserts)
 * from the web request serving event loop. The producer (job scheduling) remains
 * in Next.js; only the consumer (job processing) runs here.
 *
 * Handles SIGTERM and SIGINT for graceful shutdown:
 * - In-progress sync jobs are allowed to complete before exit.
 * - BullMQ tracks failed jobs for retry via exponential backoff.
 */

import { SyncWorkerService } from '../src/modules/sync/sync-worker';
import { logger } from '../src/shared/observability/logger';

async function main() {
  logger.info('Starting localBi BullMQ sync worker...');
  SyncWorkerService.getWorker();
  logger.info({ concurrency: 5 }, 'BullMQ sync worker started and listening for jobs');
}

async function shutdown(signal: string) {
  logger.info({ signal }, 'Received shutdown signal, draining in-progress sync jobs...');
  try {
    await SyncWorkerService.closeWorker();
    logger.info('Worker shut down cleanly');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Error during worker shutdown');
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection in worker process');
  process.exit(1);
});

main().catch((err) => {
  logger.error({ err }, 'Failed to start worker process');
  process.exit(1);
});
