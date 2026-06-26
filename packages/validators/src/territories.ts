import { z } from 'zod';

export const createHamletSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().min(2).max(20),
}).strict();

export const updateHamletSchema = createHamletSchema.partial().strict().refine((value) => Object.keys(value).length > 0, { message: 'Minimal satu field harus diisi' });

export const createNeighborhoodUnitSchema = z.object({
  hamletId: z.string().uuid(),
  rt: z.string().trim().min(1).max(10),
  rw: z.string().trim().min(1).max(10),
}).strict();

export const updateNeighborhoodUnitSchema = z.object({
  rt: z.string().trim().min(1).max(10).optional(),
  rw: z.string().trim().min(1).max(10).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: 'Minimal satu field harus diisi' });

export const residentAddressSchema = z
  .object({
    hamletId: z.string().uuid('Dusun tidak valid').optional(),
    neighborhoodUnitId: z.string().uuid('RT/RW tidak valid').optional(),
    street: z.string().trim().min(1, 'Alamat jalan tidak boleh kosong').max(500).optional(),
  })
  .refine((value) => Boolean(value.hamletId || value.neighborhoodUnitId || value.street), {
    message: 'Alamat/wilayah wajib berisi dusun, RT/RW, atau jalan',
    path: ['address'],
  });

export type CreateHamletInput = z.infer<typeof createHamletSchema>;
export type UpdateHamletInput = z.infer<typeof updateHamletSchema>;
export type CreateNeighborhoodUnitInput = z.infer<typeof createNeighborhoodUnitSchema>;
export type UpdateNeighborhoodUnitInput = z.infer<typeof updateNeighborhoodUnitSchema>;
export type ResidentAddressInput = z.infer<typeof residentAddressSchema>;
