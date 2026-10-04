'use client';

import { Check, Building2, Briefcase } from 'lucide-react';

type Plan = 'DIRECT_CLIENT' | 'AGENCY';

interface PlanSelectionCardProps {
  value: Plan;
  onChange: (plan: Plan) => void;
}

const PLANS: Array<{
  id: Plan;
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  highlight?: boolean;
  features: string[];
  bestFor: string;
}> = [
  {
    id: 'DIRECT_CLIENT',
    icon: <Building2 className="h-5 w-5" />,
    label: 'Direct Business',
    subtitle: 'For single businesses & brands',
    bestFor: 'Restaurants, clinics, retail chains, and local businesses',
    features: [
      'Up to 3 store locations',
      'Google Business Profile management',
      '1 microsite / storefront',
      'GSC & GA4 analytics',
      'SEO opportunity engine',
      'Content & blog CMS',
      'Rank tracking (50 keywords)',
      'Local listings (5 directories)',
    ],
  },
  {
    id: 'AGENCY',
    icon: <Briefcase className="h-5 w-5" />,
    label: 'Agency',
    subtitle: 'For agencies & consultants',
    badge: 'Most Popular',
    badgeColor: 'bg-indigo-600',
    highlight: true,
    bestFor: 'Digital agencies managing multiple client brands',
    features: [
      'Up to 25 store locations',
      'Multi-client management',
      'Up to 10 microsites / storefronts',
      'White-label portal & branding',
      'Rank tracking (200 keywords)',
      'Local listings (10 directories)',
      'Google Merchant Center integration',
      'Call tracking & telephony',
    ],
  },
];

export function PlanSelectionCard({ value, onChange }: PlanSelectionCardProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {PLANS.map((plan) => {
        const isSelected = value === plan.id;
        return (
          <button
            key={plan.id}
            type="button"
            id={`plan-${plan.id.toLowerCase().replace('_', '-')}`}
            onClick={() => onChange(plan.id)}
            className={`
              relative flex flex-col gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200
              ${isSelected
                ? plan.highlight
                  ? 'border-indigo-500 bg-indigo-50/70 shadow-md shadow-indigo-100'
                  : 'border-indigo-400 bg-indigo-50/40 shadow-sm'
                : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50'
              }
            `}
            aria-pressed={isSelected}
          >
            {/* Badge */}
            {plan.badge && (
              <span
                className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${plan.badgeColor || 'bg-slate-600'}`}
              >
                {plan.badge}
              </span>
            )}

            {/* Header */}
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                  isSelected
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {plan.icon}
              </div>
              <div>
                <p className="text-[15px] font-semibold text-slate-900">{plan.label}</p>
                <p className="text-[12px] text-slate-500">{plan.subtitle}</p>
              </div>
            </div>

            {/* Best for */}
            <p className="text-[12px] text-slate-500 leading-snug">{plan.bestFor}</p>

            {/* Features */}
            <ul className="space-y-1.5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check
                    className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${
                      isSelected ? 'text-indigo-500' : 'text-slate-400'
                    }`}
                  />
                  <span className="text-[12px] text-slate-600 leading-snug">{feature}</span>
                </li>
              ))}
            </ul>

            {/* Selected ring indicator */}
            {isSelected && (
              <div className="absolute right-3 bottom-3">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600">
                  <Check className="h-3 w-3 text-white" />
                </div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
