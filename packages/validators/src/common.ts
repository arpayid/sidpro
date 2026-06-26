import { z } from 'zod';

export const uuidSchema = z.string().uuid('UUID tidak valid');

export const passwordStrengthSchema = z
  .string()
  .min(12, 'Password minimal 12 karakter')
  .regex(/[a-z]/, 'Password wajib berisi huruf kecil')
  .regex(/[A-Z]/, 'Password wajib berisi huruf besar')
  .regex(/[0-9]/, 'Password wajib berisi angka')
  .regex(/[^A-Za-z0-9]/, 'Password wajib berisi simbol');

export const searchQuerySchema = z
  .string()
  .trim()
  .min(1, 'Kata kunci pencarian tidak boleh kosong')
  .max(100, 'Kata kunci pencarian maksimal 100 karakter')
  .regex(/^[\p{L}\p{N}\s._@-]+$/u, 'Kata kunci pencarian berisi karakter tidak valid');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: searchQuerySchema.optional(),
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
