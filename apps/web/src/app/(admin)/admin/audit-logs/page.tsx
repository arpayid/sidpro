import { DataTable } from '@/components/shared/data-table';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Audit Log',
};

const demoLogs = [
  { id: '1', time: '2026-06-18 09:15:22', user: 'admin@desa.go.id', action: 'CREATE', resource: 'resident', detail: 'Tambah penduduk baru' },
  { id: '2', time: '2026-06-18 08:42:10', user: 'surat@desa.go.id', action: 'UPDATE', resource: 'letter', detail: 'Setujui surat domisili' },
  { id: '3', time: '2026-06-17 16:30:05', user: 'admin@desa.go.id', action: 'EXPORT', resource: 'resident', detail: 'Ekspor data penduduk' },
  { id: '4', time: '2026-06-17 14:12:33', user: 'sekdes@desa.go.id', action: 'LOGIN', resource: 'auth', detail: 'Login berhasil' },
];

export default function AuditLogsPage() {
  return (
    <div>
      <h1 className="page-title">Audit Log</h1>
      <p className="page-description">Riwayat aktivitas dan mutasi data penting.</p>

      <div className="mt-6">
        <DataTable
          data={demoLogs}
          columns={[
            { key: 'time', header: 'Waktu', cell: (row) => row.time },
            { key: 'user', header: 'Pengguna', cell: (row) => row.user },
            { key: 'action', header: 'Aksi', cell: (row) => row.action },
            { key: 'resource', header: 'Resource', cell: (row) => row.resource },
            { key: 'detail', header: 'Detail', cell: (row) => row.detail },
          ]}
        />
      </div>
    </div>
  );
}
