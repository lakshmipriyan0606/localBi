import { z } from 'zod';

export const updateMemberRoleSchema = z.object({
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

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
