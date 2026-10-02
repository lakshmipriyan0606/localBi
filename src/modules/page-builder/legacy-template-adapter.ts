import type { Data } from '@measured/puck';

export interface CanonicalPuckData extends Data {
  schemaVersion?: number;
}

export class LegacyTemplateAdapter {
  public static readonly CURRENT_SCHEMA_VERSION = 2;

  /**
   * Adapts any legacy v1 Puck JSON into the canonical v2 schema.
   * If already v2, returns directly without mutation.
   */
  public static adapt(raw: unknown): CanonicalPuckData {
    if (!raw || typeof raw !== 'object') {
      return {
        schemaVersion: this.CURRENT_SCHEMA_VERSION,
        content: [],
        root: { props: { title: '' } },
      };
    }

    const data = raw as CanonicalPuckData;

    // If already v2 or higher, return directly
    if (data.schemaVersion && data.schemaVersion >= this.CURRENT_SCHEMA_VERSION) {
      return data;
    }

    // Adapt v1 items
    const rawContent = Array.isArray(data.content) ? data.content : [];
    const adaptedContent = rawContent.map((item) => {
      if (!item || typeof item !== 'object') return item;
      const type = item.type;
      const props = { ...(item.props || {}) };

      switch (type) {
        case 'Header':
          return {
            type: 'BrandHeader',
            props: {
              id: props.id || 'brand-header',
              showCta: Boolean(props.ctaText),
              ctaLabel: props.ctaText || 'Contact Us',
              link1Label: props.link1 || 'Overview',
              link1Url: '/',
              link2Label: props.link2 || 'Products',
              link2Url: '/products',
            },
          };

        case 'Hero':
        case 'HeroBanner':
          return {
            type: 'StoreHero',
            props: {
              id: props.id || 'store-hero',
              badgeText: props.badge || 'Verified Local Storefront',
              headline: props.heading || '',
              subheading: props.description || '',
              primaryCtaText: props.primaryCtaText || 'Order on WhatsApp',
              secondaryCtaText: props.secondaryCtaText || 'Call Store',
            },
          };

        case 'FeatureCards':
          return {
            type: 'StoreInfo',
            props: {
              id: props.id || 'store-info',
              headline: props.heading || 'Why Customers Choose Us',
              subheading: props.subheading || '',
              showHours: true,
              showAddress: true,
            },
          };

        case 'LocationMapCard':
          return {
            type: 'StoreMap',
            props: {
              id: props.id || 'store-map',
              zoomLevel: 15,
              showDirectionsButton: true,
            },
          };

        case 'WhatsAppCTA':
          return {
            type: 'WhatsAppCTA',
            props: {
              id: props.id || 'whatsapp-cta',
              headline: props.headline || 'Chat Directly with Us',
              subheading: props.subheading || 'Instant answers, custom orders, and local assistance.',
              buttonLabel: props.buttonLabel || 'Chat on WhatsApp',
              prefilledMessage: props.prefilledMessage || 'Hi, I would like to inquire about your products.',
            },
          };

        case 'Footer':
          return {
            type: 'BrandFooter',
            props: {
              id: props.id || 'brand-footer',
              copyrightText: props.copyright || '',
              showSocialLinks: true,
            },
          };

        default:
          return item;
      }
    });

    return {
      schemaVersion: this.CURRENT_SCHEMA_VERSION,
      root: data.root || { props: { title: '' } },
      content: adaptedContent,
    };
  }
}
