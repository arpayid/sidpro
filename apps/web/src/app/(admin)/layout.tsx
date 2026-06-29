'use client';

import { useState, type ReactNode } from 'react';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { AdminTopbar } from '@/components/layout/admin-topbar';
import { AdminSessionBoundary } from '@/components/auth/admin-session-boundary';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <AdminSessionBoundary>
      <div className="flex min-h-screen bg-[hsl(var(--background))]">
        <a
          href="#main-content"
          className="sr-only absolute left-4 top-4 z-[60] rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white focus:not-sr-only focus:outline-none focus:ring-2 focus:ring-emerald-300"
        >
          Lewati navigasi ke konten utama
        </a>
        <AdminSidebar
          mobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((current) => !current)}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <AdminTopbar onMenuClick={() => setSidebarOpen(true)} />
          <main id="main-content" tabIndex={-1} className="flex-1 p-4 sm:p-5 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </AdminSessionBoundary>
  );
}
