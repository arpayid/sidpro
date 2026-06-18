import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, cn } from '@sidpro/ui';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: LucideIcon;
  className?: string;
}

export function StatCard({ title, value, change, trend = 'neutral', icon: Icon, className }: StatCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-slate-500';

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
            {change && (
              <div className={cn('mt-2 flex items-center gap-1 text-xs font-medium', trendColor)}>
                <TrendIcon className="h-3 w-3" />
                <span>{change}</span>
              </div>
            )}
          </div>
          {Icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
