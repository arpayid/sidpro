import { ApiResponse, PaginationMeta } from '@sidpro/types';

export function successResponse<T>(
  data: T,
  message = 'OK',
  meta?: PaginationMeta,
): ApiResponse<T> {
  return { success: true, message, data, meta };
}

export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  message = 'OK',
): ApiResponse<T[]> {
  return {
    success: true,
    message,
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export function maskNik(nik: string): string {
  if (nik.length !== 16) return nik;
  return `${nik.slice(0, 4)}********${nik.slice(-4)}`;
}

export function maskKk(kk: string): string {
  if (kk.length !== 16) return kk;
  return `${kk.slice(0, 4)}********${kk.slice(-4)}`;
}
