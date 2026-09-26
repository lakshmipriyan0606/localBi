export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  isPopular?: boolean;
  isVeg?: boolean;
  image?: string;
}

export interface MicrositeConfig {
  subdomain: string;
  tenantSlug: string;
  brandName: string;
  tagline: string;
  aboutStory: string;
  primaryColor: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  hours: string;
  googleRating: number;
  reviewCount: number;
  googleMapsUrl: string;
  heroImageUrl: string;
  menuItems: MenuItem[];
  published: boolean;
  customDomain?: string | undefined;
  industry?: 'FOOD' | 'JEWELRY' | 'HOSPITAL' | 'RETAIL' | 'SERVICES' | undefined;
}

const micrositeStore: Map<string, MicrositeConfig> = new Map();

function seedMicrosites() {
  if (micrositeStore.size > 0) return;

  const lakshmiFood: MicrositeConfig = {
    subdomain: 'lakshmi-food',
    tenantSlug: 'lakshmi-food',
    brandName: 'Lakshmi Food & Pure Ghee Delights',
    tagline: 'Authentic Traditional South Indian Flavors Crafted with Heritage & Pure Ingredients',
    aboutStory:
      'Founded with a passion for time-honored traditional cooking, Lakshmi Food brings authentic home-style south Indian recipes to Chennai. From our freshly grounded sambar masalas to pure A2 ghee sweets and piping hot filter coffee, every bite is a celebration of purity and taste.',
    primaryColor: '#F59E0B',
    phone: '+91 98401 23456',
    whatsapp: '+919840123456',
    address: '14, 2nd Avenue, Near Roundtana, Anna Nagar, Chennai - 600040',
    city: 'Chennai',
    hours: '7:00 AM - 10:30 PM (Mon - Sun)',
    googleRating: 4.9,
    reviewCount: 1480,
    googleMapsUrl: 'https://maps.google.com/?q=Anna+Nagar+Chennai',
    heroImageUrl: 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?auto=format&fit=crop&w=1200&q=80',
    published: true,
    customDomain: 'annanagar.lakshmifood.com',
    industry: 'FOOD',
    menuItems: [],
  };

  micrositeStore.set('lakshmi-food', lakshmiFood);
}

seedMicrosites();

export class MicrositeService {
  static async getMicrositeBySubdomain(subdomain: string): Promise<MicrositeConfig | null> {
    seedMicrosites();
    return micrositeStore.get(subdomain) || null;
  }

  static async getAllMicrosites(tenantSlug: string): Promise<MicrositeConfig[]> {
    seedMicrosites();
    return Array.from(micrositeStore.values()).filter(
      (m) => m.tenantSlug === tenantSlug
    );
  }

  static async createMicrosite(
    config: Partial<MicrositeConfig> & {
      subdomain: string;
      tenantSlug: string;
      brandName: string;
    }
  ): Promise<MicrositeConfig> {
    seedMicrosites();
    const fullConfig: MicrositeConfig = {
      tagline: 'Authentic Quality & Dedicated Local Service',
      aboutStory: 'Serving our community with premium quality and dedication.',
      primaryColor: '#4F46E5',
      phone: '',
      whatsapp: '',
      address: '',
      city: 'Chennai',
      hours: '9:00 AM - 9:00 PM',
      googleRating: 4.8,
      reviewCount: 100,
      googleMapsUrl: '',
      heroImageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
      menuItems: [],
      published: true,
      industry: 'FOOD',
      ...config,
    };
    micrositeStore.set(config.subdomain, fullConfig);
    return fullConfig;
  }

  static async updateMicrosite(
    subdomain: string,
    updates: Partial<MicrositeConfig>
  ): Promise<MicrositeConfig | null> {
    seedMicrosites();
    const existing = micrositeStore.get(subdomain);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...updates,
    };
    micrositeStore.set(subdomain, updated);
    return updated;
  }

  static async deleteMicrosite(subdomain: string): Promise<boolean> {
    seedMicrosites();
    return micrositeStore.delete(subdomain);
  }
}
