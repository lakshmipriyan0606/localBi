'use client';

import { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/cn';

export interface ApiErrorAlertProps {
  message?: string | null | undefined;
  actualError?: string | null | undefined;
  className?: string;
  id?: string;
}

/**
 * Standard Dual-Layer Error Alert component:
 * 1. Shows a common, human-friendly error message
 * 2. Displays the actual technical/backend reason so developers & operators can diagnose immediately
 */
export function ApiErrorAlert({
  message,
  actualError,
  className,
  id = 'api-error-alert',
}: ApiErrorAlertProps) {
  const [copied, setCopied] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(true);

  if (!message && !actualError) {
    return null;
  }

  const displayMessage = message || 'An error occurred while processing your request.';

  const handleCopy = () => {
    if (!actualError) return;
    navigator.clipboard.writeText(actualError);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Alert variant="destructive" className={cn('relative', className)} id={id}>
      <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
      <div className="space-y-2 flex-1 min-w-0">
        <AlertDescription className="font-medium text-sm text-red-900 leading-snug">
          {displayMessage}
        </AlertDescription>

        {actualError && (
          <div className="mt-1.5 rounded-md border border-red-200 bg-red-100/80 p-2.5 text-xs text-red-950">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-semibold uppercase tracking-wider text-[10px] text-red-700 flex items-center gap-1">
                Actual Error Detail
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700 hover:text-red-900 px-1.5 py-0.5 rounded hover:bg-red-200/60 transition-colors"
                  title="Copy technical error"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setDetailsExpanded((prev) => !prev)}
                  className="text-red-700 hover:text-red-900 p-0.5"
                  title={detailsExpanded ? 'Collapse' : 'Expand'}
                >
                  {detailsExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            {detailsExpanded && (
              <pre className="font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all bg-white/70 p-2 rounded border border-red-200/60 select-all overflow-x-auto">
                {actualError}
              </pre>
            )}
          </div>
        )}
      </div>
    </Alert>
  );
}
