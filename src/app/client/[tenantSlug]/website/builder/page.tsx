'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Loader2, AlertCircle, FilePlus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function WebsiteBuilderIndexPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tenantSlug = params.tenantSlug as string;
  const brandId = searchParams.get('brandId');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function resolvePage() {
      try {
        setLoading(true);
        const url = brandId
          ? `/api/tenants/${tenantSlug}/website/pages?brandId=${brandId}`
          : `/api/tenants/${tenantSlug}/website/pages`;
        const res = await fetch(url);
        const data = await res.json();

        if (!isMounted) return;

        if (data.success && Array.isArray(data.pages) && data.pages.length > 0) {
          // Find HOME page or first page
          interface PageItem {
            id: string;
            pageType?: string;
            slug?: string;
          }
          const homePage =
            data.pages.find((p: PageItem) => p.pageType === 'HOME' || p.slug === '/' || p.slug === '/home') ||
            data.pages[0];
          const queryBrand = brandId ? `?brandId=${brandId}` : '';
          router.replace(`/client/${tenantSlug}/website/builder/${homePage.id}${queryBrand}`);
        } else {
          // No pages found, redirect to pages list to create one or pick a template
          const queryBrand = brandId ? `?brandId=${brandId}` : '';
          router.replace(`/client/${tenantSlug}/website/pages${queryBrand}`);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Failed to locate site pages');
        setLoading(false);
      }
    }

    resolvePage();

    return () => {
      isMounted = false;
    };
  }, [tenantSlug, brandId, router]);

  return (
    <div className="min-h-[500px] flex flex-col items-center justify-center p-8 text-center">
      {loading ? (
        <div className="space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600 shadow-sm animate-pulse">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Loading Visual Editor...</h2>
            <p className="text-xs text-slate-400 mt-1">Connecting to active website draft layout</p>
          </div>
        </div>
      ) : error ? (
        <div className="max-w-md bg-white rounded-2xl border border-rose-200 p-6 shadow-sm space-y-4 text-center">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">Unable to Open Visual Editor</h3>
            <p className="text-xs text-slate-500 mt-1">{error}</p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              href={`/client/${tenantSlug}/website/pages${brandId ? `?brandId=${brandId}` : ''}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
            >
              <FilePlus className="w-4 h-4" />
              <span>Go to Pages Manager</span>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
