import { z } from 'zod';
import { nikSchema, kkNumberSchema } from './common';
import { residentAddressSchema } from './territories';

export const createResidentSchema = z.object({
  nik: nikSchema,
  fullName: z.string().min(2).max(200),
  gender: z.enum(['male', 'female']),
  birthPlace: z.string().min(2).max(100),
  birthDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  religion: z.string().optional(),
  education: z.string().optional(),
  occupation: z.string().optional(),
  maritalStatus: z.string().optional(),
  bloodType: z.string().optional(),
  disabilityStatus: z.string().optional(),
  residentStatus: z.enum(['permanent', 'temporary', 'moved', 'deceased']).default('permanent'),
  familyId: z.string().uuid().optional(),
  addressId: z.string().uuid().optional(),
  address: residentAddressSchema.optional(),
});

export const updateResidentSchema = createResidentSchema.partial();

export const createFamilySchema = z.object({
  kkNumber: kkNumberSchema,
  headResidentId: z.string().uuid().optional(),
  addressId: z.string().uuid().optional(),
  address: residentAddressSchema.optional(),
  economicStatus: z.string().optional(),
  houseStatus: z.string().optional(),
});

export const addFamilyMemberSchema = z.object({
  residentId: z.string().uuid(),
  relationship: z.string().min(2),
  isHead: z.boolean().default(false),
});

export type CreateResidentInput = z.infer<typeof createResidentSchema>;
export type CreateFamilyInput = z.infer<typeof createFamilySchema>;
