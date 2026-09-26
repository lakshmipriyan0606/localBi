import { notFound } from 'next/navigation';
import {
  MapPin,
  Clock,
  Phone,
  MessageCircle,
  ExternalLink,
  Navigation,
  CheckCircle,
} from 'lucide-react';
import { MicrositeService } from '@/modules/microsites/microsite-service';

export default async function MicrositeContactPage({
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
    <div className="space-y-10 animate-in fade-in duration-300 max-w-5xl mx-auto">
      {/* Header */}
      <div className="space-y-2 border-b border-slate-200 pb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
          <MapPin className="w-3.5 h-3.5 text-amber-600" />
          Location & Hours
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Visit Us at {site.brandName}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          We welcome you for dine-in, takeaway pickups, and catering inquiries in {site.city}.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Contact Info Cards */}
        <div className="space-y-4 lg:col-span-1">
          {/* Address Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Store Address</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {site.address}
              </p>
            </div>
            <a
              href={site.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-indigo-600 font-bold hover:underline pt-1"
            >
              <Navigation className="w-3.5 h-3.5" />
              Open in Google Maps
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </a>
          </div>

          {/* Operating Hours Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Operating Timings</h3>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                {site.hours}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                Dine-in, Counter Takeaway & WhatsApp Deliveries
              </div>
            </div>
          </div>

          {/* Direct Phone & WhatsApp */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Direct Contacts</h3>
            <div className="space-y-2 pt-1">
              <a
                href={`tel:${site.phone}`}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-indigo-600" />
                Call: {site.phone}
              </a>

              <a
                href={`https://wa.me/${site.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${site.brandName}, I would like to inquire about directions/order.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Chat on WhatsApp
              </a>
            </div>
          </div>
        </div>

        {/* Right: Map Visual Card & Directions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-3xl bg-white border border-slate-200 shadow-xs p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Store Location Map</h3>
                <p className="text-xs text-slate-500">Centrally located with dedicated parking.</p>
              </div>
              <a
                href={site.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-600 transition-colors shadow-2xs"
              >
                Get Live Directions
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Styled Map Representation Frame */}
            <div className="relative w-full h-80 rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] opacity-60" />

              <div className="relative z-10 text-center space-y-3 p-6 max-w-sm bg-white/95 border border-slate-200 backdrop-blur-md rounded-2xl shadow-md">
                <div className="w-12 h-12 bg-amber-50 border border-amber-200 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
                  <MapPin className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900">{site.brandName}</div>
                  <div className="text-xs text-slate-500 mt-1">{site.address}</div>
                </div>
                <a
                  href={site.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-indigo-600 text-white font-semibold text-xs shadow-xs hover:bg-indigo-700 transition-all"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Navigate via Google Maps
                </a>
              </div>
            </div>

            {/* Amenities strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs text-slate-700 font-medium">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                🚗 Free Parking
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                ❄️ Air Conditioned
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                💳 All Cards & UPI
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                ⚡ Express Delivery
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
