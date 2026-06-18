import { z } from 'zod';

export const createHamletSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(20),
});

export const updateHamletSchema = createHamletSchema.partial();

export const createNeighborhoodUnitSchema = z.object({
  hamletId: z.string().uuid(),
  rt: z.string().min(1).max(10),
  rw: z.string().min(1).max(10),
});

export const updateNeighborhoodUnitSchema = z.object({
  rt: z.string().min(1).max(10).optional(),
  rw: z.string().min(1).max(10).optional(),
});

export const residentAddressSchema = z.object({
  hamletId: z.string().uuid(),
  neighborhoodUnitId: z.string().uuid(),
  street: z.string().max(500).optional(),
});

export type CreateHamletInput = z.infer<typeof createHamletSchema>;
export type UpdateHamletInput = z.infer<typeof updateHamletSchema>;
export type CreateNeighborhoodUnitInput = z.infer<typeof createNeighborhoodUnitSchema>;
export type UpdateNeighborhoodUnitInput = z.infer<typeof updateNeighborhoodUnitSchema>;
export type ResidentAddressInput = z.infer<typeof residentAddressSchema>;
