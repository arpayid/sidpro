import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const PERMISSIONS_KEY = 'permissions';
export const PERMISSIONS_ALL_KEY = 'permissionsAll';
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
export const RequireAllPermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_ALL_KEY, permissions);

export const CURRENT_USER_KEY = 'currentUser';
