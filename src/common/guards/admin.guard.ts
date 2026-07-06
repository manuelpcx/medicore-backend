import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

/**
 * Restringe el acceso a rutas de administración.
 * Debe usarse SIEMPRE después de JwtAuthGuard, que puebla request.user
 * con el usuario validado (incluye el campo `role`).
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.role !== 'admin') {
      throw new ForbiddenException('Acceso restringido');
    }

    return true;
  }
}
