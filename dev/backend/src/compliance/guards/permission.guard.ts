import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionService } from '../services/permission.service';
import { PermissionScope } from '@prisma/client';

export const PERMISSION_SCOPE_KEY = 'permission_scope';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector, private permissionService: PermissionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<PermissionScope | undefined>(PERMISSION_SCOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required) return true; // no scope required

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const organizationId = req.params?.organizationId || req.organizationId || user?.organization_id;
    if (!user?.id || !organizationId) return false;
    return this.permissionService.has(user.id, organizationId, required);
  }
}
