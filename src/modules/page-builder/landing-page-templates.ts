/**
 * Landing Page Starter Templates for Site Studio Visual Builder
 * Provides 1-click, production-ready landing page layouts with realistic copy and styling.
 */

export interface StarterTemplate {
  id: string;
  title: string;
  badge: string;
  tagline: string;
  category: 'store' | 'services' | 'dining' | 'minimal';
  sectionsList: string[];
  accentColor: string;
  iconName: string;
  generateBlocks: (brandName?: string, phone?: string) => any[];
}

export const LANDING_PAGE_STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'storefront-retail',
    title: 'Complete Storefront & Retail',
    badge: 'Most Popular',
    tagline: 'Ideal for local shops, grocery, retail stores, and product boutiques.',
    category: 'store',
    sectionsList: [
      'Promo Announcement Bar',
      'Brand Header Navigation',
      'High-Impact Hero Banner',
      'Why Choose Us (4 Key Benefits)',
      'Featured Product Catalog Grid',
      'Store Branch Details & Directions',
      'Interactive Location Map',
      'Weekly Operating Hours Schedule',
      'Customer Reviews & Testimonials',
      'Comprehensive Multi-Column Footer',
      'Floating WhatsApp Quick Chat',
    ],
    accentColor: 'from-blue-600 to-indigo-600',
    iconName: 'ShoppingBag',
    generateBlocks: (brandName = 'Local Storefront', phone = '+1 (555) 234-5678') => [
      {
        type: 'AnnouncementBar',
        props: {
          id: 'announcement-bar-1',
          badge: 'SPECIAL OFFER',
          message: '🎉 Grand Opening: Enjoy 15% off orders this week with code WELCOME15!',
          linkText: 'Shop Catalog',
          linkUrl: '#catalog',
          bgColor: 'indigo',
        },
      },
      {
        type: 'BrandHeader',
        props: {
          id: 'brand-header-1',
          showCta: true,
          ctaLabel: 'Call Store',
          link1Label: 'Products',
          link1Url: '#catalog',
          link2Label: 'Location & Hours',
          link2Url: '#location',
        },
      },
      {
        type: 'HeroBanner',
        props: {
          id: 'hero-banner-1',
          badgeText: '★ Top Rated Local Storefront',
          headline: `Everything You Love from ${brandName}, Delivered Fresh Daily`,
          subheading: 'Discover artisanal handcrafted selections, everyday essentials, and genuine neighborhood care with fast same-day delivery.',
          primaryCtaText: 'Explore Catalog',
          primaryCtaUrl: '#catalog',
          secondaryCtaText: 'Store Hours & Map',
          secondaryCtaUrl: '#location',
          showStatChips: true,
          statChip1: '⚡ Fast Local Delivery',
          statChip2: '⭐ 4.9 Verified Rating',
          overlayGradient: 'indigo',
        },
      },
      {
        type: 'WhyChooseUs',
        props: {
          id: 'why-choose-us-1',
          headline: 'Why Our Neighborhood Loves Us',
          subheading: 'Committed to premium quality, honest pricing, and genuine local service every single day.',
          buttonText: 'Learn More About Us',
        },
      },
      {
        type: 'ProductGrid',
        props: {
          id: 'product-grid-1',
          title: 'Featured Products & Catalog',
          badge: 'BESTSELLER',
          ctaText: 'Order Now',
        },
      },
      {
        type: 'StoreLocator',
        props: {
          id: 'store-locator-1',
          headline: 'Visit Our Neighborhood Store',
          subheading: 'Conveniently located with dedicated customer parking and easy curbside pickup.',
          searchPlaceholder: 'Enter city or neighborhood...',
        },
      },
      {
        type: 'OpeningHours',
        props: {
          id: 'opening-hours-1',
          headline: 'Store Operating Hours',
          showTodayHighlight: true,
        },
      },
      {
        type: 'StoreMap',
        props: {
          id: 'store-map-1',
          headline: 'Interactive Location Map & Directions',
          zoomLevel: 15,
        },
      },
      {
        type: 'ReviewCarousel',
        props: {
          id: 'reviews-carousel-1',
          maxWidth: 'xl',
        },
      },
      {
        type: 'MultiColumnFooter',
        props: {
          id: 'footer-1',
          aboutText: `Welcome to ${brandName}. Your trusted neighborhood destination for premium artisan goods, everyday essentials, and genuine local care.`,
          showStoreAddress: true,
          column2Title: 'Quick Links',
          column3Title: 'Store & Contact',
          copyrightText: `© ${new Date().getFullYear()} ${brandName}. All rights reserved.`,
        },
      },
      {
        type: 'FloatingWhatsApp',
        props: {
          id: 'whatsapp-1',
          phoneNumber: phone,
          message: `Hello ${brandName}! I would like to inquire about your products.`,
          tooltipText: 'Chat with Storefront',
        },
      },
    ],
  },
  {
    id: 'lead-generation-services',
    title: 'High-Converting Services & Leads',
    badge: 'High Conversion',
    tagline: 'Perfect for consultants, agencies, clinics, contractors, and local services.',
    category: 'services',
    sectionsList: [
      'Top Navigation Bar with Action Button',
      'Split Hero with Showcase Photo',
      'Key Performance Metrics & Statistics',
      '3-Column Core Services Grid',
      'Simple 1-2-3-4 Workflow Steps',
      'Featured Client Testimonial & Rating',
      'High-Conversion Lead Capture Form',
      'Multi-Column Footer with Social Links',
    ],
    accentColor: 'from-emerald-600 to-teal-600',
    iconName: 'Send',
    generateBlocks: (brandName = 'Professional Services', phone = '+1 (555) 234-5678') => [
      {
        type: 'BrandHeader',
        props: {
          id: 'brand-header-1',
          showCta: true,
          ctaLabel: 'Request Quote',
          link1Label: 'Our Services',
          link1Url: '#services',
          link2Label: 'Client Reviews',
          link2Url: '#reviews',
        },
      },
      {
        type: 'HeroWithImage',
        props: {
          id: 'hero-with-image-1',
          badgeText: '⚡ Trusted Professional Services',
          headline: `Expert Solutions Tailored to Your Growth with ${brandName}`,
          subheading: 'We help clients scale faster with dedicated support, transparent pricing, and measurable results from day one.',
          primaryCtaText: 'Request a Free Quote',
          primaryCtaUrl: '#contact-form',
          secondaryCtaText: 'Call Our Team',
          secondaryCtaUrl: `tel:${phone}`,
          imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
          imageAlt: 'Team collaborating on client solutions',
        },
      },
      {
        type: 'StatisticsCounter',
        props: {
          id: 'statistics-1',
          headline: 'Proven Track Record of Excellence',
          subtitle: 'Numbers that represent our commitment to customer satisfaction and consistent execution.',
        },
      },
      {
        type: 'ServicesGrid',
        props: {
          id: 'services-grid-1',
          headline: 'Our Core Capabilities & Offerings',
          subheading: 'Tailored services structured to solve your most critical challenges efficiently.',
          buttonText: 'Get Started with This Service',
        },
      },
      {
        type: 'ProcessSteps',
        props: {
          id: 'process-steps-1',
          headline: 'How We Work Together in 4 Steps',
          subtitle: 'A straightforward, hassle-free process from initial discovery to successful completion.',
        },
      },
      {
        type: 'TestimonialQuote',
        props: {
          id: 'testimonial-quote-1',
          quote: 'Working with this team was seamless from start to finish. Their professionalism, clear communication, and rapid execution made all the difference.',
          authorName: 'Alex Morgan',
          authorRole: 'Managing Director, Apex Enterprises',
          rating: 5,
        },
      },
      {
        type: 'LeadForm',
        props: {
          id: 'lead-form-1',
          title: 'Request a Free Consultation / Quote',
          subtitle: 'Leave your details below and our team will get in touch within 2 business hours.',
          buttonText: 'Send Free Request',
          intentType: 'INQUIRY',
        },
      },
      {
        type: 'MultiColumnFooter',
        props: {
          id: 'footer-1',
          aboutText: `${brandName} provides trusted professional services with uncompromising quality and client-first dedication.`,
          showStoreAddress: false,
          column2Title: 'Services',
          column3Title: 'Inquiries',
          copyrightText: `© ${new Date().getFullYear()} ${brandName}. All rights reserved.`,
        },
      },
    ],
  },
  {
    id: 'restaurant-cafe-dining',
    title: 'Restaurant, Cafe & Gourmet Dining',
    badge: 'Hospitality',
    tagline: 'Designed for dining spots, coffee bars, bakeries, and cloud kitchens.',
    category: 'dining',
    sectionsList: [
      'Daily Specials Announcement Bar',
      'Brand Header Navigation',
      'Centered Culinary Hero with Badges',
      'Dining Experience Value Propositions',
      'Curated Menu Catalog & Bestsellers',
      'Kitchen Operating Hours Schedule',
      'Interactive Map & Reservation Details',
      'Guest Testimonials & 5-Star Reviews',
      'Restaurant Footer with Contact Info',
    ],
    accentColor: 'from-amber-600 to-orange-600',
    iconName: 'Coffee',
    generateBlocks: (brandName = 'Artisan Kitchen & Cafe', phone = '+1 (555) 234-5678') => [
      {
        type: 'AnnouncementBar',
        props: {
          id: 'announcement-bar-1',
          badge: 'CHEF SPECIAL',
          message: '🍽️ Fresh seasonal menu launched today • Table reservations open for this weekend!',
          linkText: 'Reserve Table',
          linkUrl: '#reserve',
          bgColor: 'amber',
        },
      },
      {
        type: 'BrandHeader',
        props: {
          id: 'brand-header-1',
          showCta: true,
          ctaLabel: 'Reserve Table',
          link1Label: 'Menu',
          link1Url: '#menu',
          link2Label: 'Location & Hours',
          link2Url: '#location',
        },
      },
      {
        type: 'CenteredHero',
        props: {
          id: 'centered-hero-1',
          badgeText: 'Artisan Culinary Experience',
          headline: `Authentic Handcrafted Flavors at ${brandName}`,
          subheading: 'Crafted with farm-fresh local ingredients, traditional heritage recipes, and genuine passion for extraordinary dining.',
          primaryCtaText: 'View Our Menu',
          primaryCtaUrl: '#menu',
          secondaryCtaText: 'Table Reservation',
          secondaryCtaUrl: '#reserve',
        },
      },
      {
        type: 'IconGrid',
        props: {
          id: 'icon-grid-1',
          headline: 'What Makes Dining with Us Unique',
          subtitle: 'From farm-fresh sourcing to warm neighborhood hospitality.',
        },
      },
      {
        type: 'ProductGrid',
        props: {
          id: 'product-grid-1',
          title: 'Signature Dishes & Seasonal Favorites',
          badge: 'SIGNATURE',
          ctaText: 'Order for Takeout',
        },
      },
      {
        type: 'OpeningHours',
        props: {
          id: 'opening-hours-1',
          headline: 'Kitchen & Dining Hours',
          showTodayHighlight: true,
        },
      },
      {
        type: 'StoreMap',
        props: {
          id: 'store-map-1',
          headline: 'Location, Parking & Directions',
          zoomLevel: 15,
        },
      },
      {
        type: 'ReviewCarousel',
        props: {
          id: 'reviews-carousel-1',
          maxWidth: 'xl',
        },
      },
      {
        type: 'MultiColumnFooter',
        props: {
          id: 'footer-1',
          aboutText: `${brandName} — Celebrating culinary heritage and warm neighborhood dining with fresh artisan cuisine.`,
          showStoreAddress: true,
          column2Title: 'Menu & Dining',
          column3Title: 'Reservations',
          copyrightText: `© ${new Date().getFullYear()} ${brandName}. All rights reserved.`,
        },
      },
    ],
  },
  {
    id: 'minimalist-quick-launch',
    title: 'Minimalist 1-Page Quick Launch',
    badge: 'Fast Setup',
    tagline: 'Clean, elegant, lightweight landing page ready in seconds.',
    category: 'minimal',
    sectionsList: [
      'Top Brand Navbar',
      'Focused Hero Banner with Direct CTAs',
      'Value Propositions & Features',
      'Frequently Asked Questions Accordion',
      'Direct Message Contact Form',
      'Site Footer',
    ],
    accentColor: 'from-violet-600 to-purple-600',
    iconName: 'Sparkles',
    generateBlocks: (brandName = 'Local Brand', phone = '+1 (555) 234-5678') => [
      {
        type: 'BrandHeader',
        props: {
          id: 'brand-header-1',
          showCta: true,
          ctaLabel: 'Contact Us',
          link1Label: 'About',
          link1Url: '#about',
          link2Label: 'FAQ',
          link2Url: '#faq',
        },
      },
      {
        type: 'HeroBanner',
        props: {
          id: 'hero-banner-1',
          badgeText: '★ Welcome to Our Brand',
          headline: `Welcome to ${brandName}`,
          subheading: 'Dedicated to providing exceptional quality, friendly local service, and reliable support for every customer.',
          primaryCtaText: 'Contact Our Team',
          primaryCtaUrl: '#contact',
          secondaryCtaText: 'Frequently Asked Questions',
          secondaryCtaUrl: '#faq',
          showStatChips: true,
          statChip1: '⚡ Fast Response',
          statChip2: '⭐ 100% Satisfaction',
          overlayGradient: 'indigo',
        },
      },
      {
        type: 'WhyChooseUs',
        props: {
          id: 'why-choose-us-1',
          headline: 'Our Core Commitments & Values',
          subheading: 'Clear values that shape how we serve our neighborhood every day.',
          buttonText: 'Get in Touch',
        },
      },
      {
        type: 'FAQAccordion',
        props: {
          id: 'faq-accordion-1',
          headline: 'Frequently Asked Questions',
          showGoogleBadge: true,
        },
      },
      {
        type: 'ContactForm',
        props: {
          id: 'contact-form-1',
          title: 'Send Us a Direct Message',
          subtitle: 'Fill in the form below and our staff will respond within 24 business hours.',
        },
      },
      {
        type: 'MultiColumnFooter',
        props: {
          id: 'footer-1',
          aboutText: `${brandName} — Dedicated to quality, transparency, and neighborly care.`,
          showStoreAddress: true,
          column2Title: 'Quick Links',
          column3Title: 'Contact',
          copyrightText: `© ${new Date().getFullYear()} ${brandName}. All rights reserved.`,
        },
      },
    ],
  },
];
