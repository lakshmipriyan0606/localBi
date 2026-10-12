import type { Config } from '@measured/puck';
import {
  Columns,
  CardBox,
  Section,
  Container,
  Spacer,
  MultiColumnGrid,
  FlexLayout,
  Divider,
  TwoColumnLayout,
  ThreeColumnLayout,
  FullWidthSection,
  StickySection,
  ColumnsProps,
  CardBoxProps,
  SectionProps,
  ContainerProps,
  SpacerProps,
  MultiColumnGridProps,
  FlexLayoutProps,
  DividerProps,
  TwoColumnLayoutProps,
  ThreeColumnLayoutProps,
  FullWidthSectionProps,
  StickySectionProps,
} from './components/layout-components';
import {
  BrandHeader,
  BrandHero,
  BrandFooter,
  SiteNavigation,
  AnnouncementBar,
  Breadcrumbs,
  ContactButton,
  CallButton,
  SearchBar,
  BrandHeaderProps,
  BrandHeroProps,
  BrandFooterProps,
  SiteNavigationProps,
  AnnouncementBarProps,
  BreadcrumbsProps,
  ContactButtonProps,
  CallButtonProps,
  SearchBarProps,
} from './components/brand-components';
import {
  HeroBanner,
  HeroWithImage,
  CenteredHero,
  CTABanner,
  DualCTASection,
  PromoBanner,
  NewsletterSignup,
  HeroBannerProps,
  HeroWithImageProps,
  CenteredHeroProps,
  CTABannerProps,
  DualCTASectionProps,
  PromoBannerProps,
  NewsletterSignupProps,
} from './components/hero-components';
import {
  StoreHero,
  StoreInfo,
  OpeningHours,
  StoreMap,
  NearbyStores,
  StoreLocator,
  LocationCard,
  StoreHeroProps,
  StoreInfoProps,
  OpeningHoursProps,
  StoreMapProps,
  NearbyStoresProps,
  StoreLocatorProps,
  LocationCardProps,
} from './components/store-components';
import {
  ProductGrid,
  ProductDetails,
  CategoryGrid,
  ProductCard,
  FeaturedProduct,
  ProductCarousel,
  ProductSearch,
  ProductGridProps,
  CategoryGridProps,
  ProductCardProps,
  FeaturedProductProps,
  ProductCarouselProps,
  ProductSearchProps,
} from './components/catalog-components';
import {
  ReviewSummary,
  ReviewCarousel,
  TrustSignals,
  StatisticsCounter,
  PartnerLogos,
  TestimonialQuote,
  ReviewSummaryProps,
  TrustSignalsProps,
  StatisticsCounterProps,
  PartnerLogosProps,
  TestimonialQuoteProps,
} from './components/trust-components';
import {
  RichText,
  ImageBlock,
  Heading,
  Paragraph,
  ImageGallery,
  VideoEmbed,
  IconGrid,
  FAQAccordion,
  Tabs,
  RichTextProps,
  ImageBlockProps,
  HeadingProps,
  ParagraphProps,
  ImageGalleryProps,
  VideoEmbedProps,
  IconGridProps,
  FAQAccordionProps,
  TabsProps,
} from './components/content-components';
import {
  ServicesGrid,
  WhyChooseUs,
  TeamGrid,
  PricingCards,
  ProcessSteps,
  ServicesGridProps,
  WhyChooseUsProps,
  TeamGridProps,
  PricingCardsProps,
  ProcessStepsProps,
} from './components/service-components';
import {
  CallCTA,
  WhatsAppCTA,
  DirectionsCTA,
  LeadForm,
  CallbackRequest,
  ContactForm,
  CallCTAProps,
  WhatsAppCTAProps,
  DirectionsCTAProps,
  LeadFormProps,
  CallbackRequestProps,
  ContactFormProps,
} from './components/conversion-components';
import {
  SEOLandingSection,
  BreadcrumbSection,
  MultiColumnFooter,
  FloatingWhatsApp,
  BackToTop,
  SEOLandingSectionProps,
  BreadcrumbSectionProps,
  MultiColumnFooterProps,
  FloatingWhatsAppProps,
  BackToTopProps,
} from './components/seo-footer-components';

export type SiteStudioProps = {
  // ── LAYOUT ─────────────────────────────────────────────────────────────
  Columns: ColumnsProps;
  CardBox: CardBoxProps;
  Section: SectionProps;
  Container: ContainerProps;
  Spacer: SpacerProps;
  MultiColumnGrid: MultiColumnGridProps;
  FlexLayout: FlexLayoutProps;
  Divider: DividerProps;
  TwoColumnLayout: TwoColumnLayoutProps;
  ThreeColumnLayout: ThreeColumnLayoutProps;
  FullWidthSection: FullWidthSectionProps;
  StickySection: StickySectionProps;

  // ── BRAND ──────────────────────────────────────────────────────────────
  BrandHeader: BrandHeaderProps;
  SiteNavigation: SiteNavigationProps;
  AnnouncementBar: AnnouncementBarProps;
  Breadcrumbs: BreadcrumbsProps;
  ContactButton: ContactButtonProps;
  CallButton: CallButtonProps;
  SearchBar: SearchBarProps;
  BrandFooter: BrandFooterProps;
  MultiColumnFooter: MultiColumnFooterProps;

  // ── HERO ───────────────────────────────────────────────────────────────
  HeroBanner: HeroBannerProps;
  HeroWithImage: HeroWithImageProps;
  CenteredHero: CenteredHeroProps;
  CTABanner: CTABannerProps;
  DualCTASection: DualCTASectionProps;
  PromoBanner: PromoBannerProps;
  NewsletterSignup: NewsletterSignupProps;
  BrandHero: BrandHeroProps;

  // ── STORE ──────────────────────────────────────────────────────────────
  StoreHero: StoreHeroProps;
  StoreInfo: StoreInfoProps;
  OpeningHours: OpeningHoursProps;
  StoreMap: StoreMapProps;
  NearbyStores: NearbyStoresProps;
  StoreLocator: StoreLocatorProps;
  LocationCard: LocationCardProps;

  // ── PRODUCTS ───────────────────────────────────────────────────────────
  ProductGrid: ProductGridProps;
  ProductCard: ProductCardProps;
  FeaturedProduct: FeaturedProductProps;
  CategoryGrid: CategoryGridProps;
  ProductCarousel: ProductCarouselProps;
  ProductSearch: ProductSearchProps;
  ProductDetails: { showSku: boolean };

  // ── CONTENT ────────────────────────────────────────────────────────────
  RichText: RichTextProps;
  Heading: HeadingProps;
  Paragraph: ParagraphProps;
  ImageBlock: ImageBlockProps;
  ImageGallery: ImageGalleryProps;
  VideoEmbed: VideoEmbedProps;
  IconGrid: IconGridProps;
  FAQAccordion: FAQAccordionProps;
  Tabs: TabsProps;

  // ── TRUST ──────────────────────────────────────────────────────────────
  ReviewSummary: ReviewSummaryProps;
  ReviewCarousel: { headline: string; limit: number };
  TrustSignals: TrustSignalsProps;
  StatisticsCounter: StatisticsCounterProps;
  PartnerLogos: PartnerLogosProps;
  TestimonialQuote: TestimonialQuoteProps;

  // ── SERVICES ───────────────────────────────────────────────────────────
  ServicesGrid: ServicesGridProps;
  WhyChooseUs: WhyChooseUsProps;
  TeamGrid: TeamGridProps;
  PricingCards: PricingCardsProps;
  ProcessSteps: ProcessStepsProps;

  // ── CONVERSION & FORMS ─────────────────────────────────────────────────
  CallCTA: CallCTAProps;
  WhatsAppCTA: WhatsAppCTAProps;
  DirectionsCTA: DirectionsCTAProps;
  LeadForm: LeadFormProps;
  CallbackRequest: CallbackRequestProps;
  ContactForm: ContactFormProps;

  // ── SEO & MARKETING ────────────────────────────────────────────────────
  SEOLandingSection: SEOLandingSectionProps;
  BreadcrumbSection: BreadcrumbSectionProps;

  // ── UTILITY ────────────────────────────────────────────────────────────
  FloatingWhatsApp: FloatingWhatsAppProps;
  BackToTop: BackToTopProps;
};

export const siteStudioPuckConfig: Config<any> = {
  root: {
    render: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    defaultProps: {
      title: 'Storefront',
    },
  },
  categories: {
    layout: {
      title: 'Layout & Structure',
      components: [
        'Columns',
        'CardBox',
        'Section',
        'Container',
        'Spacer',
        'MultiColumnGrid',
        'FlexLayout',
        'Divider',
        'TwoColumnLayout',
        'ThreeColumnLayout',
        'FullWidthSection',
        'StickySection',
      ],
    },
    brand: {
      title: 'Brand & Navigation',
      components: [
        'BrandHeader',
        'SiteNavigation',
        'AnnouncementBar',
        'Breadcrumbs',
        'ContactButton',
        'CallButton',
        'SearchBar',
        'BrandFooter',
        'MultiColumnFooter',
      ],
    },
    hero: {
      title: 'Hero & Conversion',
      components: [
        'HeroBanner',
        'HeroWithImage',
        'CenteredHero',
        'CTABanner',
        'DualCTASection',
        'PromoBanner',
        'NewsletterSignup',
        'BrandHero',
      ],
    },
    store: {
      title: 'Store & Location',
      components: [
        'StoreHero',
        'StoreInfo',
        'OpeningHours',
        'StoreMap',
        'NearbyStores',
        'StoreLocator',
        'LocationCard',
      ],
    },
    products: {
      title: 'Products & Catalog',
      components: [
        'ProductGrid',
        'ProductCard',
        'FeaturedProduct',
        'CategoryGrid',
        'ProductCarousel',
        'ProductSearch',
        'ProductDetails',
      ],
    },
    content: {
      title: 'Content & Media',
      components: [
        'RichText',
        'Heading',
        'Paragraph',
        'ImageBlock',
        'ImageGallery',
        'VideoEmbed',
        'IconGrid',
        'FAQAccordion',
        'Tabs',
      ],
    },
    trust: {
      title: 'Social Proof & Trust',
      components: [
        'ReviewSummary',
        'ReviewCarousel',
        'TrustSignals',
        'StatisticsCounter',
        'PartnerLogos',
        'TestimonialQuote',
      ],
    },
    services: {
      title: 'Services & Business',
      components: [
        'ServicesGrid',
        'WhyChooseUs',
        'TeamGrid',
        'PricingCards',
        'ProcessSteps',
      ],
    },
    conversion: {
      title: 'Forms & Lead Generation',
      components: [
        'CallCTA',
        'WhatsAppCTA',
        'DirectionsCTA',
        'LeadForm',
        'CallbackRequest',
        'ContactForm',
      ],
    },
    seo: {
      title: 'SEO & Marketing',
      components: ['SEOLandingSection', 'BreadcrumbSection'],
    },
    footer: {
      title: 'Footer & Utility',
      components: ['MultiColumnFooter', 'FloatingWhatsApp', 'BackToTop'],
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
          label: 'Column Distribution',
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
          label: 'Spacing Gap',
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
            { label: 'Top', value: 'top' },
            { label: 'Center', value: 'center' },
            { label: 'Bottom', value: 'bottom' },
            { label: 'Stretch', value: 'stretch' },
          ],
        },
        stackOnMobile: {
          type: 'radio',
          label: 'Stack on Mobile',
          options: [
            { label: 'Yes', value: true },
            { label: 'No', value: false },
          ],
        },
        background: {
          type: 'select',
          label: 'Background',
          options: [
            { label: 'Transparent', value: 'transparent' },
            { label: 'White', value: 'white' },
            { label: 'Soft Slate', value: 'slate-50' },
            { label: 'Dark Slate', value: 'slate-900' },
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
            { label: 'White', value: 'white' },
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
            { label: 'Subtle', value: 'subtle' },
            { label: 'Accent', value: 'accent' },
          ],
        },
        shadow: {
          type: 'select',
          label: 'Shadow Elevation',
          options: [
            { label: 'None', value: 'none' },
            { label: 'Small', value: 'small' },
            { label: 'Medium', value: 'medium' },
            { label: 'Large', value: 'large' },
          ],
        },
        padding: {
          type: 'select',
          label: 'Inner Padding',
          options: [
            { label: 'None', value: 'none' },
            { label: 'Small (16px)', value: 'small' },
            { label: 'Medium (24px)', value: 'medium' },
            { label: 'Large (36px)', value: 'large' },
          ],
        },
        radius: {
          type: 'select',
          label: 'Corner Radius',
          options: [
            { label: 'None', value: 'none' },
            { label: 'Small', value: 'small' },
            { label: 'Medium', value: 'medium' },
            { label: 'Large', value: 'large' },
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
          label: 'Background',
          options: [
            { label: 'Transparent', value: 'transparent' },
            { label: 'White', value: 'white' },
            { label: 'Soft Slate', value: 'slate-50' },
            { label: 'Dark Slate', value: 'slate-900' },
          ],
        },
        maxWidth: {
          type: 'select',
          label: 'Max Width',
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
      defaultProps: { maxWidth: 'xl' },
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
      defaultProps: { height: 'medium' },
      fields: {
        height: {
          type: 'select',
          label: 'Gap Height',
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

    MultiColumnGrid: {
      label: 'Multi-Column Grid',
      defaultProps: { columns: 3, gap: 'medium' },
      fields: {
        columns: {
          type: 'select',
          label: 'Number of Columns',
          options: [
            { label: '1 Column', value: 1 },
            { label: '2 Columns', value: 2 },
            { label: '3 Columns', value: 3 },
            { label: '4 Columns', value: 4 },
            { label: '5 Columns', value: 5 },
            { label: '6 Columns', value: 6 },
          ],
        },
        gap: {
          type: 'select',
          label: 'Grid Spacing',
          options: [
            { label: 'None', value: 'none' },
            { label: 'Small', value: 'small' },
            { label: 'Medium', value: 'medium' },
            { label: 'Large', value: 'large' },
          ],
        },
        content: { type: 'slot' },
      },
      render: (props) => <MultiColumnGrid {...props} />,
    },

    FlexLayout: {
      label: 'Flex Layout',
      defaultProps: { direction: 'row', justify: 'start', align: 'center', wrap: true, gap: 'medium' },
      fields: {
        direction: {
          type: 'radio',
          label: 'Direction',
          options: [
            { label: 'Row (Horizontal)', value: 'row' },
            { label: 'Column (Vertical)', value: 'column' },
          ],
        },
        justify: {
          type: 'select',
          label: 'Horizontal Justification',
          options: [
            { label: 'Start (Left)', value: 'start' },
            { label: 'Center', value: 'center' },
            { label: 'End (Right)', value: 'end' },
            { label: 'Space Between', value: 'between' },
          ],
        },
        gap: {
          type: 'select',
          label: 'Gap',
          options: [
            { label: 'None', value: 'none' },
            { label: 'Small', value: 'small' },
            { label: 'Medium', value: 'medium' },
            { label: 'Large', value: 'large' },
          ],
        },
        content: { type: 'slot' },
      },
      render: (props) => <FlexLayout {...props} />,
    },

    Divider: {
      label: 'Divider Line',
      defaultProps: { style: 'solid', color: 'subtle', thickness: 'thin', badgeText: '' },
      fields: {
        style: {
          type: 'select',
          label: 'Line Style',
          options: [
            { label: 'Solid', value: 'solid' },
            { label: 'Dashed', value: 'dashed' },
            { label: 'Gradient Glow', value: 'gradient' },
          ],
        },
        color: {
          type: 'select',
          label: 'Color Tone',
          options: [
            { label: 'Subtle Slate', value: 'subtle' },
            { label: 'Slate Border', value: 'slate' },
            { label: 'Brand Indigo', value: 'indigo' },
          ],
        },
        badgeText: { type: 'text', label: 'Optional Center Badge Text' },
      },
      render: (props) => <Divider {...props} />,
    },

    TwoColumnLayout: {
      label: 'Two-Column Split',
      defaultProps: { ratio: '50-50', gap: 'medium', stackOnMobile: true },
      fields: {
        ratio: {
          type: 'select',
          label: 'Column Ratio',
          options: [
            { label: '50% / 50%', value: '50-50' },
            { label: '60% Left / 40% Right', value: '60-40' },
            { label: '40% Left / 60% Right', value: '40-60' },
            { label: '70% Left / 30% Right', value: '70-30' },
          ],
        },
        gap: {
          type: 'select',
          label: 'Gap Spacing',
          options: [
            { label: 'Small', value: 'small' },
            { label: 'Medium', value: 'medium' },
            { label: 'Large', value: 'large' },
          ],
        },
        column1: { type: 'slot' },
        column2: { type: 'slot' },
      },
      render: (props) => <TwoColumnLayout {...props} />,
    },

    ThreeColumnLayout: {
      label: 'Three-Column Layout',
      defaultProps: { gap: 'medium', stackOnMobile: true },
      fields: {
        gap: {
          type: 'select',
          label: 'Gap',
          options: [
            { label: 'Small', value: 'small' },
            { label: 'Medium', value: 'medium' },
            { label: 'Large', value: 'large' },
          ],
        },
        column1: { type: 'slot' },
        column2: { type: 'slot' },
        column3: { type: 'slot' },
      },
      render: (props) => <ThreeColumnLayout {...props} />,
    },

    FullWidthSection: {
      label: 'Full-Width Section',
      defaultProps: { backgroundGradient: 'none', backgroundImage: '', overlayOpacity: 40, padding: 'medium' },
      fields: {
        backgroundGradient: {
          type: 'select',
          label: 'Background Gradient',
          options: [
            { label: 'None (Plain White)', value: 'none' },
            { label: 'Indigo Aurora', value: 'indigo' },
            { label: 'Deep Dark Slate', value: 'slate-dark' },
            { label: 'Emerald Glow', value: 'emerald' },
          ],
        },
        backgroundImage: { type: 'text', label: 'Background Image URL' },
        padding: {
          type: 'select',
          label: 'Vertical Padding',
          options: [
            { label: 'Small', value: 'small' },
            { label: 'Medium', value: 'medium' },
            { label: 'Large', value: 'large' },
            { label: 'Extra Large', value: 'xlarge' },
          ],
        },
        content: { type: 'slot' },
      },
      render: (props) => <FullWidthSection {...props} />,
    },

    StickySection: {
      label: 'Sticky Section Header',
      defaultProps: { topOffset: 0, background: 'blur' },
      fields: {
        background: {
          type: 'select',
          label: 'Background',
          options: [
            { label: 'Glassmorphic Blur', value: 'blur' },
            { label: 'Solid White', value: 'white' },
            { label: 'Transparent', value: 'transparent' },
          ],
        },
        content: { type: 'slot' },
      },
      render: (props) => <StickySection {...props} />,
    },

    // ── BRAND ────────────────────────────────────────────────────────────
    BrandHeader: {
      label: 'Brand Header',
      defaultProps: { showCta: true, ctaLabel: 'Contact Us', link1Label: 'Home', link1Url: '/', link2Label: 'Catalog', link2Url: '/products' },
      fields: {
        showCta: { type: 'radio', options: [{ label: 'Yes', value: true }, { label: 'No', value: false }] },
        ctaLabel: { type: 'text', label: 'CTA Label' },
        link1Label: { type: 'text', label: 'Nav Link 1' },
        link1Url: { type: 'text', label: 'Nav Link 1 URL' },
        link2Label: { type: 'text', label: 'Nav Link 2' },
        link2Url: { type: 'text', label: 'Nav Link 2 URL' },
      },
      render: (props) => <BrandHeader {...props} />,
    },

    SiteNavigation: {
      label: 'Site Navigation (Header)',
      defaultProps: { sticky: true, showSearch: true, showPhone: true, ctaButtonText: 'Contact Store', ctaButtonUrl: '/contact' },
      fields: {
        sticky: { type: 'radio', options: [{ label: 'Sticky', value: true }, { label: 'Static', value: false }] },
        showPhone: { type: 'radio', options: [{ label: 'Show', value: true }, { label: 'Hide', value: false }] },
        ctaButtonText: { type: 'text', label: 'Button Text' },
        ctaButtonUrl: { type: 'text', label: 'Button Target' },
      },
      render: (props) => <SiteNavigation {...props} />,
    },

    AnnouncementBar: {
      label: 'Announcement Bar',
      defaultProps: { badge: 'NEW', message: 'Same-day delivery now available from neighborhood branches!', linkText: 'Shop Now', linkUrl: '/products', bgColor: 'indigo' },
      fields: {
        badge: { type: 'text', label: 'Badge Label' },
        message: { type: 'text', label: 'Message Text' },
        linkText: { type: 'text', label: 'Action Link Label' },
        linkUrl: { type: 'text', label: 'Action URL' },
        bgColor: {
          type: 'select',
          label: 'Theme Tone',
          options: [
            { label: 'Brand Indigo', value: 'indigo' },
            { label: 'Dark Slate', value: 'slate' },
            { label: 'Notice Amber', value: 'amber' },
          ],
        },
      },
      render: (props) => <AnnouncementBar {...props} />,
    },

    Breadcrumbs: {
      label: 'Breadcrumbs',
      defaultProps: { currentPageTitle: '' },
      fields: {
        currentPageTitle: { type: 'text', label: 'Current Page Title (Leave blank for automated)' },
      },
      render: (props) => <Breadcrumbs {...props} />,
    },

    ContactButton: {
      label: 'Contact Button',
      defaultProps: { label: 'Get in Touch', url: '/contact', variant: 'primary', size: 'medium' },
      fields: {
        label: { type: 'text', label: 'Button Label' },
        url: { type: 'text', label: 'Target URL' },
        variant: {
          type: 'select',
          label: 'Visual Style',
          options: [
            { label: 'Primary Brand', value: 'primary' },
            { label: 'Secondary Dark', value: 'secondary' },
            { label: 'Subtle Outline', value: 'outline' },
          ],
        },
        size: {
          type: 'select',
          label: 'Size',
          options: [
            { label: 'Small', value: 'small' },
            { label: 'Medium', value: 'medium' },
            { label: 'Large', value: 'large' },
          ],
        },
      },
      render: (props) => <ContactButton {...props} />,
    },

    CallButton: {
      label: 'Call Store Button',
      defaultProps: { label: 'Call Storefront Now', phoneNumber: '' },
      fields: {
        label: { type: 'text', label: 'Button Label' },
        phoneNumber: { type: 'text', label: 'Custom Phone (Leave blank for store phone)' },
      },
      render: (props) => <CallButton {...props} />,
    },

    SearchBar: {
      label: 'Search Bar',
      defaultProps: { placeholder: 'Search products or locations...', buttonText: 'Search' },
      fields: {
        placeholder: { type: 'text', label: 'Input Placeholder' },
        buttonText: { type: 'text', label: 'Button Text' },
      },
      render: (props) => <SearchBar {...props} />,
    },

    BrandFooter: {
      label: 'Brand Footer',
      defaultProps: { copyrightText: '', showSocialLinks: true },
      fields: {
        copyrightText: { type: 'text', label: 'Custom Copyright' },
        showSocialLinks: { type: 'radio', options: [{ label: 'Show', value: true }, { label: 'Hide', value: false }] },
      },
      render: (props) => <BrandFooter {...props} />,
    },

    MultiColumnFooter: {
      label: 'Multi-Column Enterprise Footer',
      defaultProps: { aboutText: '', showStoreAddress: true, column2Title: 'Quick Links', column3Title: 'Store & Contact', copyrightText: '' },
      fields: {
        aboutText: { type: 'textarea', label: 'Brand Summary Paragraph' },
        column2Title: { type: 'text', label: 'Column 2 Title' },
        column3Title: { type: 'text', label: 'Column 3 Title' },
        copyrightText: { type: 'text', label: 'Custom Copyright' },
      },
      render: (props) => <MultiColumnFooter {...props} />,
    },

    // ── HERO ─────────────────────────────────────────────────────────────
    HeroBanner: {
      label: 'Hero Banner (Showcase)',
      defaultProps: {
        badgeText: 'Official Storefront',
        headline: '',
        subheading: '',
        primaryCtaText: 'Explore Products',
        primaryCtaUrl: '/products',
        secondaryCtaText: 'Store Locations',
        secondaryCtaUrl: '/locations',
        showStatChips: true,
        statChip1: '⚡ Fast Local Delivery',
        statChip2: '⭐ 4.9 Verified Reviews',
        backgroundImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1600&q=80',
        overlayGradient: 'indigo',
      },
      fields: {
        badgeText: { type: 'text', label: 'Top Pill Badge' },
        headline: { type: 'text', label: 'Headline (Leave blank for Brand Name)' },
        subheading: { type: 'textarea', label: 'Subheading' },
        primaryCtaText: { type: 'text', label: 'Primary Button Label' },
        primaryCtaUrl: { type: 'text', label: 'Primary Button URL' },
        secondaryCtaText: { type: 'text', label: 'Secondary Button Label' },
        secondaryCtaUrl: { type: 'text', label: 'Secondary Button URL' },
        backgroundImage: { type: 'text', label: 'Background Image URL' },
        overlayGradient: {
          type: 'select',
          label: 'Gradient Tone',
          options: [
            { label: 'Indigo Aurora', value: 'indigo' },
            { label: 'Deep Dark Slate', value: 'dark' },
            { label: 'Emerald Fresh', value: 'emerald' },
            { label: 'Amber Warm', value: 'amber' },
          ],
        },
      },
      render: (props) => <HeroBanner {...props} />,
    },

    HeroWithImage: {
      label: 'Hero with Image (Split)',
      defaultProps: {
        headline: 'Fresh Quality Products Direct From Local Stores',
        subheading: 'Discover verified catalog selections, fast delivery, and authentic store experiences.',
        badge: '⭐ Verified Store Catalog',
        ctaText: 'Shop Catalog',
        ctaUrl: '/products',
        imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
        imageAlt: 'Showcase',
        imagePosition: 'right',
      },
      fields: {
        headline: { type: 'text', label: 'Headline' },
        subheading: { type: 'textarea', label: 'Subheading' },
        badge: { type: 'text', label: 'Top Badge' },
        ctaText: { type: 'text', label: 'Button Text' },
        ctaUrl: { type: 'text', label: 'Button Target' },
        imageUrl: { type: 'text', label: 'Hero Image URL' },
        imagePosition: {
          type: 'radio',
          label: 'Image Position',
          options: [
            { label: 'Right Side', value: 'right' },
            { label: 'Left Side', value: 'left' },
          ],
        },
      },
      render: (props) => <HeroWithImage {...props} />,
    },

    CenteredHero: {
      label: 'Centered Hero Banner',
      defaultProps: {
        pillText: '✨ Discover The New Experience',
        headline: 'Everything You Need, Delivered From Local Branches',
        subheading: 'Explore verified local store products, verified customer reviews, and fast in-store pickups.',
        primaryButtonText: 'Explore Products',
        primaryButtonUrl: '/products',
        secondaryButtonText: 'Find Stores',
        secondaryButtonUrl: '/locations',
      },
      fields: {
        pillText: { type: 'text', label: 'Top Pill Tag' },
        headline: { type: 'text', label: 'Headline' },
        subheading: { type: 'textarea', label: 'Subheading' },
        primaryButtonText: { type: 'text', label: 'Primary Button Label' },
        primaryButtonUrl: { type: 'text', label: 'Primary URL' },
        secondaryButtonText: { type: 'text', label: 'Secondary Button Label' },
        secondaryButtonUrl: { type: 'text', label: 'Secondary URL' },
      },
      render: (props) => <CenteredHero {...props} />,
    },

    CTABanner: {
      label: 'Call to Action Banner',
      defaultProps: {
        headline: 'Ready to Experience Authentic Quality?',
        description: 'Order directly from our catalog or visit our verified physical store locations today.',
        buttonText: 'Get Started Now',
        buttonUrl: '/products',
        themeStyle: 'indigo',
      },
      fields: {
        headline: { type: 'text', label: 'Heading' },
        description: { type: 'textarea', label: 'Description' },
        buttonText: { type: 'text', label: 'Button Label' },
        buttonUrl: { type: 'text', label: 'Button Target' },
        themeStyle: {
          type: 'select',
          label: 'Color Theme',
          options: [
            { label: 'Indigo Gradient', value: 'indigo' },
            { label: 'Dark Slate', value: 'dark' },
            { label: 'Emerald Fresh', value: 'emerald' },
          ],
        },
      },
      render: (props) => <CTABanner {...props} />,
    },

    DualCTASection: {
      label: 'Dual CTA Cards',
      defaultProps: {
        card1Title: 'Shop Product Catalog',
        card1Subtitle: 'Browse premium authentic selections with direct ordering and home delivery.',
        card1ButtonText: 'Explore Products',
        card1ButtonUrl: '/products',
        card2Title: 'Visit Physical Storefront',
        card2Subtitle: 'Locate our nearest verified branch, check business hours, and get live directions.',
        card2ButtonText: 'Find Nearest Store',
        card2ButtonUrl: '/locations',
      },
      fields: {
        card1Title: { type: 'text', label: 'Card 1 Title' },
        card1Subtitle: { type: 'text', label: 'Card 1 Subtitle' },
        card1ButtonText: { type: 'text', label: 'Card 1 Button Label' },
        card1ButtonUrl: { type: 'text', label: 'Card 1 Target' },
        card2Title: { type: 'text', label: 'Card 2 Title' },
        card2Subtitle: { type: 'text', label: 'Card 2 Subtitle' },
        card2ButtonText: { type: 'text', label: 'Card 2 Button Label' },
        card2ButtonUrl: { type: 'text', label: 'Card 2 Target' },
      },
      render: (props) => <DualCTASection {...props} />,
    },

    PromoBanner: {
      label: 'Promotional Offer Banner',
      defaultProps: {
        badge: 'SPECIAL OFFER',
        headline: 'Get 15% Off Your First Direct Store Order',
        couponCode: 'LOCAL15',
        expiryNote: 'Limited time offer. Apply code at store checkout or WhatsApp order.',
      },
      fields: {
        badge: { type: 'text', label: 'Badge Text' },
        headline: { type: 'text', label: 'Offer Headline' },
        couponCode: { type: 'text', label: 'Coupon Code' },
        expiryNote: { type: 'text', label: 'Note / Expiry' },
      },
      render: (props) => <PromoBanner {...props} />,
    },

    NewsletterSignup: {
      label: 'Newsletter Signup Card',
      defaultProps: {
        title: 'Stay Connected with Exclusive Offers',
        description: 'Subscribe to receive product drops, seasonal catalog discounts, and local branch updates.',
        buttonText: 'Subscribe',
        privacyText: 'We respect your privacy. Unsubscribe anytime.',
      },
      fields: {
        title: { type: 'text', label: 'Title' },
        description: { type: 'textarea', label: 'Description' },
        buttonText: { type: 'text', label: 'Button Label' },
      },
      render: (props) => <NewsletterSignup {...props} />,
    },

    BrandHero: {
      label: 'Classic Brand Hero',
      defaultProps: { headline: '', subheading: '', primaryCtaText: 'Explore Locations', primaryCtaUrl: '/locations' },
      fields: {
        headline: { type: 'text', label: 'Headline' },
        subheading: { type: 'textarea', label: 'Subheading' },
        primaryCtaText: { type: 'text', label: 'Button Label' },
        primaryCtaUrl: { type: 'text', label: 'Button Target' },
      },
      render: (props) => <BrandHero {...props} />,
    },

    // ── STORE ────────────────────────────────────────────────────────────
    StoreHero: {
      label: 'Store Hero Banner',
      defaultProps: { badgeText: 'Verified Official Storefront', headline: '', subheading: '', primaryCtaText: 'Get Directions', secondaryCtaText: 'Call Store' },
      fields: {
        badgeText: { type: 'text', label: 'Badge Label' },
        headline: { type: 'text', label: 'Headline' },
        subheading: { type: 'textarea', label: 'Subheading' },
        primaryCtaText: { type: 'text', label: 'Directions Button Text' },
        secondaryCtaText: { type: 'text', label: 'Call Button Text' },
      },
      render: (props) => <StoreHero {...props} />,
    },

    StoreInfo: {
      label: 'Store Details & Address',
      defaultProps: { headline: 'Store Details', subheading: 'Visit us in person or get in touch directly.', showHours: true, showAddress: true },
      fields: {
        headline: { type: 'text', label: 'Title' },
        subheading: { type: 'text', label: 'Subtitle' },
        showAddress: { type: 'radio', options: [{ label: 'Show', value: true }, { label: 'Hide', value: false }] },
        showHours: { type: 'radio', options: [{ label: 'Show', value: true }, { label: 'Hide', value: false }] },
      },
      render: (props) => <StoreInfo {...props} />,
    },

    OpeningHours: {
      label: 'Opening Hours',
      defaultProps: { headline: 'Business Hours', showTodayHighlight: true },
      fields: {
        headline: { type: 'text', label: 'Title' },
        showTodayHighlight: { type: 'radio', options: [{ label: 'Highlight Today', value: true }, { label: 'No Highlight', value: false }] },
      },
      render: (props) => <OpeningHours {...props} />,
    },

    StoreMap: {
      label: 'Store Location Map',
      defaultProps: { headline: 'Find Us on the Map', zoomLevel: 15 },
      fields: {
        headline: { type: 'text', label: 'Heading' },
        zoomLevel: { type: 'number', label: 'Zoom Level (1-20)' },
      },
      render: (props) => <StoreMap {...props} />,
    },

    NearbyStores: {
      label: 'Nearby Locations',
      defaultProps: { headline: 'Other Nearby Locations', limit: 3 },
      fields: {
        headline: { type: 'text', label: 'Title' },
        limit: { type: 'number', label: 'Max Locations' },
      },
      render: (props) => <NearbyStores {...props} />,
    },

    StoreLocator: {
      label: 'Store Locator & Search',
      defaultProps: { headline: 'Find a Nearby Store Location', subheading: 'Search our verified storefront branches across your city.', searchPlaceholder: 'Enter city or neighborhood...' },
      fields: {
        headline: { type: 'text', label: 'Heading' },
        subheading: { type: 'text', label: 'Subheading' },
        searchPlaceholder: { type: 'text', label: 'Search Input Placeholder' },
      },
      render: (props) => <StoreLocator {...props} />,
    },

    LocationCard: {
      label: 'Location Card (Single Branch)',
      defaultProps: { storeName: '', address: '', phone: '', showHours: true },
      fields: {
        storeName: { type: 'text', label: 'Store Name (Leave blank for default)' },
        address: { type: 'text', label: 'Address' },
        phone: { type: 'text', label: 'Phone Number' },
        showHours: { type: 'radio', options: [{ label: 'Show Hours', value: true }, { label: 'Hide', value: false }] },
      },
      render: (props) => <LocationCard {...props} />,
    },

    // ── PRODUCTS ──────────────────────────────────────────────────────────
    ProductGrid: {
      label: 'Product Catalog Grid',
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
        headline: { type: 'text', label: 'Heading' },
        subheading: { type: 'text', label: 'Subheading' },
        limit: { type: 'number', label: 'Max Items to Display' },
        columns: {
          type: 'select',
          label: 'Columns',
          options: [
            { label: '2 Columns', value: 2 },
            { label: '3 Columns', value: 3 },
            { label: '4 Columns', value: 4 },
          ],
        },
        showPrice: { type: 'radio', options: [{ label: 'Show Price', value: true }, { label: 'Hide', value: false }] },
        showAvailability: { type: 'radio', options: [{ label: 'Show Badge', value: true }, { label: 'Hide', value: false }] },
      },
      render: (props) => <ProductGrid {...props} />,
    },

    ProductCard: {
      label: 'Product Card (Single)',
      defaultProps: { title: '', price: '', badge: 'FEATURED', imageUrl: '', ctaText: 'Order Now' },
      fields: {
        title: { type: 'text', label: 'Product Title' },
        price: { type: 'text', label: 'Price Display' },
        badge: { type: 'text', label: 'Corner Badge' },
        imageUrl: { type: 'text', label: 'Image URL' },
        ctaText: { type: 'text', label: 'Button Text' },
      },
      render: (props) => <ProductCard {...props} />,
    },

    FeaturedProduct: {
      label: 'Featured Product Hero',
      defaultProps: { badge: 'EDITOR’S CHOICE', headline: '', description: '', price: '', ctaText: 'Buy From Store', imageUrl: '' },
      fields: {
        badge: { type: 'text', label: 'Top Badge' },
        headline: { type: 'text', label: 'Product Headline' },
        description: { type: 'textarea', label: 'Description' },
        price: { type: 'text', label: 'Price' },
        ctaText: { type: 'text', label: 'Button Text' },
        imageUrl: { type: 'text', label: 'Product Image URL' },
      },
      render: (props) => <FeaturedProduct {...props} />,
    },

    CategoryGrid: {
      label: 'Category Grid',
      defaultProps: { headline: 'Shop by Category', limit: 6 },
      fields: {
        headline: { type: 'text', label: 'Heading' },
        limit: { type: 'number', label: 'Max Categories' },
      },
      render: (props) => <CategoryGrid {...props} />,
    },

    ProductCarousel: {
      label: 'Product Carousel (Scrollable)',
      defaultProps: { headline: 'Trending Offerings' },
      fields: {
        headline: { type: 'text', label: 'Heading' },
      },
      render: (props) => <ProductCarousel {...props} />,
    },

    ProductSearch: {
      label: 'Product Search Bar',
      defaultProps: { placeholder: 'Search our authentic catalog...' },
      fields: {
        placeholder: { type: 'text', label: 'Placeholder' },
      },
      render: (props) => <ProductSearch {...props} />,
    },

    ProductDetails: {
      label: 'Product Details Card',
      defaultProps: { showSku: true },
      fields: {
        showSku: { type: 'radio', options: [{ label: 'Show SKU', value: true }, { label: 'Hide', value: false }] },
      },
      render: (props) => <ProductDetails {...props} />,
    },

    // ── CONTENT ───────────────────────────────────────────────────────────
    RichText: {
      label: 'Text & Content Block',
      defaultProps: { content: '<p>Welcome to our storefront. Explore our latest announcements, local highlights, and authentic catalog selections.</p>', alignment: 'left' },
      fields: {
        content: { type: 'textarea', label: 'HTML / Text Content' },
        alignment: {
          type: 'select',
          label: 'Alignment',
          options: [
            { label: 'Left', value: 'left' },
            { label: 'Center', value: 'center' },
            { label: 'Right', value: 'right' },
          ],
        },
      },
      render: (props) => <RichText {...props} />,
    },

    Heading: {
      label: 'Heading Typography',
      defaultProps: { text: 'Captivating Headline Text', level: 'h2', alignment: 'left', gradientText: false },
      fields: {
        text: { type: 'text', label: 'Heading Text' },
        level: {
          type: 'select',
          label: 'Heading Level',
          options: [
            { label: 'H1 (Main Hero Title)', value: 'h1' },
            { label: 'H2 (Section Header)', value: 'h2' },
            { label: 'H3 (Subheading)', value: 'h3' },
            { label: 'H4 (Small Header)', value: 'h4' },
          ],
        },
        alignment: {
          type: 'select',
          label: 'Alignment',
          options: [
            { label: 'Left', value: 'left' },
            { label: 'Center', value: 'center' },
            { label: 'Right', value: 'right' },
          ],
        },
        gradientText: {
          type: 'radio',
          label: 'Gradient Accent',
          options: [
            { label: 'Color Gradient', value: true },
            { label: 'Solid Color', value: false },
          ],
        },
      },
      render: (props) => <Heading {...props} />,
    },

    Paragraph: {
      label: 'Paragraph Content',
      defaultProps: { text: 'This is a clean, readable content paragraph providing essential details and engaging narrative for your visitors.', size: 'normal', alignment: 'left' },
      fields: {
        text: { type: 'textarea', label: 'Paragraph Text' },
        size: {
          type: 'select',
          label: 'Text Size',
          options: [
            { label: 'Small (12px)', value: 'small' },
            { label: 'Normal (14px)', value: 'normal' },
            { label: 'Lead Paragraph (16px)', value: 'lead' },
          ],
        },
        alignment: {
          type: 'select',
          label: 'Alignment',
          options: [
            { label: 'Left', value: 'left' },
            { label: 'Center', value: 'center' },
            { label: 'Right', value: 'right' },
          ],
        },
      },
      render: (props) => <Paragraph {...props} />,
    },

    ImageBlock: {
      label: 'Image Showcase',
      defaultProps: { imageUrl: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1200&q=80', altText: 'Storefront presentation image', aspectRatio: '16:9' },
      fields: {
        imageUrl: { type: 'text', label: 'Image URL' },
        altText: { type: 'text', label: 'Alt Description' },
        caption: { type: 'text', label: 'Caption' },
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

    ImageGallery: {
      label: 'Image Gallery (Grid)',
      defaultProps: {
        image1: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=800&q=80',
        image2: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80',
        image3: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
        columns: 3,
      },
      fields: {
        image1: { type: 'text', label: 'Image 1 URL' },
        image2: { type: 'text', label: 'Image 2 URL' },
        image3: { type: 'text', label: 'Image 3 URL' },
        columns: {
          type: 'select',
          label: 'Grid Columns',
          options: [
            { label: '2 Columns', value: 2 },
            { label: '3 Columns', value: 3 },
          ],
        },
      },
      render: (props) => <ImageGallery {...props} />,
    },

    VideoEmbed: {
      label: 'Video Embed (YouTube/Vimeo)',
      defaultProps: { videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', title: 'Featured Video' },
      fields: {
        videoUrl: { type: 'text', label: 'Video URL (YouTube or Vimeo embed)' },
        title: { type: 'text', label: 'Video Title' },
      },
      render: (props) => <VideoEmbed {...props} />,
    },

    IconGrid: {
      label: 'Icon Feature Grid',
      defaultProps: {
        item1Title: 'Fast Fulfillment',
        item1Desc: 'Dispatched rapidly from verified neighborhood branches.',
        item2Title: '100% Genuine',
        item2Desc: 'Certified authenticity directly from official producers.',
        item3Title: 'Expert Consultation',
        item3Desc: 'Speak with our knowledgeable store staff anytime.',
      },
      fields: {
        item1Title: { type: 'text', label: 'Feature 1 Title' },
        item1Desc: { type: 'text', label: 'Feature 1 Description' },
        item2Title: { type: 'text', label: 'Feature 2 Title' },
        item2Desc: { type: 'text', label: 'Feature 2 Description' },
        item3Title: { type: 'text', label: 'Feature 3 Title' },
        item3Desc: { type: 'text', label: 'Feature 3 Description' },
      },
      render: (props) => <IconGrid {...props} />,
    },

    FAQAccordion: {
      label: 'FAQ Accordion',
      defaultProps: {
        headline: 'Frequently Asked Questions',
        q1: 'What are your standard store operating hours?',
        a1: 'Most of our branches operate Monday through Saturday from 10:00 AM to 9:30 PM, with Sunday timings from 11:00 AM to 8:00 PM.',
        q2: 'Can I place an order for in-store pickup?',
        a2: 'Yes, you can browse our catalog online and message our store directly on WhatsApp to prepare your order for pickup.',
        q3: 'Do you offer authentic quality guarantees?',
        a3: 'All products across our catalog are 100% genuine and verified directly with manufacturer batch records.',
      },
      fields: {
        headline: { type: 'text', label: 'Section Heading' },
        q1: { type: 'text', label: 'Question 1' },
        a1: { type: 'textarea', label: 'Answer 1' },
        q2: { type: 'text', label: 'Question 2' },
        a2: { type: 'textarea', label: 'Answer 2' },
        q3: { type: 'text', label: 'Question 3' },
        a3: { type: 'textarea', label: 'Answer 3' },
      },
      render: (props) => <FAQAccordion {...props} />,
    },

    Tabs: {
      label: 'Content Tabs',
      defaultProps: {
        tab1Label: 'Store Overview',
        tab1Content: 'Welcome to our verified branch. Experience personalized customer service and exclusive in-store collections.',
        tab2Label: 'Pickup & Delivery',
        tab2Content: 'We offer same-day express local delivery or 15-minute quick in-store counter pickups.',
        tab3Label: 'Quality Guarantee',
        tab3Content: 'Every batch is inspected for authenticity, high longevity, and compliant production standards.',
      },
      fields: {
        tab1Label: { type: 'text', label: 'Tab 1 Name' },
        tab1Content: { type: 'textarea', label: 'Tab 1 Content' },
        tab2Label: { type: 'text', label: 'Tab 2 Name' },
        tab2Content: { type: 'textarea', label: 'Tab 2 Content' },
        tab3Label: { type: 'text', label: 'Tab 3 Name' },
        tab3Content: { type: 'textarea', label: 'Tab 3 Content' },
      },
      render: (props) => <Tabs {...props} />,
    },

    // ── TRUST ─────────────────────────────────────────────────────────────
    ReviewSummary: {
      label: 'Google Review Summary',
      defaultProps: { headline: 'Customer Satisfaction', showGoogleBadge: true },
      fields: {
        headline: { type: 'text', label: 'Heading' },
        showGoogleBadge: { type: 'radio', options: [{ label: 'Show', value: true }, { label: 'Hide', value: false }] },
      },
      render: (props) => <ReviewSummary {...props} />,
    },

    ReviewCarousel: {
      label: 'Customer Reviews List',
      defaultProps: { headline: 'What Our Customers Say', limit: 4 },
      fields: {
        headline: { type: 'text', label: 'Heading' },
        limit: { type: 'number', label: 'Max Reviews' },
      },
      render: (props) => <ReviewCarousel {...props} />,
    },

    TrustSignals: {
      label: 'Trust Badges & Signals',
      defaultProps: {
        signal1: '100% Authentic Quality Guaranteed',
        signal2: 'Verified Storefront Operations',
        signal3: 'Personalized In-Store & WhatsApp Assistance',
      },
      fields: {
        signal1: { type: 'text', label: 'Point 1' },
        signal2: { type: 'text', label: 'Point 2' },
        signal3: { type: 'text', label: 'Point 3' },
      },
      render: (props) => <TrustSignals {...props} />,
    },

    StatisticsCounter: {
      label: 'Statistics / Counters',
      defaultProps: {
        stat1Value: '15k+',
        stat1Label: 'Happy Local Customers',
        stat2Value: '100%',
        stat2Label: 'Authentic Proven Quality',
        stat3Value: '4.9/5',
        stat3Label: 'Verified Review Rating',
        stat4Value: '12+',
        stat4Label: 'Physical Storefronts',
      },
      fields: {
        stat1Value: { type: 'text', label: 'Stat 1 Value' },
        stat1Label: { type: 'text', label: 'Stat 1 Label' },
        stat2Value: { type: 'text', label: 'Stat 2 Value' },
        stat2Label: { type: 'text', label: 'Stat 2 Label' },
        stat3Value: { type: 'text', label: 'Stat 3 Value' },
        stat3Label: { type: 'text', label: 'Stat 3 Label' },
        stat4Value: { type: 'text', label: 'Stat 4 Value' },
        stat4Label: { type: 'text', label: 'Stat 4 Label' },
      },
      render: (props) => <StatisticsCounter {...props} />,
    },

    PartnerLogos: {
      label: 'Partner / Client Logos',
      defaultProps: {
        headline: 'Trusted By Leading Brands & Local Enterprises',
        logo1: 'Global Retail Group',
        logo2: 'Verified Merchant Hub',
        logo3: 'Organic Standards Board',
        logo4: 'Metropolitan Chambers',
      },
      fields: {
        headline: { type: 'text', label: 'Heading' },
        logo1: { type: 'text', label: 'Logo 1 Name' },
        logo2: { type: 'text', label: 'Logo 2 Name' },
        logo3: { type: 'text', label: 'Logo 3 Name' },
        logo4: { type: 'text', label: 'Logo 4 Name' },
      },
      render: (props) => <PartnerLogos {...props} />,
    },

    TestimonialQuote: {
      label: 'Testimonial Blockquote',
      defaultProps: {
        quote: 'The quality and direct customer attention from this storefront exceeded all my expectations. Ordering was quick, and product authenticity is top tier.',
        authorName: 'Dr. Rajesh Sundaram',
        authorRole: 'Verified Local Customer',
        authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      },
      fields: {
        quote: { type: 'textarea', label: 'Quote Text' },
        authorName: { type: 'text', label: 'Author Name' },
        authorRole: { type: 'text', label: 'Author Role / Locality' },
        authorAvatar: { type: 'text', label: 'Avatar Image URL' },
      },
      render: (props) => <TestimonialQuote {...props} />,
    },

    // ── SERVICES ─────────────────────────────────────────────────────────
    ServicesGrid: {
      label: 'Services Grid',
      defaultProps: {
        headline: 'Our Core Services & Offerings',
        subheading: 'Crafted for customer satisfaction with dedicated local service and verified standards.',
        columns: 3,
        service1Title: 'Authentic In-Store Consultation',
        service1Desc: 'Visit any of our physical storefronts for hands-on guidance and expert recommendations.',
        service2Title: 'Rapid Same-Day Local Delivery',
        service2Desc: 'Get verified stock dispatched directly from the nearest verified neighborhood branch.',
        service3Title: 'Wholesale & Custom Inquiries',
        service3Desc: 'Special volume arrangements, gifting packages, and customized enterprise solutions.',
      },
      fields: {
        headline: { type: 'text', label: 'Heading' },
        subheading: { type: 'text', label: 'Subheading' },
        service1Title: { type: 'text', label: 'Service 1 Title' },
        service1Desc: { type: 'textarea', label: 'Service 1 Description' },
        service2Title: { type: 'text', label: 'Service 2 Title' },
        service2Desc: { type: 'textarea', label: 'Service 2 Description' },
        service3Title: { type: 'text', label: 'Service 3 Title' },
        service3Desc: { type: 'textarea', label: 'Service 3 Description' },
      },
      render: (props) => <ServicesGrid {...props} />,
    },

    WhyChooseUs: {
      label: 'Why Choose Us',
      defaultProps: {
        headline: 'Why Thousands Choose Our Brand',
        point1Title: '100% Genuine Proven Quality',
        point1Desc: 'We source directly with strict batch controls and verifiable authenticity standards.',
        point2Title: 'Neighborhood Storefront Presence',
        point2Desc: 'Real physical locations you can visit, inspect, and experience in person.',
        point3Title: 'Transparent Pricing & Fast Support',
        point3Desc: 'No hidden markups. Live store staff standing by to support orders over phone and chat.',
      },
      fields: {
        headline: { type: 'text', label: 'Section Title' },
        point1Title: { type: 'text', label: 'Reason 1 Title' },
        point1Desc: { type: 'textarea', label: 'Reason 1 Description' },
        point2Title: { type: 'text', label: 'Reason 2 Title' },
        point2Desc: { type: 'textarea', label: 'Reason 2 Description' },
        point3Title: { type: 'text', label: 'Reason 3 Title' },
        point3Desc: { type: 'textarea', label: 'Reason 3 Description' },
      },
      render: (props) => <WhyChooseUs {...props} />,
    },

    TeamGrid: {
      label: 'Team Members Grid',
      defaultProps: {
        headline: 'Meet Our Leadership & Store Curators',
        subheading: 'Passionate experts dedicated to authentic products and outstanding customer care.',
        member1Name: 'Ahmed Al-Mansoor',
        member1Role: 'Founder & Master Curator',
        member1Image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
        member2Name: 'Fatima Zahra',
        member2Role: 'Head of Store Operations',
        member2Image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
        member3Name: 'Tariq Hussain',
        member3Role: 'Customer Experience Lead',
        member3Image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
      },
      fields: {
        headline: { type: 'text', label: 'Title' },
        subheading: { type: 'text', label: 'Subtitle' },
        member1Name: { type: 'text', label: 'Member 1 Name' },
        member1Role: { type: 'text', label: 'Member 1 Role' },
        member1Image: { type: 'text', label: 'Member 1 Avatar URL' },
        member2Name: { type: 'text', label: 'Member 2 Name' },
        member2Role: { type: 'text', label: 'Member 2 Role' },
        member2Image: { type: 'text', label: 'Member 2 Avatar URL' },
        member3Name: { type: 'text', label: 'Member 3 Name' },
        member3Role: { type: 'text', label: 'Member 3 Role' },
        member3Image: { type: 'text', label: 'Member 3 Avatar URL' },
      },
      render: (props) => <TeamGrid {...props} />,
    },

    PricingCards: {
      label: 'Pricing Cards (Tiers)',
      defaultProps: {
        headline: 'Simple, Transparent Pricing Packages',
        tier1Name: 'Starter Bundle',
        tier1Price: '$29',
        tier1Features: 'Single location delivery,Standard packaging,Email support',
        tier2Name: 'Popular Pack',
        tier2Price: '$59',
        tier2Features: 'Express priority dispatch,Gift wrapping included,WhatsApp VIP support,Free returns',
        tier2Badge: 'BEST VALUE',
        tier3Name: 'Enterprise / Bulk',
        tier3Price: '$149',
        tier3Features: 'Bulk wholesale rates,Dedicated account rep,Custom branding options,Direct invoice billing',
        buttonText: 'Choose Option',
      },
      fields: {
        headline: { type: 'text', label: 'Title' },
        tier1Name: { type: 'text', label: 'Tier 1 Name' },
        tier1Price: { type: 'text', label: 'Tier 1 Price' },
        tier1Features: { type: 'textarea', label: 'Tier 1 Features (Comma separated)' },
        tier2Name: { type: 'text', label: 'Tier 2 Name' },
        tier2Price: { type: 'text', label: 'Tier 2 Price' },
        tier2Features: { type: 'textarea', label: 'Tier 2 Features (Comma separated)' },
        tier3Name: { type: 'text', label: 'Tier 3 Name' },
        tier3Price: { type: 'text', label: 'Tier 3 Price' },
        tier3Features: { type: 'textarea', label: 'Tier 3 Features (Comma separated)' },
      },
      render: (props) => <PricingCards {...props} />,
    },

    ProcessSteps: {
      label: 'Process Steps (1-2-3)',
      defaultProps: {
        headline: 'How It Works in 3 Simple Steps',
        step1Title: '1. Browse Local Catalog',
        step1Desc: 'Select authentic products online or check in-stock availability at your branch.',
        step2Title: '2. Order or Visit Store',
        step2Desc: 'Confirm via WhatsApp chat, online checkout, or visit our physical counters.',
        step3Title: '3. Enjoy Fast Fulfillment',
        step3Desc: 'Take home same-day or have your package delivered to your doorstep.',
      },
      fields: {
        headline: { type: 'text', label: 'Heading' },
        step1Title: { type: 'text', label: 'Step 1 Title' },
        step1Desc: { type: 'text', label: 'Step 1 Description' },
        step2Title: { type: 'text', label: 'Step 2 Title' },
        step2Desc: { type: 'text', label: 'Step 2 Description' },
        step3Title: { type: 'text', label: 'Step 3 Title' },
        step3Desc: { type: 'text', label: 'Step 3 Description' },
      },
      render: (props) => <ProcessSteps {...props} />,
    },

    // ── CONVERSION & FORMS ─────────────────────────────────────────────────
    CallCTA: {
      label: 'Call Store CTA',
      defaultProps: { headline: 'Speak With Our Local Team', subheading: 'Get instant answers about pricing, availability, and services.', buttonText: 'Call Now' },
      fields: {
        headline: { type: 'text', label: 'Heading' },
        subheading: { type: 'text', label: 'Subheading' },
        buttonText: { type: 'text', label: 'Button Label' },
      },
      render: (props) => <CallCTA {...props} />,
    },

    WhatsAppCTA: {
      label: 'WhatsApp Quick Chat CTA',
      defaultProps: { headline: 'Order & Inquire via WhatsApp', subheading: 'Chat with our store representatives directly for fast orders.', buttonText: 'Start WhatsApp Chat' },
      fields: {
        headline: { type: 'text', label: 'Heading' },
        subheading: { type: 'text', label: 'Subheading' },
        buttonText: { type: 'text', label: 'Button Label' },
      },
      render: (props) => <WhatsAppCTA {...props} />,
    },

    DirectionsCTA: {
      label: 'Get Directions CTA',
      defaultProps: { headline: 'Plan Your Visit Today', buttonText: 'Open in Google Maps' },
      fields: {
        headline: { type: 'text', label: 'Heading' },
        buttonText: { type: 'text', label: 'Button Label' },
      },
      render: (props) => <DirectionsCTA {...props} />,
    },

    LeadForm: {
      label: 'Lead Capture Form',
      defaultProps: { title: 'Request a Callback / Inquiry', subtitle: 'Leave your details and our team will get back to you shortly.', buttonText: 'Submit Inquiry', intentType: 'INQUIRY' },
      fields: {
        title: { type: 'text', label: 'Form Title' },
        subtitle: { type: 'text', label: 'Subtitle' },
        buttonText: { type: 'text', label: 'Submit Button Label' },
      },
      render: (props) => <LeadForm {...props} />,
    },

    CallbackRequest: {
      label: 'Callback Request (Quick)',
      defaultProps: { headline: 'Request a 5-Minute Callback', subheading: 'Leave your phone number and our storefront representative will dial you right back.', buttonText: 'Request Call' },
      fields: {
        headline: { type: 'text', label: 'Title' },
        subheading: { type: 'text', label: 'Subtitle' },
        buttonText: { type: 'text', label: 'Button Label' },
      },
      render: (props) => <CallbackRequest {...props} />,
    },

    ContactForm: {
      label: 'Direct Contact Form',
      defaultProps: { title: 'Send Us a Direct Message', subtitle: 'Fill in the form below and our staff will respond within 24 business hours.' },
      fields: {
        title: { type: 'text', label: 'Title' },
        subtitle: { type: 'text', label: 'Subtitle' },
      },
      render: (props) => <ContactForm {...props} />,
    },

    // ── SEO & MARKETING ────────────────────────────────────────────────────
    SEOLandingSection: {
      label: 'Local SEO Landing Section',
      defaultProps: { badge: 'Local SEO Authority', headline: '', content: '', showLocationKeywords: true },
      fields: {
        badge: { type: 'text', label: 'Badge' },
        headline: { type: 'text', label: 'Headline (Leave blank for automated city title)' },
        content: { type: 'textarea', label: 'Content Paragraph' },
        showLocationKeywords: { type: 'radio', options: [{ label: 'Show', value: true }, { label: 'Hide', value: false }] },
      },
      render: (props) => <SEOLandingSection {...props} />,
    },

    BreadcrumbSection: {
      label: 'SEO Breadcrumb Trail',
      defaultProps: { currentPageTitle: '', parentLabel: 'Storefront', parentUrl: '/' },
      fields: {
        currentPageTitle: { type: 'text', label: 'Page Title' },
        parentLabel: { type: 'text', label: 'Parent Page Label' },
        parentUrl: { type: 'text', label: 'Parent Page URL' },
      },
      render: (props) => <BreadcrumbSection {...props} />,
    },

    // ── FOOTER & UTILITY ───────────────────────────────────────────────────
    FloatingWhatsApp: {
      label: 'Floating WhatsApp Widget',
      defaultProps: { phoneNumber: '', message: 'Hello! I am inquiring about your storefront products.', tooltipText: 'Chat with us' },
      fields: {
        phoneNumber: { type: 'text', label: 'WhatsApp Phone Number' },
        message: { type: 'text', label: 'Preset Message' },
        tooltipText: { type: 'text', label: 'Tooltip Text' },
      },
      render: (props) => <FloatingWhatsApp {...props} />,
    },

    BackToTop: {
      label: 'Back to Top Button',
      defaultProps: { label: 'Back to top' },
      fields: {
        label: { type: 'text', label: 'Button Label' },
      },
      render: (props) => <BackToTop {...props} />,
    },

    // ── COMPONENT ALIASES (Guarantees every type has valid defaultProps) ──
    SectionContainer: {
      label: 'Section Container',
      defaultProps: { padding: 'medium', background: 'transparent', maxWidth: 'xl' },
      fields: {
        padding: { type: 'select', label: 'Vertical Padding', options: [{ label: 'None', value: 'none' }, { label: 'Small', value: 'small' }, { label: 'Medium', value: 'medium' }, { label: 'Large', value: 'large' }] },
        background: { type: 'select', label: 'Background', options: [{ label: 'Transparent', value: 'transparent' }, { label: 'White', value: 'white' }, { label: 'Soft Slate', value: 'slate-50' }] },
        maxWidth: { type: 'select', label: 'Max Width', options: [{ label: 'Narrow (3xl)', value: 'sm' }, { label: 'Standard (5xl)', value: 'md' }, { label: 'Wide (7xl)', value: 'xl' }, { label: 'Full Width', value: 'full' }] },
        content: { type: 'slot' },
      },
      render: (props) => <Section {...props} />,
    },

    StandardContainer: {
      label: 'Standard Container',
      defaultProps: { maxWidth: 'xl' },
      fields: {
        maxWidth: { type: 'select', label: 'Container Width', options: [{ label: 'Standard', value: 'md' }, { label: 'Wide', value: 'xl' }, { label: 'Full', value: 'full' }] },
        content: { type: 'slot' },
      },
      render: (props) => <Container {...props} />,
    },

    RowAndColumns: {
      label: 'Row & Columns',
      defaultProps: { layout: '2-equal', gap: 'medium', align: 'top', stackOnMobile: true, background: 'transparent', padding: 'none', borderRadius: 'none' },
      fields: {
        layout: { type: 'select', label: 'Column Distribution', options: [{ label: '2 Columns (50% / 50%)', value: '2-equal' }, { label: '3 Columns (Equal 33% each)', value: '3-equal' }, { label: '4 Columns (Equal 25% each)', value: '4-equal' }] },
        gap: { type: 'select', label: 'Spacing Gap', options: [{ label: 'Small (16px)', value: 'small' }, { label: 'Medium (24px)', value: 'medium' }, { label: 'Large (36px)', value: 'large' }] },
        content: { type: 'slot' },
      },
      render: (props) => <Columns {...props} />,
    },

    ContentCard: {
      label: 'Content Card / Box',
      defaultProps: { background: 'white', border: 'subtle', shadow: 'sm', padding: 'medium', radius: 'medium' },
      fields: {
        background: { type: 'select', label: 'Surface Background', options: [{ label: 'White', value: 'white' }, { label: 'Soft Slate', value: 'slate-50' }, { label: 'Transparent', value: 'transparent' }] },
        border: { type: 'select', label: 'Border Style', options: [{ label: 'None', value: 'none' }, { label: 'Subtle', value: 'subtle' }] },
        shadow: { type: 'select', label: 'Shadow Elevation', options: [{ label: 'None', value: 'none' }, { label: 'Subtle (sm)', value: 'sm' }, { label: 'Medium (md)', value: 'md' }] },
        content: { type: 'slot' },
      },
      render: (props) => <CardBox {...props} />,
    },

    InnerContainer: {
      label: 'Inner Container',
      defaultProps: { maxWidth: 'xl' },
      fields: {
        maxWidth: { type: 'select', label: 'Container Width', options: [{ label: 'Standard', value: 'md' }, { label: 'Wide', value: 'xl' }, { label: 'Full', value: 'full' }] },
        content: { type: 'slot' },
      },
      render: (props) => <Container {...props} />,
    },

    StackLayout: {
      label: 'Stack Layout',
      defaultProps: { direction: 'column', justify: 'start', align: 'stretch', wrap: false, gap: 'medium' },
      fields: {
        direction: { type: 'select', label: 'Direction', options: [{ label: 'Vertical Stack', value: 'column' }, { label: 'Horizontal Row', value: 'row' }] },
        gap: { type: 'select', label: 'Spacing Gap', options: [{ label: 'Small', value: 'small' }, { label: 'Medium', value: 'medium' }, { label: 'Large', value: 'large' }] },
        content: { type: 'slot' },
      },
      render: (props) => <FlexLayout {...props} />,
    },

    FourColumnLayout: {
      label: 'Four-Column Layout',
      defaultProps: { layout: '4-equal', gap: 'medium', align: 'top', stackOnMobile: true },
      fields: {
        gap: { type: 'select', label: 'Spacing Gap', options: [{ label: 'Small', value: 'small' }, { label: 'Medium', value: 'medium' }, { label: 'Large', value: 'large' }] },
        content: { type: 'slot' },
      },
      render: (props) => <Columns {...props} layout="4-equal" />,
    },

    SidebarLayout: {
      label: 'Sidebar Layout',
      defaultProps: { layout: '2-wide-left', gap: 'medium', align: 'top', stackOnMobile: true },
      fields: {
        gap: { type: 'select', label: 'Spacing Gap', options: [{ label: 'Small', value: 'small' }, { label: 'Medium', value: 'medium' }, { label: 'Large', value: 'large' }] },
        content: { type: 'slot' },
      },
      render: (props) => <Columns {...props} layout="2-wide-left" />,
    },

    ResponsiveGrid: {
      label: 'Responsive Grid',
      defaultProps: { columns: 3, gap: 'medium' },
      fields: {
        columns: { type: 'select', label: 'Columns', options: [{ label: '2 Columns', value: 2 }, { label: '3 Columns', value: 3 }, { label: '4 Columns', value: 4 }] },
        content: { type: 'slot' },
      },
      render: (props) => <MultiColumnGrid {...props} />,
    },

    BackgroundSection: {
      label: 'Background Section',
      defaultProps: { backgroundGradient: 'none', backgroundImage: '', overlayOpacity: 40, padding: 'medium' },
      fields: {
        backgroundImage: { type: 'text', label: 'Image URL' },
        content: { type: 'slot' },
      },
      render: (props) => <FullWidthSection {...props} />,
    },

    Logo: {
      label: 'Logo Block',
      defaultProps: { sticky: false, showSearch: false, showPhone: false },
      fields: {},
      render: (props) => <BrandHeader {...props} />,
    },

    Image: {
      label: 'Image',
      defaultProps: { imageUrl: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1200&q=80', altText: 'Storefront presentation image', aspectRatio: '16:9' },
      fields: {
        imageUrl: { type: 'text', label: 'Image URL' },
        altText: { type: 'text', label: 'Alt Description' },
        aspectRatio: { type: 'select', label: 'Aspect Ratio', options: [{ label: 'Wide (16:9)', value: '16:9' }, { label: 'Standard (4:3)', value: '4:3' }, { label: 'Square (1:1)', value: '1:1' }] },
      },
      render: (props) => <ImageBlock {...props} />,
    },

    LocationMap: {
      label: 'Location Map',
      defaultProps: { headline: 'Find Us on the Map', zoomLevel: 15 },
      fields: {
        headline: { type: 'text', label: 'Headline' },
        zoomLevel: { type: 'number', label: 'Zoom Level' },
      },
      render: (props) => <StoreMap {...props} />,
    },

    AddressBlock: {
      label: 'Address Block',
      defaultProps: { headline: 'Store Details', showAddress: true, showHours: true },
      fields: {
        headline: { type: 'text', label: 'Headline' },
      },
      render: (props) => <StoreInfo {...props} />,
    },

    BusinessHours: {
      label: 'Business Hours',
      defaultProps: { headline: 'Business Hours', showTodayHighlight: true },
      fields: {
        headline: { type: 'text', label: 'Headline' },
      },
      render: (props) => <OpeningHours {...props} />,
    },

    ProductDetail: {
      label: 'Product Detail',
      defaultProps: { showSku: true },
      fields: {
        showSku: { type: 'radio', options: [{ label: 'Show', value: true }, { label: 'Hide', value: false }] },
      },
      render: (props) => <ProductDetails {...props} />,
    },

    TrustBadges: {
      label: 'Trust Badges',
      defaultProps: { headline: 'Why Trust Us' },
      fields: {
        headline: { type: 'text', label: 'Headline' },
      },
      render: (props) => <TrustSignals {...props} />,
    },

    LeadCaptureForm: {
      label: 'Lead Capture Form',
      defaultProps: { title: 'Contact Us', subtitle: 'Send a message' },
      fields: {
        title: { type: 'text', label: 'Form Title' },
        subtitle: { type: 'text', label: 'Form Subtitle' },
      },
      render: (props) => <LeadForm {...props} />,
    },
  },
};
