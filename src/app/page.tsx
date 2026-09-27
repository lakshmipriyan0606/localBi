import { ArrowRight, BarChart3, Map, Shield, Zap } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import heroImg from '@/assest/image/her02.png';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white overflow-hidden flex flex-col font-sans">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-slate-100">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white shadow-sm">
              <Zap className="w-4 h-4" fill="currentColor" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">localBi</span>
          </div>
          <nav className="hidden md:flex gap-8 text-sm font-medium text-slate-600">
            <Link href="#features" className="hover:text-primary transition-colors duration-200">Platform</Link>
            <Link href="#features" className="hover:text-primary transition-colors duration-200">Features</Link>
            <Link href="/login" className="hover:text-primary transition-colors duration-200">Workspace</Link>
          </nav>
          <div className="flex items-center gap-5">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors duration-200">
              Sign in
            </Link>
            <Link href="/login" className="px-5 py-2.5 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary/90 transition-all shadow-md shadow-primary/20">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden bg-white">
          <div className="container mx-auto px-8 lg:px-12">
            <div className="grid lg:grid-cols-2 gap-8 min-h-[calc(100vh-64px)] items-center">

              {/* Left Content */}
              <div className="py-16 lg:py-20 text-left z-10">
                <div className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-100 px-4 py-2 text-[11px] font-bold text-primary tracking-widest uppercase mb-8">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary mr-2"></span>
                  LOCAL INTELLIGENCE FOR EVERY LOCATION
                </div>

                <h1 className="text-[2.75rem] lg:text-[3.25rem] font-extrabold tracking-tight text-slate-900 mb-6 leading-[1.12]">
                  Turn every location<br />
                  into a local search<br />
                  <span className="text-primary">leader.</span>
                </h1>

                <p className="text-lg text-slate-500 mb-10 leading-relaxed max-w-md">
                  Unify rankings, listings, reviews, and search performance across every location—then act on what matters.
                </p>

                <div className="flex flex-wrap items-center gap-4">
                  <Link href="/login" className="px-7 py-3.5 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 flex items-center gap-2 group">
                    Explore the platform
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link href="#features" className="px-7 py-3.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 shadow-sm rounded-xl hover:bg-slate-50 transition-all">
                    View features
                  </Link>
                </div>
              </div>

              {/* Right Content / Image */}
              <div className="relative hidden lg:flex items-center justify-end h-full py-8">
                <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[125%]">
                  <div className="absolute -inset-8 bg-gradient-to-br from-blue-100/50 to-indigo-100/40 blur-3xl rounded-[3rem] -z-10"></div>
                  <Image
                    src={heroImg}
                    alt="localBi Dashboard Mockup"
                    className="w-full h-auto drop-shadow-[0_24px_48px_rgba(0,0,0,0.10)] rounded-2xl"
                    priority
                  />
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-28 bg-[#f8faff]">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-4">Engineered for Scale</h2>
              <p className="text-lg text-slate-500 max-w-xl mx-auto">Everything you need to manage local presence across regions and thousands of branches.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">

              {/* Card 1: Locations */}
              <div className="relative p-8 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-lg hover:shadow-indigo-100/50 transition-all duration-300 hover:-translate-y-1 group flex flex-col overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl pointer-events-none"></div>

                <div className="relative z-10 w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-6 group-hover:scale-105 transition-transform duration-300">
                  <Map className="w-6 h-6" />
                </div>

                <div className="relative z-10">
                  <div className="text-[10px] font-extrabold tracking-[0.2em] text-indigo-400 uppercase mb-2">Locations</div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">Multi-Location Management</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">Seamlessly control thousands of locations from a single dashboard. Update hours, respond to reviews, and manage GMB attributes in bulk.</p>
                </div>

                <div className="relative z-10 mt-8 pt-6 border-t border-indigo-50">
                  <svg viewBox="0 0 200 80" className="w-full h-20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 60 Q 60 30 100 50 T 180 45" stroke="#6366f1" strokeWidth="2" strokeDasharray="5 4" opacity="0.5"/>
                    <circle cx="20" cy="60" r="5" fill="#6366f1" opacity="0.3"/>
                    <circle cx="100" cy="50" r="5" fill="#6366f1" opacity="0.3"/>
                    <circle cx="180" cy="45" r="5" fill="#6366f1" opacity="0.3"/>
                    <circle cx="60" cy="42" r="3" fill="#6366f1" opacity="0.2"/>
                    <path d="M100 18 C 100 18 91 30 91 38 A 9 9 0 0 0 109 38 C 109 30 100 18 100 18 Z" fill="#6366f1" opacity="0.6"/>
                    <circle cx="100" cy="36" r="3" fill="white"/>
                  </svg>
                </div>
              </div>

              {/* Card 2: Analytics */}
              <div className="relative p-8 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-lg hover:shadow-blue-100/50 transition-all duration-300 hover:-translate-y-1 group flex flex-col overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-50/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl pointer-events-none"></div>

                <div className="relative z-10 w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 mb-6 group-hover:scale-105 transition-transform duration-300">
                  <BarChart3 className="w-6 h-6" />
                </div>

                <div className="relative z-10">
                  <div className="text-[10px] font-extrabold tracking-[0.2em] text-blue-400 uppercase mb-2">Analytics</div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">Granular Analytics</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">Deep-dive into performance metrics. Compare locations, track keyword rankings locally, and visualize search visibility over time.</p>
                </div>

                <div className="relative z-10 mt-8 pt-6 border-t border-blue-50">
                  <svg viewBox="0 0 200 80" className="w-full h-20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="30" y="50" width="16" height="22" rx="3" fill="#bfdbfe"/>
                    <rect x="58" y="35" width="16" height="37" rx="3" fill="#93c5fd"/>
                    <rect x="86" y="42" width="16" height="30" rx="3" fill="#bfdbfe"/>
                    <rect x="114" y="25" width="16" height="47" rx="3" fill="#60a5fa"/>
                    <rect x="142" y="15" width="16" height="57" rx="3" fill="#3b82f6"/>
                    <path d="M20 65 L 55 48 L 90 55 L 130 32 L 165 18" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="165" cy="18" r="4" fill="#3b82f6"/>
                  </svg>
                </div>
              </div>

              {/* Card 3: Security */}
              <div className="relative p-8 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-lg hover:shadow-emerald-100/50 transition-all duration-300 hover:-translate-y-1 group flex flex-col overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl pointer-events-none"></div>

                <div className="relative z-10 w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-105 transition-transform duration-300">
                  <Shield className="w-6 h-6" />
                </div>

                <div className="relative z-10">
                  <div className="text-[10px] font-extrabold tracking-[0.2em] text-emerald-400 uppercase mb-2">Security</div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">Enterprise Multi-Tenant</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">Built from the ground up with secure row-level security (RLS) for true enterprise multi-tenancy. Agency-ready architecture.</p>
                </div>

                <div className="relative z-10 mt-8 pt-6 border-t border-emerald-50">
                  <svg viewBox="0 0 200 80" className="w-full h-20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M100 72 L 38 50 L 100 28 L 162 50 Z" fill="#a7f3d0" opacity="0.3"/>
                    <path d="M100 58 L 38 36 L 100 14 L 162 36 Z" fill="#6ee7b7" opacity="0.4"/>
                    <path d="M100 44 L 55 28 L 100 12 L 145 28 Z" fill="white" stroke="#10b981" strokeWidth="1.5"/>
                    <path d="M100 18 L 93 22 L 93 34 C 93 41 100 46 100 46 C 100 46 107 41 107 34 L 107 22 Z" fill="#10b981" opacity="0.8"/>
                    <path d="M96 30 L 99 33 L 105 27" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>

            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
