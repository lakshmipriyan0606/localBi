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

  const { rawToken } = await SessionService.createSession(user.id, {
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent'
  });

  const res = await fetch('http://localhost:3000/client/lakshmi-food/reports/ga4', {
    headers: {
      Cookie: `localbi_session=${rawToken}`
    }
  });

  console.log('Fetch /client/lakshmi-food/reports/ga4 STATUS:', res.status);
  const html = await res.text();
  console.log('HTML size:', html.length);
  if (res.status !== 200) {
    console.log('ERROR HTML:', html);
  }

  // Check key upgraded UI elements (with HTML entities)
  const checks = [
    'Overview &amp; Velocity',
    'Traffic Channels',
    'Device Hardware',
    'Landing Pages',
    'Search Keywords',
    'Audience &amp; Geography',
    'Executive Web Performance Matrix',
    'Live Web Stream &amp; Unified Attribution',
    'Visitor &amp; Search Traffic Velocity',
    'lakshmipriyan-portfolio.vercel.app',
  ];

  for (const c of checks) {
    console.log(`Contains "${c}":`, html.includes(c));
  }

  console.log('Does NOT contain "All Sections":', !html.includes('All Sections'));
}

main().catch(console.error).finally(() => prisma.$disconnect());
