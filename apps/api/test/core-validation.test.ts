import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assignRolePermissionsSchema,
  createFileMetadataSchema,
  createTenantSchema,
  createUserSchema,
  fileListQuerySchema,
  notificationListQuerySchema,
  provisionVillageSchema,
  tenantListQuerySchema,
  updateTenantSchema,
  updateUserStatusSchema,
  upsertSettingSchema,
  uploadFileMetadataSchema,
  userListQuerySchema,
} from '@sidpro/validators';
import { formatZodError, parseWithZod } from '../src/common/utils/zod-validation.util.js';

const uuid = '123e4567-e89b-12d3-a456-426614174000';

describe('core mutation/query validation schemas', () => {
  it('rejects empty user creation payload and weak password', () => {
    assert.equal(createUserSchema.safeParse({}).success, false);
    const weak = createUserSchema.safeParse({
      email: 'operator@example.test',
      name: 'Operator',
      password: 'password',
    });
    assert.equal(weak.success, false);
  });

  it('rejects invalid email, malformed UUID role ids, and forbidden user fields', () => {
    const result = createUserSchema.safeParse({
      email: 'not-email',
      name: 'Operator',
      password: 'ValidPassw0rd!',
      roleIds: ['not-a-uuid'],
      isSuperadmin: true,
    });

    assert.equal(result.success, false);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      assert.ok(fields.email);
      assert.ok(fields.roleIds);
      assert.ok(result.error.flatten().formErrors.some((message) => message.includes('isSuperadmin')));
    }
  });

  it('rejects invalid enum status for users and tenants', () => {
    assert.equal(updateUserStatusSchema.safeParse({ status: 'deleted' }).success, false);
    assert.equal(updateTenantSchema.safeParse({ status: 'archived' }).success, false);
  });

  it('rejects invalid pagination and unsafe search queries', () => {
    assert.equal(userListQuerySchema.safeParse({ page: '0', limit: '101' }).success, false);
    assert.equal(tenantListQuerySchema.safeParse({ search: '<script>' }).success, false);
    assert.equal(notificationListQuerySchema.safeParse({ unreadOnly: 'yes' }).success, false);
  });

  it('rejects malformed tenant provisioning payloads and forbidden fields', () => {
    const result = provisionVillageSchema.safeParse({
      name: 'Desa Maju',
      code: 'desa-maju',
      parentId: 'bad-parent',
      adminEmail: 'bad-email',
      level: 'kabupaten',
    });

    assert.equal(result.success, false);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      assert.ok(fields.parentId);
      assert.ok(fields.adminEmail);
      assert.ok(result.error.flatten().formErrors.some((message) => message.includes('level')));
    }
  });

  it('rejects empty settings payload and forbidden settings fields', () => {
    assert.equal(upsertSettingSchema.safeParse({}).success, false);
    const result = upsertSettingSchema.safeParse({ value: {}, tenantId: uuid });
    assert.equal(result.success, false);
    if (!result.success) {
      assert.ok(result.error.flatten().formErrors.some((message) => message.includes('tenantId')));
    }
  });

  it('rejects uploaded file metadata with invalid owner UUID, MIME, size, and extra field', () => {
    assert.equal(uploadFileMetadataSchema.safeParse({ ownerId: 'invalid' }).success, false);

    const result = createFileMetadataSchema.safeParse({
      ownerType: 'letter',
      ownerId: uuid,
      path: 'tenant/file.exe',
      mimeType: 'application/x-msdownload',
      size: 0,
      virusScanBypass: true,
    });

    assert.equal(result.success, false);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      assert.ok(fields.mimeType);
      assert.ok(fields.size);
      assert.ok(result.error.flatten().formErrors.some((message) => message.includes('virusScanBypass')));
    }
  });

  it('accepts valid core query and mutation payloads', () => {
    assert.equal(
      createTenantSchema.safeParse({ name: 'Desa Maju', code: 'desa-maju' }).success,
      true,
    );
    assert.equal(assignRolePermissionsSchema.safeParse({ permissionIds: [uuid] }).success, true);
    assert.deepEqual(fileListQuerySchema.parse({ page: '2', limit: '10', ownerId: uuid }).page, 2);
  });

  it('formats Zod validation errors consistently for API BadRequestException responses', () => {
    assert.throws(
      () => parseWithZod(createUserSchema, {}),
      (error: unknown) => {
        const response = (error as { getResponse: () => unknown }).getResponse() as
          | ReturnType<typeof formatZodError>
          | { message: ReturnType<typeof formatZodError> };
        const payload = 'message' in response ? response.message : response;
        assert.equal(payload.success, false);
        assert.equal(payload.error.code, 'VALIDATION_ERROR');
        assert.ok(payload.error.fields.email);
        return true;
      },
    );
  });
});
