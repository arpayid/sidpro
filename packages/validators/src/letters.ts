import { z } from 'zod';

export const createLetterRequestSchema = z.object({
  letterTypeId: z.string().uuid(),
  residentId: z.string().uuid().optional(),
  applicantNik: z
    .string()
    .length(16, 'NIK harus 16 digit')
    .regex(/^\d{16}$/, 'NIK harus berisi angka')
    .optional(),
  purpose: z.string().min(5).max(1000),
  formData: z.record(z.unknown()).optional(),
});

export const adminCreateLetterRequestSchema = createLetterRequestSchema.refine(
  (data) => Boolean(data.residentId),
  { message: 'Pilih penduduk pemohon', path: ['residentId'] },
);

export const verifyLetterSchema = z.object({
  notes: z.string().optional(),
  approved: z.boolean(),
});

export const approveLetterSchema = z.object({
  notes: z.string().optional(),
  approved: z.boolean(),
});

export const letterSignatorySchema = z.object({
  name: z.string().min(2).max(120),
  title: z.string().min(2).max(120),
});

export const letterPdfSettingsSchema = z.object({
  maskNik: z.boolean(),
});

export const letterHeaderSettingsSchema = z.object({
  useCustom: z.boolean(),
  name: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  province: z.string().max(100).optional(),
  regency: z.string().max(100).optional(),
  district: z.string().max(100).optional(),
});

export const updateLetterSettingsSchema = z.object({
  signatory: letterSignatorySchema,
  pdf: letterPdfSettingsSchema,
  header: letterHeaderSettingsSchema,
});

export const updateLetterTemplateSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  content: z.string().min(10).max(10000).optional(),
  isActive: z.boolean().optional(),
});

export const publicLetterTrackSchema = z.object({
  ticket: z
    .string()
    .min(5)
    .max(20)
    .regex(/^SRT-[A-Z0-9]{8}$/i, 'Format tiket: SRT-XXXXXXXX'),
  nikLast4: z
    .string()
    .length(4)
    .regex(/^\d{4}$/, 'Masukkan 4 digit terakhir NIK'),
});

export type PublicLetterTrackInput = z.infer<typeof publicLetterTrackSchema>;

export type CreateLetterRequestInput = z.infer<typeof createLetterRequestSchema>;
export type AdminCreateLetterRequestInput = z.infer<typeof adminCreateLetterRequestSchema>;
export type UpdateLetterSettingsInput = z.infer<typeof updateLetterSettingsSchema>;
export type UpdateLetterTemplateInput = z.infer<typeof updateLetterTemplateSchema>;
