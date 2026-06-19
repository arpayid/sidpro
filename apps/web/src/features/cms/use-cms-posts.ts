'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, buildQuery } from '@/lib/api-client';
import type { PaginationMeta } from '@sidpro/types';

export interface CmsPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string | null;
  category?: string | null;
  status: string;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CmsPostInput {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  category?: string;
  status?: string;
}

export interface CmsPostsParams {
  page?: number;
  limit?: number;
  status?: string;
}

export function useCmsPosts(params: CmsPostsParams = {}) {
  const { page = 1, limit = 20, status } = params;
  return useQuery({
    queryKey: ['cms', 'posts', { page, limit, status }],
    queryFn: async () => {
      const res = await apiClient<CmsPost[]>(
        `/cms/admin/posts${buildQuery({ page, limit, status })}`,
      );
      return { data: res.data ?? [], meta: res.meta as PaginationMeta | undefined };
    },
  });
}

export function useCreateCmsPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CmsPostInput) => {
      const res = await apiClient<CmsPost>('/cms/admin/posts', { method: 'POST', body });
      if (!res.data) throw new Error('Gagal membuat berita');
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms', 'posts'] }),
  });
}

export function useUpdateCmsPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Partial<CmsPostInput> }) => {
      const res = await apiClient<CmsPost>(`/cms/admin/posts/${id}`, { method: 'PATCH', body });
      if (!res.data) throw new Error('Gagal memperbarui berita');
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms', 'posts'] }),
  });
}

export function useDeleteCmsPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient(`/cms/admin/posts/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms', 'posts'] }),
  });
}
