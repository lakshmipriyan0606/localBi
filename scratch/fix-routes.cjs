const fs = require('fs');

const base = 'E:/project/localBi/src/app/api/tenants/[tenantSlug]/gbp';

const files = [
  `${base}/profile/route.ts`,
  `${base}/verification/route.ts`,
  `${base}/posts/route.ts`,
  `${base}/posts/[postId]/route.ts`,
  `${base}/posts/sync/route.ts`,
  `${base}/media/route.ts`,
  `${base}/media/[mediaId]/route.ts`,
  `${base}/media/sync/route.ts`,
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Fix imports
  content = content.replace(
    /import \{ handleRouteError \} from '@\/shared\/errors\/route-handler';\nimport \{ TenantContextResolver \} from '@\/modules\/tenancy\/tenant-resolver';/g,
    `import { cookies } from 'next/headers';\nimport { SessionCookieManager } from '@/modules/auth/cookies';\nimport { ContextResolver } from '@/modules/auth/context-resolver';\nimport { handleRouteError } from '@/shared/errors';`
  );

  // Fix context resolution
  content = content.replace(
    /const \{ tenant, authorizedContext \} = await TenantContextResolver\.resolveFromRequest\(.*?, tenantSlug\);/g,
    `const cookieStore = await cookies();\n    const token = SessionCookieManager.getSessionToken(cookieStore);\n    const { authorizedContext, tenant } = await ContextResolver.resolveTenantContext(token, tenantSlug);\n    if (!tenant || !authorizedContext) throw new Error('Tenant context not found');`
  );

  fs.writeFileSync(file, content);
});

console.log('Fixed API routes');
