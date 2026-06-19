'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, apiUpload, buildQuery } from '@/lib/api-client';
import type { PaginationMeta } from '@sidpro/types';

export interface CmsGalleryItem {
  id: string;
  title: string;
  description?: string | null;
  fileId?: string | null;
  type: string;
  createdAt: string;
}

export interface CmsGalleryInput {
  title: string;
  description?: string;
  fileId?: string;
  type?: string;
}

export function useCmsGallery(params: { page?: number; limit?: number } = {}) {
  const { page = 1, limit = 20 } = params;
  return useQuery({
    queryKey: ['cms', 'gallery', { page, limit }],
    queryFn: async () => {
      const res = await apiClient<CmsGalleryItem[]>(
        `/cms/admin/gallery${buildQuery({ page, limit })}`,
      );
      return { data: res.data ?? [], meta: res.meta as PaginationMeta | undefined };
    },
  });
}

export function useCreateCmsGalleryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CmsGalleryInput) => {
      const res = await apiClient<CmsGalleryItem>('/cms/admin/gallery', { method: 'POST', body });
      if (!res.data) throw new Error('Gagal menambahkan galeri');
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms', 'gallery'] }),
  });
}

export function useDeleteCmsGalleryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient(`/cms/admin/gallery/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms', 'gallery'] }),
  });
}

export function useUploadGalleryFile() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('ownerType', 'gallery');
      const res = await apiUpload<{ id: string }>('/files/upload', formData);
      if (!res.data) throw new Error('Upload gagal');
      return res.data;
    },
  });
}

export function useGalleryFileUrl(fileId: string | null | undefined) {
  return useQuery({
    queryKey: ['files', 'download', fileId],
    enabled: Boolean(fileId),
    queryFn: async () => {
      const res = await apiClient<{ url: string }>(`/files/${fileId}/download`);
      return res.data?.url ?? null;
    },
    staleTime: 30 * 60 * 1000,
  });
}
