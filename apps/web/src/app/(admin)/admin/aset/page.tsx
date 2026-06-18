import { Button } from '@sidpro/ui';
import { DataTable } from '@/components/shared/data-table';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Aset',
};

const demoAssets = [
  { id: '1', code: 'AST-001', name: 'Balai Desa', type: 'Bangunan', value: 'Rp 850.000.000' },
  { id: '2', code: 'AST-002', name: 'Mobil Operasional', type: 'Kendaraan', value: 'Rp 180.000.000' },
  { id: '3', code: 'AST-003', name: 'Tanah Kas Desa', type: 'Tanah', value: 'Rp 2.100.000.000' },
];

export default function AsetPage() {
  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Aset Desa</h1>
          <p className="page-description">Inventaris aset tetap dan barang milik desa.</p>
        </div>
        <Button>Tambah Aset</Button>
      </div>

      <div className="mt-6">
        <DataTable
          data={demoAssets}
          columns={[
            { key: 'code', header: 'Kode', cell: (row) => row.code },
            { key: 'name', header: 'Nama Aset', cell: (row) => row.name },
            { key: 'type', header: 'Jenis', cell: (row) => row.type },
            { key: 'value', header: 'Nilai', cell: (row) => row.value },
          ]}
        />
      </div>
    </div>
  );
}
