import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  MapPin,
  Clock,
  Phone,
  ShieldCheck,
  Star,
  ExternalLink,
  ShoppingBag,
} from 'lucide-react';
import { Render } from '@measured/puck';
import { siteStudioPuckConfig } from '@/modules/page-builder/site-studio-puck-config';
import { PageContextService } from '@/modules/page-builder/page-context-service';
import { PageContextProvider } from '@/modules/page-builder/page-context-react';
import { prisma } from '@/shared/database/client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ subdomain: string; slug: string[] }>;
}): Promise<Metadata> {
  const { subdomain, slug } = await params;
  const pageContext = await PageContextService.resolveByHostnameOrSubdomain(subdomain, slug || []);

  if (!pageContext) {
    return { title: 'Page Not Found' };
  }

  return {
    title: pageContext.seo.title,
    description: pageContext.seo.description,
    alternates: {
      canonical: pageContext.seo.canonicalUrl,
    },
    robots: pageContext.seo.robots,
    openGraph: {
      title: pageContext.seo.openGraph.title,
      description: pageContext.seo.openGraph.description,
      url: pageContext.seo.openGraph.url,
      siteName: pageContext.seo.openGraph.siteName,
    },
  };
}

export default async function DynamicSubdomainPage({
  params,
}: {
  params: Promise<{ subdomain: string; slug: string[] }>;
}) {
  const { subdomain, slug } = await params;
  const pageContext = await PageContextService.resolveByHostnameOrSubdomain(subdomain, slug || []);

  if (!pageContext) {
    notFound();
  }

  // Find published template version for this specific page or pageType
  const pageRecord = await prisma.page.findFirst({
    where: {
      tenantId: pageContext.tenant.id,
      webSurfaceId: pageContext.webSurface.id,
      slug: pageContext.path,
      status: 'PUBLISHED',
    },
    include: {
      template: {
        include: {
          versions: {
            where: { status: 'PUBLISHED' },
            orderBy: { version: 'desc' },
            take: 1,
          },
        },
      },
    },
  });

  let puckData = pageRecord?.template?.versions[0]?.puckData as any;

  if (!puckData || !Array.isArray(puckData.content) || puckData.content.length === 0) {
    // Check archetype template for this pageType
    const archetypeTemplate = await prisma.pageTemplate.findFirst({
      where: {
        tenantId: pageContext.tenant.id,
        webSurfaceId: pageContext.webSurface.id,
        type: pageContext.pageType,
      },
      include: {
        versions: {
          where: { status: 'PUBLISHED' },
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });
    puckData = archetypeTemplate?.versions[0]?.puckData as any;
  }

  return (
    <PageContextProvider value={pageContext}>
      {/* Safe Brand Custom CSS Variables */}
      <style dangerouslySetInnerHTML={{ __html: pageContext.cssBlock }} />

      {/* Structured Data JSON-LD */}
      {pageContext.structuredData && pageContext.structuredData.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(pageContext.structuredData),
          }}
        />
      )}

      {/* Structured Tracking Identity Attribute for Workstream C */}
      <div
        data-localbi-context={JSON.stringify(pageContext.trackingContext)}
        className="space-y-8 animate-in fade-in duration-300"
      >
        {puckData && Array.isArray(puckData.content) && puckData.content.length > 0 ? (
          <Render config={siteStudioPuckConfig} data={puckData} />
        ) : (
          /* Default Archetype Fallback Layout */
          <div className="space-y-8">
            <section className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-sm space-y-4">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                {pageContext.pageType}
              </span>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                {pageContext.store?.name || pageContext.product?.name || `${pageContext.pageType} Page`}
              </h1>

              {pageContext.store && (
                <div className="space-y-2 text-xs text-slate-600 pt-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-indigo-600" />
                    <span>
                      {pageContext.store.addressLine1}, {pageContext.store.city}{' '}
                      {pageContext.store.postalCode}
                    </span>
                  </div>
                  {pageContext.store.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <a href={`tel:${pageContext.store.phone}`} className="hover:underline">
                        {pageContext.store.phone}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {pageContext.product && (
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-mono text-slate-400">SKU: {pageContext.product.sku}</p>
                  {pageContext.product.basePrice && (
                    <p className="text-2xl font-bold text-slate-900">
                      ₹{pageContext.product.basePrice.toLocaleString('en-IN')}
                    </p>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </PageContextProvider>
  );
}
