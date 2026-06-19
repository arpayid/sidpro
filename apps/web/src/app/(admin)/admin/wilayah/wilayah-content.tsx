'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@sidpro/ui';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/shared/data-table';
import { DetailDrawer } from '@/components/enterprise/detail-drawer';
import { useAuth } from '@/hooks/use-auth';
import {
  useCreateHamlet,
  useCreateNeighborhoodUnit,
  useHamlets,
  useNeighborhoodUnits,
} from '@/features/territories/use-territories';

export function WilayahContent() {
  const { can } = useAuth();
  const [selectedHamletId, setSelectedHamletId] = useState<string | null>(null);
  const [hamletDrawerOpen, setHamletDrawerOpen] = useState(false);
  const [unitDrawerOpen, setUnitDrawerOpen] = useState(false);

  const { data: hamlets = [], isLoading: hamletsLoading } = useHamlets();
  const { data: units = [], isLoading: unitsLoading } = useNeighborhoodUnits(selectedHamletId);
  const createHamlet = useCreateHamlet();
  const createUnit = useCreateNeighborhoodUnit();

  const hamletForm = useForm({ defaultValues: { name: '', code: '' } });
  const unitForm = useForm({ defaultValues: { rt: '', rw: '' } });

  const canManage = can('population.update');
  const selectedHamlet = hamlets.find((h) => h.id === selectedHamletId);

  async function onCreateHamlet(values: { name: string; code: string }) {
    const hamlet = await createHamlet.mutateAsync(values);
    setHamletDrawerOpen(false);
    hamletForm.reset();
    setSelectedHamletId(hamlet.id);
  }

  async function onCreateUnit(values: { rt: string; rw: string }) {
    if (!selectedHamletId) return;
    await createUnit.mutateAsync({ hamletId: selectedHamletId, ...values });
    setUnitDrawerOpen(false);
    unitForm.reset();
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Wilayah Desa</h1>
          <p className="page-description">Kelola data dusun, RT, dan RW untuk alamat warga.</p>
        </div>
        {canManage && (
          <Button onClick={() => setHamletDrawerOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Dusun
          </Button>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dusun</CardTitle>
          </CardHeader>
          <CardContent>
            {hamletsLoading ? (
              <p className="text-sm text-slate-500">Memuat dusun...</p>
            ) : (
              <DataTable
                data={hamlets}
                columns={[
                  { key: 'name', header: 'Nama', cell: (row) => row.name },
                  { key: 'code', header: 'Kode', cell: (row) => row.code },
                  {
                    key: 'units',
                    header: 'RT/RW',
                    cell: (row) => row._count?.neighborhoodUnits ?? 0,
                  },
                  {
                    key: 'select',
                    header: '',
                    cell: (row) => (
                      <Button
                        size="sm"
                        variant={selectedHamletId === row.id ? 'default' : 'outline'}
                        onClick={() => setSelectedHamletId(row.id)}
                      >
                        Pilih
                      </Button>
                    ),
                  },
                ]}
                emptyMessage="Belum ada dusun. Tambahkan dusun untuk mengelola RT/RW."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              RT/RW {selectedHamlet ? `— ${selectedHamlet.name}` : ''}
            </CardTitle>
            {canManage && selectedHamletId && (
              <Button size="sm" variant="outline" onClick={() => setUnitDrawerOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Tambah RT/RW
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!selectedHamletId ? (
              <p className="text-sm text-slate-500">Pilih dusun untuk melihat RT/RW.</p>
            ) : unitsLoading ? (
              <p className="text-sm text-slate-500">Memuat RT/RW...</p>
            ) : (
              <DataTable
                data={units}
                columns={[
                  { key: 'rw', header: 'RW', cell: (row) => row.rw },
                  { key: 'rt', header: 'RT', cell: (row) => row.rt },
                ]}
                emptyMessage="Belum ada RT/RW pada dusun ini."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <DetailDrawer
        open={hamletDrawerOpen}
        onClose={() => setHamletDrawerOpen(false)}
        title="Tambah Dusun"
        footer={
          <div className="flex justify-end gap-2 border-t border-slate-200 p-4">
            <Button variant="outline" onClick={() => setHamletDrawerOpen(false)}>
              Batal
            </Button>
            <Button
              disabled={!canManage || createHamlet.isPending}
              onClick={hamletForm.handleSubmit(onCreateHamlet)}
            >
              Simpan
            </Button>
          </div>
        }
      >
        <form className="space-y-4 p-5" onSubmit={hamletForm.handleSubmit(onCreateHamlet)}>
          <div>
            <label className="form-label" htmlFor="hamlet-name">
              Nama Dusun
            </label>
            <Input id="hamlet-name" disabled={!canManage} {...hamletForm.register('name')} />
          </div>
          <div>
            <label className="form-label" htmlFor="hamlet-code">
              Kode
            </label>
            <Input id="hamlet-code" disabled={!canManage} {...hamletForm.register('code')} />
          </div>
        </form>
      </DetailDrawer>

      <DetailDrawer
        open={unitDrawerOpen}
        onClose={() => setUnitDrawerOpen(false)}
        title="Tambah RT/RW"
        footer={
          <div className="flex justify-end gap-2 border-t border-slate-200 p-4">
            <Button variant="outline" onClick={() => setUnitDrawerOpen(false)}>
              Batal
            </Button>
            <Button
              disabled={!canManage || !selectedHamletId || createUnit.isPending}
              onClick={unitForm.handleSubmit(onCreateUnit)}
            >
              Simpan
            </Button>
          </div>
        }
      >
        <form className="space-y-4 p-5" onSubmit={unitForm.handleSubmit(onCreateUnit)}>
          <div>
            <label className="form-label" htmlFor="rw">
              RW
            </label>
            <Input id="rw" disabled={!canManage} {...unitForm.register('rw')} />
          </div>
          <div>
            <label className="form-label" htmlFor="rt">
              RT
            </label>
            <Input id="rt" disabled={!canManage} {...unitForm.register('rt')} />
          </div>
        </form>
      </DetailDrawer>
    </div>
  );
}
