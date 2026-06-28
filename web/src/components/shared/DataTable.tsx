'use client';

import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  compare?: (a: T, b: T) => number;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  defaultSort?: { key: string; dir: 'asc' | 'desc' };
  sortKey?: string | null;
  sortDir?: SortDir;
  onSortChange?: (key: string | null, dir: SortDir) => void;
  onRowClick?: (row: T) => void;
}

type SortDir = 'asc' | 'desc' | null;

export function DataTable<T>({
  columns,
  data,
  keyField,
  defaultSort,
  sortKey: controlledSortKey,
  sortDir: controlledSortDir,
  onSortChange,
  onRowClick,
}: Props<T>) {
  const [internalSortKey, setInternalSortKey] = useState<string | null>(defaultSort?.key ?? null);
  const [internalSortDir, setInternalSortDir] = useState<SortDir>(defaultSort?.dir ?? null);

  const isControlled = controlledSortKey !== undefined;
  const sortKey = isControlled ? controlledSortKey : internalSortKey;
  const sortDir = isControlled ? controlledSortDir : internalSortDir;

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return data;
    const col = columns.find((c) => c.key === sortKey);
    return [...data].sort((a, b) => {
      if (col?.compare) {
        return sortDir === 'asc' ? col.compare(a, b) : col.compare(b, a);
      }
      const av = (a as Record<string, unknown>)[sortKey];
      const bv = (b as Record<string, unknown>)[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const as = String(av ?? '');
      const bs = String(bv ?? '');
      return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
    });
  }, [data, sortKey, sortDir, columns]);

  function handleSort(key: string) {
    let nextKey: string | null = key;
    let nextDir: SortDir = 'asc';

    if (sortKey === key) {
      if (sortDir === 'asc') {
        nextDir = 'desc';
      } else if (sortDir === 'desc') {
        nextKey = null;
        nextDir = null;
      }
    }

    if (isControlled) {
      onSortChange?.(nextKey, nextDir);
    } else {
      setInternalSortKey(nextKey);
      setInternalSortDir(nextDir);
    }
  }

  if (data.length === 0) {
    return <div className="p-8 text-center text-sm text-gray-400">No data available</div>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="data-table w-full">
        <thead>
          <tr className="bg-gray-50">
            {columns.map((col) => {
              const isActive = sortKey === col.key;
              return (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 ${
                    col.sortable !== false ? 'cursor-pointer select-none hover:text-gray-800' : ''
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable !== false && (
                      <span className="flex flex-col leading-none">
                        <ChevronUp
                          size={12}
                          className={
                            isActive && sortDir === 'asc' ? 'text-blue-600' : 'text-gray-300'
                          }
                        />
                        <ChevronDown
                          size={12}
                          className={
                            isActive && sortDir === 'desc' ? 'text-blue-600' : 'text-gray-300'
                          }
                        />
                      </span>
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={String(row[keyField])}
              onClick={() => onRowClick?.(row)}
              className={`border-t border-gray-100 hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-sm text-gray-700">
                  {col.render
                    ? col.render(row)
                    : String((row as Record<string, unknown>)[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
