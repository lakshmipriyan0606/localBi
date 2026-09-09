import { z } from 'zod';

export const locationFormSchema = z.object({
  brandId: z
    .string()
    .min(1, 'A brand must be selected for this location'),
  storeCode: z
    .string()
    .trim()
    .min(1, 'Store code is required')
    .max(50, 'Store code cannot exceed 50 characters')
    .transform((val) => val.toUpperCase()),
  name: z
    .string()
    .trim()
    .min(2, 'Location name must be at least 2 characters')
    .max(150, 'Location name cannot exceed 150 characters'),
  addressLine1: z
    .string()
    .trim()
    .min(2, 'Street address is required')
    .max(255, 'Address cannot exceed 255 characters'),
  city: z
    .string()
    .trim()
    .min(1, 'City is required')
    .max(100, 'City cannot exceed 100 characters'),
  stateRegion: z
    .string()
    .trim()
    .min(1, 'State or region is required')
    .max(100, 'State or region cannot exceed 100 characters'),
  postalCode: z
    .string()
    .trim()
    .min(1, 'Postal code is required')
    .max(20, 'Postal code cannot exceed 20 characters'),
  countryCode: z
    .string()
    .trim()
    .length(2, 'Country code must be a 2-letter ISO 3166-1 alpha-2 code (e.g. "US")')
    .transform((val) => val.toUpperCase()),
  timezone: z
    .string()
    .trim()
    .min(2, 'Valid IANA timezone is required (e.g. "America/New_York")'),
});

export type LocationFormInput = z.infer<typeof locationFormSchema>;
