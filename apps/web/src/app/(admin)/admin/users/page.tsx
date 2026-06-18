'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUserSchema, updateUserSchema } from '@sidpro/validators';
import type { z } from 'zod';
import { Button, Input } from '@sidpro/ui';
import { Plus, Pencil, Shield, UserX, UserCheck } from 'lucide-react';
import { PageHeader } from '@/components/enterprise/page-header';
import { DataTable, FilterBar } from '@/components/enterprise/data-table';
import { DetailDrawer } from '@/components/enterprise/detail-drawer';
import { ConfirmDialog } from '@/components/enterprise/confirm-dialog';
import { StatusBadge, userStatusVariant } from '@/components/enterprise/status-badge';
import { useAuth } from '@/hooks/use-auth';
import {
  useUsers,
  useUser,
  useCreateUser,
  useUpdateUser,
  useUpdateUserStatus,
  useAssignUserRoles,
  USER_STATUS_LABELS,
  type UserRecord,
} from '@/features/users/use-users';
import { useRoles } from '@/features/roles/use-roles';

type CreateForm = z.infer<typeof createUserSchema>;
type EditForm = z.infer<typeof updateUserSchema>;

const STATUS_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Nonaktif' },
  { value: 'suspended', label: 'Ditangguhkan' },
];

function selectClass() {
  return 'h-9 rounded-md border border-slate-200 bg-white px-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500';
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  );
}

export default function UsersPage() {
  const { user: currentUser, can, canAny } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [disableTarget, setDisableTarget] = useState<UserRecord | null>(null);
  const [assignRoleIds, setAssignRoleIds] = useState<string[]>([]);

  const { data, isLoading, error, refetch } = useUsers({
    page,
    limit: 20,
    search: search || undefined,
    status: statusFilter || undefined,
    roleId: roleFilter || undefined,
  });
  const { data: rolesData } = useRoles(1, 100);
  const { data: detail } = useUser(detailId);
  const { data: editUser } = useUser(editId);

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const statusMutation = useUpdateUserStatus();
  const assignRolesMutation = useAssignUserRoles();

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { email: '', name: '', password: '', phone: '', roleIds: [] },
  });

  const editForm = useForm<EditForm>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: { name: '', phone: '', password: '' },
  });

  const users = data?.data ?? [];
  const meta = data?.meta;
  const roles = rolesData?.data ?? [];

  function openEdit(row: UserRecord) {
    setEditId(row.id);
    setAssignRoleIds(row.userRoles?.map((ur) => ur.role.id) ?? []);
    editForm.reset({
      name: row.name,
      phone: row.phone ?? '',
      password: '',
    });
  }

  async function onCreateSubmit(values: CreateForm) {
    await createMutation.mutateAsync(values);
    setCreateOpen(false);
    createForm.reset();
  }

  async function onEditSubmit(values: EditForm) {
    if (!editId) return;
    const body = {
      ...values,
      password: values.password || undefined,
      phone: values.phone || undefined,
    };
    await updateMutation.mutateAsync({ id: editId, body });
    if (can('users.update')) {
      await assignRolesMutation.mutateAsync({ id: editId, roleIds: assignRoleIds });
    }
    setEditId(null);
  }

  async function confirmDisable() {
    if (!disableTarget) return;
    await statusMutation.mutateAsync({ id: disableTarget.id, status: 'inactive' });
    setDisableTarget(null);
  }

  async function enableUser(row: UserRecord) {
    await statusMutation.mutateAsync({ id: row.id, status: 'active' });
  }

  const isSelf = (row: UserRecord) => row.id === currentUser?.id;

  return (
    <div>
      <PageHeader
        title="Pengguna"
        description="Kelola akun admin, peran, dan hak akses RBAC."
        actions={
          <div className="flex gap-2">
            {can('roles.read') && (
              <Link href="/admin/roles">
                <Button size="sm" variant="outline" type="button">
                  <Shield className="mr-1.5 h-4 w-4" />
                  Peran & Hak Akses
                </Button>
              </Link>
            )}
            {can('users.create') && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Tambah Pengguna
              </Button>
            )}
          </div>
        }
      />

      <div className="mt-6">
        <DataTable
          columns={[
            {
              key: 'name',
              header: 'Nama',
              render: (row) => (
                <div>
                  <p className="font-medium text-slate-800">{row.name}</p>
                  <p className="text-xs text-slate-500">{row.email}</p>
                </div>
              ),
            },
            {
              key: 'roles',
              header: 'Peran',
              render: (row) => (
                <div className="flex flex-wrap gap-1">
                  {row.userRoles?.length
                    ? row.userRoles.map((ur) => (
                        <StatusBadge key={ur.role.id} variant="info">
                          {ur.role.name}
                        </StatusBadge>
                      ))
                    : '—'}
                </div>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (row) => (
                <StatusBadge variant={userStatusVariant(row.status)}>
                  {USER_STATUS_LABELS[row.status] ?? row.status}
                </StatusBadge>
              ),
            },
            {
              key: 'createdAt',
              header: 'Dibuat',
              render: (row) => (
                <span className="text-sm text-slate-600">{formatDateTime(row.createdAt)}</span>
              ),
            },
          ]}
          data={users}
          loading={isLoading}
          error={error ? (error as Error).message : null}
          onRetry={() => refetch()}
          emptyTitle="Belum ada pengguna"
          emptyDescription="Tambahkan pengguna admin desa untuk mulai mengelola akses."
          rowKey={(row) => row.id}
          onRowClick={(row) => setDetailId(row.id)}
          page={page}
          totalPages={meta?.totalPages ?? 1}
          total={meta?.total}
          onPageChange={setPage}
          rowActions={(row) => (
            <div className="flex justify-end gap-1">
              {can('users.update') && (
                <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              {can('users.disable') &&
                row.status === 'active' &&
                !isSelf(row) && (
                  <Button size="sm" variant="ghost" onClick={() => setDisableTarget(row)}>
                    <UserX className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              {canAny(['users.update', 'users.disable']) &&
                row.status !== 'active' &&
                !isSelf(row) && (
                  <Button size="sm" variant="ghost" onClick={() => enableUser(row)}>
                    <UserCheck className="h-4 w-4 text-emerald-600" />
                  </Button>
                )}
            </div>
          )}
          toolbar={
            <FilterBar
              search={search}
              onSearchChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              searchPlaceholder="Cari nama atau email..."
            >
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className={selectClass()}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className={selectClass()}
              >
                <option value="">Semua Peran</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </FilterBar>
          }
        />
      </div>

      <DetailDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Tambah Pengguna"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Batal
            </Button>
            <Button onClick={createForm.handleSubmit(onCreateSubmit)} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={createForm.handleSubmit(onCreateSubmit)}>
          <div>
            <label className="form-label" htmlFor="create-email">Email</label>
            <Input id="create-email" type="email" {...createForm.register('email')} />
            {createForm.formState.errors.email && (
              <p className="form-error">{createForm.formState.errors.email.message}</p>
            )}
          </div>
          <div>
            <label className="form-label" htmlFor="create-name">Nama</label>
            <Input id="create-name" {...createForm.register('name')} />
            {createForm.formState.errors.name && (
              <p className="form-error">{createForm.formState.errors.name.message}</p>
            )}
          </div>
          <div>
            <label className="form-label" htmlFor="create-password">Password</label>
            <Input id="create-password" type="password" autoComplete="new-password" {...createForm.register('password')} />
            {createForm.formState.errors.password && (
              <p className="form-error">{createForm.formState.errors.password.message}</p>
            )}
          </div>
          <div>
            <label className="form-label" htmlFor="create-phone">Telepon</label>
            <Input id="create-phone" {...createForm.register('phone')} />
          </div>
          <div>
            <label className="form-label">Peran</label>
            <div className="mt-2 max-h-40 space-y-2 overflow-y-auto rounded-md border border-slate-200 p-3">
              {roles
                .filter((r) => r.code !== 'superadmin_system' || currentUser?.roles.includes('superadmin_system'))
                .map((role) => (
                  <label key={role.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      value={role.id}
                      checked={createForm.watch('roleIds')?.includes(role.id) ?? false}
                      onChange={(e) => {
                        const current = createForm.getValues('roleIds') ?? [];
                        createForm.setValue(
                          'roleIds',
                          e.target.checked
                            ? [...current, role.id]
                            : current.filter((id) => id !== role.id),
                        );
                      }}
                    />
                    {role.name}
                  </label>
                ))}
            </div>
          </div>
          {createMutation.isError && (
            <p className="text-sm text-red-600">{(createMutation.error as Error).message}</p>
          )}
        </form>
      </DetailDrawer>

      <DetailDrawer
        open={Boolean(editId)}
        onClose={() => setEditId(null)}
        title="Edit Pengguna"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditId(null)}>Batal</Button>
            <Button onClick={editForm.handleSubmit(onEditSubmit)} disabled={updateMutation.isPending || assignRolesMutation.isPending}>
              {updateMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        }
      >
        {editUser && (
          <form className="space-y-4" onSubmit={editForm.handleSubmit(onEditSubmit)}>
            <p className="text-sm text-slate-500">{editUser.email}</p>
            <div>
              <label className="form-label" htmlFor="edit-name">Nama</label>
              <Input id="edit-name" {...editForm.register('name')} />
            </div>
            <div>
              <label className="form-label" htmlFor="edit-phone">Telepon</label>
              <Input id="edit-phone" {...editForm.register('phone')} />
            </div>
            <div>
              <label className="form-label" htmlFor="edit-password">Reset Password</label>
              <Input id="edit-password" type="password" autoComplete="new-password" placeholder="Kosongkan jika tidak diubah" {...editForm.register('password')} />
              {editForm.formState.errors.password && (
                <p className="form-error">{editForm.formState.errors.password.message}</p>
              )}
            </div>
            {can('users.update') && (
              <div>
                <label className="form-label">Peran</label>
                <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-md border border-slate-200 p-3">
                  {roles
                    .filter((r) => r.code !== 'superadmin_system' || currentUser?.roles.includes('superadmin_system'))
                    .map((role) => (
                      <label key={role.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={assignRoleIds.includes(role.id)}
                          disabled={isSelf(editUser) && role.code === 'admin_desa' && assignRoleIds.includes(role.id) && assignRoleIds.length === 1}
                          onChange={(e) => {
                            setAssignRoleIds((prev) =>
                              e.target.checked
                                ? [...prev, role.id]
                                : prev.filter((id) => id !== role.id),
                            );
                          }}
                        />
                        {role.name}
                      </label>
                    ))}
                </div>
              </div>
            )}
          </form>
        )}
      </DetailDrawer>

      <DetailDrawer
        open={Boolean(detailId)}
        onClose={() => setDetailId(null)}
        title="Detail Pengguna"
      >
        {detail && (
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase text-slate-400">Nama</p>
              <p className="font-medium text-slate-800">{detail.name}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400">Email</p>
              <p className="text-slate-700">{detail.email}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400">Status</p>
              <StatusBadge variant={userStatusVariant(detail.status)}>
                {USER_STATUS_LABELS[detail.status] ?? detail.status}
              </StatusBadge>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400">Peran</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {detail.userRoles?.map((ur) => (
                  <StatusBadge key={ur.role.id} variant="info">{ur.role.name}</StatusBadge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400">Dibuat</p>
              <p className="text-sm text-slate-600">{formatDateTime(detail.createdAt)}</p>
            </div>
          </div>
        )}
      </DetailDrawer>

      <ConfirmDialog
        open={Boolean(disableTarget)}
        title="Nonaktifkan Pengguna"
        message={`Yakin ingin menonaktifkan ${disableTarget?.name}? Aksi ini tercatat di audit log.`}
        confirmLabel="Nonaktifkan"
        loading={statusMutation.isPending}
        onConfirm={confirmDisable}
        onCancel={() => setDisableTarget(null)}
      />
    </div>
  );
}
