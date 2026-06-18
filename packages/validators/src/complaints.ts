import { z } from 'zod';

export const createComplaintSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(5000),
  category: z.string().min(2),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  location: z.string().optional(),
  reporterName: z.string().min(2).optional(),
  reporterPhone: z.string().optional(),
  reporterEmail: z.string().email().optional(),
});

export const respondComplaintSchema = z.object({
  response: z.string().min(5).max(5000),
  status: z.enum(['verified', 'in_progress', 'resolved', 'closed']).optional(),
});

export const assignComplaintSchema = z.object({
  assigneeId: z.string().uuid(),
});

export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;
