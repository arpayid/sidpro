import { Card, CardContent, CardHeader, CardTitle } from '@sidpro/ui';
import { DataTable } from '@/components/shared/data-table';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Keuangan',
};

const demoTransactions = [
  { id: '1', date: '2026-06-15', description: 'Penerimaan PADes', type: 'Pemasukan', amount: 'Rp 12.500.000' },
  { id: '2', date: '2026-06-14', description: 'Belanja operasional', type: 'Pengeluaran', amount: 'Rp 3.200.000' },
  { id: '3', date: '2026-06-12', description: 'Bantuan sosial tahap 1', type: 'Pengeluaran', amount: 'Rp 48.000.000' },
];

export default function KeuanganPage() {
  return (
    <div>
      <h1 className="page-title">Keuangan Desa</h1>
      <p className="page-description">Transaksi dan realisasi anggaran desa.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Total Pemasukan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">Rp 2.450.000.000</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Total Pengeluaran</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">Rp 2.180.000.000</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Saldo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">Rp 270.000.000</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <DataTable
          data={demoTransactions}
          columns={[
            { key: 'date', header: 'Tanggal', cell: (row) => row.date },
            { key: 'description', header: 'Keterangan', cell: (row) => row.description },
            { key: 'type', header: 'Jenis', cell: (row) => row.type },
            { key: 'amount', header: 'Jumlah', cell: (row) => row.amount },
          ]}
        />
      </div>
    </div>
  );
}
