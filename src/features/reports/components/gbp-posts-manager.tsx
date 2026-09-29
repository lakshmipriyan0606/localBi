'use client';

import { useState } from 'react';
import { useGbpPosts, useSyncGbpPosts, useCreateGbpPost, useDeleteGbpPost } from '../hooks/use-gbp-posts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Plus, RefreshCw, Trash2, Calendar, FileText, Tag as TagIcon } from 'lucide-react';
import { useReportsQueryState } from '../hooks/use-reports-query-state';
import { NiceSelect } from '@/components/ui/nice-select';

export interface GbpPostsManagerProps {
  tenantSlug: string;
  tenantName: string;
  brands: Array<{ id: string; name: string }>;
  locations: Array<{ id: string; name: string; brandId: string }>;
  initialBrandId: string;
  isConnected: boolean;
}

export function GbpPostsManager({ tenantSlug, locations, initialBrandId, isConnected }: GbpPostsManagerProps) {
  const { state, setLocationId } = useReportsQueryState({ brandId: initialBrandId });
  const selectedLocationId = state.locationId || locations[0]?.id;

  const { data, isLoading } = useGbpPosts({ 
    tenantSlug, 
    brandId: state.brandId || initialBrandId, 
    ...(state.locationId ? { locationId: state.locationId } : {}) 
  });
  const syncMutation = useSyncGbpPosts();
  const createMutation = useCreateGbpPost();
  const deleteMutation = useDeleteGbpPost();

  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ topicType: 'STANDARD', summary: '', callToActionType: 'LEARN_MORE', callToActionUrl: '' });

  const handleSync = () => {
    if (selectedLocationId) {
      syncMutation.mutate({ tenantSlug, locationId: selectedLocationId });
    }
  };

  const handleCreate = () => {
    if (selectedLocationId) {
      createMutation.mutate(
        {
          tenantSlug,
          locationId: selectedLocationId,
          data: {
            topicType: formData.topicType,
            summary: formData.summary,
            languageCode: 'en-US',
            callToAction: {
              actionType: formData.callToActionType,
              url: formData.callToActionUrl,
            }
          }
        },
        { onSuccess: () => setIsCreating(false) }
      );
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-white border rounded-xl p-12 text-center">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold">Google Integration Required</h3>
        <p className="text-slate-500 mt-2">Connect your Google Business Profile to manage posts.</p>
      </div>
    );
  }

  const posts = data?.items || [];
  const locationOptions = locations.map(l => ({ id: l.id, name: l.name, value: l.id, label: l.name }));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Posts Manager</h2>
          <p className="text-sm text-slate-500">Publish updates and offers to Google</p>
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
          <Button onClick={() => setIsCreating(!isCreating)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Post
          </Button>
        </div>
      </div>

      <div className="p-6">
        {isCreating && (
          <div className="mb-8 p-5 border border-indigo-100 bg-indigo-50/30 rounded-xl space-y-4">
            <h3 className="font-semibold text-indigo-900 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Create New Post
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Post Type</Label>
                <select 
                  className="w-full text-sm p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.topicType}
                  onChange={(e) => setFormData({...formData, topicType: e.target.value})}
                >
                  <option value="STANDARD">Update</option>
                  <option value="EVENT">Event</option>
                  <option value="OFFER">Offer</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Message Content</Label>
              <textarea 
                className="w-full text-sm p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                rows={4}
                value={formData.summary}
                onChange={(e) => setFormData({...formData, summary: e.target.value})}
                placeholder="What's new?"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Button Type</Label>
                <select 
                  className="w-full text-sm p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.callToActionType}
                  onChange={(e) => setFormData({...formData, callToActionType: e.target.value})}
                >
                  <option value="LEARN_MORE">Learn More</option>
                  <option value="BOOK">Book</option>
                  <option value="ORDER">Order Online</option>
                  <option value="SHOP">Shop</option>
                  <option value="SIGN_UP">Sign Up</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Button Link</Label>
                <Input value={formData.callToActionUrl} onChange={(e) => setFormData({...formData, callToActionUrl: e.target.value})} placeholder="https://" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending || !formData.summary}>
                {createMutation.isPending ? 'Publishing...' : 'Publish to Google'}
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map(i => <div key={i} className="animate-pulse bg-slate-50 h-48 rounded-xl" />)}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No posts found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.map((post: any) => (
              <div key={post.id} className="border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors bg-white shadow-sm flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-2 items-center">
                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-md">
                      {post.topicType}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-md ${post.state === 'LIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {post.state}
                    </span>
                  </div>
                  <button 
                    onClick={() => {
                      if(confirm('Delete this post from Google?')) {
                        deleteMutation.mutate({ tenantSlug, locationId: selectedLocationId!, postId: post.postId });
                      }
                    }} 
                    className="text-slate-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-sm text-slate-700 whitespace-pre-wrap flex-grow mb-4">{post.summary}</p>
                
                {post.callToAction && (
                  <div className="bg-slate-50 rounded-lg p-3 flex justify-between items-center mt-auto mb-4 border border-slate-100">
                    <span className="text-xs font-semibold text-slate-600">{post.callToAction.actionType}</span>
                    <a href={post.callToAction.url} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline truncate max-w-[200px]">
                      {post.callToAction.url}
                    </a>
                  </div>
                )}

                <div className="flex items-center gap-4 text-xs text-slate-500 border-t border-slate-100 pt-3 mt-auto">
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(post.createTime).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1"><TagIcon className="w-3.5 h-3.5" /> {post.location?.name}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
