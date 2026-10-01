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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { CategoryDto } from '../types/catalog-dto';
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useArchiveCategory,
} from '../hooks/use-catalog';
import { Plus, Edit2, Archive, Tags, Loader2, AlertCircle } from 'lucide-react';

interface CategoryManagerProps {
  tenantSlug: string;
  brands: Array<{ id: string; name: string }>;
}

export function CategoryManager({ tenantSlug, brands }: CategoryManagerProps) {
  const [selectedBrandId, setSelectedBrandId] = useState<string>(brands[0]?.id || '');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryDto | null>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data, isLoading, error } = useCategories(
    tenantSlug,
    selectedBrandId ? { brandId: selectedBrandId } : {}
  );

  const createMutation = useCreateCategory(tenantSlug);
  const updateMutation = useUpdateCategory(tenantSlug);
  const archiveMutation = useArchiveCategory(tenantSlug);

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setDescription('');
    setParentId('');
    setSortOrder(0);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: CategoryDto) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setParentId(cat.parentId || '');
    setSortOrder(cat.sortOrder || 0);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleArchive = async (catId: string) => {
    if (confirm('Are you sure you want to archive this category?')) {
      await archiveMutation.mutateAsync(catId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Category name is required');
      return;
    }

    try {
      if (editingCategory) {
        await updateMutation.mutateAsync({
          categoryId: editingCategory.id,
          data: {
            name: name.trim(),
            slug: slug.trim() || undefined,
            description: description.trim() || null,
            parentId: parentId || null,
            sortOrder,
          },
        });
      } else {
        await createMutation.mutateAsync({
          brandId: selectedBrandId,
          name: name.trim(),
          slug: slug.trim() || undefined,
          description: description.trim() || null,
          parentId: parentId || null,
          sortOrder,
        });
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save category';
      setErrorMsg(msg);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      {/* Brand Selection Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
            Brand Catalog:
          </label>
          <select
            value={selectedBrandId}
            onChange={(e) => setSelectedBrandId(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white min-w-[200px]"
          >
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <Button onClick={handleOpenCreate} className="flex items-center gap-1.5">
          <Plus className="h-4 w-4" />
          <span>Add Category</span>
        </Button>
      </div>

      {/* Categories Table */}
      {isLoading ? (
        <div className="p-12 flex justify-center">
          <AnalyticsLoader />
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>Failed to load categories.</span>
        </div>
      ) : !data?.categories || data.categories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No categories defined"
          description="Categories organize your products across brands and store shelves."
          action={<Button onClick={handleOpenCreate}>Add Category</Button>}
        />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Parent Category</TableHead>
                <TableHead>Sort Order</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-semibold text-gray-900">
                    {cat.name}
                    {cat.description && (
                      <div className="text-xs font-normal text-gray-500 truncate max-w-xs">
                        {cat.description}
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="font-mono text-xs text-gray-600">
                    {cat.slug}
                  </TableCell>

                  <TableCell>
                    {cat.parent ? (
                      <Badge variant="outline" className="text-xs">
                        {cat.parent.name}
                      </Badge>
                    ) : (
                      <span className="text-xs text-gray-400 italic">None (Root)</span>
                    )}
                  </TableCell>

                  <TableCell className="text-sm text-gray-700">
                    {cat.sortOrder}
                  </TableCell>

                  <TableCell>
                    <Badge variant="secondary">
                      {cat.productCount ?? 0} Products
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Badge
                      className={
                        cat.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-gray-100 text-gray-800 border-gray-200'
                      }
                    >
                      {cat.status}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenEdit(cat)}
                        title="Edit category"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleArchive(cat.id)}
                        title="Archive category"
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

      {/* Create / Edit Dialog */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && setIsModalOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Create Category'}
            </DialogTitle>
          </DialogHeader>

          {errorMsg && (
            <div className="p-3 text-sm text-red-700 bg-red-50 rounded-md border border-red-200">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Category Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Attar, Oud, Gift Sets"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Parent Category (Optional Hierarchy)
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">None (Top-Level Category)</option>
                {data?.categories
                  ?.filter((c) => !editingCategory || c.id !== editingCategory.id)
                  ?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Sort Order
              </label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Description
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short summary of this category"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingCategory ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
