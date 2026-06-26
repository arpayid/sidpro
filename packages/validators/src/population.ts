import { z } from 'zod';
import { kkNumberSchema, nikSchema } from './common';
import { residentAddressSchema } from './territories';

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
const isoDateTimePattern = /^\d{4}-\d{2}-\d{2}T/;

function isValidDateOnly(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const isoDateSchema = z
  .string()
  .refine((value) => dateOnlyPattern.test(value) || isoDateTimePattern.test(value), {
    message: 'Tanggal harus berformat YYYY-MM-DD atau ISO datetime',
  })
  .transform((value, ctx) => {
    const normalized = dateOnlyPattern.test(value) ? value : value.slice(0, 10);
    if (!dateOnlyPattern.test(normalized) || !isValidDateOnly(normalized)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Tanggal tidak valid' });
      return z.NEVER;
    }

    if (isoDateTimePattern.test(value) && Number.isNaN(Date.parse(value))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Tanggal tidak valid' });
      return z.NEVER;
    }

    return normalized;
  });

export const genderSchema = z.enum(['male', 'female'], {
  errorMap: () => ({ message: 'Gender harus male atau female' }),
});

export const residentStatusSchema = z.enum(['permanent', 'temporary', 'moved', 'deceased'], {
  errorMap: () => ({ message: 'Status penduduk tidak valid' }),
});

export const familyRelationshipSchema = z.enum(
  [
    'head',
    'spouse',
    'child',
    'parent',
    'parent_in_law',
    'grandchild',
    'sibling',
    'relative',
    'other',
  ],
  { errorMap: () => ({ message: 'Relasi keluarga tidak valid' }) },
);

export const createResidentSchema = z.object({
  nik: nikSchema,
  fullName: z.string().trim().min(2, 'Nama lengkap minimal 2 karakter').max(200),
  gender: genderSchema,
  birthPlace: z.string().trim().min(2, 'Tempat lahir minimal 2 karakter').max(100),
  birthDate: isoDateSchema,
  religion: z.string().trim().max(100).optional(),
  education: z.string().trim().max(100).optional(),
  occupation: z.string().trim().max(100).optional(),
  maritalStatus: z.string().trim().max(100).optional(),
  bloodType: z.string().trim().max(5).optional(),
  disabilityStatus: z.string().trim().max(100).optional(),
  residentStatus: residentStatusSchema.default('permanent'),
  familyId: z.string().uuid('Keluarga tidak valid').optional(),
  addressId: z.string().uuid('Alamat tidak valid').optional(),
  address: residentAddressSchema.optional(),
});

const nullableOptionalTextSchema = z.string().trim().max(100).nullable().optional();
const nullableOptionalUuidSchema = z
  .string()
  .uuid('Data referensi tidak valid')
  .nullable()
  .optional();

export const updateResidentSchema = createResidentSchema.partial().extend({
  religion: nullableOptionalTextSchema,
  education: nullableOptionalTextSchema,
  occupation: nullableOptionalTextSchema,
  maritalStatus: nullableOptionalTextSchema,
  bloodType: z.string().trim().max(5).nullable().optional(),
  disabilityStatus: nullableOptionalTextSchema,
  familyId: nullableOptionalUuidSchema,
  addressId: nullableOptionalUuidSchema,
});

export const residentMutationSchema = z.object({
  residentStatus: z.enum(['moved', 'deceased'], {
    errorMap: () => ({ message: 'Mutasi hanya untuk status pindah atau meninggal' }),
  }),
  eventDate: isoDateSchema,
  notes: z.string().trim().max(2000).optional(),
});

export type ResidentMutationInput = z.infer<typeof residentMutationSchema>;

export const createFamilySchema = z.object({
  kkNumber: kkNumberSchema,
  headResidentId: z.string().uuid('Kepala keluarga tidak valid').optional(),
  addressId: z.string().uuid('Alamat tidak valid').optional(),
  address: residentAddressSchema.optional(),
  economicStatus: z.string().trim().max(100).optional(),
  houseStatus: z.string().trim().max(100).optional(),
  waterSource: z.string().trim().max(100).optional(),
  electricity: z.string().trim().max(100).optional(),
  sanitation: z.string().trim().max(100).optional(),
});

export const updateFamilySchema = createFamilySchema.omit({ kkNumber: true }).partial();

export const addFamilyMemberSchema = z.object({
  residentId: z.string().uuid('Penduduk tidak valid'),
  relationship: familyRelationshipSchema,
  isHead: z.boolean().default(false),
});

export type CreateResidentInput = z.infer<typeof createResidentSchema>;
export type UpdateResidentInput = z.infer<typeof updateResidentSchema>;
export type CreateFamilyInput = z.infer<typeof createFamilySchema>;
export type UpdateFamilyInput = z.infer<typeof updateFamilySchema>;
export type AddFamilyMemberInput = z.infer<typeof addFamilyMemberSchema>;
