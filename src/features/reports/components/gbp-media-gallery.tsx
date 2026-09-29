'use client';

import { useState } from 'react';
import { useGbpMedia, useSyncGbpMedia, useCreateGbpMedia, useDeleteGbpMedia } from '../hooks/use-gbp-media';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Plus, RefreshCw, Trash2, Image as ImageIcon, Video, Link } from 'lucide-react';
import { useReportsQueryState } from '../hooks/use-reports-query-state';
import { NiceSelect } from '@/components/ui/nice-select';

export interface GbpMediaGalleryProps {
  tenantSlug: string;
  tenantName: string;
  brands: Array<{ id: string; name: string }>;
  locations: Array<{ id: string; name: string; brandId: string }>;
  initialBrandId: string;
  isConnected: boolean;
}

export function GbpMediaGallery({ tenantSlug, locations, initialBrandId, isConnected }: GbpMediaGalleryProps) {
  const { state, setLocationId } = useReportsQueryState({ brandId: initialBrandId });
  const selectedLocationId = state.locationId || locations[0]?.id;

  const { data, isLoading } = useGbpMedia({ 
    tenantSlug, 
    brandId: state.brandId || initialBrandId, 
    ...(state.locationId ? { locationId: state.locationId } : {}) 
  });
  const syncMutation = useSyncGbpMedia();
  const createMutation = useCreateGbpMedia();
  const deleteMutation = useDeleteGbpMedia();

  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({ category: 'EXTERIOR', sourceUrl: '', mediaFormat: 'PHOTO' });

  const handleSync = () => {
    if (selectedLocationId) {
      syncMutation.mutate({ tenantSlug, locationId: selectedLocationId });
    }
  };

  const handleUpload = () => {
    if (selectedLocationId) {
      createMutation.mutate(
        {
          tenantSlug,
          locationId: selectedLocationId,
          data: {
            mediaFormat: formData.mediaFormat,
            locationAssociation: { category: formData.category },
            sourceUrl: formData.sourceUrl,
          }
        },
        { onSuccess: () => { setIsUploading(false); setFormData({...formData, sourceUrl: ''}); } }
      );
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-white border rounded-xl p-12 text-center">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold">Google Integration Required</h3>
        <p className="text-slate-500 mt-2">Connect your Google Business Profile to manage photos and videos.</p>
      </div>
    );
  }

  const mediaItems = data?.items || [];
  const locationOptions = locations.map(l => ({ id: l.id, name: l.name, value: l.id, label: l.name }));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Photos & Media</h2>
          <p className="text-sm text-slate-500">Manage business photos on Google</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="w-64">
            <NiceSelect
              options={locationOptions}
              value={selectedLocationId || ''}
              onChange={(val) => setLocationId(val)}
              placeholder="Select Location"
            />
          </div>
          <Button onClick={handleSync} disabled={syncMutation.isPending} variant="outline" className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            Sync
          </Button>
          <Button onClick={() => setIsUploading(!isUploading)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Upload Media
          </Button>
        </div>
      </div>

      <div className="p-6">
        {isUploading && (
          <div className="mb-8 p-5 border border-indigo-100 bg-indigo-50/30 rounded-xl space-y-4">
            <h3 className="font-semibold text-indigo-900 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Upload New Media
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Media Type</Label>
                <select 
                  className="w-full text-sm p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.mediaFormat}
                  onChange={(e) => setFormData({...formData, mediaFormat: e.target.value})}
                >
                  <option value="PHOTO">Photo</option>
                  <option value="VIDEO">Video</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select 
                  className="w-full text-sm p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  <option value="EXTERIOR">Exterior</option>
                  <option value="INTERIOR">Interior</option>
                  <option value="PRODUCT">Product</option>
                  <option value="AT_WORK">At Work</option>
                  <option value="FOOD_AND_DRINK">Food & Drink</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Source URL (Publicly accessible image link)</Label>
              <div className="flex gap-2">
                <Input 
                  value={formData.sourceUrl} 
                  onChange={(e) => setFormData({...formData, sourceUrl: e.target.value})} 
                  placeholder="https://example.com/image.jpg" 
                  className="flex-grow"
                />
              </div>
              <p className="text-xs text-slate-500">Google will download the media directly from this URL.</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setIsUploading(false)}>Cancel</Button>
              <Button onClick={handleUpload} disabled={createMutation.isPending || !formData.sourceUrl}>
                {createMutation.isPending ? 'Uploading...' : 'Upload to Google'}
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="animate-pulse bg-slate-50 aspect-square rounded-xl" />)}
          </div>
        ) : mediaItems.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No media found.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {mediaItems.map((media: any) => (
              <div key={media.id} className="group relative border border-slate-200 rounded-xl overflow-hidden aspect-square bg-slate-100 flex items-center justify-center">
                <img 
                  src={media.thumbnailUrl || media.sourceUrl} 
                  alt={media.category} 
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23f1f5f9"/></svg>' }}
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4 text-white text-center">
                  <span className="text-xs font-semibold px-2 py-1 bg-white/20 rounded-md backdrop-blur-sm">
                    {media.category}
                  </span>
                  <div className="flex gap-2 mt-2">
                    <a href={media.sourceUrl} target="_blank" rel="noreferrer" className="p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-colors">
                      <Link className="w-4 h-4" />
                    </a>
                    <button 
                      onClick={() => {
                        if(confirm('Delete this media from Google?')) {
                          deleteMutation.mutate({ tenantSlug, locationId: selectedLocationId!, mediaId: media.mediaKey });
                        }
                      }}
                      className="p-2 bg-red-500/80 hover:bg-red-500 rounded-full backdrop-blur-sm transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {media.mediaFormat === 'VIDEO' && (
                  <div className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-md backdrop-blur-sm">
                    <Video className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
