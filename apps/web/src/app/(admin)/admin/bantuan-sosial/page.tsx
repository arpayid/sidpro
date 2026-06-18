import { Badge, Button } from '@sidpro/ui';
import { DataTable } from '@/components/shared/data-table';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bantuan Sosial',
};

const demoAid = [
  { id: '1', program: 'Bantuan Pangan', beneficiaries: 120, budget: 'Rp 48.000.000', status: 'active' },
  { id: '2', program: 'BLT Desa', beneficiaries: 85, budget: 'Rp 127.500.000', status: 'active' },
  { id: '3', program: 'Bantuan Pendidikan', beneficiaries: 45, budget: 'Rp 22.500.000', status: 'closed' },
];

export default function BantuanSosialPage() {
  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Bantuan Sosial</h1>
          <p className="page-description">Kelola program bantuan untuk warga kurang mampu.</p>
        </div>
        <Button>Program Baru</Button>
      </div>

      <div className="mt-6">
        <DataTable
          data={demoAid}
          columns={[
            { key: 'program', header: 'Program', cell: (row) => row.program },
            { key: 'beneficiaries', header: 'Penerima', cell: (row) => row.beneficiaries },
            { key: 'budget', header: 'Anggaran', cell: (row) => row.budget },
            {
              key: 'status',
              header: 'Status',
              cell: (row) => (
                <Badge variant={row.status === 'active' ? 'success' : 'secondary'}>
                  {row.status === 'active' ? 'Aktif' : 'Selesai'}
                </Badge>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
