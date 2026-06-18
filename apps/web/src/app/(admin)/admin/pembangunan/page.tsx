import { Badge } from '@sidpro/ui';
import { DataTable } from '@/components/shared/data-table';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pembangunan',
};

const demoProjects = [
  { id: '1', name: 'Jalan Desa Tahap 1', budget: 'Rp 450.000.000', progress: 85, status: 'ongoing' },
  { id: '2', name: 'Renovasi Balai Desa', budget: 'Rp 280.000.000', progress: 60, status: 'ongoing' },
  { id: '3', name: 'Drainase RT 03', budget: 'Rp 120.000.000', progress: 100, status: 'completed' },
];

export default function PembangunanPage() {
  return (
    <div>
      <h1 className="page-title">Pembangunan Desa</h1>
      <p className="page-description">Monitor progres proyek pembangunan infrastruktur.</p>

      <div className="mt-6">
        <DataTable
          data={demoProjects}
          columns={[
            { key: 'name', header: 'Proyek', cell: (row) => row.name },
            { key: 'budget', header: 'Anggaran', cell: (row) => row.budget },
            { key: 'progress', header: 'Progres', cell: (row) => `${row.progress}%` },
            {
              key: 'status',
              header: 'Status',
              cell: (row) => (
                <Badge variant={row.status === 'completed' ? 'success' : 'default'}>
                  {row.status === 'completed' ? 'Selesai' : 'Berjalan'}
                </Badge>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
