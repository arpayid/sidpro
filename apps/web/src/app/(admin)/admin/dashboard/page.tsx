'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  ClipboardList,
  Database,
  FileStack,
  HeartPulse,
  Home,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { Button } from '@sidpro/ui';
import { PageHeader } from '@/components/enterprise/page-header';
import { ErrorState } from '@/components/enterprise/error-state';
import { EmptyState } from '@/components/enterprise/empty-state';
import { KpiSkeleton, LoadingSkeleton } from '@/components/enterprise/loading-skeleton';
import { Timeline } from '@/components/enterprise/approval-stepper';
import {
  useDashboard,
  useDashboardActivity,
  formatAuditActivity,
  type DashboardStats,
} from '@/features/dashboard/use-dashboard';
import { LettersStatusChart, PopulationCharts } from '@/features/dashboard/dashboard-charts';
import { usePopulationReport, useLettersReport } from '@/features/reports/use-reports';

function formatNumber(n: number) {
  return new Intl.NumberFormat('id-ID').format(n);
}

function formatRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'Baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

function percent(value: number, total: number) {
  if (total <= 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

interface KpiCardProps {
  title: string;
  value: number;
  helper: string;
  icon: ReactNode;
  href?: string;
  tone?: 'emerald' | 'sky' | 'amber' | 'rose';
}

const toneClass = {
  emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  sky: 'bg-sky-50 text-sky-600 ring-sky-100',
  amber: 'bg-amber-50 text-amber-600 ring-amber-100',
  rose: 'bg-rose-50 text-rose-600 ring-rose-100',
};

function KpiCard({ title, value, helper, icon, href, tone = 'emerald' }: KpiCardProps) {
  const content = (
    <div className="surface-card group relative overflow-hidden p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-sky-500 to-amber-400" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="kpi-value mt-2">{formatNumber(value)}</p>
          <p className="mt-2 text-xs text-slate-500">{helper}</p>
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${toneClass[tone]}`}
        >
          {icon}
        </div>
      </div>
      {href && (
        <div className="mt-4 flex items-center text-xs font-semibold text-emerald-700 opacity-0 transition-opacity group-hover:opacity-100">
          Buka modul <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }
  return content;
}

function ExecutiveSummary({ data }: { data: DashboardStats }) {
  const totalCases = data.pendingLetters + data.openComplaints;
  return (
    <section className="surface-card overflow-hidden bg-gradient-to-br from-emerald-950 via-slate-900 to-sky-950 text-white">
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-emerald-100 ring-1 ring-white/15">
            <Sparkles className="h-3.5 w-3.5" /> Executive command center
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
            Operasional desa terkonsolidasi dalam satu dashboard.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
            Pantau kependudukan, layanan surat, pengaduan, bantuan, aset, pembangunan, dan tahun
            anggaran tanpa menampilkan data sensitif warga secara mentah.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <SummaryPill label="Total antrian" value={formatNumber(totalCases)} />
            <SummaryPill
              label="Rasio surat pending"
              value={percent(data.pendingLetters, data.letterRequests)}
            />
            <SummaryPill
              label="Program aktif"
              value={formatNumber(data.aidPrograms + data.developmentProjects)}
            />
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
          <p className="text-sm font-semibold text-white">Prioritas pimpinan</p>
          <div className="mt-4 space-y-3">
            <PriorityRow label="Permohonan surat" value={data.pendingLetters} href="/admin/surat" />
            <PriorityRow
              label="Pengaduan terbuka"
              value={data.openComplaints}
              href="/admin/pengaduan"
            />
            <PriorityRow
              label="Audit aktivitas"
              value={data.recentActivity?.auditLogs.length ?? 0}
              href="/admin/audit-logs"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/10 p-3">
      <p className="text-xs text-slate-300">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function PriorityRow({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2 text-sm transition hover:bg-white/15"
    >
      <span className="text-slate-200">{label}</span>
      <span className="font-semibold text-white">{formatNumber(value)}</span>
    </Link>
  );
}

interface TaskCardProps {
  title: string;
  description: string;
  count: number;
  href: string;
  urgent?: boolean;
}

function TaskCard({ title, description, count, href, urgent }: TaskCardProps) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-emerald-200 hover:bg-emerald-50/30"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${urgent ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}
        >
          <ClipboardList className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">{title}</p>
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <div className="ml-3 flex shrink-0 items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${urgent ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}
        >
          {formatNumber(count)}
        </span>
        <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600" />
      </div>
    </Link>
  );
}

function OperationalAlerts({ data }: { data: DashboardStats }) {
  const alerts = [
    {
      title: 'Surat menunggu proses',
      description: 'Verifikasi dan persetujuan permohonan surat.',
      count: data.pendingLetters,
      href: '/admin/surat',
      urgent: data.pendingLetters > 0,
    },
    {
      title: 'Pengaduan aktif',
      description: 'Pengaduan warga yang belum diselesaikan.',
      count: data.openComplaints,
      href: '/admin/pengaduan',
      urgent: data.openComplaints > 0,
    },
    {
      title: 'Basis data penduduk',
      description: `${formatNumber(data.residents)} warga dan ${formatNumber(data.families)} KK terdaftar.`,
      count: data.residents,
      href: '/admin/penduduk',
    },
  ];

  return (
    <section className="surface-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Operational Alerts</h2>
          <p className="mt-0.5 text-xs text-slate-500">Prioritas kerja operator hari ini</p>
        </div>
        <AlertTriangle className="h-5 w-5 text-amber-500" />
      </div>
      <div className="mt-4 space-y-3">
        {alerts.some((item) => item.count > 0) ? (
          alerts.map((item) => <TaskCard key={item.title} {...item} />)
        ) : (
          <EmptyState
            className="py-10"
            title="Tidak ada alert operasional"
            description="Semua antrian utama sedang terkendali."
          />
        )}
      </div>
    </section>
  );
}

function QuickActions() {
  const actions = [
    { label: 'Input penduduk', href: '/admin/penduduk', icon: Users },
    { label: 'Kelola KK', href: '/admin/keluarga', icon: Home },
    { label: 'Proses surat', href: '/admin/surat', icon: FileStack },
    { label: 'Tindak pengaduan', href: '/admin/pengaduan', icon: ClipboardCheck },
  ];
  return (
    <section className="surface-card p-5">
      <h2 className="text-sm font-semibold text-slate-900">Quick Actions</h2>
      <p className="mt-0.5 text-xs text-slate-500">Akses cepat ke modul MVP prioritas</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {actions.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-medium text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </div>
    </section>
  );
}

function ServiceHealth({ data }: { data: DashboardStats }) {
  const services = [
    { label: 'API laporan', status: 'Online', icon: HeartPulse, ok: true },
    {
      label: 'Data penduduk',
      status: data.residents > 0 ? 'Tersedia' : 'Kosong',
      icon: Database,
      ok: data.residents > 0,
    },
    {
      label: 'Audit log',
      status: data.recentActivity?.auditLogs.length ? 'Aktif' : 'Belum ada log',
      icon: ShieldCheck,
      ok: Boolean(data.recentActivity?.auditLogs.length),
    },
  ];
  return (
    <section className="surface-card p-5">
      <h2 className="text-sm font-semibold text-slate-900">Service Health</h2>
      <p className="mt-0.5 text-xs text-slate-500">Status ringkas layanan dashboard</p>
      <div className="mt-4 space-y-3">
        {services.map(({ label, status, icon: Icon, ok }) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3"
          >
            <div className="flex items-center gap-3">
              <Icon className={ok ? 'h-4 w-4 text-emerald-600' : 'h-4 w-4 text-amber-600'} />
              <span className="text-sm font-medium text-slate-700">{label}</span>
            </div>
            <span
              className={
                ok
                  ? 'text-xs font-semibold text-emerald-700'
                  : 'text-xs font-semibold text-amber-700'
              }
            >
              {status}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useDashboard();
  const activity = useDashboardActivity(7);
  const populationReport = usePopulationReport();
  const lettersReport = useLettersReport();

  if (isError) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Ringkasan data dan aktivitas desa hari ini." />
        <ErrorState
          message={error instanceof Error ? error.message : 'Gagal memuat dashboard'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Ringkasan eksekutif, operasional, dan kesehatan layanan desa hari ini."
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        }
      />

      {isLoading || !data ? (
        <div className="space-y-6">
          <LoadingSkeleton className="h-64 w-full" />
          <KpiSkeleton count={4} />
        </div>
      ) : (
        <div className="space-y-6">
          <ExecutiveSummary data={data} />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Penduduk"
              value={data.residents}
              helper="Data warga aktif terlindungi"
              icon={<Users className="h-5 w-5" />}
              href="/admin/penduduk"
            />
            <KpiCard
              title="Kartu Keluarga"
              value={data.families}
              helper="Nomor KK tidak ditampilkan mentah"
              icon={<Home className="h-5 w-5" />}
              href="/admin/keluarga"
              tone="sky"
            />
            <KpiCard
              title="Surat Pending"
              value={data.pendingLetters}
              helper={`${formatNumber(data.letterRequests)} total permohonan`}
              icon={<FileStack className="h-5 w-5" />}
              href="/admin/surat"
              tone="amber"
            />
            <KpiCard
              title="Pengaduan Open"
              value={data.openComplaints}
              helper={`${formatNumber(data.complaints)} total pengaduan`}
              icon={<Activity className="h-5 w-5" />}
              href="/admin/pengaduan"
              tone="rose"
            />
          </div>
        </div>
      )}

      <section className="mt-6">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Chart Analytics</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Distribusi agregat tanpa membuka NIK/KK/alamat warga.
            </p>
          </div>
        </div>
        {populationReport.isLoading || lettersReport.isLoading ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <LoadingSkeleton className="h-72" />
            <LoadingSkeleton className="h-72" />
          </div>
        ) : populationReport.isError || lettersReport.isError ? (
          <ErrorState
            className="surface-card"
            title="Grafik tidak dapat dimuat"
            message="Data agregat laporan belum tersedia atau terjadi gangguan koneksi."
          />
        ) : populationReport.data || lettersReport.data ? (
          <div className="space-y-6">
            {populationReport.data && (
              <PopulationCharts
                byGender={populationReport.data.byGender}
                byStatus={populationReport.data.byStatus}
              />
            )}
            {lettersReport.data && <LettersStatusChart byStatus={lettersReport.data.byStatus} />}
          </div>
        ) : (
          <EmptyState
            className="surface-card"
            title="Belum ada data grafik"
            description="Grafik akan tampil setelah data penduduk atau layanan surat tersedia."
          />
        )}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        {data ? <OperationalAlerts data={data} /> : <LoadingSkeleton className="h-80" />}

        <section className="surface-card p-5">
          <h2 className="text-sm font-semibold text-slate-900">Recent Activity</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Audit trail 7 hari terakhir; email/NIK/KK tidak ditampilkan.
          </p>
          <div className="mt-4">
            {activity.isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <LoadingSkeleton key={i} className="h-10" />
                ))}
              </div>
            ) : activity.isError ? (
              <ErrorState
                className="py-10"
                title="Aktivitas tidak dapat dimuat"
                message="Silakan coba refresh dashboard."
              />
            ) : activity.data && activity.data.length > 0 ? (
              <Timeline
                items={activity.data.slice(0, 8).map((log) => ({
                  title: formatAuditActivity(log),
                  time: formatRelativeTime(log.createdAt),
                  description: log.actor?.name ? `Oleh ${log.actor.name}` : 'Aktor sistem',
                }))}
              />
            ) : (
              <EmptyState
                className="py-10"
                title="Belum ada aktivitas"
                description="Aktivitas audit akan muncul setelah ada perubahan data penting."
              />
            )}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <QuickActions />
        {data ? <ServiceHealth data={data} /> : <LoadingSkeleton className="h-64" />}
      </div>
    </div>
  );
}
