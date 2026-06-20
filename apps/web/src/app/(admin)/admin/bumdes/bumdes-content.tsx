'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@sidpro/ui';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/enterprise/page-header';
import { ErrorState } from '@/components/enterprise/error-state';
import { DataTable } from '@/components/shared/data-table';
import { DetailDrawer } from '@/components/enterprise/detail-drawer';
import { useAuth } from '@/hooks/use-auth';
import {
  useBumdesFinancialRecords,
  useBumdesUnits,
  useCreateBumdesFinancialRecord,
  useCreateBumdesUnit,
  type BumdesFinancialInput,
  type BumdesUnit,
  type BumdesUnitInput,
} from '@/features/bumdes/use-bumdes';

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function BumdesContent() {
  const { can } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [financeDrawerOpen, setFinanceDrawerOpen] = useState(false);
  const { data, isLoading, error, refetch } = useBumdesUnits();
  const {
    data: financeData,
    isLoading: financeLoading,
    error: financeError,
    refetch: refetchFinance,
  } = useBumdesFinancialRecords();
  const createMutation = useCreateBumdesUnit();
  const createFinanceMutation = useCreateBumdesFinancialRecord();
  const form = useForm<BumdesUnitInput>({
    defaultValues: { name: '', code: '', businessType: '', description: '' },
  });
  const financeForm = useForm<BumdesFinancialInput>({
    defaultValues: {
      unitId: '',
      type: 'revenue',
      amount: 0,
      description: '',
      recordDate: new Date().toISOString().slice(0, 10),
    },
  });

  const units: BumdesUnit[] = data?.data ?? [];
  const records = financeData?.data ?? [];
  const canManage = can('bumdes.manage');

  async function onSubmit(values: BumdesUnitInput) {
    await createMutation.mutateAsync(values);
    form.reset();
    setDrawerOpen(false);
  }

  async function onSubmitFinance(values: BumdesFinancialInput) {
    await createFinanceMutation.mutateAsync(values);
    financeForm.reset({
      unitId: units[0]?.id ?? '',
      type: 'revenue',
      amount: 0,
      description: '',
      recordDate: new Date().toISOString().slice(0, 10),
    });
    setFinanceDrawerOpen(false);
  }

  return (
    <div>
      <PageHeader
        title="BUMDes"
        description="Unit usaha desa milik masyarakat (Badan Usaha Milik Desa)."
        actions={
          canManage ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setFinanceDrawerOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Transaksi
              </Button>
              <Button size="sm" onClick={() => setDrawerOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Unit Baru
              </Button>
            </div>
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

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">Transaksi Keuangan BUMDes</CardTitle>
        </CardHeader>
        <CardContent>
          {financeLoading ? (
            <p className="text-sm text-slate-500">Memuat transaksi...</p>
          ) : financeError ? (
            <ErrorState
              message="Gagal memuat transaksi BUMDes."
              onRetry={() => refetchFinance()}
            />
          ) : (
            <DataTable
              data={records}
              columns={[
                {
                  key: 'recordDate',
                  header: 'Tanggal',
                  cell: (row) => new Date(row.recordDate).toLocaleDateString('id-ID'),
                },
                {
                  key: 'unit',
                  header: 'Unit',
                  cell: (row) => row.unit?.name ?? '—',
                },
                {
                  key: 'type',
                  header: 'Tipe',
                  cell: (row) => (row.type === 'revenue' ? 'Pendapatan' : 'Pengeluaran'),
                },
                {
                  key: 'amount',
                  header: 'Nominal',
                  cell: (row) => formatCurrency(row.amount),
                },
                {
                  key: 'description',
                  header: 'Keterangan',
                  cell: (row) => row.description ?? '—',
                },
              ]}
              emptyMessage="Belum ada transaksi keuangan BUMDes."
            />
          )}
        </CardContent>
      </Card>

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

      <DetailDrawer
        open={financeDrawerOpen}
        onClose={() => setFinanceDrawerOpen(false)}
        title="Catat Transaksi BUMDes"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setFinanceDrawerOpen(false)}>
              Batal
            </Button>
            <Button
              disabled={createFinanceMutation.isPending || units.length === 0}
              onClick={financeForm.handleSubmit(onSubmitFinance)}
            >
              {createFinanceMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={financeForm.handleSubmit(onSubmitFinance)}>
          <div>
            <label className="form-label" htmlFor="unitId">
              Unit BUMDes
            </label>
            <select
              id="unitId"
              className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              {...financeForm.register('unitId', { required: true })}
            >
              <option value="">Pilih unit</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="type">
              Tipe
            </label>
            <select
              id="type"
              className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              {...financeForm.register('type')}
            >
              <option value="revenue">Pendapatan</option>
              <option value="expense">Pengeluaran</option>
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="amount">
              Nominal (Rp)
            </label>
            <Input
              id="amount"
              type="number"
              {...financeForm.register('amount', { valueAsNumber: true, required: true })}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="recordDate">
              Tanggal
            </label>
            <Input id="recordDate" type="date" {...financeForm.register('recordDate')} />
          </div>
          <div>
            <label className="form-label" htmlFor="financeDescription">
              Keterangan
            </label>
            <Input id="financeDescription" {...financeForm.register('description')} />
          </div>
        </form>
      </DetailDrawer>
    </div>
  );
}
