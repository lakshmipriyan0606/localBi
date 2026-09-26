import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  HeartHandshake,
  ShieldCheck,
  ArrowRight,
  Flame,
  Users,
} from 'lucide-react';
import { MicrositeService } from '@/modules/microsites/microsite-service';

export default async function MicrositeAboutPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const site = await MicrositeService.getMicrositeBySubdomain(subdomain);

  if (!site) {
    notFound();
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-300 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
          <HeartHandshake className="w-3.5 h-3.5 text-amber-600" />
          The Legacy & Passion
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Our Story at {site.brandName}
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Crafting heritage culinary experiences rooted in authenticity, uncompromising quality, and warm Indian hospitality.
        </p>
      </div>

      {/* Main Story Narrative */}
      <div className="p-8 sm:p-10 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-5 text-sm text-slate-600 leading-relaxed">
        <p className="text-base font-semibold text-slate-900 leading-relaxed">
          {site.aboutStory}
        </p>
        <p>
          In a world dominated by instant mixes and artificial preservatives, we remain dedicated to the time-tested culinary wisdom of our ancestors. Every morning starts at dawn in our kitchen: stone-grinding whole grains, hand-roasting spices for our signature sambar powders, and slowly brewing single-origin coffee beans.
        </p>
        <p>
          Whether you are stopping by for a comforting breakfast, taking home a family thali meal, or enjoying an evening with friends, our mission is to ensure every plate brings happiness, purity, and nourishment.
        </p>
      </div>

      {/* Our 3 Commitments */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
            <Flame className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">Pure Ingredients Only</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            We use premium cow ghee, cold-pressed groundnut oil, and fresh vegetables sourced daily from local markets.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">Gold-Standard Hygiene</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Our kitchen operates under stringent cleanliness benchmarks, with filtered RO water used in all cooking and prep.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">Heartfelt Service</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Every customer is treated like family. Our team takes pride in prompt, attentive, and respectful hospitality.
          </p>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="p-8 rounded-3xl bg-indigo-50/70 border border-indigo-200 text-center space-y-4 shadow-xs">
        <h3 className="text-xl font-bold text-slate-900">Experience Our Food Today</h3>
        <p className="text-xs text-slate-600 max-w-md mx-auto">
          Visit our outlet in {site.city} or browse our menu online for immediate dining and takeaway.
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <Link
            href={`/site/${subdomain}/menu`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors"
          >
            <span>View Full Menu</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href={`/site/${subdomain}/contact`}
            className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-2xs transition-colors"
          >
            Store Directions
          </Link>
        </div>
      </div>
    </div>
  );
}
