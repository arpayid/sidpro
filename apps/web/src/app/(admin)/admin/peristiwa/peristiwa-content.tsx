'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input } from '@sidpro/ui';
import { Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/enterprise/page-header';
import { DataTable, FilterBar } from '@/components/enterprise/data-table';
import { DetailDrawer } from '@/components/enterprise/detail-drawer';
import { ConfirmDialog } from '@/components/enterprise/confirm-dialog';
import { useAuth } from '@/hooks/use-auth';
import {
  useCivilEvents,
  useCreateCivilEvent,
  useDeleteCivilEvent,
  type CivilEvent,
} from '@/features/civil-events/use-civil-events';
import { useResidents } from '@/features/residents/use-residents';
import { maskNik } from '@/lib/mask-nik';
import { StatusBadge } from '@/components/enterprise/status-badge';

const EVENT_TYPE_LABELS: Record<string, string> = {
  birth: 'Kelahiran',
  marriage: 'Perkawinan',
  divorce: 'Perceraian',
  moved: 'Pindah',
  deceased: 'Meninggal',
  other: 'Lainnya',
};

const EVENT_TYPE_OPTIONS = Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

function formatEventType(type: string) {
  return EVENT_TYPE_LABELS[type] ?? type;
}

function eventTypeVariant(type: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  if (type === 'birth' || type === 'marriage') return 'success';
  if (type === 'moved') return 'warning';
  if (type === 'deceased' || type === 'divorce') return 'danger';
  return 'info';
}

export function PeristiwaContent() {
  const { can } = useAuth();
  const [page, setPage] = useState(1);
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CivilEvent | null>(null);
  const [residentSearch, setResidentSearch] = useState('');

  const { data, isLoading, error, refetch } = useCivilEvents({
    page,
    limit: 20,
    eventType: eventTypeFilter || undefined,
  });
  const events = data?.data ?? [];
  const meta = data?.meta;

  const { data: residentsData } = useResidents({
    page: 1,
    limit: 50,
    search: residentSearch || undefined,
  });
  const residents = residentsData?.data ?? [];

  const createMutation = useCreateCivilEvent();
  const deleteMutation = useDeleteCivilEvent();

  const form = useForm({
    defaultValues: {
      residentId: '',
      eventType: 'birth',
      eventDate: '',
      notes: '',
    },
  });

  const canCreate = can('population.create');
  const canDelete = can('population.delete');
  const selected = events.find((e) => e.id === detailId) ?? null;

  async function onCreate(values: {
    residentId: string;
    eventType: string;
    eventDate: string;
    notes: string;
  }) {
    await createMutation.mutateAsync({
      residentId: values.residentId,
      eventType: values.eventType,
      eventDate: values.eventDate,
      notes: values.notes || undefined,
    });
    setDrawerOpen(false);
    form.reset();
    setResidentSearch('');
  }

  async function onDelete() {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
    if (detailId === deleteTarget.id) setDetailId(null);
  }

  return (
    <div>
      <PageHeader
        title="Peristiwa Sipil"
        description="Catatan kelahiran, perkawinan, mutasi, dan peristiwa kependudukan lainnya."
        actions={
          canCreate ? (
            <Button onClick={() => setDrawerOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Catat Peristiwa
            </Button>
          ) : undefined
        }
      />

      <div className="mt-6">
        <DataTable
          columns={[
            {
              key: 'eventDate',
              header: 'Tanggal',
              render: (row) => row.eventDate.slice(0, 10),
            },
            {
              key: 'eventType',
              header: 'Jenis',
              render: (row) => (
                <StatusBadge variant={eventTypeVariant(row.eventType)}>
                  {formatEventType(row.eventType)}
                </StatusBadge>
              ),
            },
            {
              key: 'resident',
              header: 'Penduduk',
              render: (row) => row.resident?.fullName ?? '—',
            },
            {
              key: 'nik',
              header: 'NIK',
              render: (row) => (row.resident?.nik ? maskNik(row.resident.nik) : '—'),
            },
            {
              key: 'notes',
              header: 'Catatan',
              render: (row) => row.notes ?? '—',
            },
          ]}
          data={events}
          loading={isLoading}
          error={error?.message}
          onRetry={() => refetch()}
          rowKey={(row) => row.id}
          onRowClick={(row) => setDetailId(row.id)}
          page={page}
          totalPages={meta?.totalPages ?? 1}
          total={meta?.total}
          onPageChange={setPage}
          toolbar={
            <FilterBar>
              <select
                value={eventTypeFilter}
                onChange={(e) => {
                  setEventTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="">Semua jenis</option>
                {EVENT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </FilterBar>
          }
          rowActions={
            canDelete
              ? (row) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(row);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                )
              : undefined
          }
        />
      </div>

      <DetailDrawer
        open={Boolean(detailId)}
        onClose={() => setDetailId(null)}
        title="Detail Peristiwa"
      >
        {selected && (
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Jenis</dt>
              <dd className="font-medium">{formatEventType(selected.eventType)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Tanggal</dt>
              <dd className="font-medium">{selected.eventDate.slice(0, 10)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Penduduk</dt>
              <dd className="font-medium">{selected.resident?.fullName ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">NIK</dt>
              <dd className="font-medium">
                {selected.resident?.nik ? maskNik(selected.resident.nik) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Catatan</dt>
              <dd className="font-medium">{selected.notes ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Dicatat</dt>
              <dd className="font-medium">{selected.createdAt.slice(0, 10)}</dd>
            </div>
          </dl>
        )}
      </DetailDrawer>

      <DetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Catat Peristiwa Sipil"
        footer={
          <Button
            disabled={createMutation.isPending}
            onClick={form.handleSubmit(onCreate)}
          >
            {createMutation.isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        }
      >
        <form className="space-y-4" onSubmit={form.handleSubmit(onCreate)}>
          <div>
            <label className="form-label" htmlFor="resident-search">
              Cari Penduduk
            </label>
            <Input
              id="resident-search"
              placeholder="Nama atau NIK..."
              value={residentSearch}
              onChange={(e) => setResidentSearch(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="residentId">
              Penduduk
            </label>
            <select
              id="residentId"
              className="form-input"
              {...form.register('residentId', { required: true })}
            >
              <option value="">Pilih penduduk</option>
              {residents.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.fullName} ({maskNik(r.nik)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="eventType">
              Jenis Peristiwa
            </label>
            <select id="eventType" className="form-input" {...form.register('eventType')}>
              {EVENT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="eventDate">
              Tanggal Peristiwa
            </label>
            <Input id="eventDate" type="date" {...form.register('eventDate', { required: true })} />
          </div>
          <div>
            <label className="form-label" htmlFor="notes">
              Catatan
            </label>
            <textarea
              id="notes"
              rows={3}
              className="form-input"
              {...form.register('notes')}
            />
          </div>
        </form>
      </DetailDrawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={onDelete}
        title="Hapus peristiwa?"
        message="Data peristiwa sipil akan dihapus permanen. Tindakan ini tidak mengubah status penduduk."
        confirmLabel="Hapus"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
