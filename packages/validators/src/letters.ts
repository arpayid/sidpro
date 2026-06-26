import { z } from 'zod';

const safeText = (field: string, min = 1, max = 1000) =>
  z
    .string({ required_error: `${field} wajib diisi` })
    .trim()
    .min(min, `${field} wajib diisi`)
    .max(max, `${field} terlalu panjang`)
    .refine((value) => !/[<>]/.test(value), `${field} mengandung karakter tidak valid`);

export const letterTypePayloadSchema = z
  .object({
    code: z
      .string({ required_error: 'Kode jenis surat wajib diisi' })
      .trim()
      .min(2)
      .max(30)
      .regex(/^[A-Z0-9_-]+$/i, 'Kode hanya boleh berisi huruf, angka, garis bawah, atau strip')
      .transform((value) => value.toUpperCase()),
    name: safeText('Nama jenis surat', 2, 200),
    requiredFields: z.record(z.unknown()).optional(),
    requiredFiles: z.record(z.unknown()).optional(),
  })
  .strict();

export const createLetterRequestSchema = z
  .object({
    letterTypeId: z.string().uuid('Jenis surat tidak valid'),
    residentId: z.string().uuid('Penduduk pemohon tidak valid').optional(),
    applicantNik: z
      .string()
      .length(16, 'NIK harus 16 digit')
      .regex(/^\d{16}$/, 'NIK harus berisi angka')
      .optional(),
    purpose: safeText('Keperluan', 5, 1000),
    formData: z.record(z.unknown()).optional(),
  })
  .strict();

export const adminCreateLetterRequestSchema = createLetterRequestSchema.refine(
  (data) => Boolean(data.residentId),
  { message: 'Pilih penduduk pemohon', path: ['residentId'] },
);

export const letterApprovalActionSchema = z.enum(['verify', 'approve', 'reject', 'generate', 'download']);

export const verifyLetterSchema = z
  .object({
    notes: safeText('Catatan', 1, 1000).optional(),
    approved: z.boolean({ required_error: 'Keputusan verifikasi wajib diisi' }),
  })
  .strict();

export const approveLetterSchema = z
  .object({
    notes: safeText('Catatan', 1, 1000).optional(),
    approved: z.boolean({ required_error: 'Keputusan persetujuan wajib diisi' }),
  })
  .strict();

export const rejectLetterSchema = z
  .object({
    notes: safeText('Alasan penolakan', 5, 1000),
  })
  .strict();

export const qrCodeVerificationSchema = z.object({
  qrCode: z.string().uuid('Kode QR tidak valid'),
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

export const publicLetterTrackSchema = z
  .object({
    ticket: z
      .string()
      .trim()
      .min(5)
      .max(20)
      .regex(/^SRT-[A-Z0-9]{8}$/i, 'Format tiket: SRT-XXXXXXXX')
      .transform((value) => value.toUpperCase()),
    nikLast4: z
      .string()
      .length(4)
      .regex(/^\d{4}$/, 'Masukkan 4 digit terakhir NIK'),
  })
  .strict();

export const publicLetterTrackQuerySchema = z.object({
  tenantCode: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/i, 'Kode tenant tidak valid'),
});

export type PublicLetterTrackInput = z.infer<typeof publicLetterTrackSchema>;
export type LetterTypePayloadInput = z.infer<typeof letterTypePayloadSchema>;
export type CreateLetterRequestInput = z.infer<typeof createLetterRequestSchema>;
export type AdminCreateLetterRequestInput = z.infer<typeof adminCreateLetterRequestSchema>;
export type UpdateLetterSettingsInput = z.infer<typeof updateLetterSettingsSchema>;
export type UpdateLetterTemplateInput = z.infer<typeof updateLetterTemplateSchema>;
