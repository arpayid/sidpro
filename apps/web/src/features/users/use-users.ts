'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateUserInput, UpdateUserInput } from '@sidpro/validators';
import { apiClient, buildQuery } from '@/lib/api-client';
import type { PaginationMeta } from '@sidpro/types';

export interface UserRole {
  role: { id: string; name: string; code: string };
}

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  status: string;
  tenantId?: string | null;
  createdAt: string;
  updatedAt?: string;
  userRoles?: UserRole[];
}

export interface UsersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  roleId?: string;
}

export function useUsers(params: UsersParams = {}) {
  const { page = 1, limit = 20, search, status, roleId } = params;
  return useQuery({
    queryKey: ['users', { page, limit, search, status, roleId }],
    queryFn: async () => {
      const res = await apiClient<UserRecord[]>(
        `/users${buildQuery({ page, limit, search, status, roleId })}`,
      );
      return { data: res.data ?? [], meta: res.meta as PaginationMeta | undefined };
    },
  });
}

export function useUser(id: string | null) {
  return useQuery({
    queryKey: ['users', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await apiClient<UserRecord>(`/users/${id}`);
      if (!res.data) throw new Error('User tidak ditemukan');
      return res.data;
    },
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateUserInput) => {
      const res = await apiClient<UserRecord>('/users', { method: 'POST', body });
      return res;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateUserInput }) => {
      const res = await apiClient<UserRecord>(`/users/${id}`, { method: 'PATCH', body });
      return res;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['users', id] });
    },
  });
}

export function useUpdateUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: 'active' | 'inactive' | 'suspended';
    }) => {
      const res = await apiClient<UserRecord>(`/users/${id}/status`, {
        method: 'PATCH',
        body: { status },
      });
      return res;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['users', id] });
    },
  });
}

export function useAssignUserRoles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, roleIds }: { id: string; roleIds: string[] }) => {
      const res = await apiClient<UserRecord>(`/users/${id}/roles`, {
        method: 'PUT',
        body: { roleIds },
      });
      return res;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['users', id] });
    },
  });
}

export const USER_STATUS_LABELS: Record<string, string> = {
  active: 'Aktif',
  inactive: 'Nonaktif',
  suspended: 'Ditangguhkan',
};
