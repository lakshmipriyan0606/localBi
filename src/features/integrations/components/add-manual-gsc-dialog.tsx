'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BrandOption } from './steps/select-google-resources-step';
import { Globe, RefreshCw, CheckCircle2, ShieldCheck } from 'lucide-react';
import { notify } from '@/lib/notify';

interface AddManualGscDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brands: BrandOption[];
  connectedEmail: string;
  onAdd: (siteUrl: string, brandId?: string) => Promise<void>;
}

export function AddManualGscDialog({
  open,
  onOpenChange,
  brands,
  connectedEmail,
  onAdd,
}: AddManualGscDialogProps) {
  const [siteUrl, setSiteUrl] = useState('');
  const [brandId, setBrandId] = useState<string>(brands[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = siteUrl.trim();
    if (!cleanUrl) {
      notify.error('Please enter a website URL or domain.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAdd(cleanUrl, brandId || undefined);
      setSiteUrl('');
      onOpenChange(false);
    } catch (err: unknown) {
      // notify is handled by caller or here
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white rounded-2xl p-6 shadow-xl border border-slate-200">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
              <Globe className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Google Search Console</span>
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Add GSC Property Without Re-authenticating
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              If you just added a new property on Google Search Console, enter the URL or domain below. LocalBi will verify access using your connected Google account (<strong className="text-slate-700">{connectedEmail}</strong>) without asking you to log in again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Website URL or Domain Property <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                placeholder="https://example.com/ or sc-domain:example.com"
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono text-slate-800"
              />
              <p className="text-[11px] text-slate-400">
                Supports URL-prefix (e.g. <code>https://mysite.com/</code>) or domain properties (e.g. <code>sc-domain:mysite.com</code>).
              </p>
            </div>

            {brands.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Assign to Brand Immediately (Optional)
                </label>
                <select
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold text-slate-800 cursor-pointer"
                >
                  <option value="">Leave Unmapped (Assign Later)</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      Map to {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-[11px] text-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Zero OAuth re-prompt: LocalBi verifies permissions in the background via your stored token.
              </span>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
              className="text-xs font-semibold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-[#3B49DF] hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying &amp; Adding...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verify &amp; Add Property</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
