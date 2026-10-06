'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useParams, useSearchParams, useRouter } from 'next/navigation';
import { SiteStudioSidebar } from './site-studio-sidebar';
import { SiteStudioHeader } from './site-studio-header';
import { PublishModal } from './publishing/publish-modal';
import { X, RefreshCw } from 'lucide-react';

interface BrandOption {
  id: string;
  name: string;
  slug: string;
}

interface SiteStudioShellProps {
  children: React.ReactNode;
}

export function SiteStudioShell({ children }: SiteStudioShellProps) {
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tenantSlug = params.tenantSlug as string;

  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [primaryDomain, setPrimaryDomain] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);

  // Load brands and overview state
  useEffect(() => {
    let isMounted = true;

    async function loadStudioContext() {
      try {
        setIsLoading(true);
        // 1. Fetch brands
        const brandRes = await fetch(`/api/tenants/${tenantSlug}/brands`);
        const brandData = await brandRes.json();

        if (brandData.success && brandData.brands && brandData.brands.length > 0) {
          if (!isMounted) return;
          setBrands(brandData.brands);

          const queryBrandId = searchParams.get('brandId');
          const activeBrandId =
            queryBrandId && brandData.brands.some((b: any) => b.id === queryBrandId)
              ? queryBrandId
              : brandData.brands[0].id;

          setSelectedBrandId(activeBrandId);

          // 2. Fetch site overview for this brand
          const overviewRes = await fetch(
            `/api/tenants/${tenantSlug}/website/overview?brandId=${activeBrandId}`
          );
          const overviewData = await overviewRes.json();

          if (isMounted && overviewData.success && overviewData.overview) {
            setPrimaryDomain(overviewData.overview.primaryDomain || null);
            setIsLive(Boolean(overviewData.overview.isLive));
          }
        }
      } catch (err) {
        console.error('Failed to load Site Studio context:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadStudioContext();

    return () => {
      isMounted = false;
    };
  }, [tenantSlug, searchParams]);

  const handleSelectBrand = (brandId: string) => {
    setSelectedBrandId(brandId);
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('brandId', brandId);
    router.push(`${pathname}?${newParams.toString()}`);
  };

  const currentBrand = brands.find((b) => b.id === selectedBrandId) || brands[0];

  // Derive human-readable page title from path
  const getPageTitle = () => {
    if (pathname.endsWith('/pages')) return 'Pages';
    if (pathname.includes('/pages/')) return 'Page Details';
    if (pathname.endsWith('/design')) return 'Design & Theme';
    if (pathname.endsWith('/navigation')) return 'Navigation';
    if (pathname.endsWith('/stores')) return 'Locations';
    if (pathname.endsWith('/products')) return 'Products';
    if (pathname.endsWith('/seo')) return 'SEO Settings';
    if (pathname.endsWith('/seo/intelligence')) return 'SEO Intelligence';
    if (pathname.endsWith('/domains')) return 'Domains';
    if (pathname.endsWith('/preview')) return 'Preview Site';
    if (pathname.endsWith('/analytics')) return 'Analytics';
    return 'Overview';
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-indigo-600 selection:text-white">
      {/* Desktop Left Sidebar
      <div className="hidden lg:block">
        <SiteStudioSidebar
          tenantSlug={tenantSlug}
          brandId={selectedBrandId}
          brandName={currentBrand?.name}
          isLive={isLive}
          onOpenPublishModal={() => setPublishModalOpen(true)}
        />
      </div> */}

      {/* Mobile Drawer Sidebar
      {mobileSidebarOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="lg:hidden fixed top-0 left-0 bottom-0 z-50 w-64 shadow-2xl animate-in slide-in-from-left duration-200">
            <SiteStudioSidebar
              tenantSlug={tenantSlug}
              brandId={selectedBrandId}
              brandName={currentBrand?.name}
              isLive={isLive}
              onOpenPublishModal={() => setPublishModalOpen(true)}
              onCloseMobile={() => setMobileSidebarOpen(false)}
            />
          </div>
        </>
      )} */}

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <SiteStudioHeader
          tenantSlug={tenantSlug}
          title={getPageTitle()}
          brands={brands}
          selectedBrandId={selectedBrandId}
          onSelectBrand={handleSelectBrand}
          primaryDomain={primaryDomain}
          isLive={isLive}
          onOpenPublishModal={() => setPublishModalOpen(true)}
          onToggleMobileSidebar={() => setMobileSidebarOpen((v) => !v)}
        />

        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Global Publish Modal */}
      <PublishModal
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        tenantSlug={tenantSlug}
        brandId={selectedBrandId}
        brandName={currentBrand?.name}
        primaryDomain={primaryDomain}
        onPublishSuccess={() => {
          setIsLive(true);
        }}
      />
    </div>
  );
}
