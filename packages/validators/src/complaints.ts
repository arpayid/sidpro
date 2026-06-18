import { z } from 'zod';

export const createComplaintSchema = z.object({
  title: z.string().min(5, 'Judul minimal 5 karakter').max(200),
  description: z.string().min(10, 'Deskripsi minimal 10 karakter').max(5000),
  category: z.string().min(2),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  location: z.string().optional(),
  reporterName: z.string().min(2).optional(),
  reporterPhone: z.string().optional(),
  reporterEmail: z.string().email().optional(),
});

export const respondComplaintSchema = z.object({
  response: z.string().min(5, 'Tanggapan minimal 5 karakter').max(5000),
  status: z.enum(['in_progress', 'resolved']).optional(),
});

export const assignComplaintSchema = z.object({
  assigneeId: z.string().uuid(),
});

export const updateComplaintStatusSchema = z.object({
  status: z.enum([
    'submitted',
    'verified',
    'assigned',
    'in_progress',
    'resolved',
    'rejected',
    'closed',
  ]),
  note: z.string().max(2000).optional(),
});

export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;
export type RespondComplaintInput = z.infer<typeof respondComplaintSchema>;
export type AssignComplaintInput = z.infer<typeof assignComplaintSchema>;
export type UpdateComplaintStatusInput = z.infer<typeof updateComplaintStatusSchema>;

/** Public portal form — maps to POST /complaints/public body */
export const publicComplaintFormSchema = z.object({
  reporterName: z.string().min(2, 'Nama minimal 2 karakter'),
  reporterPhone: z.string().min(8, 'Nomor telepon tidak valid'),
  reporterEmail: z
    .string()
    .email('Email tidak valid')
    .optional()
    .or(z.literal('')),
  category: z.string().min(2, 'Pilih kategori'),
  title: z.string().min(5, 'Subjek minimal 5 karakter').max(200),
  description: z.string().min(10, 'Isi pengaduan minimal 10 karakter').max(5000),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  location: z.string().optional(),
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
  };
}

/** Public track form — maps to POST /complaints/public/track body */
export const publicComplaintTrackSchema = z.object({
  ticket: z
    .string()
    .min(8, 'Nomor tiket tidak valid')
    .regex(/^PGD-[A-Z0-9]+$/i, 'Format tiket: PGD-XXXXXXXX'),
  reporterPhone: z.string().min(8, 'Nomor telepon tidak valid'),
});

export type PublicComplaintTrackInput = z.infer<typeof publicComplaintTrackSchema>;
