import { cn } from '@sidpro/ui';
import { AlertCircle } from 'lucide-react';
import { Button } from '@sidpro/ui';

export function ErrorState({
  title = 'Gagal memuat data',
  message,
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="text-sm font-medium text-slate-900">{title}</h3>
      {message && <p className="mt-1 max-w-md text-sm text-slate-500">{message}</p>}
      {onRetry && (
        <Button variant="outline" className="mt-4" size="sm" onClick={onRetry}>
          Coba lagi
        </Button>
      )}
    </div>
  );
}
