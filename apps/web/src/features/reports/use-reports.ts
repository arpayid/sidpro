'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient, downloadBinary } from '@/lib/api-client';

export interface PopulationReport {
  byGender: { gender: string; _count: { id: number } }[];
  byStatus: { residentStatus: string; _count: { id: number } }[];
}

export interface LettersReport {
  byStatus: { status: string; _count: { id: number } }[];
  byType: { letterTypeId: string; _count: { id: number } }[];
}

export interface FinanceReport {
  year: number;
  summary: {
    totalBudget: number;
    totalPlanned: number;
    totalRealized: number;
    absorptionRate: number;
  };
}

export function usePopulationReport() {
  return useQuery({
    queryKey: ['reports', 'population'],
    queryFn: async () => {
      const res = await apiClient<PopulationReport>('/reports/population');
      if (!res.data) throw new Error('Laporan penduduk tidak tersedia');
      return res.data;
    },
  });
}

export function useLettersReport() {
  return useQuery({
    queryKey: ['reports', 'letters'],
    queryFn: async () => {
      const res = await apiClient<LettersReport>('/reports/letters');
      if (!res.data) throw new Error('Laporan surat tidak tersedia');
      return res.data;
    },
  });
}

export function useFinanceReport(year?: number) {
  return useQuery({
    queryKey: ['reports', 'finance', year],
    queryFn: async () => {
      const query = year ? `?year=${year}` : '';
      const res = await apiClient<FinanceReport>(`/reports/finance${query}`);
      if (!res.data) throw new Error('Laporan keuangan tidak tersedia');
      return res.data;
    },
  });
}

async function downloadReportExport(path: string, filename: string) {
  await downloadBinary(path, filename);
}

export function useExportPopulationReport() {
  return useMutation({
    mutationFn: () => downloadReportExport('/reports/population/export', 'laporan-kependudukan.xlsx'),
  });
}

export function useExportLettersReport() {
  return useMutation({
    mutationFn: () => downloadReportExport('/reports/letters/export', 'laporan-surat.xlsx'),
  });
}

export function useExportFinanceReport(year?: number) {
  return useMutation({
    mutationFn: () => {
      const query = year ? `?year=${year}` : '';
      const filename = year ? `laporan-keuangan-${year}.xlsx` : 'laporan-keuangan.xlsx';
      return downloadReportExport(`/reports/finance/export${query}`, filename);
    },
  });
}
