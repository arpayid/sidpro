'use client';

import { useMutation } from '@tanstack/react-query';
import { buildApiUrl, buildQuery } from '@/lib/api-client';
import { getPublicTenantCode } from '@/lib/tenant';

export function useUploadPublicComplaintFile() {
  return useMutation({
    mutationFn: async (file: File) => {
      const tenantCode = getPublicTenantCode();
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(
        buildApiUrl(`/complaints/public/upload${buildQuery({ tenantCode })}`),
        { method: 'POST', body: formData },
      );
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.data?.id) {
        throw new Error(json.message ?? 'Upload gagal');
      }
      return json.data.id as string;
    },
  });
}
