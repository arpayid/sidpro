'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createRoleSchema } from '@sidpro/validators';
import type { z } from 'zod';
import { Button, Input } from '@sidpro/ui';
import { Plus, Pencil, Users } from 'lucide-react';
import { PageHeader } from '@/components/enterprise/page-header';
import { DataTable } from '@/components/enterprise/data-table';
import { DetailDrawer } from '@/components/enterprise/detail-drawer';
import { StatusBadge } from '@/components/enterprise/status-badge';
import { useAuth } from '@/hooks/use-auth';
import {
  useRoles,
  useRole,
  usePermissions,
  useCreateRole,
  useUpdateRole,
  useAssignRolePermissions,
  groupPermissionsByModule,
  type RoleRecord,
} from '@/features/roles/use-roles';

type CreateForm = z.infer<typeof createRoleSchema>;

const SUPERADMIN_CODE = 'superadmin_system';

export default function RolesPage() {
  const { user: currentUser, can } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [editRoleId, setEditRoleId] = useState<string | null>(null);
  const [selectedPermIds, setSelectedPermIds] = useState<string[]>([]);
  const [editName, setEditName] = useState('');

  const { data, isLoading, error, refetch } = useRoles();
  const { data: permissions = [], isLoading: permsLoading } = usePermissions();
  const { data: editRole } = useRole(editRoleId);

  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();
  const assignMutation = useAssignRolePermissions();

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: { name: '', code: '', scope: 'tenant', permissionIds: [] },
  });

  const grouped = useMemo(() => groupPermissionsByModule(permissions), [permissions]);
  const roles = data?.data ?? [];

  useEffect(() => {
    if (editRole) {
      setEditName(editRole.name);
      setSelectedPermIds(
        editRole.rolePermissions?.map((rp) => rp.permission.id) ?? [],
      );
    }
  }, [editRole]);

  function openEdit(role: RoleRecord) {
    setEditRoleId(role.id);
  }

  function isProtectedRole(code: string) {
    return code === SUPERADMIN_CODE && !currentUser?.roles.includes(SUPERADMIN_CODE);
  }

  function togglePermission(id: string) {
    setSelectedPermIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  function toggleModule(modulePerms: { id: string }[], checked: boolean) {
    const ids = modulePerms.map((p) => p.id);
    setSelectedPermIds((prev) => {
      if (checked) return [...new Set([...prev, ...ids])];
      return prev.filter((id) => !ids.includes(id));
    });
  }

  async function onCreateSubmit(values: CreateForm) {
    await createMutation.mutateAsync(values);
    setCreateOpen(false);
    createForm.reset();
  }

  async function saveRoleChanges() {
    if (!editRoleId || !editRole) return;
    if (editName !== editRole.name && can('roles.update')) {
      await updateMutation.mutateAsync({ id: editRoleId, body: { name: editName } });
    }
    if (can('roles.assign_permissions')) {
      await assignMutation.mutateAsync({ id: editRoleId, permissionIds: selectedPermIds });
    }
    setEditRoleId(null);
  }

  const readOnly = editRole ? isProtectedRole(editRole.code) : false;

  return (
    <div>
      <PageHeader
        title="Peran & Hak Akses"
        description="Kelola role dan permission matrix per modul."
        actions={
          <div className="flex gap-2">
            {can('users.read') && (
              <Link href="/admin/users">
                <Button size="sm" variant="outline" type="button">
                  <Users className="mr-1.5 h-4 w-4" />
                  Pengguna
                </Button>
              </Link>
            )}
            {can('roles.create') && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Tambah Peran
              </Button>
            )}
          </div>
        }
      />

      <div className="mt-6">
        <DataTable
          columns={[
            { key: 'name', header: 'Nama Peran', render: (row) => <span className="font-medium">{row.name}</span> },
            { key: 'code', header: 'Kode', render: (row) => <code className="text-xs text-slate-600">{row.code}</code> },
            {
              key: 'permissions',
              header: 'Permission',
              render: (row) => (
                <span className="text-sm text-slate-600">
                  {row.rolePermissions?.length ?? 0} permission
                </span>
              ),
            },
            {
              key: 'users',
              header: 'Pengguna',
              render: (row) => row._count?.userRoles ?? 0,
            },
            {
              key: 'scope',
              header: 'Scope',
              render: (row) => <StatusBadge variant="default">{row.scope}</StatusBadge>,
            },
          ]}
          data={roles}
          loading={isLoading}
          error={error ? (error as Error).message : null}
          onRetry={() => refetch()}
          emptyTitle="Belum ada peran"
          rowKey={(row) => row.id}
          onRowClick={(row) => canAnyEdit(row) && openEdit(row)}
          rowActions={(row) =>
            canAnyEdit(row) ? (
              <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>
                <Pencil className="h-4 w-4" />
              </Button>
            ) : null
          }
        />
      </div>

      <DetailDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Tambah Peran"
        width="max-w-xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Batal</Button>
            <Button onClick={createForm.handleSubmit(onCreateSubmit)} disabled={createMutation.isPending}>
              Simpan
            </Button>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={createForm.handleSubmit(onCreateSubmit)}>
          <div>
            <label className="form-label" htmlFor="role-name">Nama Peran</label>
            <Input id="role-name" {...createForm.register('name')} />
          </div>
          <div>
            <label className="form-label" htmlFor="role-code">Kode (snake_case)</label>
            <Input id="role-code" placeholder="operator_surat" {...createForm.register('code')} />
            {createForm.formState.errors.code && (
              <p className="form-error">{createForm.formState.errors.code.message}</p>
            )}
          </div>
        </form>
      </DetailDrawer>

      <DetailDrawer
        open={Boolean(editRoleId)}
        onClose={() => setEditRoleId(null)}
        title={editRole ? `Edit: ${editRole.name}` : 'Edit Peran'}
        width="max-w-2xl"
        footer={
          !readOnly && (can('roles.update') || can('roles.assign_permissions')) ? (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditRoleId(null)}>Batal</Button>
              <Button
                onClick={saveRoleChanges}
                disabled={updateMutation.isPending || assignMutation.isPending}
              >
                {assignMutation.isPending ? 'Menyimpan...' : 'Simpan Permission'}
              </Button>
            </div>
          ) : undefined
        }
      >
        {readOnly && (
          <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Role superadmin hanya dapat diubah oleh superadmin sistem.
          </p>
        )}
        {editRole && (
          <div className="space-y-4">
            {can('roles.update') && !readOnly && (
              <div>
                <label className="form-label" htmlFor="edit-role-name">Nama Peran</label>
                <Input
                  id="edit-role-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
            )}
            <div>
              <p className="mb-3 text-sm font-medium text-slate-700">Permission Matrix</p>
              {permsLoading && <p className="text-sm text-slate-500">Memuat permission...</p>}
              {!permsLoading && (
                <div className="space-y-4">
                  {Object.entries(grouped).map(([module, modulePerms]) => {
                    const allChecked = modulePerms.every((p) => selectedPermIds.includes(p.id));
                    const someChecked = modulePerms.some((p) => selectedPermIds.includes(p.id));
                    return (
                      <div key={module} className="rounded-lg border border-slate-200 p-3">
                        <label className="mb-2 flex items-center gap-2 font-medium text-slate-800">
                          <input
                            type="checkbox"
                            checked={allChecked}
                            ref={(el) => {
                              if (el) el.indeterminate = someChecked && !allChecked;
                            }}
                            disabled={readOnly || !can('roles.assign_permissions')}
                            onChange={(e) => toggleModule(modulePerms, e.target.checked)}
                          />
                          {module}
                          <span className="text-xs font-normal text-slate-400">
                            ({modulePerms.length})
                          </span>
                        </label>
                        <div className="ml-6 grid gap-1 sm:grid-cols-2">
                          {modulePerms.map((perm) => (
                            <label key={perm.id} className="flex items-start gap-2 text-sm text-slate-600">
                              <input
                                type="checkbox"
                                className="mt-0.5"
                                checked={selectedPermIds.includes(perm.id)}
                                disabled={readOnly || !can('roles.assign_permissions')}
                                onChange={() => togglePermission(perm.id)}
                              />
                              <span>
                                <span className="font-mono text-xs">{perm.code}</span>
                                <span className="block text-xs text-slate-400">{perm.name}</span>
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );

  function canAnyEdit(row: RoleRecord) {
    if (isProtectedRole(row.code)) return false;
    return can('roles.update') || can('roles.assign_permissions');
  }
}
