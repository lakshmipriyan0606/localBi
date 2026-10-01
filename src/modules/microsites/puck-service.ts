import type { Data } from '@measured/puck';
import {
  PuckComponentProps,
  DEFAULT_FOOD_LAYOUT,
  INDUSTRY_STARTER_DATA,
  normalizePuckData,
} from './puck-config';
import { MicrositeService } from './microsite-service';

const puckDataStore: Map<string, Data<PuckComponentProps>> = new Map();

export class PuckService {
  static async getPuckData(subdomain: string, preferDraft = false): Promise<Data<PuckComponentProps> | null> {
    const cleanSubdomain = subdomain.toLowerCase().trim();

    // 1. Check in-memory store
    const memData = puckDataStore.get(cleanSubdomain);
    if (memData) {
      return normalizePuckData(memData);
    }

    // 2. Check MicrositeConfig published or draft data
    const site = await MicrositeService.getMicrositeBySubdomain(cleanSubdomain);
    if (site) {
      const rawData = preferDraft ? (site.draftData || site.publishedData) : (site.publishedData || site.draftData);
      const persisted = rawData as Data<PuckComponentProps> | null | undefined;
      if (persisted && persisted.content && persisted.content.length > 0) {
        puckDataStore.set(cleanSubdomain, persisted);
        return normalizePuckData(persisted);
      }

      if (
        site.industry === 'HOSPITAL' ||
        cleanSubdomain.includes('apollo') ||
        cleanSubdomain.includes('hospital') ||
        cleanSubdomain.includes('clinic')
      ) {
        const hosp = INDUSTRY_STARTER_DATA['HOSPITAL'] || DEFAULT_FOOD_LAYOUT;
        puckDataStore.set(cleanSubdomain, hosp);
        return normalizePuckData(hosp);
      }

      if (
        site.industry === 'JEWELRY' ||
        cleanSubdomain.includes('swarna') ||
        cleanSubdomain.includes('jewel')
      ) {
        const jewel = INDUSTRY_STARTER_DATA['JEWELRY'] || DEFAULT_FOOD_LAYOUT;
        puckDataStore.set(cleanSubdomain, jewel);
        return normalizePuckData(jewel);
      }

      // Generate initial dynamic layout tailored to the business
      const dynamicLayout: Data<PuckComponentProps> = {
        ...DEFAULT_FOOD_LAYOUT,
        root: {
          props: {
            title: site.brandName,
          },
        },
        content: [
          {
            type: 'Hero',
            props: {
              id: 'hero-1',
              badge: 'Verified Local Storefront',
              heading: site.brandName,
              description: site.tagline,
              primaryCtaText: 'Order on WhatsApp',
              whatsappNumber: site.whatsapp,
              secondaryCtaText: 'Call Store',
              phone: site.phone,
              hours: site.hours,
              address: site.address,
            },
          },
          {
            type: 'FeatureCards',
            props: {
              id: 'features-1',
              heading: 'Why Customers Choose Us',
              subheading: 'Dedicated to freshness, authentic preparation, and community trust.',
              feat1Title: 'Premium Quality',
              feat1Desc: 'Prepared fresh daily with authentic ingredients and strict hygiene.',
              feat2Title: 'Swift Service',
              feat2Desc: 'Fast fulfillment and priority local pickup or delivery.',
              feat3Title: 'Verified Business',
              feat3Desc: `Rated ${site.googleRating}★ by local patrons on Google.`,
              feat4Title: 'Warm Hospitality',
              feat4Desc: 'Friendly staff and dedicated customer support.',
            },
          },
          {
            type: 'LocationMapCard',
            props: {
              id: 'location-1',
              storeName: site.brandName,
              address: site.address,
              hours: site.hours,
              phone: site.phone,
              googleMapsUrl: site.googleMapsUrl,
            },
          },
          {
            type: 'WhatsAppCTA',
            props: {
              id: 'cta-1',
              headline: `Connect Directly with ${site.brandName}`,
              subheading: 'Place custom orders, catering inquiries, or ask questions directly on WhatsApp.',
              buttonLabel: 'Chat on WhatsApp',
              whatsappNumber: site.whatsapp,
              prefilledMessage: `Hi ${site.brandName}, I would like to inquire about your services.`,
            },
          },
        ],
      };

      puckDataStore.set(cleanSubdomain, dynamicLayout);
      return dynamicLayout;
    }

    if (
      cleanSubdomain.includes('apollo') ||
      cleanSubdomain.includes('hospital') ||
      cleanSubdomain.includes('clinic')
    ) {
      const hosp = INDUSTRY_STARTER_DATA['HOSPITAL'] || DEFAULT_FOOD_LAYOUT;
      return normalizePuckData(hosp);
    }

    if (
      cleanSubdomain.includes('swarna') ||
      cleanSubdomain.includes('jewel')
    ) {
      const jewel = INDUSTRY_STARTER_DATA['JEWELRY'] || DEFAULT_FOOD_LAYOUT;
      return normalizePuckData(jewel);
    }

    return DEFAULT_FOOD_LAYOUT;
  }

  static async savePuckData(
    subdomain: string,
    data: Data<PuckComponentProps>,
    isPublish = true
  ): Promise<boolean> {
    const cleanSubdomain = subdomain.toLowerCase().trim();
    puckDataStore.set(cleanSubdomain, data);

    // Persist to MicrositeService
    await MicrositeService.updateMicrosite(cleanSubdomain, {
      draftData: data,
      ...(isPublish
        ? {
            publishedData: data,
            published: true,
            status: 'PUBLISHED',
            lastPublishedAt: new Date().toISOString(),
          }
        : {
            status: 'UNPUBLISHED_CHANGES',
          }),
    });

    return true;
  }
}
