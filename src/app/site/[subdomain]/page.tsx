import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  Star,
  MapPin,
  Clock,
  Sparkles,
  ArrowRight,
  MessageCircle,
  Phone,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react';
import { Render } from '@measured/puck';
import { siteStudioPuckConfig } from '@/modules/page-builder/site-studio-puck-config';
import { PageContextService } from '@/modules/page-builder/page-context-service';
import { PageContextProvider } from '@/modules/page-builder/page-context-react';
import { prisma } from '@/shared/database/client';
import { MicrositeService } from '@/modules/microsites/microsite-service';
import { PuckService } from '@/modules/microsites/puck-service';
import { puckConfig as legacyPuckConfig } from '@/modules/microsites/puck-config';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}): Promise<Metadata> {
  const { subdomain } = await params;

  // 1. Try canonical PageContextService
  const pageContext = await PageContextService.resolveByHostnameOrSubdomain(subdomain, []);
  if (pageContext) {
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

  // 2. Fallback to legacy microsite for backwards compatibility
  const site = await MicrositeService.getMicrositeBySubdomain(subdomain);
  if (!site) {
    return { title: 'Not Found | localBi' };
  }

  return {
    title: `${site.brandName} - ${site.tagline}`,
    description: site.tagline,
  };
}

export default async function MicrositeHomePage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;

  // ── 1. CANONICAL LOCALBI PAGE RESOLUTION ─────────────────────────────────────
  const pageContext = await PageContextService.resolveByHostnameOrSubdomain(subdomain, []);

  if (pageContext) {
    // Find published template version for HOME
    const homeTemplate = await prisma.pageTemplate.findFirst({
      where: {
        tenantId: pageContext.tenant.id,
        webSurfaceId: pageContext.webSurface.id,
        type: 'HOME',
      },
      include: {
        versions: {
          where: { status: 'PUBLISHED' },
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    const puckData = homeTemplate?.versions[0]?.puckData as any;

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
            /* Fallback SSR Layout when Puck data is empty */
            <div className="space-y-8">
              <section className="relative rounded-3xl bg-white border border-slate-200 p-8 sm:p-12 shadow-sm text-slate-900 space-y-6">
                <div className="max-w-2xl space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verified Official Storefront</span>
                  </div>

                  <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
                    {pageContext.brand.name}
                  </h1>

                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    Welcome to our official website. Explore our verified stores, authentic catalog offerings, and direct support.
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <Link
                      href="/locations"
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors"
                      style={{ backgroundColor: 'var(--brand-primary, #4F46E5)' }}
                    >
                      <span>Find Our Stores</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </section>

              {pageContext.products.length > 0 && (
                <section className="space-y-4">
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    Featured Offerings
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {pageContext.products.slice(0, 6).map((p) => (
                      <div
                        key={p.id}
                        className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-2xs"
                      >
                        <h3 className="font-bold text-sm text-slate-900">{p.name}</h3>
                        <p className="text-xs text-slate-500 font-mono">SKU: {p.sku}</p>
                        {p.basePrice && (
                          <p className="text-sm font-bold text-slate-900">
                            ₹{p.basePrice.toLocaleString('en-IN')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </PageContextProvider>
    );
  }

  // ── 2. BACKWARD COMPATIBILITY FOR LEGACY MICROSITES ─────────────────────────
  const [site, legacyPuckData] = await Promise.all([
    MicrositeService.getMicrositeBySubdomain(subdomain),
    PuckService.getPuckData(subdomain),
  ]);

  if (!site) {
    notFound();
  }

  if (legacyPuckData && legacyPuckData.content && legacyPuckData.content.length > 0) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <Render config={legacyPuckConfig} data={legacyPuckData} />
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      <section className="relative rounded-3xl bg-white border border-slate-200 p-8 sm:p-12 shadow-sm text-slate-900 space-y-6">
        <div className="max-w-2xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Verified Official Storefront</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
            {site.brandName}
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
            {site.tagline}
          </p>
        </div>
      </section>
    </div>
  );
}
