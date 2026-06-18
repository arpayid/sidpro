'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateRoleInput, UpdateRoleInput } from '@sidpro/validators';
import { apiClient, buildQuery } from '@/lib/api-client';
import type { PaginationMeta } from '@sidpro/types';

export interface Permission {
  id: string;
  code: string;
  name: string;
  module: string;
}

export interface RoleRecord {
  id: string;
  name: string;
  code: string;
  scope: string;
  tenantId?: string | null;
  rolePermissions?: { permission: Permission }[];
  _count?: { userRoles: number };
}

export function useRoles(page = 1, limit = 50) {
  return useQuery({
    queryKey: ['roles', { page, limit }],
    queryFn: async () => {
      const res = await apiClient<RoleRecord[]>(`/roles${buildQuery({ page, limit })}`);
      return { data: res.data ?? [], meta: res.meta as PaginationMeta | undefined };
    },
  });
}

export function useRole(id: string | null) {
  return useQuery({
    queryKey: ['roles', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await apiClient<RoleRecord>(`/roles/${id}`);
      if (!res.data) throw new Error('Role tidak ditemukan');
      return res.data;
    },
  });
}

export function usePermissions() {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const res = await apiClient<Permission[]>('/permissions');
      return res.data ?? [];
    },
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateRoleInput) => {
      const res = await apiClient<RoleRecord>('/roles', { method: 'POST', body });
      return res;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateRoleInput }) => {
      const res = await apiClient<RoleRecord>(`/roles/${id}`, { method: 'PATCH', body });
      return res;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      qc.invalidateQueries({ queryKey: ['roles', id] });
    },
  });
}

export function useAssignRolePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, permissionIds }: { id: string; permissionIds: string[] }) => {
      const res = await apiClient<RoleRecord>(`/roles/${id}/permissions`, {
        method: 'PUT',
        body: { permissionIds },
      });
      return res;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      qc.invalidateQueries({ queryKey: ['roles', id] });
    },
  });
}

export function groupPermissionsByModule(permissions: Permission[]) {
  return permissions.reduce<Record<string, Permission[]>>((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {});
}
