import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AdminRole } from "@school-voting/shared";
import { ROLES_KEY } from "./roles.decorator";
import { AdminJwtPayload } from "./admin-jwt.strategy";

/**
 * Runs after AdminJwtAuthGuard. Reads @Roles(...) metadata off the handler
 * and rejects unless the authenticated admin's role is in the allowed set —
 * this, not any client-side hiding, is the real super-admin security boundary.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user: AdminJwtPayload }>();
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException("You do not have permission to perform this action");
    }
    return true;
  }
}
