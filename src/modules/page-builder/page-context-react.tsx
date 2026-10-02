'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { PageContext } from './page-context-service';
import { LocalBiAnalyticsRuntime } from '@/modules/analytics/localbi-tracker';

const PageContextReact = createContext<PageContext | null>(null);

export function PageContextProvider({
  value,
  children,
}: {
  value: PageContext;
  children: ReactNode;
}) {
  return (
    <PageContextReact.Provider value={value}>
      <LocalBiAnalyticsRuntime trackingContext={value.trackingContext} />
      {children}
    </PageContextReact.Provider>
  );
}

export function usePageContext(): PageContext {
  const ctx = useContext(PageContextReact);
  if (!ctx) {
    // Return a safe fallback mock context if rendered outside a provider (e.g. in standalone preview or editor)
    return {
      tenant: { id: 'fallback', name: 'Demo Organization', slug: 'demo' },
      brand: { id: 'fallback', name: 'Demo Brand', slug: 'demo-brand' },
      webSurface: {
        id: 'fallback',
        tenantId: 'fallback',
        brandId: 'fallback',
        type: 'LOCALBI',
        name: 'Demo Surface',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      domain: null,
      theme: {
        id: 'fallback',
        tenantId: 'fallback',
        brandId: 'fallback',
        primaryColor: '#4F46E5',
        secondaryColor: '#0F172A',
        accentColor: '#F59E0B',
        backgroundColor: '#FFFFFF',
        textColor: '#0F172A',
        fontHeading: 'Inter, sans-serif',
        fontBody: 'Inter, sans-serif',
        buttonRadius: '0.5rem',
        cardRadius: '0.75rem',
        customCss: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      cssBlock: '',
      pageType: 'STORE',
      path: '/',
      city: 'Chennai',
      store: {
        id: 'demo-store',
        name: 'Demo Storefront',
        addressLine1: '12 Beach Road',
        city: 'Chennai',
        state: 'Tamil Nadu',
        postalCode: '600001',
        country: 'IN',
        phone: '+91 98765 43210',
        rating: 4.8,
        reviewCount: 142,
      },
      category: null,
      product: null,
      storeProduct: null,
      products: [
        {
          id: 'demo-p1',
          name: 'Signature Artisan Blend',
          sku: 'DEMO-01',
          slug: 'signature-blend',
          shortDescription: 'Handcrafted signature local favorite.',
          basePrice: 1299,
          currency: 'INR',
          isAvailable: true,
        },
      ],
      nearbyStores: [],
      reviews: [
        {
          id: 'demo-r1',
          authorName: 'Priya Sharma',
          rating: 5,
          comment: 'Outstanding quality and very friendly service!',
          createTime: new Date().toISOString(),
        },
      ],
      faqs: [
        {
          question: 'What are your operating hours?',
          answer: 'We are open Monday through Saturday from 10:00 AM to 9:00 PM.',
        },
      ],
      seo: {
        title: 'Demo Storefront',
        description: 'Demo description',
        canonicalUrl: 'https://demo.localbi.app',
        robots: 'noindex, nofollow',
        openGraph: {
          title: 'Demo Storefront',
          description: 'Demo description',
          url: 'https://demo.localbi.app',
          siteName: 'Demo Brand',
          type: 'website',
        },
        twitter: {
          card: 'summary',
          title: 'Demo Storefront',
          description: 'Demo description',
        },
      },
      structuredData: [],
      breadcrumbs: [{ name: 'Home', url: '/' }],
      trackingContext: {
        tenantSlug: 'demo',
        brandId: 'demo-brand',
        webSurfaceId: 'fallback',
        pageType: 'STORE',
      },
    };
  }
  return ctx;
}
