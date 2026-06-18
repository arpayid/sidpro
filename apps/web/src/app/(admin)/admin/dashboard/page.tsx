'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  Users,
  Home,
  FileStack,
  AlertCircle,
  ArrowRight,
  ClipboardList,
} from 'lucide-react';
import { PageHeader } from '@/components/enterprise/page-header';
import { ErrorState } from '@/components/enterprise/error-state';
import { KpiSkeleton } from '@/components/enterprise/loading-skeleton';
import { Timeline } from '@/components/enterprise/approval-stepper';
import {
  useDashboard,
  useDashboardActivity,
  formatAuditActivity,
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

interface KpiCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  href?: string;
}

function KpiCard({ title, value, icon, href }: KpiCardProps) {
  const content = (
    <div className="surface-card flex items-start justify-between p-5 transition-shadow hover:shadow-md">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="kpi-value mt-1">{formatNumber(value)}</p>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
        {icon}
      </div>
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

interface TaskCardProps {
  title: string;
  description: string;
  count: number;
  href: string;
}

function TaskCard({ title, description, count, href }: TaskCardProps) {
  return (
    <Link
      href={href}
      className="surface-card group flex items-center justify-between p-4 transition-colors hover:border-emerald-200 hover:bg-emerald-50/30"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-amber-50 text-amber-600">
          <ClipboardList className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900">{title}</p>
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
          {count}
        </span>
        <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600" />
      </div>
    </Link>
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
        <PageHeader
          title="Dashboard"
          description="Ringkasan data dan aktivitas desa hari ini."
        />
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
        description="Ringkasan data dan aktivitas desa hari ini."
      />

      {isLoading || !data ? (
        <KpiSkeleton count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Penduduk"
            value={data.residents}
            icon={<Users className="h-5 w-5" />}
            href="/admin/penduduk"
          />
          <KpiCard
            title="Kartu Keluarga"
            value={data.families}
            icon={<Home className="h-5 w-5" />}
            href="/admin/keluarga"
          />
          <KpiCard
            title="Surat Pending"
            value={data.pendingLetters}
            icon={<FileStack className="h-5 w-5" />}
            href="/admin/surat"
          />
          <KpiCard
            title="Pengaduan Open"
            value={data.openComplaints}
            icon={<AlertCircle className="h-5 w-5" />}
            href="/admin/pengaduan"
          />
        </div>
      )}

      {(populationReport.data || lettersReport.data) && (
        <div className="mt-6 space-y-6">
          {populationReport.data && (
            <PopulationCharts
              byGender={populationReport.data.byGender}
              byStatus={populationReport.data.byStatus}
            />
          )}
          {lettersReport.data && (
            <LettersStatusChart byStatus={lettersReport.data.byStatus} />
          )}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="surface-card p-5">
          <h2 className="text-sm font-semibold text-slate-900">Tugas Perlu Tindakan</h2>
          <p className="mt-0.5 text-xs text-slate-500">Prioritas operasional hari ini</p>
          <div className="mt-4 space-y-3">
            {isLoading || !data ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
              ))
            ) : (
              <>
                <TaskCard
                  title="Surat menunggu proses"
                  description="Verifikasi dan persetujuan permohonan surat"
                  count={data.pendingLetters}
                  href="/admin/surat"
                />
                <TaskCard
                  title="Pengaduan aktif"
                  description="Pengaduan yang belum diselesaikan"
                  count={data.openComplaints}
                  href="/admin/pengaduan"
                />
                <TaskCard
                  title="Kelola data penduduk"
                  description={`${formatNumber(data.residents)} penduduk terdaftar`}
                  count={data.residents}
                  href="/admin/penduduk"
                />
              </>
            )}
          </div>
        </section>

        <section className="surface-card p-5">
          <h2 className="text-sm font-semibold text-slate-900">Aktivitas Terbaru</h2>
          <p className="mt-0.5 text-xs text-slate-500">7 hari terakhir</p>
          <div className="mt-4">
            {activity.isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded bg-slate-100" />
                ))}
              </div>
            ) : activity.isError ? (
              <p className="text-sm text-slate-500">Aktivitas tidak dapat dimuat.</p>
            ) : activity.data && activity.data.length > 0 ? (
              <Timeline
                items={activity.data.slice(0, 8).map((log) => ({
                  title: formatAuditActivity(log),
                  time: formatRelativeTime(log.createdAt),
                  description: log.actor?.name,
                }))}
              />
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">
                Belum ada aktivitas tercatat.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
