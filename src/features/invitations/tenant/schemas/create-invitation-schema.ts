import { z } from 'zod';

export const createInvitationSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address')
    .max(254, 'Email address is too long')
    .transform((val) => val.toLowerCase()),
  role: z.enum([
    'OWNER',
    'ADMIN',
    'MANAGER',
    'ANALYST',
    'OPERATOR',
    'BILLING',
    'AUDITOR',
    'VIEWER',
  ]),
  scopeMode: z.enum(['ALL_BRANDS', 'RESTRICTED']),
  brandIds: z.array(z.string()).default([]),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
