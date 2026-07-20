import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';

/**
 * Resuelve el `?patientId` de la query para los endpoints de dominio.
 *
 * - Sin `patientId` -> `req.scopedPatientId = null` (comportamiento del adulto,
 *   sin regresión) (R21).
 * - Con `patientId`: solo se permite si es el propio `Patient` del adulto
 *   (`user_id === req.user.id`) o un menor propio (`is_minor` && `owner_id ===
 *   req.user.id`); en otro caso -> 403 (R20). Al validar, adjunta
 *   `req.scopedPatientId` con el id resuelto (R19).
 *
 * Corre tras el `JwtAuthGuard` global (`req.user` ya poblado).
 */
@Injectable()
export class PatientScopeGuard implements CanActivate {
  constructor(
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const patientId = req.query?.patientId as string | undefined;

    if (!patientId) {
      req.scopedPatientId = null;
      return true;
    }

    const userId = req.user?.id;
    if (!userId) throw new ForbiddenException();

    const p = await this.patientRepo.findOne({ where: { id: patientId } });
    const ok =
      p &&
      (p.user_id === userId || (p.is_minor && p.owner_id === userId));
    if (!ok) throw new ForbiddenException();

    req.scopedPatientId = p!.id;
    return true;
  }
}
