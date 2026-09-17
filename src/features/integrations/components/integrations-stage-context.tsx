import { Tag, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface StageContextProps {
  brands: Array<{ id: string; name: string; slug: string }>;
  onContinue: () => void;
}

export function IntegrationsStageContext({ brands, onContinue }: StageContextProps) {
  return (
    <Card className="border-slate-200 shadow-xs">
      <CardHeader>
        <CardTitle className="text-sm font-bold text-slate-900">
          Stage 1: Choose Brand & Reporting Scope
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">
          Confirm the client brand and scope for Google data authorization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800">Target Client Brands</span>
            <span className="text-slate-500">{brands.length} brand registered</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {brands.map((b) => (
              <div key={b.id} className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200 shadow-xs">
                <Tag className="h-3.5 w-3.5 text-indigo-600" />
                <span className="font-semibold text-slate-800">{b.name}</span>
                <span className="font-mono text-[10px] text-slate-400">({b.slug})</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 text-slate-700 space-y-2">
          <p className="font-semibold text-indigo-900">Permissions Requested During OAuth:</p>
          <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
            <li><strong>Google Business Profile:</strong> Read business information and aggregate performance metrics.</li>
            <li><strong>Google Search Console:</strong> Read-only search analytics data (queries, pages, country, position).</li>
          </ul>
          <p className="text-[11px] text-slate-500 pt-1">
            localBi strictly preserves tenant isolation. Tokens are encrypted server-side with AES-256-GCM.
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <Button size="sm" onClick={onContinue} className="flex items-center gap-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white">
            <span>Continue to Authorization</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
