import { Users, Home, FileStack, AlertCircle } from 'lucide-react';
import { StatCard } from '@/components/shared/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@sidpro/ui';
import { apiFetchWithFallback } from '@/lib/api';
import { demoStats, type DashboardStat } from '@/lib/demo-data';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
};

const statIcons = [Users, Home, FileStack, AlertCircle];

export default async function DashboardPage() {
  const stats = await apiFetchWithFallback<DashboardStat[]>(
    '/api/v1/admin/stats',
    demoStats,
  );

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-description">Ringkasan data dan aktivitas desa hari ini.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => (
          <StatCard
            key={stat.label}
            title={stat.label}
            value={stat.value}
            change={stat.change}
            trend={stat.trend}
            icon={statIcons[index]}
          />
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Aktivitas Terbaru</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span>Surat domisili diterbitkan</span>
              <span className="text-slate-500">5 menit lalu</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span>Data penduduk diperbarui</span>
              <span className="text-slate-500">1 jam lalu</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span>Pengaduan baru masuk</span>
              <span className="text-slate-500">2 jam lalu</span>
            </div>
            <div className="flex justify-between">
              <span>Backup database otomatis</span>
              <span className="text-slate-500">Kemarin</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Cepat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p>12 surat menunggu persetujuan kepala desa.</p>
            <p>5 pengaduan dalam status penanganan aktif.</p>
            <p>3 program bantuan sosial sedang berjalan.</p>
            <p>APBD desa terealisasi 67% per semester ini.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
