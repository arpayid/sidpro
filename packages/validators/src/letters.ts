import { z } from 'zod';

export const createLetterRequestSchema = z.object({
  letterTypeId: z.string().uuid(),
  residentId: z.string().uuid().optional(),
  purpose: z.string().min(5).max(1000),
  formData: z.record(z.unknown()).optional(),
});

export const verifyLetterSchema = z.object({
  notes: z.string().optional(),
  approved: z.boolean(),
});

export const approveLetterSchema = z.object({
  notes: z.string().optional(),
  approved: z.boolean(),
});

export type CreateLetterRequestInput = z.infer<typeof createLetterRequestSchema>;
