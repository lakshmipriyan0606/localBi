'use client';

import React from 'react';
import { Calendar, Search, MapPin, ArrowRight, CheckCircle2, Clock } from 'lucide-react';

interface HistoryTableProps {
  history: any[];
  onSelectAnalysis: (analysisId: string) => void;
}

export function HistoryTable({ history, onSelectAnalysis }: HistoryTableProps) {
  if (history.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 text-slate-400 text-xs">
        No previous SEO analyses recorded for this workspace.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Analysis History</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Previous landing page scans and competitor comparison records.
          </p>
        </div>
        <span className="text-xs text-slate-400 font-mono">{history.length} Runs</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
              <th className="py-3 px-4">Date & Time</th>
              <th className="py-3 px-4">Target Keyword</th>
              <th className="py-3 px-4">Location</th>
              <th className="py-3 px-4">Target Page</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-center">Competitors</th>
              <th className="py-3 px-4 text-center">Opportunities</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {history.map((item) => {
              const compCount = Array.isArray(item.selectedCompetitors) ? item.selectedCompetitors.length : 0;
              const oppCount = Array.isArray(item.createdOpportunityIds) ? item.createdOpportunityIds.length : 0;
              const dateStr = new Date(item.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-slate-500">{dateStr}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{item.keyword}</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 text-slate-600">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {item.searchLocation}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 truncate max-w-[200px]" title={item.targetUrl}>
                    {item.targetUrl}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : item.status === 'PARTIAL'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center font-semibold text-slate-800">{compCount}</td>
                  <td className="py-3.5 px-4 text-center font-semibold text-indigo-600">{oppCount}</td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => onSelectAnalysis(item.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                    >
                      <span>View</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
