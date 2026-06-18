import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email('Email tidak valid'),
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  phone: z.string().optional(),
  roleIds: z.array(z.string().uuid()).optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password minimal 8 karakter').optional(),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(['active', 'inactive', 'suspended'], {
    errorMap: () => ({ message: 'Status tidak valid' }),
  }),
});

export const assignUserRolesSchema = z.object({
  roleIds: z.array(z.string().uuid()),
});

export const createRoleSchema = z.object({
  name: z.string().min(2, 'Nama role minimal 2 karakter').max(100),
  code: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z][a-z0-9_]*$/, 'Kode role harus snake_case'),
  scope: z.enum(['tenant', 'system']).optional(),
  permissionIds: z.array(z.string().uuid()).optional(),
});

export const updateRoleSchema = z.object({
  name: z.string().min(2).max(100).optional(),
});

export const assignRolePermissionsSchema = z.object({
  permissionIds: z.array(z.string().uuid()),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type AssignUserRolesInput = z.infer<typeof assignUserRolesSchema>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type AssignRolePermissionsInput = z.infer<typeof assignRolePermissionsSchema>;
