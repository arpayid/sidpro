import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators';
import { JwtPayload } from '../decorators/current-user.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions?.length) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (!user) throw new ForbiddenException('Access denied');

    const hasPermission = requiredPermissions.some((p) => user.permissions.includes(p));
    if (!hasPermission) {
      throw new ForbiddenException(`Missing permission: ${requiredPermissions.join(', ')}`);
    }

    return true;
  }
}
