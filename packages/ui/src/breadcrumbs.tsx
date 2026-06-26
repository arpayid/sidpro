import * as React from 'react';
import { cn } from './utils';

export interface BreadcrumbItem {
  label: React.ReactNode;
  href?: string;
  current?: boolean;
}

export interface BreadcrumbsProps extends React.HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
}

export function Breadcrumbs({ items, separator = '/', className, ...props }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('text-sm text-slate-500', className)} {...props}>
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => {
          const isCurrent = item.current ?? index === items.length - 1;
          return (
            <li key={index} className="flex items-center gap-2">
              {index > 0 ? <span className="text-slate-300">{separator}</span> : null}
              {item.href && !isCurrent ? (
                <a className="font-medium text-slate-600 transition hover:text-emerald-700" href={item.href}>
                  {item.label}
                </a>
              ) : (
                <span aria-current={isCurrent ? 'page' : undefined} className={cn(isCurrent && 'font-semibold text-slate-900')}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
