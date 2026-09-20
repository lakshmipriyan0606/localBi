import { z } from 'zod';

export const brandFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Brand name must be at least 2 characters')
    .max(100, 'Brand name cannot exceed 100 characters'),
  slug: z
    .string()
    .trim()
    .min(2, 'Brand slug must be at least 2 characters')
    .max(63, 'Brand slug cannot exceed 63 characters')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must be lowercase alphanumeric and may contain hyphens between words (e.g. "acme-coffee")'
    ),
  ga4MeasurementId: z
    .string()
    .trim()
    .regex(
      /^(G-[A-Z0-9]{4,20})?$/,
      'Must be a valid GA4 Measurement ID (e.g. G-ABC123DEF4)'
    )
    .optional()
    .or(z.literal('')),
});

export type BrandFormInput = z.infer<typeof brandFormSchema>;
