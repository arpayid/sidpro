'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Home,
  FileText,
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
} from 'lucide-react';
import { cn } from '@sidpro/ui';
import { adminNavItems } from '@/lib/demo-data';

const iconMap = {
  'layout-dashboard': LayoutDashboard,
  users: Users,
  home: Home,
  'file-text': FileText,
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
}

export function AdminSidebar({ mobileOpen = false, onMobileClose }: AdminSidebarProps) {
  const pathname = usePathname();

  const content = (
    <>
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500">
          <Shield className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">SIDPRO</p>
          <p className="text-xs text-emerald-200">Admin Panel</p>
        </div>
        {onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-emerald-100 hover:bg-sidebar-accent lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {adminNavItems.map((item) => {
          const Icon = iconMap[item.icon];
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-sidebar-accent text-white'
                  : 'text-emerald-100 hover:bg-sidebar-accent/60 hover:text-white',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        {content}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={onMobileClose}
            aria-label="Close overlay"
          />
          <aside className="relative flex h-full w-64 flex-col bg-sidebar shadow-xl">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
