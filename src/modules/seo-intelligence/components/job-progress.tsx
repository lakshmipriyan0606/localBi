'use client';

import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface JobProgressProps {
  tenantSlug: string;
  jobId: string;
  onCompleted: (jobId: string) => void;
  onFailed?: (error: string) => void;
}

export function JobProgress({ tenantSlug, jobId, onCompleted, onFailed }: JobProgressProps) {
  const [job, setJob] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let isMounted = true;

    async function checkStatus() {
      try {
        const res = await fetch(`/api/tenants/${tenantSlug}/seo/jobs/${jobId}`);
        const data = await res.json();
        if (!isMounted) return;

        if (data.success && data.job) {
          setJob(data.job);
          if (data.job.status === 'COMPLETED' || data.job.status === 'PARTIAL') {
            onCompleted(jobId);
          } else if (data.job.status === 'FAILED') {
            setError(data.job.errorMessage || 'Analysis failed');
            if (onFailed) onFailed(data.job.errorMessage || 'Analysis failed');
          } else {
            // Poll again in 1.5s
            timer = setTimeout(checkStatus, 1500);
          }
        } else {
          setError(data.error || 'Job not found');
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || 'Error checking job status');
      }
    }

    checkStatus();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [tenantSlug, jobId, onCompleted, onFailed]);

  if (error) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-xs">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <div>
          <p className="font-semibold">Analysis Encountered an Issue</p>
          <p className="text-[11px] mt-0.5">{error}</p>
        </div>
      </div>
    );
  }

  const percent = job?.progressPercent || 10;
  const stageDesc = job?.stageDescription || 'Analyzing search landscape...';
  const isDone = job?.status === 'COMPLETED' || job?.status === 'PARTIAL';

  return (
    <div className="p-6 bg-white rounded-2xl border border-indigo-100 shadow-sm space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {isDone ? (
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          )}
          <div>
            <h4 className="text-xs font-bold text-slate-900">
              {isDone ? 'Analysis Complete' : 'SEO Analysis in Progress'}
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">{stageDesc}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono font-bold text-indigo-600">{percent}%</span>
          <span className="block text-[10px] text-slate-400">Step {Math.min(9, Math.ceil(percent / 11))} of 9</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            isDone ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-indigo-600'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {job?.unavailableParts && job.unavailableParts.length > 0 && (
        <div className="pt-2 text-[11px] text-amber-700 bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/60 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>Notice: {job.unavailableParts.join(', ')} were unavailable; continuing with remaining signals.</span>
        </div>
      )}
    </div>
  );
}
