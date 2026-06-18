import { ForbiddenException } from '@nestjs/common';
import { JwtPayload } from '../decorators/current-user.decorator';

export const SUPERADMIN_ROLE_CODE = 'superadmin_system';
export const VILLAGE_ADMIN_ROLE_CODE = 'admin_desa';

export function isSuperAdmin(user: JwtPayload): boolean {
  return user.roles.includes(SUPERADMIN_ROLE_CODE);
}

export function assertSuperadminRoleAccess(user: JwtPayload, roleCodes: string[]) {
  if (roleCodes.includes(SUPERADMIN_ROLE_CODE) && !isSuperAdmin(user)) {
    throw new ForbiddenException('Hanya superadmin yang dapat mengelola role superadmin');
  }
}

export function assertSuperadminRoleMutation(user: JwtPayload, roleCode: string) {
  if (roleCode === SUPERADMIN_ROLE_CODE && !isSuperAdmin(user)) {
    throw new ForbiddenException('Role superadmin tidak dapat diubah tanpa akses superadmin');
  }
}
