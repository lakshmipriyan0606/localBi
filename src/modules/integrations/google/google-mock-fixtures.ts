export interface MockGbpLocation {
  name: string; // e.g. "locations/293847192837"
  title: string;
  storeCode?: string;
  storefrontAddress: {
    addressLines: string[];
    locality: string; // City
    administrativeArea: string; // State
    postalCode: string;
    regionCode: string; // Country ISO-2
  };
  metadata?: {
    hasVoiceOfMerchant?: boolean; // verified status
  };
}

export interface MockGbpAccount {
  name: string; // e.g. "accounts/108472918374"
  accountName: string;
  type: string;
  locations: MockGbpLocation[];
}

export interface MockGscSite {
  siteUrl: string;
  permissionLevel: 'siteOwner' | 'siteFullUser' | 'siteRestrictedUser';
}

export interface MockGscDailyRow {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  keys?: string[];
}

export const MOCK_FIXTURES = {
  // Client A: ABC Dental
  abcDental: {
    tenantSlug: 'abc-dental',
    gbpAccounts: [
      {
        name: 'accounts/108472918374',
        accountName: 'ABC Dental Group Healthcare',
        type: 'BUSINESS_ACCOUNT',
        locations: [
          {
            name: 'locations/293847192837',
            title: 'ABC Dental - Chennai Anna Nagar',
            storeCode: 'CHN-AN-01',
            storefrontAddress: {
              addressLines: ['12 2nd Avenue, Anna Nagar'],
              locality: 'Chennai',
              administrativeArea: 'Tamil Nadu',
              postalCode: '600040',
              regionCode: 'IN',
            },
            metadata: { hasVoiceOfMerchant: true },
          },
          {
            name: 'locations/482910394821',
            title: 'ABC Dental - Salem Fairlands',
            storeCode: 'SLM-FL-01',
            storefrontAddress: {
              addressLines: ['45 Brindavan Road, Fairlands'],
              locality: 'Salem',
              administrativeArea: 'Tamil Nadu',
              postalCode: '636016',
              regionCode: 'IN',
            },
            metadata: { hasVoiceOfMerchant: true },
          },
        ],
      },
    ],
    gscSites: [
      { siteUrl: 'sc-domain:abcdental.example', permissionLevel: 'siteOwner' as const },
      { siteUrl: 'https://abcdental.example/', permissionLevel: 'siteOwner' as const },
    ],
  },

  // Client B: XYZ Fitness
  xyzFitness: {
    tenantSlug: 'xyz-fitness',
    gbpAccounts: [
      {
        name: 'accounts/992817263541',
        accountName: 'XYZ Fitness Enterprises',
        type: 'PERSONAL',
        locations: [
          {
            name: 'locations/883920194821',
            title: 'XYZ Fitness - Dharmapuri Town Centre',
            storeCode: 'DHM-TC-01',
            storefrontAddress: {
              addressLines: ['78 Netaji Road, Town Centre'],
              locality: 'Dharmapuri',
              administrativeArea: 'Tamil Nadu',
              postalCode: '636701',
              regionCode: 'IN',
            },
            metadata: { hasVoiceOfMerchant: false }, // Needs verification
          },
        ],
      },
    ],
    gscSites: [
      { siteUrl: 'sc-domain:xyzfitness.example', permissionLevel: 'siteOwner' as const },
    ],
  },
};
