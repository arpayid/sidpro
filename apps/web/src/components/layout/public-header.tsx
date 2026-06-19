'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Button, cn } from '@sidpro/ui';
import { Menu, X, Shield } from 'lucide-react';
import { publicNavItems } from '@/lib/portal-navigation';

export function PublicHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-emerald-800/10 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Shield className="h-5 w-5" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-bold leading-none text-emerald-900">SIDPRO</p>
            <p className="text-xs text-slate-500">Sistem Informasi Desa</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {publicNavItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-emerald-700',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden sm:inline-flex">
            <Button variant="outline" size="sm">
              Masuk Admin
            </Button>
          </Link>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 lg:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-100 bg-white lg:hidden">
          <nav className="container-page flex flex-col gap-1 py-4">
            {publicNavItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'rounded-md px-3 py-2 text-sm font-medium',
                    active ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link href="/login" onClick={() => setMobileOpen(false)} className="mt-2">
              <Button className="w-full" size="sm">
                Masuk Admin
              </Button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
