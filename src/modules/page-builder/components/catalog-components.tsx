'use client';

import Link from 'next/link';
import { usePageContext } from '../page-context-react';
import { ShoppingBag, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

export interface ProductGridProps {
  id?: string;
  source?: 'CURRENT_STORE_PRODUCTS' | 'CURRENT_CATEGORY_PRODUCTS' | 'FEATURED_PRODUCTS';
  headline?: string;
  subheading?: string;
  limit?: number;
  columns?: 2 | 3 | 4;
  showPrice?: boolean;
  showAvailability?: boolean;
}

export function ProductGrid({
  headline = 'Featured Offerings',
  subheading = 'Authentic selection available at this storefront.',
  limit = 8,
  columns = 3,
  showPrice = true,
  showAvailability = true,
}: ProductGridProps) {
  const { products, store, path } = usePageContext();

  const displayProducts = products.slice(0, limit);

  if (displayProducts.length === 0) {
    return (
      <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl p-8">
        <ShoppingBag className="w-8 h-8 mx-auto text-slate-300 mb-2" />
        <p className="text-sm font-medium">Catalog items currently being updated for this location.</p>
      </div>
    );
  }

  const gridColsClass =
    columns === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : columns === 4
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          {headline}
        </h2>
        {subheading && (
          <p className="text-xs sm:text-sm text-slate-500">{subheading}</p>
        )}
      </div>

      <div className={`grid ${gridColsClass} gap-5`}>
        {displayProducts.map((p) => {
          // Construct product detail link (scoped to store if currently on a store page)
          const prodUrl = store?.city && store?.name
            ? `${path.replace(/\/$/, '')}/${p.slug}`
            : `/products/${p.slug}`;

          return (
            <div
              key={p.id}
              className="group rounded-2xl bg-white border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                {p.category && (
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold uppercase tracking-wider">
                    {p.category.name}
                  </span>
                )}

                <div>
                  <h3 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">
                    {p.name}
                  </h3>
                  {p.shortDescription && (
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                      {p.shortDescription}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  {showPrice && p.basePrice !== null && p.basePrice !== undefined && (
                    <div className="text-sm font-bold text-slate-900">
                      ₹{p.basePrice.toLocaleString('en-IN')}
                    </div>
                  )}

                  {showAvailability && (
                    <div className="flex items-center gap-1 text-[11px] font-medium mt-0.5">
                      {p.isAvailable !== false ? (
                        <span className="text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> In Stock
                        </span>
                      ) : (
                        <span className="text-rose-500 flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Unavailable
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <Link
                  href={prodUrl}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform"
                >
                  <span>Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface ProductDetailsProps {
  id?: string;
  showSku?: boolean;
}

export function ProductDetails({ showSku = true }: ProductDetailsProps) {
  const { product, storeProduct, store } = usePageContext();

  if (!product) {
    return (
      <div className="py-12 text-center text-slate-400 border border-slate-200 rounded-2xl">
        <p className="text-sm font-medium">Select a product to view catalog details.</p>
      </div>
    );
  }

  const effectivePrice = storeProduct ? storeProduct.effectivePrice : product.basePrice;
  const isAvailable = storeProduct ? storeProduct.isAvailable : product.isAvailable;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-sm space-y-8">
      <div className="space-y-4 max-w-3xl">
        {product.category && (
          <span className="inline-block px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold">
            {product.category.name}
          </span>
        )}

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
          {product.name}
        </h1>

        {showSku && product.sku && (
          <p className="text-xs font-mono text-slate-400">SKU: {product.sku}</p>
        )}

        {effectivePrice !== null && effectivePrice !== undefined && (
          <div className="text-2xl sm:text-3xl font-bold text-slate-900">
            ₹{effectivePrice.toLocaleString('en-IN')}{' '}
            <span className="text-xs font-normal text-slate-500">
              {store ? `(Price at ${store.name})` : '(Base Price)'}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {isAvailable !== false ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Available for In-Store Pickup or Order</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>Currently Unavailable at this Location</span>
            </div>
          )}
        </div>

        {product.shortDescription && (
          <p className="text-base text-slate-600 leading-relaxed pt-2">
            {product.shortDescription}
          </p>
        )}

        {product.description && (
          <div className="pt-4 border-t border-slate-100 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
            {product.description}
          </div>
        )}
      </div>

      {store?.phone && (
        <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center gap-4">
          <a
            href={`tel:${store.phone}`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-xs shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <span>Inquire by Phone</span>
          </a>
          {store.addressLine1 && (
            <span className="text-xs text-slate-500">
              Pick up at: {store.addressLine1}, {store.city}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
