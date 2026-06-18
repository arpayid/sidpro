'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, buildQuery } from '@/lib/api-client';

export interface DashboardStats {
  residents: number;
  families: number;
  letterRequests: number;
  pendingLetters: number;
  complaints: number;
  openComplaints: number;
  aidPrograms: number;
  assets: number;
  developmentProjects: number;
  budgetYears: number;
  recentActivity?: {
    auditLogs: AuditLogItem[];
    pendingLetters: Array<{
      id: string;
      purpose: string;
      status: string;
      submittedAt: string;
      letterType?: { name: string };
      resident?: { fullName: string };
    }>;
    openComplaints: Array<{
      id: string;
      title: string;
      status: string;
      createdAt: string;
    }>;
  };
}

export interface AuditLogItem {
  id: string;
  action: string;
  module: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  actor?: { id: string; name: string; email: string };
}

export interface AuditReport {
  periodDays: number;
  recent: AuditLogItem[];
}

const ACTION_LABELS: Record<string, string> = {
  create: 'Membuat',
  update: 'Memperbarui',
  delete: 'Menghapus',
  verify: 'Memverifikasi',
  approve: 'Menyetujui',
  reject: 'Menolak',
  generate: 'Mengenerate',
};

const MODULE_LABELS: Record<string, string> = {
  population: 'Penduduk',
  families: 'Keluarga',
  letters: 'Surat',
  complaints: 'Pengaduan',
  finance: 'Keuangan',
  cms: 'CMS',
};

export function formatAuditActivity(log: AuditLogItem): string {
  const action = ACTION_LABELS[log.action] ?? log.action;
  const module = MODULE_LABELS[log.module] ?? log.module;
  return `${action} data ${module}`;
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await apiClient<DashboardStats>('/reports/dashboard');
      if (!res.data) throw new Error('Data dashboard tidak tersedia');
      return res.data;
    },
  });
}

export function useDashboardActivity(days = 7) {
  return useQuery({
    queryKey: ['dashboard', 'activity', days],
    queryFn: async () => {
      const res = await apiClient<AuditReport>(
        `/reports/audit${buildQuery({ days })}`,
      );
      return res.data?.recent ?? [];
    },
  });
}
