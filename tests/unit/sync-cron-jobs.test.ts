import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CronSchedulerService } from '@/modules/sync/cron-scheduler';
import { GscPeriodicSyncJob } from '@/modules/sync/jobs/gsc-periodic-sync-job';
import { Ga4PeriodicSyncJob } from '@/modules/sync/jobs/ga4-periodic-sync-job';
import { RankSchedulerJob } from '@/modules/sync/jobs/rank-scheduler-job';
import { MerchantPeriodicSyncJob } from '@/modules/sync/jobs/merchant-periodic-sync-job';
import { ListingPeriodicSyncJob } from '@/modules/sync/jobs/listing-periodic-sync-job';
import { prisma } from '@/shared/database/client';

describe('Phase 18 — Sync Jobs & Cron Scheduler', () => {
  describe('Cron Job Definitions & Metadata', () => {
    it('registers all 5 required periodic sync jobs with correct schedules', () => {
      const jobs = CronSchedulerService.getJobDefinitions();
      expect(jobs).toHaveLength(5);

      const jobMap = new Map(jobs.map((j) => [j.name, j.cron]));

      expect(jobMap.has('gsc-periodic-sync')).toBe(true);
      expect(jobMap.get('gsc-periodic-sync')).toBe('0 2 * * *');

      expect(jobMap.has('ga4-periodic-sync')).toBe(true);
      expect(jobMap.get('ga4-periodic-sync')).toBe('0 3 * * *');

      expect(jobMap.has('rank-scheduler')).toBe(true);
      expect(jobMap.get('rank-scheduler')).toBe('0 4 * * *');

      expect(jobMap.has('merchant-periodic-sync')).toBe(true);
      expect(jobMap.get('merchant-periodic-sync')).toBe('0 */6 * * *');

      expect(jobMap.has('listing-periodic-sync')).toBe(true);
      expect(jobMap.get('listing-periodic-sync')).toBe('0 */12 * * *');
    });

    it('rejects triggerNow for unknown job names', async () => {
      await expect(CronSchedulerService.triggerNow('non-existent-job')).rejects.toThrow(
        'Unknown cron job: non-existent-job'
      );
    });
  });

  describe('Sync Jobs Execution Against DB (Mock / Empty Safety)', () => {
    it('executes GscPeriodicSyncJob without throwing when no tenants qualify', async () => {
      vi.spyOn(prisma.tenant, 'findMany').mockResolvedValueOnce([]);

      const result = await GscPeriodicSyncJob.execute();
      expect(result).toBeDefined();
      expect(result.tenantsProcessed).toBe(0);
      expect(result.propertiesQueued).toBe(0);
      expect(result.errors).toBe(0);
    });

    it('executes Ga4PeriodicSyncJob without throwing when no tenants qualify', async () => {
      vi.spyOn(prisma.tenant, 'findMany').mockResolvedValueOnce([]);

      const result = await Ga4PeriodicSyncJob.execute();
      expect(result).toBeDefined();
      expect(result.tenantsProcessed).toBe(0);
      expect(result.surfacesQueued).toBe(0);
      expect(result.errors).toBe(0);
    });

    it('executes RankSchedulerJob without throwing when no tenants qualify', async () => {
      vi.spyOn(prisma.tenant, 'findMany').mockResolvedValueOnce([]);

      const result = await RankSchedulerJob.execute();
      expect(result).toBeDefined();
      expect(result.tenantsProcessed).toBe(0);
      expect(result.scansQueued).toBe(0);
      expect(result.errors).toBe(0);
    });

    it('executes MerchantPeriodicSyncJob without throwing when no tenants qualify', async () => {
      vi.spyOn(prisma.tenant, 'findMany').mockResolvedValueOnce([]);

      const result = await MerchantPeriodicSyncJob.execute();
      expect(result).toBeDefined();
      expect(result.tenantsProcessed).toBe(0);
      expect(result.reconcileJobsQueued).toBe(0);
      expect(result.errors).toBe(0);
    });

    it('executes ListingPeriodicSyncJob without throwing when no tenants qualify', async () => {
      vi.spyOn(prisma.tenant, 'findMany').mockResolvedValueOnce([]);

      const result = await ListingPeriodicSyncJob.execute();
      expect(result).toBeDefined();
      expect(result.tenantsProcessed).toBe(0);
      expect(result.storesAudited).toBe(0);
      expect(result.errors).toBe(0);
    });
  });
});
