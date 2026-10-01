'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AnalyticsLoader } from '@/components/ui/analytics-loader';
import { EmptyState } from '@/components/ui/empty-state';
import { ProductDto } from '../types/catalog-dto';
import { useProducts, useArchiveProduct } from '../hooks/use-catalog';
import { ProductFormModal } from './product-form-modal';
import { Search, Plus, Edit2, Archive, Package, AlertCircle } from 'lucide-react';

interface ProductListProps {
  tenantSlug: string;
  brands: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string; brandId: string }>;
}

export function ProductList({ tenantSlug, brands, categories }: ProductListProps) {
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [publishFilter, setPublishFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductDto | null>(null);

  const filters = {
    ...(selectedBrandId ? { brandId: selectedBrandId } : {}),
    ...(selectedCategoryId ? { categoryId: selectedCategoryId } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(publishFilter ? { publishStatus: publishFilter } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
  };

  const { data, isLoading, error } = useProducts(tenantSlug, filters);

  const archiveMutation = useArchiveProduct(tenantSlug);

  const handleArchive = async (productId: string) => {
    if (confirm('Are you sure you want to archive this product?')) {
      await archiveMutation.mutateAsync(productId);
    }
  };

  const handleEdit = (prod: ProductDto) => {
    setEditingProduct(prod);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const filteredCategories = selectedBrandId
    ? categories.filter((c) => c.brandId === selectedBrandId)
    : categories;

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[300px]">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by product name, SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Brand Filter */}
          <select
            value={selectedBrandId}
            onChange={(e) => {
              setSelectedBrandId(e.target.value);
              setSelectedCategoryId('');
            }}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">All Brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">All Categories</option>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">All Lifecycle</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>

          {/* Publish Filter */}
          <select
            value={publishFilter}
            onChange={(e) => setPublishFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">All Publishing</option>
            <option value="PUBLISHED">PUBLISHED</option>
            <option value="DRAFT">DRAFT</option>
            <option value="UNPUBLISHED">UNPUBLISHED</option>
          </select>
        </div>

        <Button onClick={handleAdd} className="flex items-center gap-1.5">
          <Plus className="h-4 w-4" />
          <span>Add Product</span>
        </Button>
      </div>

      {/* Table Content */}
      {isLoading ? (
        <div className="p-12 flex justify-center">
          <AnalyticsLoader />
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>Failed to load products.</span>
        </div>
      ) : !data?.products || data.products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products found"
          description="Get started by creating your first canonical product or running legacy backfill."
          action={<Button onClick={handleAdd}>Add Product</Button>}
        />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Base Price</TableHead>
                <TableHead>Stores Available</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Publishing</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.products.map((prod) => (
                <TableRow key={prod.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {prod.media && prod.media[0] ? (
                        <img
                          src={prod.media[0].url}
                          alt={prod.name}
                          className="h-10 w-10 rounded object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs border border-indigo-100">
                          {prod.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                          {prod.name}
                          {prod.featured && (
                            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300">
                              Featured
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{prod.slug}</div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="font-mono text-xs text-gray-700">
                    {prod.sku}
                  </TableCell>

                  <TableCell>
                    {prod.category ? (
                      <span className="text-xs font-medium text-gray-800 bg-gray-100 px-2 py-0.5 rounded">
                        {prod.category.name}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Uncategorized</span>
                    )}
                  </TableCell>

                  <TableCell className="font-semibold text-gray-900">
                    {prod.basePrice !== null ? `₹${Number(prod.basePrice).toLocaleString('en-IN')}` : '—'}
                  </TableCell>

                  <TableCell>
                    <Badge variant="secondary" className="font-semibold">
                      {prod.storesAvailableCount ?? 0} Stores
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Badge
                      className={
                        prod.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-gray-100 text-gray-800 border-gray-200'
                      }
                    >
                      {prod.status}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Badge
                      className={
                        prod.publishStatus === 'PUBLISHED'
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : prod.publishStatus === 'DRAFT'
                          ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                          : 'bg-red-100 text-red-800 border-red-200'
                      }
                    >
                      {prod.publishStatus}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(prod)}
                        title="Edit product"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleArchive(prod.id)}
                        title="Archive product"
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modal */}
      <ProductFormModal
        tenantSlug={tenantSlug}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={editingProduct}
        brands={brands}
      />
    </div>
  );
}
