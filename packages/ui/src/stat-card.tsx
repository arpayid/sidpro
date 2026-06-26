import * as React from 'react';
import { cn } from './utils';

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  value: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  trend?: React.ReactNode;
  tone?: 'emerald' | 'blue' | 'nusantara' | 'slate';
}

const tones: Record<NonNullable<StatCardProps['tone']>, string> = {
  emerald: 'from-emerald-500/12 to-emerald-50 text-emerald-700 ring-emerald-100',
  blue: 'from-blue-500/12 to-blue-50 text-blue-700 ring-blue-100',
  nusantara: 'from-amber-500/14 to-orange-50 text-amber-700 ring-amber-100',
  slate: 'from-slate-500/10 to-slate-50 text-slate-700 ring-slate-100',
};

export function StatCard({ label, value, description, icon, trend, tone = 'emerald', className, ...props }: StatCardProps) {
  return (
    <section className={cn('rounded-2xl border border-white/70 bg-white p-5 shadow-sm shadow-slate-200/70', className)} {...props}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-slate-950">{value}</p>
        </div>
        {icon ? <div className={cn('rounded-2xl bg-gradient-to-br p-3 ring-1', tones[tone])}>{icon}</div> : null}
      </div>
      {(description || trend) ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
          {description ? <p className="text-slate-500">{description}</p> : <span />}
          {trend ? <div className="font-medium text-emerald-700">{trend}</div> : null}
        </div>
      ) : null}
    </section>
  );
}
