import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FamilyGroup } from '../entities/family-group.entity';
import { FamilyMember } from '../entities/family-member.entity';

/**
 * Permite el acceso SOLO si el solicitante es el owner de un `FamilyGroup` Y el
 * `memberId` de la ruta corresponde a un `FamilyMember` `accepted` de ese mismo
 * grupo. Corre tras el `JwtAuthGuard` global. Los miembros no-owner nunca
 * superan el paso 3 → 403 (privacidad estricta: no se ven entre sí).
 */
@Injectable()
export class FamilyAccessGuard implements CanActivate {
  constructor(
    @InjectRepository(FamilyGroup)
    private readonly groupRepo: Repository<FamilyGroup>,
    @InjectRepository(FamilyMember)
    private readonly memberRepo: Repository<FamilyMember>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 1. Usuario autenticado (poblado por JwtAuthGuard).
    const user = request.user;
    if (!user) throw new ForbiddenException();

    // 2. memberId de la ruta.
    const memberId = request.params.memberId;

    // 3. El solicitante debe ser owner de un grupo.
    const group = await this.groupRepo.findOne({
      where: { owner_id: user.id },
    });
    if (!group) throw new ForbiddenException();

    // 4. El memberId debe ser un miembro accepted de ese grupo.
    const member = await this.memberRepo.findOne({
      where: {
        id: memberId,
        family_group_id: group.id,
        status: 'accepted',
      },
    });
    if (!member) throw new ForbiddenException();

    // 5. Adjuntar el miembro validado para que el controller lea member.user_id.
    request.familyMember = member;
    return true;
  }
}
