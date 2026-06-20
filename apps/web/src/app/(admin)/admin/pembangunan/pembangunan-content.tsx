'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Badge, Button, Input } from '@sidpro/ui';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/shared/data-table';
import { DetailDrawer } from '@/components/enterprise/detail-drawer';
import { ErrorState } from '@/components/enterprise/error-state';
import { useAuth } from '@/hooks/use-auth';
import {
  useCreateDevelopmentProject,
  useDeleteDevelopmentProject,
  useDevelopmentProjects,
  useUpdateDevelopmentProject,
  type DevelopmentProject,
  type DevelopmentProjectInput,
} from '@/features/development/use-development-projects';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

function statusLabel(status: string) {
  if (status === 'completed') return 'Selesai';
  if (status === 'ongoing') return 'Berjalan';
  if (status === 'planned') return 'Perencanaan';
  if (status === 'cancelled') return 'Dibatalkan';
  return status;
}

const emptyForm: DevelopmentProjectInput = {
  name: '',
  code: '',
  description: '',
  location: '',
  budget: undefined,
  fundingSource: '',
  status: 'planned',
  progress: 0,
};

export function PembangunanContent() {
  const { can } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<DevelopmentProject | null>(null);

  const { data, isLoading, error, refetch } = useDevelopmentProjects();
  const createMutation = useCreateDevelopmentProject();
  const updateMutation = useUpdateDevelopmentProject();
  const deleteMutation = useDeleteDevelopmentProject();

  const form = useForm<DevelopmentProjectInput>({ defaultValues: emptyForm });
  const projects = data?.data ?? [];
  const canManage = can('development.manage');

  useEffect(() => {
    if (editingProject) {
      form.reset({
        name: editingProject.name,
        code: editingProject.code,
        description: editingProject.description ?? '',
        location: editingProject.location ?? '',
        budget: editingProject.budget ? Number(editingProject.budget) : undefined,
        fundingSource: editingProject.fundingSource ?? '',
        status: editingProject.status,
        progress: editingProject.progress,
      });
      return;
    }
    form.reset(emptyForm);
  }, [editingProject, form]);

  function openCreate() {
    setEditingProject(null);
    setDrawerOpen(true);
  }

  function openEdit(project: DevelopmentProject) {
    setEditingProject(project);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditingProject(null);
  }

  async function onSubmit(values: DevelopmentProjectInput) {
    const body = {
      ...values,
      budget: values.budget ? Number(values.budget) : undefined,
      progress: values.progress ? Number(values.progress) : 0,
    };
    if (editingProject) {
      await updateMutation.mutateAsync({ id: editingProject.id, body });
    } else {
      await createMutation.mutateAsync(body);
    }
    closeDrawer();
  }

  async function onDelete(project: DevelopmentProject) {
    if (!window.confirm(`Hapus proyek "${project.name}"?`)) return;
    await deleteMutation.mutateAsync(project.id);
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Pembangunan Desa</h1>
          <p className="page-description">Monitor progres proyek pembangunan infrastruktur.</p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Proyek
          </Button>
        )}
      </div>

      <div className="mt-6">
        {isLoading ? (
          <p className="text-sm text-slate-500">Memuat proyek...</p>
        ) : error ? (
          <ErrorState message="Gagal memuat daftar proyek." onRetry={() => refetch()} />
        ) : (
          <DataTable
            data={projects}
            columns={[
              { key: 'name', header: 'Proyek', cell: (row) => row.name },
              {
                key: 'budget',
                header: 'Anggaran',
                cell: (row) =>
                  row.budget ? formatCurrency(Number(row.budget)) : '—',
              },
              { key: 'progress', header: 'Progres', cell: (row) => `${row.progress}%` },
              {
                key: 'status',
                header: 'Status',
                cell: (row) => (
                  <Badge variant={row.status === 'completed' ? 'success' : 'default'}>
                    {statusLabel(row.status)}
                  </Badge>
                ),
              },
              {
                key: 'actions',
                header: 'Aksi',
                cell: (row) =>
                  canManage ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="text-slate-500 hover:text-slate-800"
                        onClick={() => openEdit(row)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => onDelete(row)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    '—'
                  ),
              },
            ]}
            emptyMessage="Belum ada proyek pembangunan."
          />
        )}
      </div>

      <DetailDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={editingProject ? 'Edit Proyek' : 'Tambah Proyek'}
        width="max-w-xl"
        footer={
          <div className="flex justify-end gap-2 border-t border-slate-200 p-4">
            <Button variant="outline" onClick={closeDrawer}>
              Batal
            </Button>
            <Button disabled={!canManage || isSaving} onClick={form.handleSubmit(onSubmit)}>
              {isSaving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        }
      >
        <form className="space-y-4 p-5" onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <label className="form-label" htmlFor="name">
              Nama Proyek
            </label>
            <Input id="name" disabled={!canManage} {...form.register('name', { required: true })} />
          </div>
          <div>
            <label className="form-label" htmlFor="code">
              Kode Proyek
            </label>
            <Input
              id="code"
              disabled={!canManage || Boolean(editingProject)}
              {...form.register('code', { required: true })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label" htmlFor="budget">
                Anggaran (Rp)
              </label>
              <Input
                id="budget"
                type="number"
                disabled={!canManage}
                {...form.register('budget', { valueAsNumber: true })}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="progress">
                Progres (%)
              </label>
              <Input
                id="progress"
                type="number"
                min={0}
                max={100}
                disabled={!canManage}
                {...form.register('progress', { valueAsNumber: true })}
              />
            </div>
          </div>
          <div>
            <label className="form-label" htmlFor="location">
              Lokasi
            </label>
            <Input id="location" disabled={!canManage} {...form.register('location')} />
          </div>
          <div>
            <label className="form-label" htmlFor="status">
              Status
            </label>
            <select
              id="status"
              disabled={!canManage}
              className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              {...form.register('status')}
            >
              <option value="planned">Perencanaan</option>
              <option value="ongoing">Berjalan</option>
              <option value="completed">Selesai</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="description">
              Deskripsi
            </label>
            <textarea
              id="description"
              rows={4}
              disabled={!canManage}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...form.register('description')}
            />
          </div>
        </form>
      </DetailDrawer>
    </div>
  );
}
