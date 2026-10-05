import type { Config } from '@measured/puck';
import { Columns, CardBox, Section, Container, Spacer } from './components/layout-components';
import { BrandHeader, BrandHero, BrandFooter } from './components/brand-components';
import {
  StoreHero,
  StoreInfo,
  OpeningHours,
  StoreMap,
  NearbyStores,
} from './components/store-components';
import { ProductGrid, ProductDetails, CategoryGrid } from './components/catalog-components';
import { ReviewSummary, ReviewCarousel, TrustSignals } from './components/trust-components';
import { RichText, ImageBlock } from './components/content-components';
import { CallCTA, WhatsAppCTA, DirectionsCTA, LeadForm } from './components/conversion-components';

export type SiteStudioProps = {
  // ── LAYOUT ─────────────────────────────────────────────────────────────
  Columns: {
    layout: '2-equal' | '2-wide-left' | '2-wide-right' | '3-equal' | '4-equal';
    gap: 'none' | 'small' | 'medium' | 'large' | 'xlarge';
    align: 'top' | 'center' | 'bottom' | 'stretch';
    stackOnMobile: boolean;
    background: 'transparent' | 'white' | 'slate-50' | 'slate-900';
    padding: 'none' | 'small' | 'medium' | 'large';
    borderRadius: 'none' | 'small' | 'medium' | 'large';
    column1?: any;
    column2?: any;
    column3?: any;
    column4?: any;
  };
  CardBox: {
    background: 'white' | 'slate-50' | 'slate-900' | 'transparent';
    border: 'none' | 'subtle' | 'accent';
    shadow: 'none' | 'small' | 'medium' | 'large';
    padding: 'none' | 'small' | 'medium' | 'large';
    radius: 'none' | 'small' | 'medium' | 'large';
    content?: any;
  };
  Section: {
    padding: 'none' | 'small' | 'medium' | 'large';
    background: 'transparent' | 'white' | 'slate-50' | 'slate-900';
    maxWidth: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
    content?: any;
  };
  Container: {
    maxWidth: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    content?: any;
  };
  Spacer: {
    height: 'small' | 'medium' | 'large' | 'xlarge';
  };

  // ── BRAND ──────────────────────────────────────────────────────────────
  BrandHeader: {
    showCta: boolean;
    ctaLabel: string;
    link1Label: string;
    link1Url: string;
    link2Label: string;
    link2Url: string;
  };
  BrandHero: {
    headline?: string;
    subheading?: string;
    primaryCtaText?: string;
    primaryCtaUrl?: string;
  };
  BrandFooter: {
    copyrightText?: string;
    showSocialLinks: boolean;
  };

  // ── STORE ──────────────────────────────────────────────────────────────
  StoreHero: {
    badgeText?: string;
    headline?: string;
    subheading?: string;
    primaryCtaText?: string;
    secondaryCtaText?: string;
  };
  StoreInfo: {
    headline: string;
    subheading: string;
    showHours: boolean;
    showAddress: boolean;
  };
  OpeningHours: {
    headline: string;
    showTodayHighlight: boolean;
  };
  StoreMap: {
    headline: string;
    zoomLevel: number;
  };
  NearbyStores: {
    headline: string;
    limit: number;
  };

  // ── PRODUCTS ───────────────────────────────────────────────────────────
  ProductGrid: {
    source: 'CURRENT_STORE_PRODUCTS' | 'CURRENT_CATEGORY_PRODUCTS' | 'FEATURED_PRODUCTS';
    headline: string;
    subheading: string;
    limit: number;
    columns: 2 | 3 | 4;
    showPrice: boolean;
    showAvailability: boolean;
  };
  CategoryGrid: {
    headline: string;
    limit: number;
  };
  ProductDetails: {
    showSku: boolean;
  };

  // ── TRUST ──────────────────────────────────────────────────────────────
  ReviewSummary: {
    headline: string;
    showGoogleBadge: boolean;
  };
  ReviewCarousel: {
    headline: string;
    limit: number;
  };
  TrustSignals: {
    signal1: string;
    signal2: string;
    signal3: string;
  };

  // ── CONTENT ────────────────────────────────────────────────────────────
  RichText: {
    content: string;
    alignment: 'left' | 'center' | 'right';
  };
  ImageBlock: {
    imageUrl: string;
    altText: string;
    caption?: string;
    aspectRatio: 'auto' | '16:9' | '4:3' | '1:1';
  };

  // ── CONVERSION ─────────────────────────────────────────────────────────
  CallCTA: {
    headline: string;
    subheading: string;
    buttonText: string;
  };
  WhatsAppCTA: {
    headline: string;
    subheading: string;
    buttonText: string;
  };
  DirectionsCTA: {
    headline: string;
    buttonText: string;
  };
  LeadForm: {
    title: string;
    subtitle: string;
    buttonText: string;
    intentType: string;
  };
};

export const siteStudioPuckConfig: Config<SiteStudioProps> = {
  categories: {
    layout: {
      title: 'Layout & Structure',
      components: ['Columns', 'CardBox', 'Section', 'Container', 'Spacer'],
    },
    brand: {
      title: 'Brand & Navigation',
      components: ['BrandHeader', 'BrandHero', 'BrandFooter'],
    },
    store: {
      title: 'Store & Location',
      components: ['StoreHero', 'StoreInfo', 'OpeningHours', 'StoreMap', 'NearbyStores'],
    },
    products: {
      title: 'Products & Catalog',
      components: ['ProductGrid', 'ProductDetails', 'CategoryGrid'],
    },
    trust: {
      title: 'Social Proof & Trust',
      components: ['ReviewSummary', 'ReviewCarousel', 'TrustSignals'],
    },
    content: {
      title: 'Content & Media',
      components: ['RichText', 'ImageBlock'],
    },
    conversion: {
      title: 'Lead & Contact Actions',
      components: ['CallCTA', 'WhatsAppCTA', 'DirectionsCTA', 'LeadForm'],
    },
  },
  components: {
    // ── LAYOUT ───────────────────────────────────────────────────────────
    Columns: {
      label: 'Row & Columns (Multi-Column)',
      defaultProps: {
        layout: '2-equal',
        gap: 'medium',
        align: 'top',
        stackOnMobile: true,
        background: 'transparent',
        padding: 'none',
        borderRadius: 'none',
      },
      fields: {
        layout: {
          type: 'select',
          label: 'Column Layout & Distribution',
          options: [
            { label: '2 Columns (50% / 50%)', value: '2-equal' },
            { label: '2 Columns (66% Left / 33% Right)', value: '2-wide-left' },
            { label: '2 Columns (33% Left / 66% Right)', value: '2-wide-right' },
            { label: '3 Columns (Equal 33% each)', value: '3-equal' },
            { label: '4 Columns (Equal 25% each)', value: '4-equal' },
          ],
        },
        gap: {
          type: 'select',
          label: 'Spacing Between Columns',
          options: [
            { label: 'None (0px)', value: 'none' },
            { label: 'Small (16px)', value: 'small' },
            { label: 'Medium (24px)', value: 'medium' },
            { label: 'Large (36px)', value: 'large' },
            { label: 'Extra Large (48px)', value: 'xlarge' },
          ],
        },
        align: {
          type: 'select',
          label: 'Vertical Alignment',
          options: [
            { label: 'Top (Start)', value: 'top' },
            { label: 'Center (Middle)', value: 'center' },
            { label: 'Bottom (End)', value: 'bottom' },
            { label: 'Stretch (Equal Height)', value: 'stretch' },
          ],
        },
        stackOnMobile: {
          type: 'radio',
          label: 'Mobile Screen Behavior',
          options: [
            { label: 'Stack Vertically', value: true },
            { label: 'Keep Columns', value: false },
          ],
        },
        background: {
          type: 'select',
          label: 'Background Tone',
          options: [
            { label: 'Transparent', value: 'transparent' },
            { label: 'Crisp White', value: 'white' },
            { label: 'Soft Slate', value: 'slate-50' },
            { label: 'Dark Slate', value: 'slate-900' },
          ],
        },
        padding: {
          type: 'select',
          label: 'Row Padding',
          options: [
            { label: 'None', value: 'none' },
            { label: 'Small', value: 'small' },
            { label: 'Medium', value: 'medium' },
            { label: 'Large', value: 'large' },
          ],
        },
        borderRadius: {
          type: 'select',
          label: 'Corner Style',
          options: [
            { label: 'Square (None)', value: 'none' },
            { label: 'Slightly Rounded', value: 'small' },
            { label: 'Rounded Card', value: 'medium' },
            { label: 'Large Rounded', value: 'large' },
          ],
        },
        column1: { type: 'slot' },
        column2: { type: 'slot' },
        column3: { type: 'slot' },
        column4: { type: 'slot' },
      },
      render: (props) => <Columns {...props} />,
    },

    CardBox: {
      label: 'Content Card / Box',
      defaultProps: {
        background: 'white',
        border: 'subtle',
        shadow: 'small',
        padding: 'medium',
        radius: 'medium',
      },
      fields: {
        background: {
          type: 'select',
          label: 'Background Tone',
          options: [
            { label: 'Crisp White', value: 'white' },
            { label: 'Soft Slate', value: 'slate-50' },
            { label: 'Dark Slate', value: 'slate-900' },
            { label: 'Transparent', value: 'transparent' },
          ],
        },
        border: {
          type: 'select',
          label: 'Border Style',
          options: [
            { label: 'None', value: 'none' },
            { label: 'Subtle Border', value: 'subtle' },
            { label: 'Accent Border', value: 'accent' },
          ],
        },
        shadow: {
          type: 'select',
          label: 'Elevation / Shadow',
          options: [
            { label: 'None (Flat)', value: 'none' },
            { label: 'Subtle Shadow', value: 'small' },
            { label: 'Medium Elevated', value: 'medium' },
            { label: 'Floating Card', value: 'large' },
          ],
        },
        padding: {
          type: 'select',
          label: 'Inner Padding',
          options: [
            { label: 'None', value: 'none' },
            { label: 'Compact (16px)', value: 'small' },
            { label: 'Comfortable (24px)', value: 'medium' },
            { label: 'Spacious (36px)', value: 'large' },
          ],
        },
        radius: {
          type: 'select',
          label: 'Corner Radius',
          options: [
            { label: 'Square (0px)', value: 'none' },
            { label: 'Small (8px)', value: 'small' },
            { label: 'Medium (16px)', value: 'medium' },
            { label: 'Large (24px)', value: 'large' },
          ],
        },
        content: { type: 'slot' },
      },
      render: (props) => <CardBox {...props} />,
    },

    Section: {
      label: 'Section Container',
      defaultProps: {
        padding: 'medium',
        background: 'transparent',
        maxWidth: 'xl',
      },
      fields: {
        padding: {
          type: 'select',
          label: 'Vertical Padding',
          options: [
            { label: 'None', value: 'none' },
            { label: 'Small', value: 'small' },
            { label: 'Medium', value: 'medium' },
            { label: 'Large', value: 'large' },
          ],
        },
        background: {
          type: 'select',
          label: 'Background Tone',
          options: [
            { label: 'Transparent', value: 'transparent' },
            { label: 'Crisp White', value: 'white' },
            { label: 'Soft Slate', value: 'slate-50' },
            { label: 'Dark Slate', value: 'slate-900' },
          ],
        },
        maxWidth: {
          type: 'select',
          label: 'Content Width',
          options: [
            { label: 'Narrow (3xl)', value: 'sm' },
            { label: 'Standard (5xl)', value: 'md' },
            { label: 'Wide (7xl)', value: 'xl' },
            { label: 'Full Width', value: 'full' },
          ],
        },
        content: { type: 'slot' },
      },
      render: (props) => <Section {...props} />,
    },

    Container: {
      label: 'Standard Container',
      defaultProps: {
        maxWidth: 'xl',
      },
      fields: {
        maxWidth: {
          type: 'select',
          label: 'Container Width',
          options: [
            { label: 'Standard', value: 'md' },
            { label: 'Wide', value: 'xl' },
            { label: 'Full', value: 'full' },
          ],
        },
        content: { type: 'slot' },
      },
      render: (props) => <Container {...props} />,
    },

    Spacer: {
      label: 'Spacer / Gap',
      defaultProps: {
        height: 'medium',
      },
      fields: {
        height: {
          type: 'select',
          label: 'Height',
          options: [
            { label: 'Small (16px)', value: 'small' },
            { label: 'Medium (32px)', value: 'medium' },
            { label: 'Large (64px)', value: 'large' },
            { label: 'Extra Large (96px)', value: 'xlarge' },
          ],
        },
      },
      render: (props) => <Spacer {...props} />,
    },

    // ── BRAND ────────────────────────────────────────────────────────────
    BrandHeader: {
      label: 'Brand Header',
      defaultProps: {
        showCta: true,
        ctaLabel: 'Contact Us',
        link1Label: 'Home',
        link1Url: '/',
        link2Label: 'Catalog',
        link2Url: '/products',
      },
      fields: {
        showCta: { type: 'radio', options: [{ label: 'Yes', value: true }, { label: 'No', value: false }] },
        ctaLabel: { type: 'text', label: 'CTA Button Text' },
        link1Label: { type: 'text', label: 'Nav Link 1 Label' },
        link1Url: { type: 'text', label: 'Nav Link 1 Target' },
        link2Label: { type: 'text', label: 'Nav Link 2 Label' },
        link2Url: { type: 'text', label: 'Nav Link 2 Target' },
      },
      render: (props) => <BrandHeader {...props} />,
    },

    BrandHero: {
      label: 'Brand Hero Banner',
      defaultProps: {
        headline: '',
        subheading: '',
        primaryCtaText: 'Explore Locations',
        primaryCtaUrl: '/locations',
      },
      fields: {
        headline: { type: 'text', label: 'Headline (Leave blank for Brand Name)' },
        subheading: { type: 'textarea', label: 'Subheading' },
        primaryCtaText: { type: 'text', label: 'Button Label' },
        primaryCtaUrl: { type: 'text', label: 'Button Target' },
      },
      render: (props) => <BrandHero {...props} />,
    },

    BrandFooter: {
      label: 'Brand Footer',
      defaultProps: {
        copyrightText: '',
        showSocialLinks: true,
      },
      fields: {
        copyrightText: { type: 'text', label: 'Custom Copyright (Leave blank for automatic)' },
        showSocialLinks: { type: 'radio', options: [{ label: 'Show', value: true }, { label: 'Hide', value: false }] },
      },
      render: (props) => <BrandFooter {...props} />,
    },

    // ── STORE ────────────────────────────────────────────────────────────
    StoreHero: {
      label: 'Store Hero Banner',
      defaultProps: {
        badgeText: 'Verified Official Storefront',
        headline: '',
        subheading: '',
        primaryCtaText: 'Get Directions',
        secondaryCtaText: 'Call Store',
      },
      fields: {
        badgeText: { type: 'text', label: 'Badge Label' },
        headline: { type: 'text', label: 'Headline (Leave blank for Store Name)' },
        subheading: { type: 'textarea', label: 'Subheading (Leave blank for auto-derived address summary)' },
        primaryCtaText: { type: 'text', label: 'Directions Button Text' },
        secondaryCtaText: { type: 'text', label: 'Call Button Text' },
      },
      render: (props) => <StoreHero {...props} />,
    },

    StoreInfo: {
      label: 'Store Details & Address',
      defaultProps: {
        headline: 'Store Details',
        subheading: 'Visit us in person or get in touch directly.',
        showHours: true,
        showAddress: true,
      },
      fields: {
        headline: { type: 'text', label: 'Section Title' },
        subheading: { type: 'text', label: 'Subtitle' },
        showAddress: { type: 'radio', options: [{ label: 'Show', value: true }, { label: 'Hide', value: false }] },
        showHours: { type: 'radio', options: [{ label: 'Show', value: true }, { label: 'Hide', value: false }] },
      },
      render: (props) => <StoreInfo {...props} />,
    },

    OpeningHours: {
      label: 'Opening Hours',
      defaultProps: {
        headline: 'Business Hours',
        showTodayHighlight: true,
      },
      fields: {
        headline: { type: 'text', label: 'Section Title' },
        showTodayHighlight: { type: 'radio', options: [{ label: 'Highlight Today', value: true }, { label: 'No Highlight', value: false }] },
      },
      render: (props) => <OpeningHours {...props} />,
    },

    StoreMap: {
      label: 'Store Location Map',
      defaultProps: {
        headline: 'Find Us on the Map',
        zoomLevel: 15,
      },
      fields: {
        headline: { type: 'text', label: 'Map Heading' },
        zoomLevel: { type: 'number', label: 'Zoom Level (1-20)' },
      },
      render: (props) => <StoreMap {...props} />,
    },

    NearbyStores: {
      label: 'Nearby Locations',
      defaultProps: {
        headline: 'Other Nearby Locations',
        limit: 3,
      },
      fields: {
        headline: { type: 'text', label: 'Section Title' },
        limit: { type: 'number', label: 'Maximum Locations to Display' },
      },
      render: (props) => <NearbyStores {...props} />,
    },

    // ── PRODUCTS ──────────────────────────────────────────────────────────
    ProductGrid: {
      label: 'Products Catalog Grid',
      defaultProps: {
        source: 'CURRENT_STORE_PRODUCTS',
        headline: 'Featured Offerings',
        subheading: 'Authentic selection available at this storefront.',
        limit: 8,
        columns: 3,
        showPrice: true,
        showAvailability: true,
      },
      fields: {
        source: {
          type: 'select',
          label: 'Data Source',
          options: [
            { label: 'Products Available at this Store', value: 'CURRENT_STORE_PRODUCTS' },
            { label: 'Current Category Products', value: 'CURRENT_CATEGORY_PRODUCTS' },
            { label: 'Brand Featured Products', value: 'FEATURED_PRODUCTS' },
          ],
        },
        headline: { type: 'text', label: 'Section Heading' },
        subheading: { type: 'text', label: 'Subheading' },
        limit: { type: 'number', label: 'Max Items to Display (Default: 8)' },
        columns: {
          type: 'select',
          label: 'Grid Columns',
          options: [
            { label: '2 Columns', value: 2 },
            { label: '3 Columns', value: 3 },
            { label: '4 Columns', value: 4 },
          ],
        },
        showPrice: { type: 'radio', options: [{ label: 'Show Price', value: true }, { label: 'Hide Price', value: false }] },
        showAvailability: { type: 'radio', options: [{ label: 'Show Availability Badge', value: true }, { label: 'Hide', value: false }] },
      },
      render: (props) => <ProductGrid {...props} />,
    },

    CategoryGrid: {
      label: 'Category Grid',
      defaultProps: {
        headline: 'Shop by Category',
        limit: 6,
      },
      fields: {
        headline: { type: 'text', label: 'Section Heading' },
        limit: { type: 'number', label: 'Max Categories' },
      },
      render: (props) => <CategoryGrid {...props} />,
    },

    ProductDetails: {
      label: 'Product Details Card',
      defaultProps: {
        showSku: true,
      },
      fields: {
        showSku: { type: 'radio', options: [{ label: 'Show SKU', value: true }, { label: 'Hide SKU', value: false }] },
      },
      render: (props) => <ProductDetails {...props} />,
    },

    // ── TRUST ─────────────────────────────────────────────────────────────
    ReviewSummary: {
      label: 'Google Review Summary',
      defaultProps: {
        headline: 'Customer Satisfaction',
        showGoogleBadge: true,
      },
      fields: {
        headline: { type: 'text', label: 'Heading' },
        showGoogleBadge: { type: 'radio', options: [{ label: 'Show Badge', value: true }, { label: 'Hide Badge', value: false }] },
      },
      render: (props) => <ReviewSummary {...props} />,
    },

    ReviewCarousel: {
      label: 'Verified Review Cards',
      defaultProps: {
        headline: 'What Our Customers Say',
        limit: 4,
      },
      fields: {
        headline: { type: 'text', label: 'Heading' },
        limit: { type: 'number', label: 'Max Reviews to Show' },
      },
      render: (props) => <ReviewCarousel {...props} />,
    },

    TrustSignals: {
      label: 'Trust Badges / Guarantees',
      defaultProps: {
        signal1: '100% Authentic Quality Guaranteed',
        signal2: 'Verified Storefront Operations',
        signal3: 'Personalized In-Store & WhatsApp Assistance',
      },
      fields: {
        signal1: { type: 'text', label: 'Trust Point 1' },
        signal2: { type: 'text', label: 'Trust Point 2' },
        signal3: { type: 'text', label: 'Trust Point 3' },
      },
      render: (props) => <TrustSignals {...props} />,
    },

    // ── CONTENT ───────────────────────────────────────────────────────────
    RichText: {
      label: 'Text & Content Block',
      defaultProps: {
        content: '<p>Welcome to our storefront. Explore our latest announcements, local highlights, and authentic catalog selections.</p>',
        alignment: 'left',
      },
      fields: {
        content: { type: 'textarea', label: 'HTML / Text Content' },
        alignment: {
          type: 'select',
          label: 'Text Alignment',
          options: [
            { label: 'Left', value: 'left' },
            { label: 'Center', value: 'center' },
            { label: 'Right', value: 'right' },
          ],
        },
      },
      render: (props) => <RichText {...props} />,
    },

    ImageBlock: {
      label: 'Image Showcase',
      defaultProps: {
        imageUrl: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1200&q=80',
        altText: 'Storefront presentation image',
        aspectRatio: '16:9',
      },
      fields: {
        imageUrl: { type: 'text', label: 'Image URL' },
        altText: { type: 'text', label: 'Alt Description' },
        caption: { type: 'text', label: 'Optional Caption' },
        aspectRatio: {
          type: 'select',
          label: 'Aspect Ratio',
          options: [
            { label: 'Wide (16:9)', value: '16:9' },
            { label: 'Standard (4:3)', value: '4:3' },
            { label: 'Square (1:1)', value: '1:1' },
          ],
        },
      },
      render: (props) => <ImageBlock {...props} />,
    },

    // ── CONVERSION ────────────────────────────────────────────────────────
    CallCTA: {
      label: 'Call Store CTA',
      defaultProps: {
        headline: 'Speak With Our Local Team',
        subheading: 'Get instant answers about pricing, availability, and services.',
        buttonText: 'Call Now',
      },
      fields: {
        headline: { type: 'text', label: 'Heading' },
        subheading: { type: 'text', label: 'Subheading' },
        buttonText: { type: 'text', label: 'Button Label' },
      },
      render: (props) => <CallCTA {...props} />,
    },

    WhatsAppCTA: {
      label: 'WhatsApp Quick Chat',
      defaultProps: {
        headline: 'Order & Inquire via WhatsApp',
        subheading: 'Chat with our store representatives directly for fast orders and inquiries.',
        buttonText: 'Start WhatsApp Chat',
      },
      fields: {
        headline: { type: 'text', label: 'Heading' },
        subheading: { type: 'text', label: 'Subheading' },
        buttonText: { type: 'text', label: 'Button Label' },
      },
      render: (props) => <WhatsAppCTA {...props} />,
    },

    DirectionsCTA: {
      label: 'Get Directions CTA',
      defaultProps: {
        headline: 'Plan Your Visit Today',
        buttonText: 'Open in Google Maps',
      },
      fields: {
        headline: { type: 'text', label: 'Heading' },
        buttonText: { type: 'text', label: 'Button Label' },
      },
      render: (props) => <DirectionsCTA {...props} />,
    },

    LeadForm: {
      label: 'Lead Capture Form',
      defaultProps: {
        title: 'Request a Callback / Inquiry',
        subtitle: 'Leave your details and our team will get back to you shortly.',
        buttonText: 'Submit Inquiry',
        intentType: 'INQUIRY',
      },
      fields: {
        title: { type: 'text', label: 'Form Title' },
        subtitle: { type: 'text', label: 'Subtitle' },
        buttonText: { type: 'text', label: 'Submit Button Label' },
        intentType: {
          type: 'select',
          label: 'Lead Purpose',
          options: [
            { label: 'General Inquiry', value: 'INQUIRY' },
            { label: 'Order Assistance', value: 'ORDER' },
            { label: 'Service Appointment', value: 'APPOINTMENT' },
          ],
        },
      },
      render: (props) => <LeadForm {...props} />,
    },
  },
};
