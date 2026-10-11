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

export interface CategoryGridProps {
  id?: string;
  headline?: string;
  limit?: number;
}

export function CategoryGrid({
  headline = 'Browse by Category',
  limit = 6,
}: CategoryGridProps) {
  const { products, path } = usePageContext();

  // Extract unique categories from products
  const categoryMap = new Map<string, { id: string; name: string; slug: string; count: number }>();
  for (const p of products) {
    if (p.category?.name) {
      const existing = categoryMap.get(p.category.name);
      if (existing) {
        existing.count += 1;
      } else {
        categoryMap.set(p.category.name, {
          id: p.category.id || p.category.name,
          name: p.category.name,
          slug: p.category.slug || p.category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          count: 1,
        });
      }
    }
  }

  const categories = Array.from(categoryMap.values()).slice(0, limit);

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold tracking-tight text-slate-900">{headline}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="font-semibold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
              {cat.name}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {cat.count} {cat.count === 1 ? 'item' : 'items'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PRODUCT CARD (Standalone Featured Card)
// ─────────────────────────────────────────────────────────────────────────────

export interface ProductCardProps {
  id?: string;
  title?: string;
  price?: string;
  badge?: string;
  imageUrl?: string;
  ctaText?: string;
}

export function ProductCard({
  title = '',
  price = '',
  badge = 'FEATURED',
  imageUrl = '',
  ctaText = 'Order Now',
}: ProductCardProps) {
  const { products, store } = usePageContext();
  const fallbackProduct = products?.[0];

  const prodName = title || fallbackProduct?.name || 'Artisanal Reserve Item';
  const prodPrice = price || (fallbackProduct?.basePrice ? `₹${fallbackProduct.basePrice}` : '₹2,499');
  const img = imageUrl || (fallbackProduct as any)?.images?.[0]?.url || (fallbackProduct as any)?.imageUrl || 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=600&q=80';

  return (
    <div className="max-w-xs rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all my-4 group">
      <div className="relative aspect-square overflow-hidden bg-slate-100">
        <img src={img} alt={prodName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        {badge && (
          <span className="absolute top-2.5 left-2.5 text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white px-2 py-0.5 rounded-md shadow-xs">
            {badge}
          </span>
        )}
      </div>
      <div className="p-4 space-y-2">
        <h4 className="font-bold text-sm text-slate-900 truncate">{prodName}</h4>
        <div className="flex items-center justify-between pt-1">
          <span className="text-base font-extrabold text-slate-900">{prodPrice}</span>
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs transition-colors"
          >
            {ctaText}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. FEATURED PRODUCT (Split Showcase Banner)
// ─────────────────────────────────────────────────────────────────────────────

export interface FeaturedProductProps {
  id?: string;
  badge?: string;
  headline?: string;
  description?: string;
  price?: string;
  ctaText?: string;
  imageUrl?: string;
}

export function FeaturedProduct({
  badge = 'EDITOR’S CHOICE',
  headline = '',
  description = '',
  price = '',
  ctaText = 'Buy From Store',
  imageUrl = '',
}: FeaturedProductProps) {
  const { products, store } = usePageContext();
  const prod = products?.[0];

  const name = headline || prod?.name || 'Pure Aged Dehn Al Oudh (12ml)';
  const desc = description || (prod as any)?.description || 'Authentic batch aged for over 15 years, offering deep woody notes and exceptional persistence.';
  const cost = price || (prod?.basePrice ? `₹${prod.basePrice}` : '₹3,899');
  const img = imageUrl || (prod as any)?.images?.[0]?.url || (prod as any)?.imageUrl || 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80';

  return (
    <div className="rounded-3xl bg-slate-900 text-white border border-slate-800 p-8 sm:p-12 my-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="space-y-4">
          {badge && (
            <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded-full">
              {badge}
            </span>
          )}
          <h3 className="text-2xl sm:text-3xl font-black tracking-tight">{name}</h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{desc}</p>
          <div className="text-3xl font-black text-white pt-2">{cost}</div>
          <div className="pt-2">
            <button
              type="button"
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all hover:scale-[1.02]"
            >
              {ctaText}
            </button>
          </div>
        </div>
        <div className="rounded-2xl overflow-hidden aspect-[4/3] bg-slate-800 shadow-xl border border-slate-700/50">
          <img src={img} alt={name} className="w-full h-full object-cover" />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. PRODUCT CAROUSEL (Horizontal Scroll)
// ─────────────────────────────────────────────────────────────────────────────

export interface ProductCarouselProps {
  id?: string;
  headline?: string;
}

export function ProductCarousel({ headline = 'Trending Offerings' }: ProductCarouselProps) {
  const { products } = usePageContext();

  return (
    <div className="py-8 space-y-4 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h3 className="text-xl font-bold text-slate-900 tracking-tight">{headline}</h3>
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
        {products.map((p) => (
          <div
            key={p.id}
            className="w-56 shrink-0 rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-2xs hover:shadow-xs transition-all"
          >
            <div className="aspect-square bg-slate-100 overflow-hidden">
              <img
                src={(p as any)?.images?.[0]?.url || (p as any)?.imageUrl || 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=400&q=80'}
                alt={p.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-3 space-y-1">
              <div className="font-bold text-xs text-slate-900 truncate">{p.name}</div>
              <div className="text-xs font-black text-indigo-600">₹{p.basePrice}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. PRODUCT SEARCH
// ─────────────────────────────────────────────────────────────────────────────

export interface ProductSearchProps {
  id?: string;
  placeholder?: string;
}

export function ProductSearch({ placeholder = 'Search our authentic catalog...' }: ProductSearchProps) {
  return (
    <div className="max-w-xl mx-auto my-6 px-4">
      <input
        type="search"
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-xs text-slate-800 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}


