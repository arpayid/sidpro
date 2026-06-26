import { z } from 'zod';

const phoneRegex = /^(?:\+62|62|0)8[1-9][0-9]{6,11}$/;
const tenantCodeRegex = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/;

export const complaintTenantCodeSchema = z
  .string({ required_error: 'Kode tenant wajib diisi' })
  .trim()
  .min(2, 'Kode tenant minimal 2 karakter')
  .max(63, 'Kode tenant maksimal 63 karakter')
  .regex(tenantCodeRegex, 'Kode tenant tidak valid');

const complaintFileIdsSchema = z
  .array(z.string().uuid('File ID tidak valid'))
  .max(3, 'Maksimal 3 lampiran')
  .refine((ids) => new Set(ids).size === ids.length, 'File ID tidak boleh duplikat');

export const createComplaintSchema = z.object({
  title: z.string().trim().min(5, 'Judul minimal 5 karakter').max(200),
  description: z.string().trim().min(10, 'Deskripsi minimal 10 karakter').max(5000),
  category: z.string().trim().min(2, 'Kategori wajib dipilih').max(100),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  location: z.string().trim().max(255).optional(),
  reporterName: z.string().trim().min(2).max(120).optional(),
  reporterPhone: z.string().trim().regex(phoneRegex, 'Nomor telepon tidak valid').optional(),
  reporterEmail: z.string().trim().email('Email tidak valid').max(254).optional(),
  fileIds: complaintFileIdsSchema.optional(),
});

export const publicCreateComplaintSchema = createComplaintSchema.extend({
  reporterName: z.string().trim().min(2, 'Nama minimal 2 karakter').max(120),
  reporterPhone: z.string().trim().regex(phoneRegex, 'Nomor telepon tidak valid'),
  reporterEmail: z.string().trim().email('Email tidak valid').max(254).optional(),
});

export const respondComplaintSchema = z.object({
  response: z.string().trim().min(5, 'Tanggapan minimal 5 karakter').max(5000),
  status: z.enum(['in_progress', 'resolved']).optional(),
});

export const assignComplaintSchema = z.object({
  assigneeId: z.string().uuid('Petugas tidak valid'),
});

export const updateComplaintStatusSchema = z
  .object({
    status: z.enum([
      'submitted',
      'verified',
      'assigned',
      'in_progress',
      'resolved',
      'rejected',
      'closed',
    ]),
    note: z.string().trim().min(5, 'Catatan minimal 5 karakter').max(2000).optional(),
    closeReason: z.string().trim().min(5, 'Alasan penutupan minimal 5 karakter').max(2000).optional(),
  })
  .superRefine((value, ctx) => {
    if (['rejected', 'closed'].includes(value.status) && !value.note && !value.closeReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['closeReason'],
        message: 'Alasan penutupan/penolakan wajib diisi',
      });
    }
  });

export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;
export type PublicCreateComplaintInput = z.infer<typeof publicCreateComplaintSchema>;
export type RespondComplaintInput = z.infer<typeof respondComplaintSchema>;
export type AssignComplaintInput = z.infer<typeof assignComplaintSchema>;
export type UpdateComplaintStatusInput = z.infer<typeof updateComplaintStatusSchema>;

/** Public portal form — maps to POST /complaints/public body */
export const publicComplaintFormSchema = publicCreateComplaintSchema.extend({
  reporterEmail: z.string().trim().email('Email tidak valid').optional().or(z.literal('')),
});

export type PublicComplaintFormInput = z.input<typeof publicComplaintFormSchema>;
export type PublicComplaintFormValues = z.infer<typeof publicComplaintFormSchema>;

export function toPublicComplaintPayload(values: PublicComplaintFormValues) {
  return {
    title: values.title,
    description: values.description,
    category: values.category,
    priority: values.priority,
    location: values.location || undefined,
    reporterName: values.reporterName,
    reporterPhone: values.reporterPhone,
    reporterEmail: values.reporterEmail || undefined,
    fileIds: values.fileIds,
  };
}

/** Public track form — maps to POST /complaints/public/track body */
export const publicComplaintTrackSchema = z.object({
  ticket: z
    .string()
    .trim()
    .regex(/^PGD-[A-Z0-9]{8}$/i, 'Format tiket: PGD-XXXXXXXX (8 karakter)'),
  reporterPhone: z.string().trim().regex(phoneRegex, 'Nomor telepon tidak valid'),
});

export type PublicComplaintTrackInput = z.infer<typeof publicComplaintTrackSchema>;
