'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, buildQuery } from '@/lib/api-client';
import type { PaginationMeta } from '@sidpro/types';

export interface BudgetItem {
  id: string;
  category: string;
  name: string;
  planned: string | number;
  realized: string | number;
}

export interface BudgetYear {
  id: string;
  year: number;
  totalBudget: string | number;
  status: string;
  items: BudgetItem[];
}

export function useBudgetYears(params: { page?: number; limit?: number } = {}) {
  const { page = 1, limit = 20 } = params;
  return useQuery({
    queryKey: ['finance', 'budget-years', { page, limit }],
    queryFn: async () => {
      const res = await apiClient<BudgetYear[]>(
        `/finance/budget-years${buildQuery({ page, limit })}`,
      );
      return { data: res.data ?? [], meta: res.meta as PaginationMeta | undefined };
    },
  });
}

export function useCreateBudgetYear() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { year: number; totalBudget: number; status?: string }) => {
      const res = await apiClient<BudgetYear>('/finance/budget-years', { method: 'POST', body });
      if (!res.data) throw new Error('Gagal membuat tahun anggaran');
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance', 'budget-years'] }),
  });
}

export function useCreateBudgetItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      budgetYearId,
      body,
    }: {
      budgetYearId: string;
      body: { category: string; name: string; planned: number; realized?: number };
    }) => {
      const res = await apiClient<BudgetItem>(`/finance/budget-years/${budgetYearId}/items`, {
        method: 'POST',
        body,
      });
      if (!res.data) throw new Error('Gagal menambahkan pos anggaran');
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance', 'budget-years'] }),
  });
}
