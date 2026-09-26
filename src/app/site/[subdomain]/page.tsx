import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Star,
  MapPin,
  Clock,
  Sparkles,
  ArrowRight,
  MessageCircle,
  Phone,
  ShieldCheck,
  Flame,
  Award,
} from 'lucide-react';
import { MicrositeService } from '@/modules/microsites/microsite-service';
import { Render } from '@measured/puck';
import { puckConfig } from '@/modules/microsites/puck-config';
import { PuckService } from '@/modules/microsites/puck-service';

export default async function MicrositeHomePage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const [site, puckData] = await Promise.all([
    MicrositeService.getMicrositeBySubdomain(subdomain),
    PuckService.getPuckData(subdomain),
  ]);

  if (!site) {
    notFound();
  }

  // If the brand admin published a custom UI using the visual builder
  if (puckData && puckData.content && puckData.content.length > 0) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <Render config={puckConfig} data={puckData} />
      </div>
    );
  }

  const popularItems = site.menuItems.slice(0, 3);

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      {/* Hero Section */}
      <section className="relative rounded-3xl bg-white border border-slate-200 p-8 sm:p-12 shadow-sm text-slate-900 space-y-6">
        <div className="max-w-2xl space-y-5">
          {/* Trust Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
            <span>{site.googleRating} Star Rating · {site.reviewCount.toLocaleString()}+ Google Reviews</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
            {site.brandName}
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
            {site.tagline}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href={`/site/${subdomain}/menu`}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors"
            >
              <span>Explore Menu & Catalog</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href={`https://wa.me/${site.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${site.brandName}, I would like to place an order.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Order via WhatsApp</span>
            </a>

            <a
              href={`tel:${site.phone}`}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm transition-colors"
            >
              <Phone className="w-4 h-4 text-indigo-600" />
              <span>Call Store</span>
            </a>
          </div>

          {/* Location & Time bar */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-600" />
              <span>{site.address}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{site.hours}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Quality Pillars */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Cooked Fresh Hourly</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Zero reheated food. Prepared fresh upon every batch order.
            </p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Pure & Authentic</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Pure ghee, stone-ground batter, and certified hygiene protocols.
            </p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Top Rated on Google</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Consistently rated 4.9★ by thousands of verified local food lovers.
            </p>
          </div>
        </div>
      </section>

      {/* Popular Menu Items */}
      {popularItems.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Today's Chef Specials</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                Popular Dishes You'll Love
              </h2>
            </div>

            <Link
              href={`/site/${subdomain}/menu`}
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              <span>View All ({site.menuItems.length} Items)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {popularItems.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-white border border-slate-200 p-5 flex flex-col justify-between hover:border-slate-300 transition-all hover:-translate-y-0.5 shadow-xs group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">
                        {item.category}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {item.name}
                      </h3>
                    </div>
                    <span className="text-sm font-extrabold text-emerald-700 font-mono bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                      ₹{item.price}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Pure Vegetarian
                  </span>

                  <a
                    href={`https://wa.me/${site.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${site.brandName}, I would like to order: ${item.name} (₹${item.price})`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Order
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Story & Visit Section */}
      <section className="rounded-3xl bg-white border border-slate-200 p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center shadow-xs">
        <div className="space-y-4">
          <span className="text-xs text-indigo-600 uppercase tracking-wider font-semibold">
            Our Story & Heritage
          </span>
          <h2 className="text-2xl font-bold text-slate-900 leading-snug">
            Tradition You Can Taste in Every Serving
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {site.aboutStory}
          </p>
          <div className="pt-2">
            <Link
              href={`/site/${subdomain}/about`}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-indigo-600 hover:underline"
            >
              Read Full Brand Story
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Visit Our Store in {site.city}
          </h3>
          <p className="text-xs text-slate-600">
            {site.address}
          </p>
          <div className="p-3 bg-white rounded-xl text-xs space-y-1 text-slate-700 border border-slate-200">
            <div className="font-semibold text-indigo-600">Daily Service Hours:</div>
            <div>{site.hours}</div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <a
              href={site.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 px-4 text-center rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors"
            >
              Get Directions
            </a>
            <Link
              href={`/site/${subdomain}/contact`}
              className="py-2.5 px-4 text-center rounded-xl border border-slate-200 hover:bg-white text-slate-700 font-semibold text-xs transition-colors"
            >
              Contact Details
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
