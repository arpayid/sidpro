import { Badge, Button } from '@sidpro/ui';
import { DataTable } from '@/components/shared/data-table';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Surat',
};

const demoLetters = [
  { id: '1', number: 'SID-2026-001', type: 'Domisili', applicant: 'Budi Santoso', status: 'pending' },
  { id: '2', number: 'SID-2026-002', type: 'Usaha', applicant: 'Siti Aminah', status: 'approved' },
  { id: '3', number: 'SID-2026-003', type: 'Tidak Mampu', applicant: 'Ahmad Rizki', status: 'draft' },
];

const statusVariant = {
  pending: 'warning' as const,
  approved: 'success' as const,
  draft: 'secondary' as const,
};

const statusLabel = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  draft: 'Draft',
};

export default function SuratPage() {
  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Layanan Surat</h1>
          <p className="page-description">Kelola pengajuan dan penerbitan surat desa.</p>
        </div>
        <Button>Buat Surat</Button>
      </div>

      <div className="mt-6">
        <DataTable
          data={demoLetters}
          columns={[
            { key: 'number', header: 'No. Surat', cell: (row) => row.number },
            { key: 'type', header: 'Jenis', cell: (row) => row.type },
            { key: 'applicant', header: 'Pemohon', cell: (row) => row.applicant },
            {
              key: 'status',
              header: 'Status',
              cell: (row) => (
                <Badge variant={statusVariant[row.status as keyof typeof statusVariant]}>
                  {statusLabel[row.status as keyof typeof statusLabel]}
                </Badge>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
