import { z } from 'zod';

export const createTenantSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Client name must be at least 2 characters')
    .max(100, 'Client name cannot exceed 100 characters'),
  slug: z
    .string()
    .trim()
    .min(2, 'Client URL slug must be at least 2 characters')
    .max(63, 'Client URL slug cannot exceed 63 characters')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must be lowercase alphanumeric and may contain hyphens between words (e.g. "acme-corp")'
    ),
  timezone: z
    .string()
    .trim()
    .min(1, 'Reporting timezone is required'),
  contactEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  industry: z.string().optional(),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
