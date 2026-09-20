import { SyncWorkerService } from '../src/modules/sync/sync-worker';

console.log('Starting BullMQ Sync Worker...');
const worker = SyncWorkerService.getWorker();

process.on('SIGINT', async () => {
  console.log('Shutting down worker...');
  await SyncWorkerService.closeWorker();
  process.exit(0);
});
