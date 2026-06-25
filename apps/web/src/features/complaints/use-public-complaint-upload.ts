'use client';

import { useMutation } from '@tanstack/react-query';
import { apiUpload, buildQuery } from '@/lib/api-client';
import { getPublicTenantCode } from '@/lib/tenant';

export function useUploadPublicComplaintFile() {
  return useMutation({
    mutationFn: async (file: File) => {
      const tenantCode = getPublicTenantCode();
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiUpload<{ id: string }>(
        `/complaints/public/upload${buildQuery({ tenantCode })}`,
        formData,
        { skipAuth: true },
      );
      if (!response.data?.id) throw new Error('Upload gagal');
      return response.data.id;
    },
  });
}
