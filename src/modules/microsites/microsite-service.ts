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

import fs from 'node:fs';
import path from 'node:path';

const micrositeStore: Map<string, MicrositeConfig> = new Map();

const isTestEnv = process.env['NODE_ENV'] === 'test' || Boolean(process.env['VITEST']);
const DATA_DIR = path.join(process.cwd(), '.data');
const MICROSITES_FILE = path.join(DATA_DIR, 'microsites.json');

const SEED_MICROSITES: MicrositeConfig[] = [
  {
    tagline: 'Authentic South Indian Specialties & Fresh Delicacies',
    aboutStory: 'Lakshmi Food Flagship brings premium products, trusted expertise, and dedicated customer support to our local community.',
    primaryColor: '#4F46E5',
    phone: '+91 98401 23456',
    whatsapp: '+919840123456',
    address: 'Khan St, Thiruvenkatapuram, Choolaimedu',
    city: 'Chennai',
    hours: '8:00 AM - 10:00 PM',
    googleRating: 4.9,
    reviewCount: 1,
    googleMapsUrl: 'https://maps.google.com/?q=Lakshmi%20Food%20Flagship',
    heroImageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
    menuItems: [
      {
        id: 'item-1',
        name: 'Special Masala Dosa',
        category: 'Tiffin & Breakfast',
        price: 110,
        description: 'Crispy golden crepe with potato masala and fresh coconut chutney',
        isVeg: true,
      },
    ],
    published: true,
    industry: 'FOOD',
    subdomain: 'lakshmi-food',
    tenantSlug: 'lakshmi-food',
    brandName: 'Lakshmi Food Flagship',
  },
  {
    tagline: 'Authentic South Indian Specialties & Fresh Delicacies',
    aboutStory: 'Lakshmi Food Store 001 brings premium products, trusted expertise, and dedicated customer support to our local community.',
    primaryColor: '#4F46E5',
    phone: '+91 98401 23456',
    whatsapp: '+919840123456',
    address: 'Khan St, Thiruvenkatapuram, Choolaimedu',
    city: 'Chennai',
    hours: '8:00 AM - 10:00 PM',
    googleRating: 4.9,
    reviewCount: 1,
    googleMapsUrl: 'https://maps.google.com/?q=Lakshmi%20Food%20Store%20001',
    heroImageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
    menuItems: [
      {
        id: 'item-1',
        name: 'Special Masala Dosa',
        category: 'Tiffin & Breakfast',
        price: 110,
        description: 'Crispy golden crepe with potato masala and fresh coconut chutney',
        isVeg: true,
      },
    ],
    published: true,
    industry: 'FOOD',
    subdomain: 'lakshmi-food-001',
    tenantSlug: 'lakshmi-food',
    brandName: 'Lakshmi Food Store 001',
  },
];

function initMicrositeStore() {
  if (micrositeStore.size === 0) {
    for (const item of SEED_MICROSITES) {
      micrositeStore.set(item.subdomain, item);
    }
  }
  if (isTestEnv) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(MICROSITES_FILE)) {
      const raw = fs.readFileSync(MICROSITES_FILE, 'utf-8');
      if (raw.trim()) {
        const list: MicrositeConfig[] = JSON.parse(raw);
        for (const item of list) {
          micrositeStore.set(item.subdomain, item);
        }
      }
    }
  } catch (err) {
    console.error('Failed to load microsites from disk:', err);
  }
}

function saveMicrositesToDisk() {
  if (isTestEnv) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const list = Array.from(micrositeStore.values());
    fs.writeFileSync(MICROSITES_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save microsites to disk:', err);
  }
}

initMicrositeStore();

export class MicrositeService {
  static async getMicrositeBySubdomain(subdomain: string): Promise<MicrositeConfig | null> {
    initMicrositeStore();
    const site = micrositeStore.get(subdomain);
    if (site) return site;

    // Fallback: if subdomain has a numeric suffix (e.g., lakshmi-food-001), match to base slug
    const baseSlug = subdomain.replace(/-\d+$/, '');
    if (baseSlug !== subdomain) {
      const baseSite = micrositeStore.get(baseSlug);
      if (baseSite) {
        return {
          ...baseSite,
          subdomain,
        };
      }
    }

    return null;
  }

  static async getAllMicrosites(tenantSlug: string): Promise<MicrositeConfig[]> {
    initMicrositeStore();
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
    const fullConfig: MicrositeConfig = {
      tagline: 'Authentic Quality & Dedicated Local Service',
      aboutStory: 'Serving our community with premium quality and dedication.',
      primaryColor: '#4F46E5',
      phone: '',
      whatsapp: '',
      address: '',
      city: 'Chennai',
      hours: '9:00 AM - 9:00 PM',
      googleRating: config.googleRating ?? 0,
      reviewCount: config.reviewCount ?? 0,
      googleMapsUrl: '',
      heroImageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
      menuItems: [],
      published: true,
      industry: 'FOOD',
      ...config,
    };
    micrositeStore.set(config.subdomain, fullConfig);
    saveMicrositesToDisk();
    return fullConfig;
  }

  static async updateMicrosite(
    subdomain: string,
    updates: Partial<MicrositeConfig>
  ): Promise<MicrositeConfig | null> {
    initMicrositeStore();
    const existing = micrositeStore.get(subdomain);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...updates,
    };
    micrositeStore.set(subdomain, updated);
    saveMicrositesToDisk();
    return updated;
  }

  static async deleteMicrosite(subdomain: string): Promise<boolean> {
    initMicrositeStore();
    const res = micrositeStore.delete(subdomain);
    saveMicrositesToDisk();
    return res;
  }
}
