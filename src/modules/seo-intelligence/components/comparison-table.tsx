'use client';

import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Globe } from 'lucide-react';
import { SeoPageSignals, CompetitorCandidate } from '../seo-types';

interface ComparisonTableProps {
  clientSignals: SeoPageSignals;
  competitors: Array<{
    candidate: CompetitorCandidate;
    signals: SeoPageSignals;
  }>;
}

export function ComparisonTable({ clientSignals, competitors }: ComparisonTableProps) {
  const displayComps = competitors.slice(0, 3);

  const rows = [
    {
      label: 'Page Title',
      client: clientSignals.title || 'Missing',
      clientValid: Boolean(clientSignals.title),
      comps: displayComps.map((c) => ({
        domain: c.candidate.domain,
        val: c.signals.title || 'Missing',
        valid: Boolean(c.signals.title),
      })),
    },
    {
      label: 'Meta Description',
      client: clientSignals.metaDescription || 'Missing',
      clientValid: Boolean(clientSignals.metaDescription),
      comps: displayComps.map((c) => ({
        domain: c.candidate.domain,
        val: c.signals.metaDescription || 'Missing',
        valid: Boolean(c.signals.metaDescription),
      })),
    },
    {
      label: 'Main H1 Heading',
      client: clientSignals.headings.h1[0] || 'Missing',
      clientValid: clientSignals.headings.h1.length > 0,
      comps: displayComps.map((c) => ({
        domain: c.candidate.domain,
        val: c.signals.headings.h1[0] || 'Missing',
        valid: c.signals.headings.h1.length > 0,
      })),
    },
    {
      label: 'Canonical Tag',
      client: clientSignals.canonical ? 'Declared' : 'Missing',
      clientValid: Boolean(clientSignals.canonical),
      comps: displayComps.map((c) => ({
        domain: c.candidate.domain,
        val: c.signals.canonical ? 'Declared' : 'Missing',
        valid: Boolean(c.signals.canonical),
      })),
    },
    {
      label: 'Indexability Signal',
      client: clientSignals.indexability.isIndexable ? 'Indexable' : 'Blocked',
      clientValid: clientSignals.indexability.isIndexable,
      comps: displayComps.map((c) => ({
        domain: c.candidate.domain,
        val: c.signals.indexability.isIndexable ? 'Indexable' : 'Blocked',
        valid: c.signals.indexability.isIndexable,
      })),
    },
    {
      label: 'Schema Types',
      client: clientSignals.structuredDataTypes.join(', ') || 'None detected',
      clientValid: clientSignals.structuredDataTypes.length > 0,
      comps: displayComps.map((c) => ({
        domain: c.candidate.domain,
        val: c.signals.structuredDataTypes.join(', ') || 'None detected',
        valid: c.signals.structuredDataTypes.length > 0,
      })),
    },
    {
      label: 'Internal Links',
      client: `${clientSignals.internalLinkCount} links`,
      clientValid: clientSignals.internalLinkCount >= 3,
      comps: displayComps.map((c) => ({
        domain: c.candidate.domain,
        val: `${c.signals.internalLinkCount} links`,
        valid: c.signals.internalLinkCount >= 3,
      })),
    },
    {
      label: 'FAQ Elements',
      client: clientSignals.faqSignals.length > 0 ? `${clientSignals.faqSignals.length} FAQs` : 'None',
      clientValid: clientSignals.faqSignals.length > 0,
      comps: displayComps.map((c) => ({
        domain: c.candidate.domain,
        val: c.signals.faqSignals.length > 0 ? `${c.signals.faqSignals.length} FAQs` : 'None',
        valid: c.signals.faqSignals.length > 0,
      })),
    },
    {
      label: 'Word Count',
      client: `${clientSignals.wordCount} words`,
      clientValid: true,
      comps: displayComps.map((c) => ({
        domain: c.candidate.domain,
        val: `${c.signals.wordCount} words`,
        valid: true,
      })),
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">On-Page SEO Signal Comparison</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Factual technical signals compared directly against top Google Search competitors.
          </p>
        </div>
        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
          Source: Verified Safe Crawl
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
              <th className="py-3 px-4 w-1/4">Signal</th>
              <th className="py-3 px-4 w-1/4 bg-indigo-50/50 text-indigo-900 border-x border-indigo-100">
                Your Page (Client)
              </th>
              {displayComps.map((c, i) => (
                <th key={c.candidate.domain} className="py-3 px-4 w-1/6">
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-slate-200 text-[10px] font-bold flex items-center justify-center text-slate-700">
                      {i + 1}
                    </span>
                    <span className="truncate max-w-[120px]" title={c.candidate.domain}>
                      {c.candidate.domain}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {rows.map((r) => (
              <tr key={r.label} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3.5 px-4 font-semibold text-slate-900">{r.label}</td>
                <td className="py-3.5 px-4 bg-indigo-50/30 border-x border-indigo-100">
                  <div className="flex items-start gap-1.5">
                    {r.clientValid ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    )}
                    <span className="line-clamp-2">{r.client}</span>
                  </div>
                </td>
                {r.comps.map((c) => (
                  <td key={c.domain} className="py-3.5 px-4 text-slate-600">
                    <span className="line-clamp-2">{c.val}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
