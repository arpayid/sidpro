import { z } from 'zod';
import { paginationSchema, searchQuerySchema, uuidSchema } from './common';

export const tenantStatusSchema = z.enum(['active', 'inactive', 'suspended'], {
  errorMap: () => ({ message: 'Status tenant tidak valid' }),
});

export const tenantListQuerySchema = paginationSchema.extend({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: searchQuerySchema.optional(),
});

export const createTenantSchema = z
  .object({
    name: z.string().min(2).max(150),
    code: z
      .string()
      .min(2)
      .max(50)
      .regex(/^[a-z0-9][a-z0-9_-]*$/, 'Kode tenant tidak valid'),
    status: tenantStatusSchema.optional(),
  })
  .strict();

export const updateTenantSchema = z
  .object({
    name: z.string().min(2).max(150).optional(),
    status: tenantStatusSchema.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'Minimal satu field harus diisi' });

export const provisionVillageSchema = createTenantSchema
  .extend({
    parentId: uuidSchema,
    villageCode: z.string().min(2).max(16).optional(),
    adminEmail: z.string().email('Email admin tidak valid').optional(),
    adminName: z.string().min(2).max(100).optional(),
  })
  .strict();

export const settingKeySchema = z
  .string()
  .min(2)
  .max(120)
  .regex(/^[a-z][a-z0-9_.-]*$/, 'Key setting tidak valid');

export const upsertSettingSchema = z
  .object({
    value: z.record(z.unknown()),
  })
  .strict();

const ownerTypeSchema = z.string().min(2).max(80).regex(/^[a-z][a-z0-9_-]*$/);
const filePathSchema = z.string().min(3).max(1024).regex(/^[^\0]+$/);
const mimeTypeSchema = z
  .enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'], {
    errorMap: () => ({ message: 'Tipe file tidak diizinkan' }),
  });

export const fileListQuerySchema = paginationSchema.extend({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  ownerType: ownerTypeSchema.optional(),
  ownerId: uuidSchema.optional(),
});

export const uploadFileMetadataSchema = z
  .object({
    ownerType: ownerTypeSchema.optional(),
    ownerId: uuidSchema.optional(),
  })
  .strict();

export const createFileMetadataSchema = z
  .object({
    ownerType: ownerTypeSchema,
    ownerId: uuidSchema.optional(),
    path: filePathSchema,
    mimeType: mimeTypeSchema,
    size: z.coerce.number().int().positive().max(5 * 1024 * 1024),
    checksum: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
  })
  .strict();

export const updateFileMetadataSchema = z
  .object({
    ownerType: ownerTypeSchema.optional(),
    ownerId: uuidSchema.optional(),
    path: filePathSchema.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'Minimal satu field harus diisi' });

export const notificationListQuerySchema = paginationSchema.extend({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional()
    .default('false'),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
export type ProvisionVillageInput = z.infer<typeof provisionVillageSchema>;
export type UpsertSettingInput = z.infer<typeof upsertSettingSchema>;
export type CreateFileMetadataInput = z.infer<typeof createFileMetadataSchema>;
export type UpdateFileMetadataInput = z.infer<typeof updateFileMetadataSchema>;
