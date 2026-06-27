'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, ArrowRight, Filter } from 'lucide-react';
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

const SENSITIVE_METADATA_KEYS = [
  'password',
  'token',
  'refreshToken',
  'accessToken',
  'secret',
  'otp',
  'totp',
  'nik',
  'kk',
  'noKk',
  'document',
  'fileUrl',
  'url',
];

function isSensitiveKey(key: string) {
  const normalized = key.toLowerCase();
  return SENSITIVE_METADATA_KEYS.some((sensitive) =>
    normalized.includes(sensitive.toLowerCase()),
  );
}

function redactMetadataValue(key: string, value: unknown): unknown {
  if (isSensitiveKey(key)) return '[disamarkan]';
  if (Array.isArray(value)) return value.slice(0, 5).map((item) => sanitizeMetadata(item));
  if (value && typeof value === 'object') return sanitizeMetadata(value);
  if (typeof value === 'string' && value.length > 120) return `${value.slice(0, 120)}…`;
  return value;
}

function sanitizeMetadata(metadata: unknown): unknown {
  if (!metadata || typeof metadata !== 'object') return metadata;
  return Object.fromEntries(
    Object.entries(metadata as Record<string, unknown>)
      .slice(0, 12)
      .map(([key, value]) => [key, redactMetadataValue(key, value)]),
  );
}

function metadataSummary(metadata: unknown): string {
  const sanitized = sanitizeMetadata(metadata);
  if (!sanitized || typeof sanitized !== 'object') return '—';
  const entries = Object.entries(sanitized as Record<string, unknown>).filter(
    ([, value]) => value !== undefined && value !== null && value !== '',
  );
  if (entries.length === 0) return '—';
  return entries
    .slice(0, 2)
    .map(([key, value]) => {
      const text = typeof value === 'string' ? value : JSON.stringify(value);
      const preview = text.length > 40 ? `${text.slice(0, 40)}…` : text;
      return `${key}: ${preview}`;
    })
    .join(' • ');
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

  const { data: actors } = useQuery<{ id: string; name: string; email: string }[]>({
    queryKey: ['users', 'audit-actor-filter'],
    enabled: can('users.read'),
    queryFn: async () => {
      const res = await apiClient<{ id: string; name: string; email: string }[]>(
        `/users${buildQuery({ page: 1, limit: 100 })}`,
      );
      return res.data ?? [];
    },
  });

  const logs: AuditLog[] = data?.data ?? [];
  const timelineLogs: AuditLog[] = logs.slice(0, 5);
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

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
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

        <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-slate-800">Timeline Aktor / Aksi / Modul</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">Ringkasan aktivitas terbaru dari hasil filter aktif.</p>
          <div className="mt-4 space-y-3">
            {timelineLogs.length === 0 ? (
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">Tidak ada aktivitas pada filter ini.</p>
            ) : (
              timelineLogs.map((log) => (
                <button
                  key={log.id}
                  type="button"
                  onClick={() => openDetail(log)}
                  className="w-full rounded-lg border border-slate-100 p-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50/40"
                >
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{formatDateTime(log.createdAt)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium text-slate-800">{log.actor?.name ?? 'Sistem'}</span>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                    <StatusBadge variant={auditActionVariant(log.action)}>{log.action}</StatusBadge>
                    <StatusBadge variant="default">{log.module}</StatusBadge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-slate-500">{metadataSummary(log.metadata)}</p>
                </button>
              ))
            )}
          </div>
        </aside>
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
                <div>
                  <div className="mb-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    <Filter className="mt-0.5 h-3.5 w-3.5" />
                    Metadata sensitif seperti token, NIK/KK, password, OTP, dan URL dokumen disamarkan di UI.
                  </div>
                  <pre className="max-h-80 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                    {JSON.stringify(sanitizeMetadata(detail.metadata), null, 2)}
                  </pre>
                </div>
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
