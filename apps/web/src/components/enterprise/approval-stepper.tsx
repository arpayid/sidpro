import { cn } from '@sidpro/ui';
import { Check } from 'lucide-react';

const STEPS = [
  { key: 'submitted', label: 'Diajukan' },
  { key: 'verified', label: 'Diverifikasi' },
  { key: 'approved', label: 'Disetujui' },
  { key: 'completed', label: 'Selesai' },
];

export function ApprovalStepper({ currentStatus }: { currentStatus: string }) {
  const statusOrder = ['submitted', 'verified', 'approved', 'completed'];
  const currentIndex =
    currentStatus === 'rejected'
      ? -1
      : statusOrder.indexOf(currentStatus);

  return (
    <ol className="flex flex-wrap items-center gap-2">
      {STEPS.map((step, i) => {
        const done = currentIndex >= i;
        const active = statusOrder[currentIndex] === step.key;
        return (
          <li key={step.key} className="flex items-center gap-2">
            {i > 0 && <span className="hidden h-px w-6 bg-slate-200 sm:block" />}
            <span
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                done && 'bg-emerald-50 text-emerald-700',
                active && !done && 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
                !done && !active && 'bg-slate-100 text-slate-500',
              )}
            >
              {done && <Check className="h-3 w-3" />}
              {step.label}
            </span>
          </li>
        );
      })}
      {currentStatus === 'rejected' && (
        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
          Ditolak
        </span>
      )}
    </ol>
  );
}

export function Timeline({
  items,
}: {
  items: { title: string; time?: string; description?: string }[];
}) {
  return (
    <ul className="space-y-4">
      {items.map((item, i) => (
        <li key={i} className="relative flex gap-3 pl-6">
          <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-emerald-500" />
          {i < items.length - 1 && (
            <span className="absolute left-[3px] top-4 h-full w-px bg-slate-200" />
          )}
          <div>
            <p className="text-sm font-medium text-slate-900">{item.title}</p>
            {item.time && <p className="text-xs text-slate-500">{item.time}</p>}
            {item.description && (
              <p className="mt-1 text-sm text-slate-600">{item.description}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
