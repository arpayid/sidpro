import { Badge, Button } from '@sidpro/ui';
import { DataTable } from '@/components/shared/data-table';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pengguna',
};

const demoUsers = [
  { id: '1', name: 'Administrator Desa', email: 'admin@desa.go.id', role: 'Super Admin', status: 'active' },
  { id: '2', name: 'Sekretaris Desa', email: 'sekdes@desa.go.id', role: 'Sekretaris', status: 'active' },
  { id: '3', name: 'Operator Surat', email: 'surat@desa.go.id', role: 'Operator', status: 'inactive' },
];

export default function UsersPage() {
  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Pengguna</h1>
          <p className="page-description">Kelola akun admin dan hak akses RBAC.</p>
        </div>
        <Button>Tambah Pengguna</Button>
      </div>

      <div className="mt-6">
        <DataTable
          data={demoUsers}
          columns={[
            { key: 'name', header: 'Nama', cell: (row) => row.name },
            { key: 'email', header: 'Email', cell: (row) => row.email },
            { key: 'role', header: 'Peran', cell: (row) => row.role },
            {
              key: 'status',
              header: 'Status',
              cell: (row) => (
                <Badge variant={row.status === 'active' ? 'success' : 'secondary'}>
                  {row.status === 'active' ? 'Aktif' : 'Nonaktif'}
                </Badge>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
