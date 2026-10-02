import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { ContentStatus } from '@/modules/content/content-types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;

    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      include: {
        domains: { where: { isVerified: true, isPrimary: true } },
      },
    });

    if (!tenant) {
      return new NextResponse('Tenant not found', { status: 404 });
    }

    const host = tenant.domains[0]?.domain || request.headers.get('host') || 'localhost';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    const [articles, locations, products] = await TenantContextService.withTenantContext(
      prisma,
      tenant.id,
      async (tx) => {
        return await Promise.all([
          tx.contentItem.findMany({
            where: { tenantId: tenant.id, status: ContentStatus.PUBLISHED },
            select: { slug: true, updatedAt: true, publishedAt: true },
          }),
          tx.location.findMany({
            where: { tenantId: tenant.id, isClosed: false },
            select: { slug: true, id: true, updatedAt: true },
          }),
          tx.product.findMany({
            where: { tenantId: tenant.id, status: 'ACTIVE' },
            select: { slug: true, updatedAt: true },
          }),
        ]);
      }
    );

    const urls: Array<{ loc: string; lastmod: string; changefreq: string; priority: string }> = [
      {
        loc: `${baseUrl}/`,
        lastmod: new Date().toISOString().split('T')[0]!,
        changefreq: 'daily',
        priority: '1.0',
      },
      {
        loc: `${baseUrl}/blog`,
        lastmod: new Date().toISOString().split('T')[0]!,
        changefreq: 'daily',
        priority: '0.8',
      },
    ];

    for (const a of articles) {
      urls.push({
        loc: `${baseUrl}/blog/${a.slug}`,
        lastmod: (a.updatedAt || a.publishedAt || new Date()).toISOString().split('T')[0]!,
        changefreq: 'weekly',
        priority: '0.8',
      });
    }

    for (const l of locations) {
      urls.push({
        loc: `${baseUrl}/stores/${l.slug || l.id}`,
        lastmod: (l.updatedAt || new Date()).toISOString().split('T')[0]!,
        changefreq: 'weekly',
        priority: '0.7',
      });
    }

    for (const p of products) {
      urls.push({
        loc: `${baseUrl}/products/${p.slug}`,
        lastmod: (p.updatedAt || new Date()).toISOString().split('T')[0]!,
        changefreq: 'weekly',
        priority: '0.7',
      });
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    });
  } catch (error) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
