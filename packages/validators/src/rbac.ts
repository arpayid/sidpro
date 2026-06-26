import { z } from 'zod';
import { paginationSchema, passwordStrengthSchema, uuidSchema } from './common';

export const userStatusSchema = z.enum(['active', 'inactive', 'suspended'], {
  errorMap: () => ({ message: 'Status tidak valid' }),
});

export const roleScopeSchema = z.enum(['tenant', 'system']);

export const userListQuerySchema = paginationSchema.extend({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: userStatusSchema.optional(),
  roleId: uuidSchema.optional(),
});

export const roleListQuerySchema = paginationSchema.extend({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const createUserSchema = z
  .object({
    email: z.string().email('Email tidak valid'),
    name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
    password: passwordStrengthSchema,
    phone: z.string().max(32).optional(),
    roleIds: z.array(uuidSchema).optional(),
  })
  .strict();

export const updateUserSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    phone: z.string().max(32).optional(),
    password: passwordStrengthSchema.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Minimal satu field harus diisi',
  });

export const updateUserStatusSchema = z
  .object({
    status: userStatusSchema,
  })
  .strict();

export const assignUserRolesSchema = z
  .object({
    roleIds: z.array(uuidSchema),
  })
  .strict();

export const createRoleSchema = z
  .object({
    name: z.string().min(2, 'Nama role minimal 2 karakter').max(100),
    code: z
      .string()
      .min(2)
      .max(50)
      .regex(/^[a-z][a-z0-9_]*$/, 'Kode role harus snake_case'),
    scope: roleScopeSchema.optional(),
    permissionIds: z.array(uuidSchema).optional(),
  })
  .strict();

export const updateRoleSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Minimal satu field harus diisi',
  });

export const assignRolePermissionsSchema = z
  .object({
    permissionIds: z.array(uuidSchema),
  })
  .strict();

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type AssignUserRolesInput = z.infer<typeof assignUserRolesSchema>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type AssignRolePermissionsInput = z.infer<typeof assignRolePermissionsSchema>;
