import { z } from 'zod';
import { paginationSchema, uuidSchema } from './common';

const codeSchema = z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9._-]+$/);
const shortTextSchema = z.string().trim().min(1).max(255);
const longTextSchema = z.string().trim().min(1).max(5000);
const moneySchema = z.coerce.number().nonnegative().finite();
const positiveMoneySchema = z.coerce.number().positive().finite();
const percentageSchema = z.coerce.number().int().min(0).max(100);
const dateStringSchema = z.string().datetime().or(z.string().date());
const optionalBooleanSchema = z.coerce.boolean().optional();
const nonEmptyUpdate = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  schema.partial().strict().refine((value) => Object.keys(value).length > 0, {
    message: 'Minimal satu field harus diisi',
  });

export const adminListQuerySchema = paginationSchema.extend({
  category: shortTextSchema.optional(),
  status: shortTextSchema.optional(),
  type: shortTextSchema.optional(),
  eventType: shortTextSchema.optional(),
  year: z.coerce.number().int().min(1900).max(2200).optional(),
});

export const createAssetSchema = z.object({
  name: shortTextSchema,
  code: codeSchema,
  category: shortTextSchema,
  condition: z.enum(['good', 'fair', 'damaged', 'lost']).optional(),
  location: shortTextSchema.optional(),
  value: moneySchema.optional(),
  description: longTextSchema.optional(),
}).strict();
export const updateAssetSchema = nonEmptyUpdate(createAssetSchema.omit({ code: true }).extend({ code: codeSchema.optional() }));

export const createDevelopmentProjectSchema = z.object({
  name: shortTextSchema,
  code: codeSchema,
  description: longTextSchema.optional(),
  location: shortTextSchema.optional(),
  budget: moneySchema.optional(),
  fundingSource: shortTextSchema.optional(),
  status: z.enum(['planned', 'ongoing', 'completed', 'cancelled']).optional(),
  progress: percentageSchema.optional(),
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
}).strict();
export const updateDevelopmentProjectSchema = nonEmptyUpdate(createDevelopmentProjectSchema);

export const createBudgetYearSchema = z.object({ year: z.coerce.number().int().min(1900).max(2200), totalBudget: moneySchema, status: z.enum(['draft', 'published', 'closed']).optional() }).strict();
export const createBudgetItemSchema = z.object({ category: shortTextSchema, name: shortTextSchema, planned: moneySchema }).strict();
export const updateBudgetItemSchema = nonEmptyUpdate(createBudgetItemSchema);
export const createBudgetRealizationEntrySchema = z.object({
  type: z.enum(['realization', 'reversal']),
  amount: positiveMoneySchema,
  description: longTextSchema.optional(),
  reference: shortTextSchema.optional(),
  occurredAt: dateStringSchema.optional(),
}).strict();
export const createFinanceDocumentSchema = z.object({ title: shortTextSchema, type: shortTextSchema, year: z.coerce.number().int().min(1900).max(2200).optional(), fileId: uuidSchema.optional(), isPublic: optionalBooleanSchema }).strict();

export const createSocialAidProgramSchema = z.object({ name: shortTextSchema, code: codeSchema, description: longTextSchema.optional(), startDate: dateStringSchema.optional(), endDate: dateStringSchema.optional(), status: z.enum(['active', 'inactive', 'closed']).optional() }).strict();
export const updateSocialAidProgramSchema = nonEmptyUpdate(createSocialAidProgramSchema);
const socialAidRecipientBaseSchema = z.object({ residentId: uuidSchema.optional(), familyId: uuidSchema.optional(), amount: moneySchema.optional(), status: z.enum(['pending', 'verified', 'approved', 'rejected', 'distributed']).optional(), notes: longTextSchema.optional() }).strict();
export const createSocialAidRecipientSchema = socialAidRecipientBaseSchema.refine((value) => Boolean(value.residentId || value.familyId), { message: 'residentId atau familyId wajib diisi' });
export const updateSocialAidRecipientSchema = nonEmptyUpdate(socialAidRecipientBaseSchema.omit({ residentId: true, familyId: true }));

export const createBumdesBusinessSchema = z.object({ name: shortTextSchema, code: codeSchema, businessType: shortTextSchema.optional(), description: longTextSchema.optional(), status: z.enum(['active', 'inactive']).optional() }).strict();
export const updateBumdesBusinessSchema = nonEmptyUpdate(createBumdesBusinessSchema);
export const createBumdesFinancialRecordSchema = z.object({ unitId: uuidSchema, type: z.enum(['revenue', 'expense']), amount: moneySchema, description: longTextSchema.optional(), recordDate: dateStringSchema }).strict();

export const createPostSchema = z.object({ title: shortTextSchema, slug: codeSchema, content: longTextSchema, excerpt: longTextSchema.optional(), category: shortTextSchema.optional(), coverImageId: uuidSchema.optional(), status: z.enum(['draft', 'published', 'archived']).optional() }).strict();
export const updatePostSchema = nonEmptyUpdate(createPostSchema);
export const createAgendaSchema = z.object({ title: shortTextSchema, description: longTextSchema.optional(), location: shortTextSchema.optional(), startAt: dateStringSchema, endAt: dateStringSchema.optional(), status: z.enum(['scheduled', 'cancelled', 'done']).optional() }).strict();
export const updateAgendaSchema = nonEmptyUpdate(createAgendaSchema);

export const createCivilEventSchema = z.object({ residentId: uuidSchema, eventType: z.enum(['birth', 'death', 'move_in', 'move_out', 'marriage', 'divorce']), eventDate: dateStringSchema, notes: longTextSchema.optional() }).strict();
export const updateCivilEventSchema = nonEmptyUpdate(createCivilEventSchema.omit({ residentId: true }));

export const createGalleryItemSchema = z.object({ title: shortTextSchema, description: longTextSchema.optional(), fileId: uuidSchema.optional(), type: shortTextSchema.optional() }).strict();
