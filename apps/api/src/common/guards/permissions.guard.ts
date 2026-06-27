import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_ALL_KEY, PERMISSIONS_KEY } from '../decorators';
import { JwtPayload } from '../decorators/current-user.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;
    const userPermissions = user?.permissions ?? [];

    const requiredAll = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_ALL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredAll?.length) {
      if (!user) throw new ForbiddenException('Access denied');
      const missingAll = requiredAll.filter((permission) => !userPermissions.includes(permission));
      if (missingAll.length) {
        throw new ForbiddenException(`Missing permission: ${missingAll.join(', ')}`);
      }
      return true;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions?.length) return true;

    if (!user) throw new ForbiddenException('Access denied');

    const hasPermission = requiredPermissions.some((permission) => userPermissions.includes(permission));
    if (!hasPermission) {
      throw new ForbiddenException(`Missing permission: ${requiredPermissions.join(', ')}`);
    }

    return true;
  }
}
