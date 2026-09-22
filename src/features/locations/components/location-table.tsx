'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Edit2, Archive, RotateCcw, AlertCircle, Loader2, ArrowUpRight } from 'lucide-react';
import { LocationDto } from '../types/location-dto';
import { LocationEditDialog } from './location-edit-dialog';
import { useArchiveLocationMutation } from '../hooks/use-locations';
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
import { AnalyticsLoader } from '@/components/ui/analytics-loader';
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

interface LocationTableProps {
  tenantSlug: string;
  locations: LocationDto[] | undefined;
  isLoading: boolean;
  onAddLocationClick?: () => void;
}

export function LocationTable({
  tenantSlug,
  locations,
  isLoading,
  onAddLocationClick,
}: LocationTableProps) {
  const [editingLocation, setEditingLocation] = useState<LocationDto | null>(null);
  const [archivingLocation, setArchivingLocation] = useState<LocationDto | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const archiveMutation = useArchiveLocationMutation(tenantSlug);

  const handleConfirmArchive = async () => {
    if (!archivingLocation) return;
    setActionError(null);
    try {
      await archiveMutation.mutateAsync({
        locationId: archivingLocation.id,
        version: archivingLocation.version,
      });
      setArchivingLocation(null);
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
            <TableHead>Store Code</TableHead>
            <TableHead>Location Name</TableHead>
            <TableHead>Address / City</TableHead>
            <TableHead>Country / TZ</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Version</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7} className="py-10 text-center">
                <AnalyticsLoader variant="table" message="Loading store locations..." />
              </TableCell>
            </TableRow>
          ) : !locations || locations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-48 p-0">
                <EmptyState
                  title="No locations found"
                  description="No store locations match the current search or filters. Click 'Add Location' to register one."
                  action={
                    onAddLocationClick && (
                      <Button variant="outline" size="sm" onClick={onAddLocationClick}>
                        Register a store location
                      </Button>
                    )
                  }
                  className="border-none rounded-none"
                />
              </TableCell>
            </TableRow>
          ) : (
            locations.map((loc) => {
              const isActive = loc.status ? loc.status === 'ACTIVE' : !loc.isArchived;
              const statusLabel = loc.status ?? (loc.isArchived ? 'ARCHIVED' : 'ACTIVE');
              const stateDisplay = loc.stateRegion || loc.state || '';
              const countryDisplay = loc.countryCode || loc.country || '';

              return (
                <TableRow key={loc.id}>
                  <TableCell>
                    <code className="text-xs font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded font-semibold">
                      {loc.storeCode}
                    </code>
                  </TableCell>
                  <TableCell className="font-semibold text-slate-900">
                    <Link
                      href={`/client/${tenantSlug}/locations/${loc.id}`}
                      className="text-slate-900 hover:text-indigo-600 hover:underline inline-flex items-center gap-1 group cursor-pointer"
                    >
                      <span>{loc.name}</span>
                      <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                    {loc.brandName && (
                      <div className="text-xs font-normal text-slate-400 mt-0.5">
                        {loc.brandName}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    <div>{loc.addressLine1}</div>
                    <div className="text-slate-400">
                      {loc.city}{stateDisplay ? `, ${stateDisplay}` : ''} {loc.postalCode}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 font-mono">
                    <div>{countryDisplay}</div>
                    <div className="text-[11px] text-slate-400">{loc.timezone}</div>
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
                    v{loc.version}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingLocation(loc)}
                        id={`edit-location-${loc.storeCode}`}
                        className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900"
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant={isActive ? 'outline' : 'secondary'}
                        size="sm"
                        onClick={() => setArchivingLocation(loc)}
                        id={`archive-location-${loc.storeCode}`}
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
      <LocationEditDialog
        tenantSlug={tenantSlug}
        location={editingLocation}
        open={Boolean(editingLocation)}
        onOpenChange={(open) => !open && setEditingLocation(null)}
      />

      {/* Archive / Restore Confirmation Dialog */}
      <Dialog
        open={Boolean(archivingLocation)}
        onOpenChange={(open) => !open && setArchivingLocation(null)}
      >
        <DialogContent className="sm:max-w-md">
          {(() => {
            const isArchivingActive = archivingLocation
              ? (archivingLocation.status ? archivingLocation.status === 'ACTIVE' : !archivingLocation.isArchived)
              : false;

            return (
              <>
                <DialogHeader>
                  <DialogTitle>
                    {isArchivingActive ? 'Archive Location' : 'Restore Location'}
                  </DialogTitle>
                  <DialogDescription>
                    {isArchivingActive
                      ? `Are you sure you want to archive location "${archivingLocation?.name}" (${archivingLocation?.storeCode})?`
                      : `Reactivate location "${archivingLocation?.name}" (${archivingLocation?.storeCode})?`}
                  </DialogDescription>
                </DialogHeader>

                <DialogFooter className="pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setArchivingLocation(null)}
                    disabled={archiveMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant={isArchivingActive ? 'destructive' : 'default'}
                    onClick={handleConfirmArchive}
                    disabled={archiveMutation.isPending}
                    id="confirm-location-status-btn"
                  >
                    {archiveMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : isArchivingActive ? (
                      'Archive Location'
                    ) : (
                      'Restore Location'
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
