'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, buildQuery } from '@/lib/api-client';
import type { PaginationMeta } from '@sidpro/types';

export interface AuditLogActor {
  id: string;
  name: string;
  email: string;
}

export interface AuditLog {
  id: string;
  tenantId: string | null;
  actorId: string | null;
  action: string;
  module: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  createdAt: string;
  actor?: AuditLogActor | null;
}

export interface AuditLogsParams {
  page?: number;
  limit?: number;
  module?: string;
  action?: string;
  actorId?: string;
  entityType?: string;
  entityId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export function useAuditLogs(params: AuditLogsParams = {}) {
  const {
    page = 1,
    limit = 20,
    module,
    action,
    actorId,
    entityType,
    entityId,
    dateFrom,
    dateTo,
    search,
  } = params;

  return useQuery({
    queryKey: [
      'audit-logs',
      { page, limit, module, action, actorId, entityType, entityId, dateFrom, dateTo, search },
    ],
    queryFn: async () => {
      const res = await apiClient<AuditLog[]>(
        `/audit-logs${buildQuery({
          page,
          limit,
          module,
          action,
          actorId,
          entityType,
          entityId,
          dateFrom,
          dateTo,
          search,
        })}`,
      );
      return { data: res.data ?? [], meta: res.meta as PaginationMeta | undefined };
    },
  });
}

export function useAuditLog(id: string | null) {
  return useQuery({
    queryKey: ['audit-logs', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await apiClient<AuditLog>(`/audit-logs/${id}`);
      if (!res.data) throw new Error('Audit log tidak ditemukan');
      return res.data;
    },
  });
}
