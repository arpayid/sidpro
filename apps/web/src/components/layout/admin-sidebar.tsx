'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Home,
  FileText,
  FileCog,
  MessageSquare,
  HeartHandshake,
  Building,
  HardHat,
  Wallet,
  Newspaper,
  FileBarChart,
  Settings,
  UserCog,
  ScrollText,
  Shield,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@sidpro/ui';
import { adminNavItems } from '@/lib/navigation';
import { useAuth } from '@/hooks/use-auth';

const iconMap = {
  'layout-dashboard': LayoutDashboard,
  users: Users,
  home: Home,
  'file-text': FileText,
  'file-cog': FileCog,
  'message-square': MessageSquare,
  'heart-handshake': HeartHandshake,
  building: Building,
  'hard-hat': HardHat,
  wallet: Wallet,
  newspaper: Newspaper,
  'file-bar-chart': FileBarChart,
  settings: Settings,
  'user-cog': UserCog,
  'scroll-text': ScrollText,
} as const;

interface AdminSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function AdminSidebar({
  mobileOpen = false,
  onMobileClose,
  collapsed = false,
  onToggleCollapse,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const { can } = useAuth();

  const items = adminNavItems.filter(
    (item) => !('permission' in item) || !item.permission || can(item.permission),
  );

  const content = (
    <>
      <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-600">
          <Shield className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">SIDPRO</p>
            <p className="truncate text-xs text-slate-500">Admin Desa</p>
          </div>
        )}
        {onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Tutup menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {onToggleCollapse && !onMobileClose && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 lg:inline-flex"
            aria-label="Ciutkan sidebar"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {items.map((item) => {
          const Icon = iconMap[item.icon];
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                collapsed && 'justify-center px-2',
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', active && 'text-emerald-600')} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      <aside
        className={cn(
          'hidden shrink-0 flex-col border-r border-slate-200 bg-white lg:flex',
          collapsed ? 'w-[4.5rem]' : 'w-64',
        )}
      >
        {content}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            onClick={onMobileClose}
            aria-label="Tutup overlay"
          />
          <aside className="relative flex h-full w-64 flex-col bg-white shadow-xl">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
