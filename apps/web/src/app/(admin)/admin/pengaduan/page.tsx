import { Badge } from '@sidpro/ui';
import { DataTable } from '@/components/shared/data-table';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pengaduan',
};

const demoComplaints = [
  { id: '1', ticket: 'PGD-001', subject: 'Jalan berlubang RT 02', category: 'Infrastruktur', status: 'open' },
  { id: '2', ticket: 'PGD-002', subject: 'Sampah menumpuk', category: 'Lingkungan', status: 'in_progress' },
  { id: '3', ticket: 'PGD-003', subject: 'Antrian surat lama', category: 'Pelayanan', status: 'resolved' },
];

const statusVariant = {
  open: 'warning' as const,
  in_progress: 'default' as const,
  resolved: 'success' as const,
};

const statusLabel = {
  open: 'Baru',
  in_progress: 'Diproses',
  resolved: 'Selesai',
};

export default function AdminPengaduanPage() {
  return (
    <div>
      <h1 className="page-title">Pengaduan Warga</h1>
      <p className="page-description">Tindak lanjuti pengaduan dari masyarakat.</p>

      <div className="mt-6">
        <DataTable
          data={demoComplaints}
          columns={[
            { key: 'ticket', header: 'Tiket', cell: (row) => row.ticket },
            { key: 'subject', header: 'Subjek', cell: (row) => row.subject },
            { key: 'category', header: 'Kategori', cell: (row) => row.category },
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
