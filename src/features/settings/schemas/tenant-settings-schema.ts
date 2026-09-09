import { z } from 'zod';

export const tenantSettingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name cannot exceed 100 characters'),
  timezone: z
    .string()
    .trim()
    .min(2, 'Reporting timezone is required'),
});

export type TenantSettingsInput = z.infer<typeof tenantSettingsSchema>;
