'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Badge, Button, Input } from '@sidpro/ui';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/shared/data-table';
import { DetailDrawer } from '@/components/enterprise/detail-drawer';
import { useAuth } from '@/hooks/use-auth';
import {
  useCmsAgendas,
  useCreateCmsAgenda,
  useUpdateCmsAgenda,
  useDeleteCmsAgenda,
  type CmsAgenda,
  type CmsAgendaInput,
} from '@/features/cms/use-cms-agendas';

const emptyForm: CmsAgendaInput = {
  title: '',
  description: '',
  location: '',
  startAt: '',
  endAt: '',
  status: 'scheduled',
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Terjadwal',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AgendaContent() {
  const { can } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingAgenda, setEditingAgenda] = useState<CmsAgenda | null>(null);

  const { data, isLoading, error } = useCmsAgendas();
  const createMutation = useCreateCmsAgenda();
  const updateMutation = useUpdateCmsAgenda();
  const deleteMutation = useDeleteCmsAgenda();

  const form = useForm<CmsAgendaInput>({ defaultValues: emptyForm });
  const agendas = data?.data ?? [];
  const canManage = can('cms.manage');

  useEffect(() => {
    if (editingAgenda) {
      form.reset({
        title: editingAgenda.title,
        description: editingAgenda.description ?? '',
        location: editingAgenda.location ?? '',
        startAt: editingAgenda.startAt.slice(0, 16),
        endAt: editingAgenda.endAt ? editingAgenda.endAt.slice(0, 16) : '',
        status: editingAgenda.status,
      });
      return;
    }
    form.reset(emptyForm);
  }, [editingAgenda, form]);

  function openCreate() {
    setEditingAgenda(null);
    setDrawerOpen(true);
  }

  function openEdit(agenda: CmsAgenda) {
    setEditingAgenda(agenda);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditingAgenda(null);
  }

  async function onSubmit(values: CmsAgendaInput) {
    const body = {
      ...values,
      endAt: values.endAt || undefined,
    };
    if (editingAgenda) {
      await updateMutation.mutateAsync({ id: editingAgenda.id, body });
    } else {
      await createMutation.mutateAsync(body);
    }
    closeDrawer();
  }

  async function onDelete(agenda: CmsAgenda) {
    if (!window.confirm(`Hapus agenda "${agenda.title}"?`)) return;
    await deleteMutation.mutateAsync(agenda.id);
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Agenda Kegiatan</h1>
          <p className="page-description">Kelola jadwal kegiatan resmi yang tampil di portal publik.</p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Agenda
          </Button>
        )}
      </div>

      <div className="mt-6">
        {isLoading ? (
          <p className="text-sm text-slate-500">Memuat agenda...</p>
        ) : error ? (
          <p className="text-sm text-red-600">Gagal memuat agenda.</p>
        ) : (
          <DataTable
            data={agendas}
            columns={[
              { key: 'title', header: 'Judul', cell: (row) => row.title },
              {
                key: 'startAt',
                header: 'Mulai',
                cell: (row) => formatDateTime(row.startAt),
              },
              { key: 'location', header: 'Lokasi', cell: (row) => row.location ?? '—' },
              {
                key: 'status',
                header: 'Status',
                cell: (row) => (
                  <Badge variant={row.status === 'scheduled' ? 'default' : 'secondary'}>
                    {STATUS_LABELS[row.status] ?? row.status}
                  </Badge>
                ),
              },
              {
                key: 'actions',
                header: 'Aksi',
                cell: (row) =>
                  canManage ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="text-slate-500 hover:text-slate-800"
                        onClick={() => openEdit(row)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="text-slate-500 hover:text-red-600"
                        onClick={() => onDelete(row)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    '—'
                  ),
              },
            ]}
          />
        )}
      </div>

      <DetailDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={editingAgenda ? 'Edit Agenda' : 'Tambah Agenda'}
        footer={
          canManage ? (
            <Button disabled={isSaving} onClick={form.handleSubmit(onSubmit)}>
              {isSaving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          ) : undefined
        }
      >
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <label className="form-label" htmlFor="title">
              Judul
            </label>
            <Input id="title" disabled={!canManage} {...form.register('title', { required: true })} />
          </div>
          <div>
            <label className="form-label" htmlFor="startAt">
              Waktu Mulai
            </label>
            <Input
              id="startAt"
              type="datetime-local"
              disabled={!canManage}
              {...form.register('startAt', { required: true })}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="endAt">
              Waktu Selesai
            </label>
            <Input id="endAt" type="datetime-local" disabled={!canManage} {...form.register('endAt')} />
          </div>
          <div>
            <label className="form-label" htmlFor="location">
              Lokasi
            </label>
            <Input id="location" disabled={!canManage} {...form.register('location')} />
          </div>
          <div>
            <label className="form-label" htmlFor="description">
              Deskripsi
            </label>
            <textarea
              id="description"
              rows={4}
              className="form-input"
              disabled={!canManage}
              {...form.register('description')}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="status">
              Status
            </label>
            <select id="status" className="form-input" disabled={!canManage} {...form.register('status')}>
              <option value="scheduled">Terjadwal</option>
              <option value="completed">Selesai</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
          </div>
        </form>
      </DetailDrawer>
    </div>
  );
}
