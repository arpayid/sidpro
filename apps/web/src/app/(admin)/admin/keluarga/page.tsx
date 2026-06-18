import { Button } from '@sidpro/ui';
import { DataTable } from '@/components/shared/data-table';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Keluarga',
};

const demoFamilies = [
  { id: '1', kk: '3301********0001', head: 'Budi Santoso', members: 4, rt: '01', rw: '02' },
  { id: '2', kk: '3301********0005', head: 'Joko Widodo', members: 3, rt: '02', rw: '02' },
  { id: '3', kk: '3301********0009', head: 'Rina Wati', members: 5, rt: '03', rw: '01' },
];

export default function KeluargaPage() {
  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Data Keluarga</h1>
          <p className="page-description">Kelola kartu keluarga dan anggota rumah tangga.</p>
        </div>
        <Button>Tambah KK</Button>
      </div>

      <div className="mt-6">
        <DataTable
          data={demoFamilies}
          columns={[
            { key: 'kk', header: 'No. KK', cell: (row) => row.kk },
            { key: 'head', header: 'Kepala Keluarga', cell: (row) => row.head },
            { key: 'members', header: 'Anggota', cell: (row) => row.members },
            { key: 'rt', header: 'RT/RW', cell: (row) => `${row.rt}/${row.rw}` },
          ]}
        />
      </div>
    </div>
  );
}
