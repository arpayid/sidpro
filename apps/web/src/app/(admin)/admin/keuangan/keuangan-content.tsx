'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@sidpro/ui';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/shared/data-table';
import { DetailDrawer } from '@/components/enterprise/detail-drawer';
import { ErrorState } from '@/components/enterprise/error-state';
import { useAuth } from '@/hooks/use-auth';
import {
  useBudgetYears,
  useCreateBudgetItem,
  useCreateBudgetYear,
} from '@/features/finance/use-finance';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function KeuanganContent() {
  const { can } = useAuth();
  const [yearDrawerOpen, setYearDrawerOpen] = useState(false);
  const [itemDrawerOpen, setItemDrawerOpen] = useState(false);

  const { data, isLoading, error, refetch } = useBudgetYears();
  const createYear = useCreateBudgetYear();
  const createItem = useCreateBudgetItem();

  const yearForm = useForm({ defaultValues: { year: new Date().getFullYear(), totalBudget: 0 } });
  const itemForm = useForm({
    defaultValues: { category: 'Belanja', name: '', planned: 0, realized: 0 },
  });

  const budgetYears = data?.data ?? [];
  const currentYear = budgetYears[0];

  const summary = useMemo(() => {
    const items = currentYear?.items ?? [];
    const totalPlanned = items.reduce((sum, item) => sum + Number(item.planned), 0);
    const totalRealized = items.reduce((sum, item) => sum + Number(item.realized), 0);
    return {
      year: currentYear?.year ?? new Date().getFullYear(),
      totalBudget: currentYear ? Number(currentYear.totalBudget) : 0,
      totalPlanned,
      totalRealized,
      absorptionRate: totalPlanned > 0 ? Math.round((totalRealized / totalPlanned) * 100) : 0,
    };
  }, [currentYear]);

  const canManage = can('finance.manage');

  async function onCreateYear(values: { year: number; totalBudget: number }) {
    await createYear.mutateAsync(values);
    setYearDrawerOpen(false);
    yearForm.reset();
  }

  async function onCreateItem(values: {
    category: string;
    name: string;
    planned: number;
    realized: number;
  }) {
    if (!currentYear) return;
    await createItem.mutateAsync({
      budgetYearId: currentYear.id,
      body: values,
    });
    setItemDrawerOpen(false);
    itemForm.reset();
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Keuangan Desa</h1>
          <p className="page-description">Transaksi dan realisasi anggaran desa.</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setYearDrawerOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Tahun Anggaran
            </Button>
            <Button disabled={!currentYear} onClick={() => setItemDrawerOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Pos Anggaran
            </Button>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">
              Anggaran {summary.year}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">
              {formatCurrency(summary.totalBudget)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Realisasi</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(summary.totalRealized)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Serapan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">{summary.absorptionRate}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <p className="text-sm text-slate-500">Memuat anggaran...</p>
        ) : error ? (
          <ErrorState message="Gagal memuat data keuangan." onRetry={() => refetch()} />
        ) : (
          <DataTable
            data={currentYear?.items ?? []}
            columns={[
              { key: 'category', header: 'Kategori', cell: (row) => row.category },
              { key: 'name', header: 'Uraian', cell: (row) => row.name },
              {
                key: 'planned',
                header: 'Anggaran',
                cell: (row) => formatCurrency(Number(row.planned)),
              },
              {
                key: 'realized',
                header: 'Realisasi',
                cell: (row) => formatCurrency(Number(row.realized)),
              },
            ]}
            emptyMessage={
              currentYear
                ? 'Belum ada pos anggaran untuk tahun ini.'
                : 'Belum ada tahun anggaran. Tambahkan tahun anggaran terlebih dahulu.'
            }
          />
        )}
      </div>

      <DetailDrawer
        open={yearDrawerOpen}
        onClose={() => setYearDrawerOpen(false)}
        title="Tambah Tahun Anggaran"
        footer={
          <div className="flex justify-end gap-2 border-t border-slate-200 p-4">
            <Button variant="outline" onClick={() => setYearDrawerOpen(false)}>
              Batal
            </Button>
            <Button
              disabled={!canManage || createYear.isPending}
              onClick={yearForm.handleSubmit(onCreateYear)}
            >
              Simpan
            </Button>
          </div>
        }
      >
        <form className="space-y-4 p-5" onSubmit={yearForm.handleSubmit(onCreateYear)}>
          <div>
            <label className="form-label" htmlFor="year">
              Tahun
            </label>
            <Input
              id="year"
              type="number"
              disabled={!canManage}
              {...yearForm.register('year', { valueAsNumber: true })}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="totalBudget">
              Total Anggaran (Rp)
            </label>
            <Input
              id="totalBudget"
              type="number"
              disabled={!canManage}
              {...yearForm.register('totalBudget', { valueAsNumber: true })}
            />
          </div>
        </form>
      </DetailDrawer>

      <DetailDrawer
        open={itemDrawerOpen}
        onClose={() => setItemDrawerOpen(false)}
        title="Tambah Pos Anggaran"
        footer={
          <div className="flex justify-end gap-2 border-t border-slate-200 p-4">
            <Button variant="outline" onClick={() => setItemDrawerOpen(false)}>
              Batal
            </Button>
            <Button
              disabled={!canManage || !currentYear || createItem.isPending}
              onClick={itemForm.handleSubmit(onCreateItem)}
            >
              Simpan
            </Button>
          </div>
        }
      >
        <form className="space-y-4 p-5" onSubmit={itemForm.handleSubmit(onCreateItem)}>
          <div>
            <label className="form-label" htmlFor="category">
              Kategori
            </label>
            <Input id="category" disabled={!canManage} {...itemForm.register('category')} />
          </div>
          <div>
            <label className="form-label" htmlFor="name">
              Uraian
            </label>
            <Input id="name" disabled={!canManage} {...itemForm.register('name')} />
          </div>
          <div>
            <label className="form-label" htmlFor="planned">
              Anggaran (Rp)
            </label>
            <Input
              id="planned"
              type="number"
              disabled={!canManage}
              {...itemForm.register('planned', { valueAsNumber: true })}
            />
          </div>
        </form>
      </DetailDrawer>
    </div>
  );
}
