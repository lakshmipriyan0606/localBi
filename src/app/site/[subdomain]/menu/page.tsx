'use client';

import { useState, useEffect, use } from 'react';
import { notFound } from 'next/navigation';
import {
  UtensilsCrossed,
  MessageCircle,
  Sparkles,
  Search,
} from 'lucide-react';
import type { MenuItem } from '@/modules/microsites/microsite-service';

export default function MicrositeMenuPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const resolvedParams = use(params);
  const subdomain = resolvedParams.subdomain;

  const [loading, setLoading] = useState(true);
  const [siteData, setSiteData] = useState<{
    brandName: string;
    whatsapp: string;
    menuItems: MenuItem[];
  } | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/microsites/${subdomain}`);
        if (res.ok) {
          const data = await res.json();
          setSiteData(data.microsite);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [subdomain]);

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs">Loading fresh specialties...</p>
      </div>
    );
  }

  if (!siteData) {
    notFound();
  }

  const categories = [
    'All',
    ...Array.from(new Set(siteData.menuItems.map((item) => item.category))),
  ];

  const filteredItems = siteData.menuItems.filter((item) => {
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="space-y-2 border-b border-slate-200 pb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
          <UtensilsCrossed className="w-3.5 h-3.5 text-amber-600" />
          Fresh Daily Menu & Catalog
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Our Handcrafted Specials & Menu
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          All dishes prepared fresh with authentic ingredients upon order. Tap "Order via WhatsApp" to send your selection directly to our kitchen counter.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Categories Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search dosas, coffee, thali..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 shadow-2xs"
          />
        </div>
      </div>

      {/* Menu Item Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredItems.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-500 text-xs">
            No menu items found for this selection.
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl bg-white border border-slate-200 p-5 flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition-all shadow-xs"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                        {item.category}
                      </span>
                      {item.isPopular && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                          Bestseller
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {item.name}
                    </h3>
                  </div>

                  <span className="text-sm font-extrabold text-emerald-700 font-mono bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 shrink-0">
                    ₹{item.price}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
                  Pure Veg Delight
                </span>

                <a
                  href={`https://wa.me/${siteData.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${siteData.brandName}, I would like to order: ${item.name} (₹${item.price})`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Order on WhatsApp
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
