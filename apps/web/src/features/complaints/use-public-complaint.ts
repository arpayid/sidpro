'use client';

import { useMutation } from '@tanstack/react-query';
import {
  publicComplaintFormSchema,
  toPublicComplaintPayload,
  type PublicComplaintFormInput,
} from '@sidpro/validators';
import { apiClient, buildQuery } from '@/lib/api-client';
import { getPublicTenantCode } from '@/lib/tenant';

export interface PublicComplaintResult {
  id: string;
  title: string;
  status: string;
  createdAt: string;
}

export function useSubmitPublicComplaint() {
  return useMutation({
    mutationFn: async (values: PublicComplaintFormInput) => {
      const tenantCode = getPublicTenantCode();
      const parsed = publicComplaintFormSchema.parse(values);
      const body = toPublicComplaintPayload(parsed);
      const res = await apiClient<PublicComplaintResult>(
        `/complaints/public${buildQuery({ tenantCode })}`,
        { method: 'POST', body, skipAuth: true },
      );
      if (!res.data) throw new Error(res.message ?? 'Pengaduan gagal dikirim');
      return res.data;
    },
  });
}
