import { z } from 'zod';

/**
 * Client and Form validation schema for enterprise authentication.
 *
 * Rules:
 * - Email: non-empty, RFC 5322 compliant structure, <= 254 chars, trimmed.
 * - Password: non-empty, <= 128 chars.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email address is required')
    .max(254, 'Email address must not exceed 254 characters')
    .email('Please enter a valid work email address')
    .transform((val) => val.trim().toLowerCase()),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password must not exceed 128 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;
