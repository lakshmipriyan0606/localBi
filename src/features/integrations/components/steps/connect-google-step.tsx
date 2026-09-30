import { Check, ShieldCheck, Zap, Layers } from "lucide-react";
import { GoogleProductIcon } from "../google-product-icon";

interface ConnectGoogleStepProps {
  brandName: string;
  isAuthorized: boolean;
  activeConnectionEmail?: string;
  onConnect: () => void;
  onContinue: () => void;
  onChangeAccount: () => void;
}

export function ConnectGoogleStep({
  brandName,
  isAuthorized,
  activeConnectionEmail,
  onConnect,
  onContinue,
  onChangeAccount,
}: ConnectGoogleStepProps) {
  return (
    <div className="max-w-5xl mx-auto w-full">
      {isAuthorized ? (
        <div className="bg-white rounded-2xl border border-slate-200/70 p-8 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Google Account Connected
          </h2>
          <p className="text-slate-500 mb-6">
            You are currently signed in as <strong className="text-slate-700">{activeConnectionEmail}</strong>.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onContinue}
              className="px-6 py-3 bg-[#5138EE] hover:bg-[#432ee0] text-white rounded-xl font-semibold shadow-sm transition-colors"
            >
              Continue to Select Resources →
            </button>
            <button
              onClick={onChangeAccount}
              className="px-6 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
            >
              Change Account
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="bg-gradient-to-br from-[#F4F7FF] via-[#FAFBFC] to-[#F1F5FD] rounded-3xl overflow-hidden shadow-[inset_0_0_0_1px_rgba(255,255,255,1),0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-slate-100">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[480px]">
              {/* Left Side: Hero Text */}
              <div className="lg:col-span-7 p-8 lg:p-14 flex flex-col justify-center min-w-0">
                <div className="inline-flex items-center gap-2 bg-indigo-50/80 border border-indigo-100/50 text-indigo-600 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase mb-8 self-start shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
                  Get Started
                </div>
                
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0F172A] mb-5 tracking-tight leading-[1.1]">
                  One connection.<br />All your business data.
                </h2>
                
                <p className="text-slate-500 text-base lg:text-lg mb-12 max-w-lg leading-relaxed">
                  Connect your Google account once and get insights from Search Console, Business Profile, and Google Analytics 4 — all in one place for <strong className="text-slate-800 font-semibold">{brandName}</strong>.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-auto">
                  <div className="p-3.5 rounded-xl bg-white/70 border border-slate-200/60 shadow-sm flex flex-col items-start gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100/70 text-indigo-600 flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Auto-import data</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Bring your Google data into LocalBi automatically.</p>
                    </div>
                  </div>
                  
                  <div className="p-3.5 rounded-xl bg-white/70 border border-slate-200/60 shadow-sm flex flex-col items-start gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100/70 text-blue-600 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Secure & safe</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">We use Google's secure OAuth process.</p>
                    </div>
                  </div>
                  
                  <div className="p-3.5 rounded-xl bg-white/70 border border-slate-200/60 shadow-sm flex flex-col items-start gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100/70 text-indigo-600 flex items-center justify-center shrink-0">
                      <Layers className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Selective connect</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">You choose exactly what to connect.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: Graphic with animated edges */}
              <div className="lg:col-span-5 relative min-h-[360px] lg:min-h-[480px] flex items-center justify-center p-6 lg:p-10 min-w-0 overflow-visible">
                
                {/* Background decorative blob */}
                <div className="absolute inset-0 bg-gradient-to-l from-indigo-100/50 to-transparent blur-3xl mix-blend-multiply pointer-events-none" />

                {/* Robust Flex Layout for Graphic */}
                <div className="relative w-full max-w-[420px] flex items-center justify-between z-10 overflow-visible">
                  
                  {/* SVG Edges connecting the two sides */}
                  <div className="absolute left-[3.5rem] right-[13rem] top-0 bottom-0 pointer-events-none">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 100 300" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#C7D2FE" stopOpacity="0.2"/>
                          <stop offset="100%" stopColor="#818CF8" stopOpacity="0.8"/>
                        </linearGradient>
                        <filter id="glow">
                          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                        <style>
                          {`
                            .animated-path {
                              stroke-dasharray: 6 6;
                              animation: flow 20s linear infinite reverse;
                            }
                            @keyframes flow {
                              to { stroke-dashoffset: 400; }
                            }
                            .animated-dot {
                              offset-distance: 0%;
                              animation: moveDot 3s ease-in-out infinite;
                            }
                            .dot-2 { animation-delay: 1s; }
                            .dot-3 { animation-delay: 2s; }
                            @keyframes moveDot {
                              0% { offset-distance: 0%; opacity: 0; }
                              10% { opacity: 1; transform: scale(1); }
                              50% { transform: scale(1.5); }
                              90% { opacity: 1; transform: scale(1); }
                              100% { offset-distance: 100%; opacity: 0; }
                            }
                          `}
                        </style>
                      </defs>

                      {/* Paths scaling to container */}
                      <path id="p1" d="M 0 150 C 40 150, 60 50, 100 50" fill="none" stroke="url(#edgeGrad)" strokeWidth="2.5" className="animated-path" />
                      <path id="p2" d="M 0 150 C 40 150, 60 150, 100 150" fill="none" stroke="url(#edgeGrad)" strokeWidth="2.5" className="animated-path" />
                      <path id="p3" d="M 0 150 C 40 150, 60 250, 100 250" fill="none" stroke="url(#edgeGrad)" strokeWidth="2.5" className="animated-path" />

                      {/* Dots */}
                      <circle r="4" fill="#6366f1" filter="url(#glow)" className="animated-dot" style={{ offsetPath: "path('M 0 150 C 40 150, 60 50, 100 50')" }} />
                      <circle r="4" fill="#6366f1" filter="url(#glow)" className="animated-dot dot-2" style={{ offsetPath: "path('M 0 150 C 40 150, 60 150, 100 150')" }} />
                      <circle r="4" fill="#6366f1" filter="url(#glow)" className="animated-dot dot-3" style={{ offsetPath: "path('M 0 150 C 40 150, 60 250, 100 250')" }} />
                      
                      {/* Anchor points */}
                      <circle cx="100" cy="50" r="4" fill="#fff" stroke="#818CF8" strokeWidth="2" />
                      <circle cx="100" cy="150" r="4" fill="#fff" stroke="#818CF8" strokeWidth="2" />
                      <circle cx="100" cy="250" r="4" fill="#fff" stroke="#818CF8" strokeWidth="2" />
                    </svg>
                  </div>

                  {/* Left Google Icon */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 bg-white rounded-full shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-slate-100 flex items-center justify-center animate-[float_4s_ease-in-out_infinite] z-20">
                    <GoogleProductIcon product="GOOGLE" size="lg" />
                  </div>

                  {/* Right Cards Stack */}
                  <div className="flex flex-col justify-between gap-4 w-full max-w-[210px] sm:max-w-[230px] shrink-0 z-20">
                    
                    <div className="bg-white/95 backdrop-blur-xs p-3 rounded-xl shadow-md border border-slate-200/80 flex items-center gap-3 transition-all hover:shadow-lg hover:-translate-y-0.5">
                      <div className="bg-blue-50 w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                        <GoogleProductIcon product="GBP" size="sm" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900 leading-snug">Google Business Profile</span>
                        <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium leading-tight mt-0.5">Locations, Reviews, Insights</span>
                      </div>
                    </div>

                    <div className="bg-white/95 backdrop-blur-xs p-3 rounded-xl shadow-md border border-slate-200/80 flex items-center gap-3 transition-all hover:shadow-lg hover:-translate-y-0.5 delay-75">
                      <div className="bg-slate-50 w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                        <GoogleProductIcon product="GSC" size="sm" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900 leading-snug">Google Search Console</span>
                        <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium leading-tight mt-0.5">Search Performance, Keywords</span>
                      </div>
                    </div>

                    <div className="bg-white/95 backdrop-blur-xs p-3 rounded-xl shadow-md border border-slate-200/80 flex items-center gap-3 transition-all hover:shadow-lg hover:-translate-y-0.5 delay-150">
                      <div className="bg-amber-50 w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                        <GoogleProductIcon product="GA4" size="sm" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900 leading-snug">Google Analytics 4</span>
                        <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium leading-tight mt-0.5">Users, Events, Conversions</span>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="bg-white rounded-[24px] border border-slate-200/70 p-6 flex flex-col items-center justify-center shadow-sm">
            <button
              onClick={onConnect}
              className="w-full max-w-[420px] py-4 bg-[#5138EE] hover:bg-[#432ee0] text-white rounded-[16px] font-bold text-lg shadow-[0_4px_14px_rgba(81,56,238,0.4)] hover:shadow-[0_6px_20px_rgba(81,56,238,0.5)] transition-all flex items-center justify-center gap-2 group"
            >
              <div className="bg-white rounded-full w-7 h-7 flex items-center justify-center mr-1">
                <GoogleProductIcon product="GOOGLE" size="sm" className="w-4 h-4 p-0 shadow-none border-none bg-transparent" />
              </div>
              Continue with Google <span className="transition-transform group-hover:translate-x-1.5 ml-1">→</span>
            </button>
            <div className="flex items-center justify-center gap-2 mt-4 text-[13px] text-slate-500 font-medium">
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              You'll be redirected to Google to securely sign in.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
