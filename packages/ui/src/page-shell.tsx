import * as React from 'react';
import { cn } from './utils';

export interface PageShellProps extends React.HTMLAttributes<HTMLDivElement> {
  maxWidth?: 'default' | 'wide' | 'full';
  surface?: 'muted' | 'plain' | 'gradient';
}

const maxWidths: Record<NonNullable<PageShellProps['maxWidth']>, string> = {
  default: 'mx-auto max-w-7xl',
  wide: 'mx-auto max-w-screen-2xl',
  full: 'w-full',
};

const surfaces: Record<NonNullable<PageShellProps['surface']>, string> = {
  muted: 'bg-slate-50',
  plain: 'bg-white',
  gradient: 'bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_32%),linear-gradient(135deg,#f8fafc_0%,#eef6ff_52%,#fff7ed_100%)]',
};

export function PageShell({
  className,
  maxWidth = 'default',
  surface = 'gradient',
  ...props
}: PageShellProps) {
  return (
    <main className={cn('min-h-screen px-4 py-6 sm:px-6 lg:px-8', surfaces[surface])}>
      <div className={cn(maxWidths[maxWidth], 'space-y-6', className)} {...props} />
    </main>
  );
}
