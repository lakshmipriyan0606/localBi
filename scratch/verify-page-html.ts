import { prisma } from '../src/shared/database/client';
import { SessionService } from '../src/modules/auth/session-service';

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'admin@localbi.com' }
  });

  if (!user) {
    console.log('User admin@localbi.com not found');
    return;
  }

  // Ensure admin is member of lakshmi-food
  const tenant = await prisma.tenant.findUnique({
    where: { slug: 'lakshmi-food' }
  });

  if (tenant) {
    const existingMembership = await prisma.tenantMembership.findFirst({
      where: { userId: user.id, tenantId: tenant.id }
    });
    if (!existingMembership) {
      await prisma.tenantMembership.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          role: 'CLIENT_OWNER'
        }
      });
      console.log('Created membership for admin in lakshmi-food');
    } else {
      console.log('Admin is already member in lakshmi-food with role', existingMembership.role);
    }
  }

  const { rawToken } = await SessionService.createSession(user.id, {
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent'
  });

  console.log('RAW_SESSION_TOKEN:', rawToken);

  const res = await fetch('http://localhost:3000/t/lakshmi-food/integrations', {
    headers: {
      Cookie: `localbi_session=${rawToken}`
    }
  });

  console.log('Fetch /t/lakshmi-food/integrations STATUS:', res.status);
  const html = await res.text();
  console.log('HTML preview:', html.slice(0, 300));

  // Check if any banned technical terms appear in the rendered HTML
  const terms = ['BullMQ', 'telemetry', 'ingestion jobs', 'Resource Mapping'];
  terms.forEach(t => {
    const hasTerm = html.includes(t);
    console.log(`HTML includes "${t}":`, hasTerm);
  });

  // Check if new friendly terms appear in the rendered HTML
  const friendlyTerms = [
    'Google Setup Guide',
    'Step 1: Google Account',
    'Step 2: Link Website & Stores',
    'Step 3: Sync & View Reports',
    'Store Overview',
    'All Store Locations',
    'Customer Search Keywords',
    'Manage Store Locations',
    'Website Search Overview',
    'Top Search Keywords',
    'Top Website Pages',
    'Visitor Countries',
    'Visitor Devices',
    'Website Visitors & Traffic',
    'Traffic Sources',
    'Connect Google Accounts',
    'Brands & Businesses',
    'Invite Team Members',
    'General Settings'
  ];

  console.log('\n--- VERIFYING FRIENDLY TERMS IN RENDERED HTML ---');
  friendlyTerms.forEach(t => {
    const hasTerm = html.includes(t);
    console.log(`[${hasTerm ? 'PASS' : 'FAIL'}] "${t}" found in HTML: ${hasTerm}`);
  });

  await prisma.$disconnect();
}

main();
