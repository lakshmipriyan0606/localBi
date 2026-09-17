'use client';

import { useState } from 'react';
import { Edit2, Archive, RotateCcw, AlertCircle, Loader2 } from 'lucide-react';
import { BrandDto } from '../types/brand-dto';
import { BrandEditDialog } from './brand-edit-dialog';
import { useArchiveBrandMutation } from '../hooks/use-brands';
import { normalizeApiError } from '@/lib/http/api-error';
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
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface BrandTableProps {
  tenantSlug: string;
  brands: BrandDto[] | undefined;
  isLoading: boolean;
  onAddBrandClick?: () => void;
}

export function BrandTable({
  tenantSlug,
  brands,
  isLoading,
  onAddBrandClick,
}: BrandTableProps) {
  const [editingBrand, setEditingBrand] = useState<BrandDto | null>(null);
  const [archivingBrand, setArchivingBrand] = useState<BrandDto | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const archiveMutation = useArchiveBrandMutation(tenantSlug);

  const handleConfirmArchive = async () => {
    if (!archivingBrand) return;
    setActionError(null);
    try {
      await archiveMutation.mutateAsync({
        brandId: archivingBrand.id,
        version: archivingBrand.version,
      });
      setArchivingBrand(null);
    } catch (err) {
      const normalized = normalizeApiError(err);
      setActionError(normalized.message);
    }
  };

  return (
    <div className="space-y-4">
      {actionError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Brand Name</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={`skeleton-row-${i}`}>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
              </TableRow>
            ))
          ) : !brands || brands.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-48 p-0">
                <EmptyState
                  title="No brands found"
                  description="No brand identities match the current search or filters. Click 'Add Brand' to create one."
                  action={
                    onAddBrandClick && (
                      <Button variant="outline" size="sm" onClick={onAddBrandClick}>
                        Add your first brand
                      </Button>
                    )
                  }
                  className="border-none rounded-none"
                />
              </TableCell>
            </TableRow>
          ) : (
            brands.map((brand) => {
              const isActive = brand.status ? brand.status === 'ACTIVE' : !brand.isArchived;
              const statusLabel = brand.status ?? (brand.isArchived ? 'ARCHIVED' : 'ACTIVE');

              return (
                <TableRow key={brand.id}>
                  <TableCell className="font-semibold text-slate-900">
                    {brand.name}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {brand.slug}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={isActive ? 'success' : 'neutral'}
                      className="capitalize"
                    >
                      {statusLabel.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-400 font-mono">
                    v{brand.version}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {new Date(brand.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingBrand(brand)}
                        id={`edit-brand-${brand.slug}`}
                        className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900"
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant={isActive ? 'outline' : 'secondary'}
                        size="sm"
                        onClick={() => setArchivingBrand(brand)}
                        id={`archive-brand-${brand.slug}`}
                        className="h-8 px-2.5 text-xs text-slate-600 hover:text-red-700 hover:border-red-300"
                      >
                        {isActive ? (
                          <>
                            <Archive className="h-3 w-3 mr-1 text-slate-400" />
                            Archive
                          </>
                        ) : (
                          <>
                            <RotateCcw className="h-3 w-3 mr-1 text-emerald-600" />
                            Restore
                          </>
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* Edit Dialog */}
      <BrandEditDialog
        tenantSlug={tenantSlug}
        brand={editingBrand}
        open={Boolean(editingBrand)}
        onOpenChange={(open) => !open && setEditingBrand(null)}
      />

      {/* Archive / Restore Confirmation Dialog (Accessible modal replacing window.confirm) */}
      <Dialog
        open={Boolean(archivingBrand)}
        onOpenChange={(open) => !open && setArchivingBrand(null)}
      >
        <DialogContent className="sm:max-w-md">
          {(() => {
            const isArchivingActive = archivingBrand
              ? (archivingBrand.status ? archivingBrand.status === 'ACTIVE' : !archivingBrand.isArchived)
              : false;

            return (
              <>
                <DialogHeader>
                  <DialogTitle>
                    {isArchivingActive ? 'Archive Brand' : 'Restore Brand'}
                  </DialogTitle>
                  <DialogDescription>
                    {isArchivingActive
                      ? `Are you sure you want to archive brand "${archivingBrand?.name}"? Its locations will remain associated.`
                      : `Reactivate brand "${archivingBrand?.name}"? It will become active for all authorized members.`}
                  </DialogDescription>
                </DialogHeader>

                <DialogFooter className="pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setArchivingBrand(null)}
                    disabled={archiveMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant={isArchivingActive ? 'destructive' : 'default'}
                    onClick={handleConfirmArchive}
                    disabled={archiveMutation.isPending}
                    id="confirm-brand-status-btn"
                  >
                    {archiveMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : isArchivingActive ? (
                      'Archive Brand'
                    ) : (
                      'Restore Brand'
                    )}
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
