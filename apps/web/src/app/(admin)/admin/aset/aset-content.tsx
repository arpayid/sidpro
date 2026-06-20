'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input } from '@sidpro/ui';
import { Plus, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/shared/data-table';
import { DetailDrawer } from '@/components/enterprise/detail-drawer';
import { ErrorState } from '@/components/enterprise/error-state';
import { useAuth } from '@/hooks/use-auth';
import {
  useAssets,
  useCreateAsset,
  useDeleteAsset,
  type AssetInput,
} from '@/features/assets/use-assets';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

const emptyForm: AssetInput = {
  name: '',
  code: '',
  category: 'Bangunan',
  condition: 'good',
  location: '',
  value: undefined,
};

export function AsetContent() {
  const { can } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data, isLoading, error, refetch } = useAssets();
  const createMutation = useCreateAsset();
  const deleteMutation = useDeleteAsset();
  const form = useForm<AssetInput>({ defaultValues: emptyForm });

  const assets = data?.data ?? [];
  const canManage = can('assets.manage');

  async function onSubmit(values: AssetInput) {
    await createMutation.mutateAsync(values);
    form.reset(emptyForm);
    setDrawerOpen(false);
  }

  async function onDelete(id: string, name: string) {
    if (!window.confirm(`Hapus aset "${name}"?`)) return;
    await deleteMutation.mutateAsync(id);
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Aset Desa</h1>
          <p className="page-description">Inventaris aset tetap dan barang milik desa.</p>
        </div>
        {canManage && (
          <Button onClick={() => setDrawerOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Aset
          </Button>
        )}
      </div>

      <div className="mt-6">
        {isLoading ? (
          <p className="text-sm text-slate-500">Memuat aset...</p>
        ) : error ? (
          <ErrorState message="Gagal memuat daftar aset." onRetry={() => refetch()} />
        ) : (
          <DataTable
            data={assets}
            columns={[
              { key: 'code', header: 'Kode', cell: (row) => row.code },
              { key: 'name', header: 'Nama Aset', cell: (row) => row.name },
              { key: 'category', header: 'Jenis', cell: (row) => row.category },
              {
                key: 'value',
                header: 'Nilai',
                cell: (row) => (row.value ? formatCurrency(Number(row.value)) : '—'),
              },
              {
                key: 'actions',
                header: 'Aksi',
                cell: (row) =>
                  canManage ? (
                    <button
                      type="button"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => onDelete(row.id, row.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : (
                    '—'
                  ),
              },
            ]}
            emptyMessage="Belum ada aset terdata."
          />
        )}
      </div>

      <DetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Tambah Aset"
        footer={
          <div className="flex justify-end gap-2 border-t border-slate-200 p-4">
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              Batal
            </Button>
            <Button
              disabled={!canManage || createMutation.isPending}
              onClick={form.handleSubmit(onSubmit)}
            >
              Simpan
            </Button>
          </div>
        }
      >
        <form className="space-y-4 p-5" onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <label className="form-label" htmlFor="code">
              Kode
            </label>
            <Input id="code" disabled={!canManage} {...form.register('code', { required: true })} />
          </div>
          <div>
            <label className="form-label" htmlFor="name">
              Nama Aset
            </label>
            <Input id="name" disabled={!canManage} {...form.register('name', { required: true })} />
          </div>
          <div>
            <label className="form-label" htmlFor="category">
              Kategori
            </label>
            <Input id="category" disabled={!canManage} {...form.register('category')} />
          </div>
          <div>
            <label className="form-label" htmlFor="value">
              Nilai (Rp)
            </label>
            <Input
              id="value"
              type="number"
              disabled={!canManage}
              {...form.register('value', { valueAsNumber: true })}
            />
          </div>
        </form>
      </DetailDrawer>
    </div>
  );
}
