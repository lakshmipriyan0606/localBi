import { ArrowUpDown, ArrowUp, ArrowDown, Clock } from 'lucide-react';
import { ColumnDef } from './drilldown-view';
import { formatRelativeTime } from '@/shared/lib/formatters';

interface DrilldownTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  sortBy?: string | undefined;
  sortOrder?: ('asc' | 'desc') | undefined;
  onSort?: ((key: string) => void) | undefined;
}

export function DrilldownTable<T>({
  columns,
  data,
  sortBy,
  sortOrder = 'desc',
  onSort,
}: DrilldownTableProps<T>) {
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/75">
              {columns.map((col) => {
                const isSorted = sortBy === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={`px-4 py-3 text-xs font-semibold text-slate-600 ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    } ${col.className || ''}`}
                  >
                    {col.sortable && onSort ? (
                      <button
                        type="button"
                        onClick={() => onSort(col.key)}
                        className={`inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer ${
                          isSorted ? 'text-indigo-600 font-bold' : ''
                        }`}
                      >
                        <span>{col.header}</span>
                        {isSorted ? (
                          sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-slate-400" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-slate-700 ${
                      col.align === 'right' ? 'text-right tabular-nums' : col.align === 'center' ? 'text-center' : 'text-left'
                    }`}
                  >
                    {col.render(row, idx)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
        <span>Showing {data.length} records</span>
        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <Clock className="h-3 w-3" />
          <span>Updated {formatRelativeTime(new Date())}</span>
        </div>
      </div>
    </>
  );
}
