import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const nikSchema = z
  .string()
  .length(16, 'NIK harus 16 digit')
  .regex(/^\d{16}$/, 'NIK hanya boleh angka');

export const kkNumberSchema = z
  .string()
  .length(16, 'Nomor KK harus 16 digit')
  .regex(/^\d{16}$/, 'Nomor KK hanya boleh angka');
