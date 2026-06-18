'use client';

import Link from 'next/link';
import { Bell, Menu, Search, LogOut, ExternalLink } from 'lucide-react';
import { Button } from '@sidpro/ui';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface AdminTopbarProps {
  onMenuClick?: () => void;
}

export function AdminTopbar({ onMenuClick }: AdminTopbarProps) {
  const { user, logout } = useAuth();

  const { data: notifications } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () =>
      apiClient<{ id: string; title: string; readAt: string | null }[]>('/notifications', {
        method: 'GET',
      }),
    enabled: Boolean(user),
  });

  const unread = notifications?.data?.filter((n) => !n.readAt).length ?? 0;

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur sm:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden"
          aria-label="Buka menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="relative hidden max-w-md flex-1 sm:block">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Cari penduduk, surat, pengaduan..."
            className="h-8 w-full rounded-md border border-slate-200 bg-slate-50/80 pl-8 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="hidden items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 md:flex">
          <span className="font-medium text-slate-800">Desa Demo</span>
        </div>

        <Link
          href="/"
          className="hidden h-8 items-center gap-1 rounded-md px-2 text-xs text-slate-500 hover:bg-slate-50 hover:text-emerald-600 sm:inline-flex"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Portal
        </Link>

        <button
          type="button"
          className="relative inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
          aria-label="Notifikasi"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-medium text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        <div className="hidden text-right md:block">
          <p className="max-w-[140px] truncate text-sm font-medium text-slate-900">
            {user?.name ?? 'Operator'}
          </p>
          <p className="max-w-[140px] truncate text-xs text-slate-500">{user?.email}</p>
        </div>

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800">
          {(user?.name ?? 'O').charAt(0).toUpperCase()}
        </div>

        <Button variant="ghost" size="sm" onClick={() => logout()} className="hidden h-8 sm:inline-flex">
          <LogOut className="mr-1 h-3.5 w-3.5" />
          Keluar
        </Button>
      </div>
    </header>
  );
}
