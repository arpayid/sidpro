'use client';

import type { ReactNode } from 'react';
import { cn } from '@sidpro/ui';
import { ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { Button } from '@sidpro/ui';
import { LoadingSkeleton } from './loading-skeleton';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  render?: (row: T) => ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => ReactNode;
  page?: number;
  totalPages?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  toolbar?: ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  loading,
  error,
  onRetry,
  emptyTitle = 'Belum ada data',
  emptyDescription,
  rowKey,
  onRowClick,
  rowActions,
  page = 1,
  totalPages = 1,
  total,
  onPageChange,
  toolbar,
}: DataTableProps<T>) {
  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  return (
    <div className="surface-card overflow-hidden">
      {toolbar && <div className="border-b border-slate-100 p-4">{toolbar}</div>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200">
              {columns.map((col) => (
                <th key={col.key} className={cn('data-table-header px-4 py-3', col.className)}>
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && <ArrowUpDown className="h-3 w-3 opacity-40" />}
                  </span>
                </th>
              ))}
              {rowActions && <th className="data-table-header px-4 py-3 text-right">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <LoadingSkeleton className="h-4 w-full max-w-[120px]" />
                    </td>
                  ))}
                  {rowActions && (
                    <td className="px-4 py-3">
                      <LoadingSkeleton className="ml-auto h-4 w-16" />
                    </td>
                  )}
                </tr>
              ))}

            {!loading && data.length === 0 && (
              <tr>
                <td colSpan={columns.length + (rowActions ? 1 : 0)}>
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            )}

            {!loading &&
              data.map((row) => (
                <tr
                  key={rowKey(row)}
                  className={cn(
                    'border-b border-slate-100 transition-colors last:border-0',
                    onRowClick && 'cursor-pointer hover:bg-slate-50/80',
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn('data-table-cell', col.className)}>
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? '—')}
                    </td>
                  ))}
                  {rowActions && (
                    <td
                      className="px-4 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {rowActions(row)}
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {onPageChange && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
          <span>
            Halaman {page} dari {totalPages}
            {total !== undefined && ` · ${total} total`}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Cari...',
  children,
}: {
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {onSearchChange && (
        <input
          type="search"
          value={search ?? ''}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-9 w-full max-w-xs rounded-md border border-slate-200 bg-white px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      )}
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
