'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ProductDto } from '../types/catalog-dto';
import { useCreateProduct, useUpdateProduct, useCategories } from '../hooks/use-catalog';
import { Loader2 } from 'lucide-react';

interface ProductFormModalProps {
  tenantSlug: string;
  isOpen: boolean;
  onClose: () => void;
  product?: ProductDto | null;
  brands: Array<{ id: string; name: string }>;
}

export function ProductFormModal({
  tenantSlug,
  isOpen,
  onClose,
  product,
  brands,
}: ProductFormModalProps) {
  const [brandId, setBrandId] = useState(brands[0]?.id || '');
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [slug, setSlug] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState<string>('');
  const [currency, setCurrency] = useState('INR');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [publishStatus, setPublishStatus] = useState<'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED'>('DRAFT');
  const [featured, setFeatured] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: categoryData } = useCategories(tenantSlug, { brandId });
  const createMutation = useCreateProduct(tenantSlug);
  const updateMutation = useUpdateProduct(tenantSlug);

  useEffect(() => {
    if (product) {
      setBrandId(product.brandId);
      setName(product.name);
      setSku(product.sku);
      setSlug(product.slug);
      setCategoryId(product.categoryId || '');
      setShortDescription(product.shortDescription || '');
      setDescription(product.description || '');
      setBasePrice(product.basePrice !== null ? String(product.basePrice) : '');
      setCurrency(product.currency || 'INR');
      setStatus(product.status as 'ACTIVE' | 'INACTIVE');
      setPublishStatus(product.publishStatus as 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED');
      setFeatured(product.featured);
      setImageUrl(product.media?.[0]?.url || '');
    } else {
      setBrandId(brands[0]?.id || '');
      setName('');
      setSku('');
      setSlug('');
      setCategoryId('');
      setShortDescription('');
      setDescription('');
      setBasePrice('');
      setCurrency('INR');
      setStatus('ACTIVE');
      setPublishStatus('DRAFT');
      setFeatured(false);
      setImageUrl('');
    }
    setErrorMsg(null);
  }, [product, brands, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Product name is required');
      return;
    }
    if (!sku.trim()) {
      setErrorMsg('SKU is required');
      return;
    }
    if (!brandId) {
      setErrorMsg('Brand selection is required');
      return;
    }

    try {
      const priceVal = basePrice ? parseFloat(basePrice) : null;
      if (priceVal !== null && (isNaN(priceVal) || priceVal < 0)) {
        setErrorMsg('Price must be a valid non-negative number');
        return;
      }

      if (product) {
        await updateMutation.mutateAsync({
          productId: product.id,
          data: {
            name: name.trim(),
            sku: sku.trim(),
            slug: slug.trim() || undefined,
            categoryId: categoryId || null,
            shortDescription: shortDescription.trim() || null,
            description: description.trim() || null,
            basePrice: priceVal,
            currency,
            status,
            publishStatus,
            featured,
          },
        });
      } else {
        await createMutation.mutateAsync({
          brandId,
          name: name.trim(),
          sku: sku.trim(),
          slug: slug.trim() || undefined,
          categoryId: categoryId || null,
          shortDescription: shortDescription.trim() || null,
          description: description.trim() || null,
          basePrice: priceVal,
          currency,
          status,
          publishStatus,
          featured,
          media: imageUrl.trim()
            ? [{ url: imageUrl.trim(), altText: name.trim(), sortOrder: 0, type: 'IMAGE' }]
            : [],
        });
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save product';
      setErrorMsg(msg);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Product' : 'Add New Product'}</DialogTitle>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 text-sm text-red-700 bg-red-50 rounded-md border border-red-200">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Brand *
              </label>
              <select
                disabled={Boolean(product)}
                value={brandId}
                onChange={(e) => {
                  setBrandId(e.target.value);
                  setCategoryId('');
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">No Category</option>
                {categoryData?.categories?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Royal Oud Eau De Parfum"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                SKU *
              </label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. OUD-ROYAL-100"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Base Price
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="2499.00"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Currency
              </label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Slug (Optional)
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="auto-generated-if-empty"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Short Description
            </label>
            <input
              type="text"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="Brief overview for search cards and listings"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Full Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed specifications, notes, ingredients..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Publishing
              </label>
              <select
                value={publishStatus}
                onChange={(e) => setPublishStatus(e.target.value as 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="DRAFT">DRAFT</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="UNPUBLISHED">UNPUBLISHED</option>
              </select>
            </div>

            <div className="flex items-center pt-6 space-x-2">
              <input
                type="checkbox"
                id="featured"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="featured" className="text-sm font-medium text-gray-700 cursor-pointer">
                Featured Product
              </label>
            </div>
          </div>

          {!product && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Primary Image URL (Optional)
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/images/product.jpg"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {product ? 'Save Changes' : 'Create Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
