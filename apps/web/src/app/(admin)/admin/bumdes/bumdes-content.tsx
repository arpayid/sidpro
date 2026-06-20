'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input } from '@sidpro/ui';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/enterprise/page-header';
import { ErrorState } from '@/components/enterprise/error-state';
import { DataTable } from '@/components/shared/data-table';
import { DetailDrawer } from '@/components/enterprise/detail-drawer';
import { useAuth } from '@/hooks/use-auth';
import {
  useBumdesUnits,
  useCreateBumdesUnit,
  type BumdesUnit,
  type BumdesUnitInput,
} from '@/features/bumdes/use-bumdes';

export function BumdesContent() {
  const { can } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data, isLoading, error, refetch } = useBumdesUnits();
  const createMutation = useCreateBumdesUnit();
  const form = useForm<BumdesUnitInput>({
    defaultValues: { name: '', code: '', businessType: '', description: '' },
  });

  const units: BumdesUnit[] = data?.data ?? [];
  const canManage = can('bumdes.manage');

  async function onSubmit(values: BumdesUnitInput) {
    await createMutation.mutateAsync(values);
    form.reset();
    setDrawerOpen(false);
  }

  return (
    <div>
      <PageHeader
        title="BUMDes"
        description="Unit usaha desa milik masyarakat (Badan Usaha Milik Desa)."
        actions={
          canManage ? (
            <Button size="sm" onClick={() => setDrawerOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Unit Baru
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <p className="text-sm text-slate-500">Memuat unit BUMDes...</p>
      ) : error ? (
        <ErrorState message="Gagal memuat data BUMDes." onRetry={() => refetch()} />
      ) : (
        <DataTable
          data={units}
          columns={[
            { key: 'name', header: 'Nama Unit', cell: (row) => row.name },
            { key: 'code', header: 'Kode', cell: (row) => row.code },
            { key: 'businessType', header: 'Jenis Usaha', cell: (row) => row.businessType ?? '—' },
            { key: 'status', header: 'Status', cell: (row) => row.status },
          ]}
          emptyMessage="Belum ada unit BUMDes terdaftar."
        />
      )}

      <DetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Tambah Unit BUMDes"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              Batal
            </Button>
            <Button disabled={createMutation.isPending} onClick={form.handleSubmit(onSubmit)}>
              {createMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <label className="form-label" htmlFor="name">
              Nama Unit
            </label>
            <Input id="name" {...form.register('name', { required: true })} />
          </div>
          <div>
            <label className="form-label" htmlFor="code">
              Kode
            </label>
            <Input id="code" {...form.register('code', { required: true })} />
          </div>
          <div>
            <label className="form-label" htmlFor="businessType">
              Jenis Usaha
            </label>
            <Input id="businessType" {...form.register('businessType')} />
          </div>
          <div>
            <label className="form-label" htmlFor="description">
              Deskripsi
            </label>
            <Input id="description" {...form.register('description')} />
          </div>
        </form>
      </DetailDrawer>
    </div>
  );
}
