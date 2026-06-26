import * as React from 'react';
import { cn } from './utils';

export interface EnterpriseDataTableColumn<TData> {
  key: string;
  header: React.ReactNode;
  cell: (row: TData, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface EnterpriseDataTableProps<TData> extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  data: TData[];
  columns: EnterpriseDataTableColumn<TData>[];
  getRowKey: (row: TData, index: number) => React.Key;
  emptyState?: React.ReactNode;
  caption?: string;
  footer?: React.ReactNode;
}

export function EnterpriseDataTable<TData>({
  data,
  columns,
  getRowKey,
  emptyState,
  caption,
  footer,
  className,
  ...props
}: EnterpriseDataTableProps<TData>) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm', className)} {...props}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead className="bg-slate-50/80">
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" className={cn('px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500', column.headerClassName)}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {data.length > 0 ? data.map((row, rowIndex) => (
              <tr key={getRowKey(row, rowIndex)} className="transition hover:bg-emerald-50/40">
                {columns.map((column) => (
                  <td key={column.key} className={cn('whitespace-nowrap px-4 py-3 text-slate-700', column.className)}>
                    {column.cell(row, rowIndex)}
                  </td>
                ))}
              </tr>
            )) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-500">
                  {emptyState ?? 'Tidak ada data.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {footer ? <div className="border-t border-slate-200 bg-slate-50/70 px-4 py-3">{footer}</div> : null}
    </div>
  );
}
