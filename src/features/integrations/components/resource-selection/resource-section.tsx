import React, { useState } from "react";
import { Search } from "lucide-react";
import { GoogleProductIcon, GoogleProduct } from "../google-product-icon";

interface ResourceSectionProps {
  product: GoogleProduct;
  title: string;
  totalCount: number;
  selectedCount: number;
  unitLabel: string;
  onSelectAll?: (selected: boolean) => void;
  children: React.ReactNode;
}

export function ResourceSection({
  product,
  title,
  totalCount,
  selectedCount,
  unitLabel,
  onSelectAll,
  children,
}: ResourceSectionProps) {
  const [search, setSearch] = useState("");
  const isAllSelected = totalCount > 0 && selectedCount === totalCount;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden mb-6">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <GoogleProductIcon product={product} size="md" className="shadow-none" />
          <h3 className="text-[16px] font-bold text-slate-900">{title}</h3>
          
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full uppercase tracking-tight">
              {selectedCount} of {totalCount} selected
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 justify-between sm:justify-end">
          <span className="text-[13px] font-bold text-slate-400 sm:hidden">
            {totalCount} {unitLabel}
          </span>
          <span className="text-[13px] font-bold text-slate-400 hidden sm:inline-block">
            {totalCount} {unitLabel}
          </span>
          
          {onSelectAll && totalCount > 0 && (
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={(e) => onSelectAll(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#5138EE] focus:ring-[#5138EE]/50 cursor-pointer"
              />
              <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">Select All</span>
            </label>
          )}
        </div>
      </div>

      {/* Search & List */}
      <div className="bg-slate-50/30">
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${unitLabel.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 shadow-2xs"
            />
          </div>
        </div>
        <div className="flex flex-col">
          {children}
          {totalCount === 0 && (
            <div className="p-8 text-center flex flex-col items-center justify-center">
              <p className="text-slate-500 text-sm">No {unitLabel.toLowerCase()} found for this account.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
