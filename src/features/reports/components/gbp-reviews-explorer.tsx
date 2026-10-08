'use client';

import { useState } from 'react';
import { Star, MessageSquare, Clock, Trash2, Edit2, RefreshCw, AlertCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGbpReviews, useSyncGbpReviews, useReplyToReview, useDeleteReviewReply } from '../hooks/use-gbp-reviews';

interface Review {
  id: string;
  reviewId: string;
  reviewerName: string;
  rating: number;
  comment: string | null;
  replyComment: string | null;
  replyUpdatedAt: string | null;
  createTime: string;
  updateTime: string;
  location: { name: string; storeCode: string | null };
}

export interface GbpReviewsExplorerProps {
  tenantSlug: string;
  tenantName: string;
  brands: Array<{ id: string; name: string }>;
  locations: Array<{ id: string; name: string }>;
  initialBrandId: string;
  isConnected: boolean;
}

import { useActiveBrand } from '@/providers/active-brand-context';

export function GbpReviewsExplorer({
  tenantSlug,
  initialBrandId,
  isConnected,
}: GbpReviewsExplorerProps) {
  const brandCtx = useActiveBrand();
  const effectiveBrandId = brandCtx?.activeBrandId || initialBrandId;

  const [filterBy, setFilterBy] = useState<'all' | 'replied' | 'unreplied' | 'low'>('all');
  const [page, setPage] = useState(1);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const { data, isLoading } = useGbpReviews({
    tenantSlug,
    brandId: effectiveBrandId,
    filterBy,
    page,
    pageSize: 10,
  });

  const syncMutation = useSyncGbpReviews();
  const replyMutation = useReplyToReview();
  const deleteMutation = useDeleteReviewReply();

  const handleSync = () => {
    syncMutation.mutate({ tenantSlug, brandId: effectiveBrandId });
  };

  const handleReplySubmit = (reviewId: string) => {
    replyMutation.mutate(
      { tenantSlug, reviewId, comment: replyText },
      {
        onSuccess: () => {
          setReplyingTo(null);
          setReplyText('');
        },
      }
    );
  };

  const handleDeleteReply = (reviewId: string) => {
    if (confirm('Are you sure you want to delete this reply?')) {
      deleteMutation.mutate({ tenantSlug, reviewId });
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-white border rounded-xl p-12 text-center">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold">Google Integration Required</h3>
        <p className="text-slate-500 mt-2">Connect your Google Business Profile to view and manage reviews.</p>
      </div>
    );
  }

  const reviews: Review[] = data?.items || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / 10);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Customer Reviews</h2>
          <p className="text-sm text-slate-500">Manage and reply to Google reviews</p>
        </div>
        <Button
          onClick={handleSync}
          disabled={syncMutation.isPending}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700"
        >
          <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
          {syncMutation.isPending ? 'Syncing...' : 'Sync Now'}
        </Button>
      </div>

      <div className="px-6 py-4 flex gap-2 border-b border-slate-100">
        {(['all', 'replied', 'unreplied', 'low'] as const).map((f) => (
          <button
            key={f}
            onClick={() => { setFilterBy(f); setPage(1); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filterBy === f ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-slate-50 h-32 rounded-xl" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No reviews found for this filter.</div>
        ) : (
          <div className="space-y-6">
            {reviews.map((review) => (
              <div key={review.id} className="border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{review.reviewerName}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" />
                      {new Date(review.createTime).toLocaleDateString()}
                      <span className="mx-1">•</span>
                      {review.location.name}
                    </p>
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${s <= review.rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-200'}`}
                      />
                    ))}
                  </div>
                </div>

                <p className="text-sm text-slate-700 whitespace-pre-wrap">{review.comment || <span className="italic text-slate-400">No comment provided</span>}</p>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  {review.replyComment ? (
                    replyingTo === review.reviewId ? (
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <textarea
                          className="w-full text-sm p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          rows={3}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <Button variant="ghost" onClick={() => setReplyingTo(null)}>Cancel</Button>
                          <Button onClick={() => handleReplySubmit(review.reviewId)} disabled={replyMutation.isPending}>
                            {replyMutation.isPending ? 'Saving...' : 'Update Reply'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-indigo-50/50 p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-xs font-semibold text-indigo-700 flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5" /> Owner Reply
                          </h4>
                          <div className="flex gap-2">
                            <button onClick={() => { setReplyingTo(review.reviewId); setReplyText(review.replyComment!); }} className="text-slate-400 hover:text-indigo-600 transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteReply(review.reviewId)} className="text-slate-400 hover:text-red-600 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{review.replyComment}</p>
                      </div>
                    )
                  ) : replyingTo === review.reviewId ? (
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <textarea
                        className="w-full text-sm p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        rows={3}
                        placeholder="Write a response..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <Button variant="ghost" onClick={() => setReplyingTo(null)}>Cancel</Button>
                        <Button onClick={() => handleReplySubmit(review.reviewId)} disabled={replyMutation.isPending} className="flex items-center gap-1">
                          <Send className="w-3.5 h-3.5" /> {replyMutation.isPending ? 'Sending...' : 'Post Reply'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="ghost" onClick={() => { setReplyingTo(review.reviewId); setReplyText(''); }} className="text-indigo-600 hover:bg-indigo-50">
                      Reply to Review
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <Button variant="ghost" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <span className="text-sm text-slate-500 py-2">Page {page} of {totalPages}</span>
                <Button variant="ghost" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
