'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/enterprise/page-header';
import { DataTable, FilterBar } from '@/components/enterprise/data-table';
import { DetailDrawer } from '@/components/enterprise/detail-drawer';
import { StatusBadge, auditActionVariant } from '@/components/enterprise/status-badge';
import { useAuth } from '@/hooks/use-auth';
import { apiClient, buildQuery } from '@/lib/api-client';
import {
  useAuditLog,
  useAuditLogs,
  type AuditLog,
} from '@/features/audit-logs/use-audit-logs';

const MODULE_OPTIONS = [
  { value: '', label: 'Semua Modul' },
  { value: 'auth', label: 'Auth' },
  { value: 'letters', label: 'Surat' },
  { value: 'letter-templates', label: 'Template Surat' },
  { value: 'files', label: 'Berkas' },
  { value: 'population', label: 'Penduduk' },
  { value: 'residents', label: 'Penduduk (residents)' },
  { value: 'families', label: 'Keluarga' },
  { value: 'settings', label: 'Pengaturan' },
  { value: 'users', label: 'Pengguna' },
  { value: 'roles', label: 'Peran' },
  { value: 'complaints', label: 'Pengaduan' },
  { value: 'reports', label: 'Laporan' },
  { value: 'village-profile', label: 'Profil Desa' },
];

const ACTION_OPTIONS = [
  { value: '', label: 'Semua Aksi' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'generate', label: 'Generate' },
  { value: 'download', label: 'Download' },
  { value: 'verify', label: 'Verify' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'export', label: 'Export' },
  { value: 'import', label: 'Import' },
  { value: 'upload', label: 'Upload' },
  { value: 'approve', label: 'Approve' },
  { value: 'reject', label: 'Reject' },
];

function defaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 7);
  return {
    dateTo: to.toISOString().slice(0, 10),
    dateFrom: from.toISOString().slice(0, 10),
  };
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(iso));
}

function metadataSummary(metadata: unknown): string {
  if (!metadata || typeof metadata !== 'object') return '—';
  const entries = Object.entries(metadata as Record<string, unknown>);
  if (entries.length === 0) return '—';
  const [key, value] = entries[0];
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  const preview = text.length > 48 ? `${text.slice(0, 48)}…` : text;
  return `${key}: ${preview}`;
}

function selectClassName() {
  return 'h-9 rounded-md border border-slate-200 bg-white px-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500';
}

export default function AuditLogsPage() {
  const { can } = useAuth();
  const defaults = useMemo(() => defaultDateRange(), []);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [dateFrom, setDateFrom] = useState(defaults.dateFrom);
  const [dateTo, setDateTo] = useState(defaults.dateTo);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useAuditLogs({
    page,
    limit: 20,
    module: moduleFilter || undefined,
    action: actionFilter || undefined,
    actorId: actorFilter || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    search: search || undefined,
  });

  const { data: detail, isLoading: detailLoading } = useAuditLog(detailId);

  const { data: actors } = useQuery({
    queryKey: ['users', 'audit-actor-filter'],
    enabled: can('users.read'),
    queryFn: async () => {
      const res = await apiClient<{ id: string; name: string; email: string }[]>(
        `/users${buildQuery({ page: 1, limit: 100 })}`,
      );
      return res.data ?? [];
    },
  });

  const logs = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  function openDetail(log: AuditLog) {
    setDetailId(log.id);
  }

  function resetFilters() {
    setSearch('');
    setModuleFilter('');
    setActionFilter('');
    setActorFilter('');
    setDateFrom(defaults.dateFrom);
    setDateTo(defaults.dateTo);
    setPage(1);
  }

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Riwayat aktivitas penting sistem — transparan dan dapat dilacak."
      />

      <div className="mt-6">
        <DataTable
          columns={[
            {
              key: 'createdAt',
              header: 'Waktu',
              render: (row) => (
                <span className="whitespace-nowrap text-slate-700">
                  {formatDateTime(row.createdAt)}
                </span>
              ),
            },
            {
              key: 'actor',
              header: 'Aktor',
              render: (row) => (
                <div className="min-w-[140px]">
                  <p className="font-medium text-slate-800">
                    {row.actor?.name ?? 'Sistem'}
                  </p>
                  {row.actor?.email && (
                    <p className="text-xs text-slate-500">{row.actor.email}</p>
                  )}
                </div>
              ),
            },
            {
              key: 'module',
              header: 'Modul',
              render: (row) => (
                <StatusBadge variant="default">{row.module}</StatusBadge>
              ),
            },
            {
              key: 'action',
              header: 'Aksi',
              render: (row) => (
                <StatusBadge variant={auditActionVariant(row.action)}>
                  {row.action}
                </StatusBadge>
              ),
            },
            {
              key: 'entity',
              header: 'Entitas',
              render: (row) => (
                <div className="text-sm text-slate-600">
                  <span className="font-medium">{row.entityType}</span>
                  {row.entityId && (
                    <span className="mt-0.5 block truncate text-xs text-slate-400">
                      {row.entityId}
                    </span>
                  )}
                </div>
              ),
            },
            {
              key: 'summary',
              header: 'Ringkasan',
              className: 'max-w-[220px]',
              render: (row) => (
                <span className="line-clamp-2 text-sm text-slate-500">
                  {metadataSummary(row.metadata)}
                </span>
              ),
            },
          ]}
          data={logs}
          loading={isLoading}
          error={error ? (error as Error).message : null}
          onRetry={() => refetch()}
          emptyTitle="Belum ada aktivitas"
          emptyDescription="Coba ubah rentang tanggal atau filter pencarian."
          rowKey={(row) => row.id}
          onRowClick={openDetail}
          page={page}
          totalPages={totalPages}
          total={meta?.total}
          onPageChange={setPage}
          toolbar={
            <FilterBar
              search={search}
              onSearchChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              searchPlaceholder="Cari modul, aksi, entitas, aktor..."
            >
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className={selectClassName()}
                aria-label="Dari tanggal"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className={selectClassName()}
                aria-label="Sampai tanggal"
              />
              <select
                value={moduleFilter}
                onChange={(e) => {
                  setModuleFilter(e.target.value);
                  setPage(1);
                }}
                className={selectClassName()}
              >
                {MODULE_OPTIONS.map((opt) => (
                  <option key={opt.value || 'all'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                className={selectClassName()}
              >
                {ACTION_OPTIONS.map((opt) => (
                  <option key={opt.value || 'all'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {can('users.read') && actors && actors.length > 0 && (
                <select
                  value={actorFilter}
                  onChange={(e) => {
                    setActorFilter(e.target.value);
                    setPage(1);
                  }}
                  className={selectClassName()}
                >
                  <option value="">Semua Aktor</option>
                  {actors.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={resetFilters}
                className="h-9 rounded-md border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50"
              >
                Reset
              </button>
            </FilterBar>
          }
        />
      </div>

      <DetailDrawer
        open={Boolean(detailId)}
        onClose={() => setDetailId(null)}
        title="Detail Audit Log"
        width="max-w-xl"
      >
        {detailLoading && (
          <p className="text-sm text-slate-500">Memuat detail...</p>
        )}
        {!detailLoading && detail && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Waktu
                </p>
                <p className="mt-1 text-sm text-slate-800">
                  {formatDateTime(detail.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  IP Address
                </p>
                <p className="mt-1 text-sm text-slate-800">
                  {detail.ipAddress ?? '—'}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Aktor
              </p>
              <p className="mt-1 text-sm font-medium text-slate-800">
                {detail.actor?.name ?? 'Sistem'}
              </p>
              {detail.actor?.email && (
                <p className="text-sm text-slate-500">{detail.actor.email}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge variant="default">{detail.module}</StatusBadge>
              <StatusBadge variant={auditActionVariant(detail.action)}>
                {detail.action}
              </StatusBadge>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Entitas
              </p>
              <p className="mt-1 text-sm text-slate-800">
                {detail.entityType}
                {detail.entityId && (
                  <span className="mt-1 block font-mono text-xs text-slate-500">
                    {detail.entityId}
                  </span>
                )}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                Metadata
              </p>
              {detail.metadata &&
              typeof detail.metadata === 'object' &&
              Object.keys(detail.metadata as object).length > 0 ? (
                <pre className="max-h-80 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                  {JSON.stringify(detail.metadata, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-slate-500">Tidak ada metadata tambahan.</p>
              )}
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}
