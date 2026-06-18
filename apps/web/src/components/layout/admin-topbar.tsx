'use client';

import Link from 'next/link';
import { Bell, Menu, Search, LogOut } from 'lucide-react';
import { Button } from '@sidpro/ui';
import { clearAuthSession, getStoredUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';

interface AdminTopbarProps {
  onMenuClick?: () => void;
}

export function AdminTopbar({ onMenuClick }: AdminTopbarProps) {
  const router = useRouter();
  const user = getStoredUser();

  function handleLogout() {
    clearAuthSession();
    router.push('/login');
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Cari data, surat, warga..."
            className="h-9 w-64 rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 lg:w-80"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>

        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-slate-900">{user?.name ?? 'Administrator'}</p>
          <p className="text-xs text-slate-500">{user?.email ?? 'admin@desa.go.id'}</p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
          {(user?.name ?? 'A').charAt(0).toUpperCase()}
        </div>

        <Button variant="ghost" size="sm" onClick={handleLogout} className="hidden sm:inline-flex">
          <LogOut className="mr-1 h-4 w-4" />
          Keluar
        </Button>

        <Link href="/" className="text-xs text-emerald-600 hover:underline sm:hidden">
          Portal
        </Link>
      </div>
    </header>
  );
}
