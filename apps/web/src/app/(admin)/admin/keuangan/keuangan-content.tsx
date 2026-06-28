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
  type BudgetItem,
  type BudgetRealizationEntry,
  useBudgetRealizationEntries,
  useBudgetYears,
  useCreateBudgetItem,
  useCreateBudgetRealizationEntry,
  useCreateBudgetYear,
} from '@/features/finance/use-finance';

type RealizationFormValues = {
  type: 'realization' | 'reversal';
  amount: number;
  reference: string;
  description: string;
  occurredAt: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatLedgerType(type: BudgetRealizationEntry['entryType']) {
  if (type === 'reversal') return 'Pembatalan';
  if (type === 'migration_opening_balance') return 'Saldo awal';
  return 'Realisasi';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function KeuanganContent() {
  const { can } = useAuth();
  const [yearDrawerOpen, setYearDrawerOpen] = useState(false);
  const [itemDrawerOpen, setItemDrawerOpen] = useState(false);
  const [realizationDrawerOpen, setRealizationDrawerOpen] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BudgetItem | null>(null);

  const { data, isLoading, error, refetch } = useBudgetYears();
  const realizationEntries = useBudgetRealizationEntries(selectedItem?.id);
  const createYear = useCreateBudgetYear();
  const createItem = useCreateBudgetItem();
  const createRealization = useCreateBudgetRealizationEntry();

  const yearForm = useForm({ defaultValues: { year: new Date().getFullYear(), totalBudget: 0 } });
  const itemForm = useForm({
    defaultValues: { category: 'Belanja', name: '', planned: 0 },
  });
  const realizationForm = useForm<RealizationFormValues>({
    defaultValues: {
      type: 'realization',
      amount: 0,
      reference: '',
      description: '',
      occurredAt: '',
    },
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
  }) {
    if (!currentYear) return;
    await createItem.mutateAsync({
      budgetYearId: currentYear.id,
      body: values,
    });
    setItemDrawerOpen(false);
    itemForm.reset();
  }

  function openRealizationDrawer(item: BudgetItem) {
    setSelectedItem(item);
    realizationForm.reset({
      type: 'realization',
      amount: 0,
      reference: '',
      description: '',
      occurredAt: '',
    });
    setRealizationDrawerOpen(true);
  }

  function openHistoryDrawer(item: BudgetItem) {
    setSelectedItem(item);
    setHistoryDrawerOpen(true);
  }

  async function onCreateRealization(values: RealizationFormValues) {
    if (!selectedItem) return;
    await createRealization.mutateAsync({
      budgetItemId: selectedItem.id,
      body: {
        type: values.type,
        amount: values.amount,
        ...(values.reference.trim() ? { reference: values.reference.trim() } : {}),
        ...(values.description.trim() ? { description: values.description.trim() } : {}),
        ...(values.occurredAt ? { occurredAt: values.occurredAt } : {}),
      },
    });
    setRealizationDrawerOpen(false);
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Keuangan Desa</h1>
          <p className="page-description">Realisasi dicatat sebagai transaksi ledger yang dapat diaudit.</p>
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
              {
                key: 'actions',
                header: 'Aksi',
                cell: (row) => (
                  <div className="flex flex-wrap gap-2">
                    {canManage && (
                      <Button
                        variant="outline"
                        className="h-8 px-2 text-xs"
                        onClick={() => openRealizationDrawer(row)}
                      >
                        Catat
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="h-8 px-2 text-xs"
                      onClick={() => openHistoryDrawer(row)}
                    >
                      Riwayat
                    </Button>
                  </div>
                ),
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

      <DetailDrawer
        open={realizationDrawerOpen}
        onClose={() => setRealizationDrawerOpen(false)}
        title={`Catat Realisasi — ${selectedItem?.name ?? ''}`}
        footer={
          <div className="flex justify-end gap-2 border-t border-slate-200 p-4">
            <Button variant="outline" onClick={() => setRealizationDrawerOpen(false)}>
              Batal
            </Button>
            <Button
              disabled={!canManage || !selectedItem || createRealization.isPending}
              onClick={realizationForm.handleSubmit(onCreateRealization)}
            >
              Simpan Transaksi
            </Button>
          </div>
        }
      >
        <form className="space-y-4 p-5" onSubmit={realizationForm.handleSubmit(onCreateRealization)}>
          <div>
            <label className="form-label" htmlFor="realizationType">
              Jenis transaksi
            </label>
            <select
              id="realizationType"
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
              disabled={!canManage}
              {...realizationForm.register('type')}
            >
              <option value="realization">Realisasi</option>
              <option value="reversal">Pembatalan / koreksi</option>
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="realizationAmount">
              Nilai transaksi (Rp)
            </label>
            <Input
              id="realizationAmount"
              type="number"
              min="1"
              disabled={!canManage}
              {...realizationForm.register('amount', { valueAsNumber: true })}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="realizationReference">
              Referensi bukti
            </label>
            <Input
              id="realizationReference"
              disabled={!canManage}
              placeholder="Contoh: BKM-2026-001"
              {...realizationForm.register('reference')}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="realizationDate">
              Tanggal transaksi
            </label>
            <Input
              id="realizationDate"
              type="date"
              disabled={!canManage}
              {...realizationForm.register('occurredAt')}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="realizationDescription">
              Keterangan
            </label>
            <Input
              id="realizationDescription"
              disabled={!canManage}
              placeholder="Keterangan transaksi"
              {...realizationForm.register('description')}
            />
          </div>
        </form>
      </DetailDrawer>

      <DetailDrawer
        open={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
        title={`Riwayat Realisasi — ${selectedItem?.name ?? ''}`}
      >
        <div className="p-5">
          {realizationEntries.isLoading ? (
            <p className="text-sm text-slate-500">Memuat riwayat transaksi...</p>
          ) : realizationEntries.error ? (
            <ErrorState
              message="Gagal memuat riwayat realisasi."
              onRetry={() => realizationEntries.refetch()}
            />
          ) : (
            <DataTable
              data={realizationEntries.data?.data ?? []}
              columns={[
                {
                  key: 'occurredAt',
                  header: 'Tanggal',
                  cell: (row) => formatDate(row.occurredAt),
                },
                {
                  key: 'entryType',
                  header: 'Jenis',
                  cell: (row) => formatLedgerType(row.entryType),
                },
                {
                  key: 'amount',
                  header: 'Nilai',
                  cell: (row) =>
                    `${row.entryType === 'reversal' ? '−' : ''}${formatCurrency(Number(row.amount))}`,
                },
                {
                  key: 'reference',
                  header: 'Referensi',
                  cell: (row) => row.reference ?? '—',
                },
              ]}
              emptyMessage="Belum ada transaksi realisasi untuk pos ini."
            />
          )}
        </div>
      </DetailDrawer>
    </div>
  );
}
