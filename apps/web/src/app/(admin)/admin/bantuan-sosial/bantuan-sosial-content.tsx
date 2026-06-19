'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Badge, Button, Input } from '@sidpro/ui';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/shared/data-table';
import { DetailDrawer } from '@/components/enterprise/detail-drawer';
import { useAuth } from '@/hooks/use-auth';
import {
  useAidPrograms,
  useCreateAidProgram,
  type AidProgramInput,
} from '@/features/social-assistance/use-aid-programs';

const emptyForm: AidProgramInput = {
  name: '',
  code: '',
  description: '',
  status: 'active',
};

export function BantuanSosialContent() {
  const { can } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data, isLoading, error } = useAidPrograms();
  const createMutation = useCreateAidProgram();
  const form = useForm<AidProgramInput>({ defaultValues: emptyForm });

  const programs = data?.data ?? [];
  const canManage = can('aid.manage');

  async function onSubmit(values: AidProgramInput) {
    await createMutation.mutateAsync(values);
    form.reset(emptyForm);
    setDrawerOpen(false);
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Bantuan Sosial</h1>
          <p className="page-description">Kelola program bantuan untuk warga kurang mampu.</p>
        </div>
        {canManage && (
          <Button onClick={() => setDrawerOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Program Baru
          </Button>
        )}
      </div>

      <div className="mt-6">
        {isLoading ? (
          <p className="text-sm text-slate-500">Memuat program...</p>
        ) : error ? (
          <p className="text-sm text-red-600">Gagal memuat program bantuan.</p>
        ) : (
          <DataTable
            data={programs}
            columns={[
              { key: 'name', header: 'Program', cell: (row) => row.name },
              {
                key: 'recipients',
                header: 'Penerima',
                cell: (row) => row._count?.recipients ?? 0,
              },
              { key: 'code', header: 'Kode', cell: (row) => row.code },
              {
                key: 'status',
                header: 'Status',
                cell: (row) => (
                  <Badge variant={row.status === 'active' ? 'success' : 'secondary'}>
                    {row.status === 'active' ? 'Aktif' : row.status}
                  </Badge>
                ),
              },
            ]}
            emptyMessage="Belum ada program bantuan sosial."
          />
        )}
      </div>

      <DetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Program Bantuan Baru"
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
            <label className="form-label" htmlFor="name">
              Nama Program
            </label>
            <Input id="name" disabled={!canManage} {...form.register('name', { required: true })} />
          </div>
          <div>
            <label className="form-label" htmlFor="code">
              Kode
            </label>
            <Input id="code" disabled={!canManage} {...form.register('code', { required: true })} />
          </div>
          <div>
            <label className="form-label" htmlFor="description">
              Deskripsi
            </label>
            <textarea
              id="description"
              rows={3}
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
