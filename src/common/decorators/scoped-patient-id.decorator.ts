import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Devuelve el `patient_id` resuelto por `PatientScopeGuard`:
 * - el id de un menor propio cuando llega `?patientId` válido, o
 * - `null` cuando no hay `?patientId` (opera sobre el Patient del adulto).
 */
export const ScopedPatientId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const req = ctx.switchToHttp().getRequest();
    return (req.scopedPatientId ?? null) as string | null;
  },
);
