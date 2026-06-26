import * as React from 'react';
import { Button } from './button';
import { cn } from './utils';

export interface StateBlockProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

function StateBlock({ title, description, icon, action, className, ...props }: StateBlockProps) {
  return (
    <div className={cn('flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/80 p-8 text-center', className)} {...props}>
      {icon ? <div className="mb-4 rounded-full bg-emerald-50 p-3 text-emerald-700 ring-1 ring-emerald-100">{icon}</div> : null}
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      {description ? <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export type EmptyStateProps = StateBlockProps;
export function EmptyState(props: EmptyStateProps) {
  return <StateBlock {...props} />;
}

export interface LoadingStateProps extends Omit<StateBlockProps, 'title'> {
  title?: React.ReactNode;
}
export function LoadingState({ title = 'Memuat data', description = 'Mohon tunggu sebentar.', className, ...props }: LoadingStateProps) {
  return (
    <StateBlock
      title={title}
      description={description}
      className={cn('border-solid', className)}
      icon={<span className="block h-5 w-5 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-700" />}
      {...props}
    />
  );
}

export interface ErrorStateProps extends StateBlockProps {
  retryLabel?: string;
  onRetry?: () => void;
}
export function ErrorState({ action, retryLabel = 'Coba lagi', onRetry, className, ...props }: ErrorStateProps) {
  return (
    <StateBlock
      className={cn('border-red-200 bg-red-50/40', className)}
      action={action ?? (onRetry ? <Button type="button" variant="outline" onClick={onRetry}>{retryLabel}</Button> : undefined)}
      {...props}
    />
  );
}
