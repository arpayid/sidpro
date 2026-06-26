import * as React from 'react';
import { Button } from './button';
import { cn } from './utils';

export interface DetailDrawerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  open: boolean;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  onClose: () => void;
  side?: 'right' | 'left';
}

export function DetailDrawer({ open, title, description, actions, onClose, side = 'right', className, children, ...props }: DetailDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40" role="presentation">
      <aside
        role="dialog"
        aria-modal="true"
        className={cn(
          'fixed top-0 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl sm:w-[32rem]',
          side === 'right' ? 'right-0' : 'left-0',
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div className="min-w-0 space-y-1">
            <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
            {description ? <p className="text-sm leading-6 text-slate-500">{description}</p> : null}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Tutup drawer">×</Button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {actions ? <div className="border-t border-slate-200 bg-slate-50 p-4">{actions}</div> : null}
      </aside>
    </div>
  );
}
