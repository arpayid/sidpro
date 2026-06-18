import { Button } from '@sidpro/ui';
import { DataTable } from '@/components/shared/data-table';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Penduduk',
};

const demoResidents = [
  { id: '1', nik: '3301********0001', name: 'Budi Santoso', gender: 'L', rt: '01', rw: '02' },
  { id: '2', nik: '3301********0002', name: 'Siti Aminah', gender: 'P', rt: '01', rw: '02' },
  { id: '3', nik: '3301********0003', name: 'Ahmad Rizki', gender: 'L', rt: '02', rw: '02' },
  { id: '4', nik: '3301********0004', name: 'Dewi Lestari', gender: 'P', rt: '03', rw: '01' },
];

export default function PendudukPage() {
  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Data Penduduk</h1>
          <p className="page-description">Kelola data kependudukan desa.</p>
        </div>
        <Button>Tambah Penduduk</Button>
      </div>

      <div className="mt-6">
        <DataTable
          data={demoResidents}
          columns={[
            { key: 'nik', header: 'NIK', cell: (row) => row.nik },
            { key: 'name', header: 'Nama', cell: (row) => row.name },
            { key: 'gender', header: 'JK', cell: (row) => row.gender },
            { key: 'rt', header: 'RT/RW', cell: (row) => `${row.rt}/${row.rw}` },
          ]}
        />
      </div>
    </div>
  );
}
