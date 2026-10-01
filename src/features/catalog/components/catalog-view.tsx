'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ProductList } from './product-list';
import { CategoryManager } from './category-manager';
import { StoreProductMatrix } from './store-product-matrix';
import { useCategories, useRunCatalogMigration } from '../hooks/use-catalog';
import {
  Package,
  Tags,
  Store,
  Database,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { CatalogMigrationReport } from '@/modules/catalog/catalog-migration-service';

interface CatalogViewProps {
  tenantSlug: string;
  brands: Array<{ id: string; name: string }>;
  stores: Array<{ id: string; name: string; brandId: string; city?: string | null }>;
}

export function CatalogView({ tenantSlug, brands, stores }: CatalogViewProps) {
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'mapping'>('products');
  const [isMigrateModalOpen, setIsMigrateModalOpen] = useState(false);
  const [migrationReport, setMigrationReport] = useState<CatalogMigrationReport | null>(null);

  const { data: categoriesData } = useCategories(tenantSlug);
  const categories = categoriesData?.categories || [];

  const migrateMutation = useRunCatalogMigration(tenantSlug);

  const handleRunMigration = async () => {
    try {
      const res = await migrateMutation.mutateAsync();
      setMigrationReport(res.report as unknown as CatalogMigrationReport);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Migration failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Catalog & Products
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Canonical relational catalog source of truth: manage products, brand categories, and store-level availability.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setMigrationReport(null);
              setIsMigrateModalOpen(true);
            }}
            className="flex items-center gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
          >
            <Database className="h-4 w-4" />
            <span>Backfill Legacy Data</span>
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'products'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
          }`}
        >
          <Package className="h-4 w-4" />
          <span>Products</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'categories'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
          }`}
        >
          <Tags className="h-4 w-4" />
          <span>Categories</span>
        </button>

        <button
          onClick={() => setActiveTab('mapping')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'mapping'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
          }`}
        >
          <Store className="h-4 w-4" />
          <span>Store ↔ Product Mapping</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'products' && (
        <ProductList tenantSlug={tenantSlug} brands={brands} categories={categories} />
      )}

      {activeTab === 'categories' && (
        <CategoryManager tenantSlug={tenantSlug} brands={brands} />
      )}

      {activeTab === 'mapping' && (
        <StoreProductMatrix tenantSlug={tenantSlug} brands={brands} stores={stores} />
      )}

      {/* Migration / Backfill Dialog */}
      <Dialog open={isMigrateModalOpen} onOpenChange={setIsMigrateModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Backfill Legacy Catalog Data</DialogTitle>
            <DialogDescription>
              Scans legacy Microsite menuItems JSON and ProductLocation rows, creating canonical
              Category, Product, and StoreProduct records without deleting original records.
            </DialogDescription>
          </DialogHeader>

          {migrationReport ? (
            <div className="space-y-3 py-2">
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-md border border-emerald-200 flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span>Deterministic Backfill Completed Successfully</span>
              </div>

              <div className="bg-gray-50 rounded p-3 text-xs space-y-1.5 font-mono text-gray-700">
                <div>Products Migrated: {String(migrationReport.micrositeProductsMigrated || 0)}</div>
                <div>Categories Created: {String(migrationReport.categoriesCreated || 0)}</div>
                <div>Store Mappings Created: {String(migrationReport.storeProductsCreated || 0)}</div>
                <div>
                  ProductLocations Processed: {String(migrationReport.productLocationsMigrated || 0)}
                </div>
                <div>
                  Ambiguous Skipped:{' '}
                  {Array.isArray(migrationReport.skippedRecords)
                    ? migrationReport.skippedRecords.length
                    : 0}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-3 text-sm text-gray-600 space-y-2">
              <p>
                This operation is strictly <strong>ADDITIVE</strong>. It will not drop or overwrite
                existing data. Records with ambiguous ownership or missing brand/location mappings
                will be skipped safely and reported.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMigrateModalOpen(false)}>
              Close
            </Button>
            {!migrationReport && (
              <Button onClick={handleRunMigration} disabled={migrateMutation.isPending}>
                {migrateMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Run Backfill Now
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
