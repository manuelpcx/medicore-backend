import {
  Injectable,
  Logger,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { Patient } from '../patients/entities/patient.entity';
import { FamilyGroup } from './entities/family-group.entity';
import { FamilyMember } from './entities/family-member.entity';
import { InviteDto } from './dto/invite.dto';
import { NotificationsService } from '../notifications/notifications.service';

/** Cupo unificado del titular (#21): 1 titular + miembros + menores. */
export interface FamilyQuota {
  group: FamilyGroup; // grupo (creado perezosamente si no existía)
  max_members: number; // tope (5 por defecto)
  members: number; // FamilyMember pending/accepted (ocupan cupo)
  minors: number; // Patient is_minor con owner_id = titular
  occupied: number; // 1 (titular) + members + minors
  available: number; // max_members - occupied
}

@Injectable()
export class FamilyService {
  private readonly logger = new Logger(FamilyService.name);

  constructor(
    @InjectRepository(FamilyGroup)
    private readonly groupRepo: Repository<FamilyGroup>,
    @InjectRepository(FamilyMember)
    private readonly memberRepo: Repository<FamilyMember>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  // ── URL pública base para enlaces de cara al usuario (#24) ──────────────────
  /**
   * Resuelve la URL pública base (sin barra final) para construir enlaces de
   * cara al usuario (p. ej. el acceptUrl de invitación). Prioridad:
   *   1. APP_URL (variable dedicada opcional), normalizada con trim.
   *   2. Primer origen de CORS_ORIGIN (CSV), normalizado con trim.
   *   3. Fallback local 'http://localhost:5173'.
   * No exige ninguna variable nueva: con solo CORS_ORIGIN funciona.
   */
  private resolvePublicBaseUrl(): string {
    const stripTrailingSlash = (value: string): string =>
      value.replace(/\/+$/, '');

    // 1. APP_URL (override opcional). (R6)
    const appUrl = this.config.get<string>('APP_URL')?.trim();
    if (appUrl) {
      return stripTrailingSlash(appUrl);
    }

    // 2. Primer origen de CORS_ORIGIN (CSV), con trim. (R1, R2, R3)
    const corsOrigin = this.config.get<string>('CORS_ORIGIN');
    if (corsOrigin) {
      const firstOrigin = corsOrigin.split(',')[0].trim();
      if (firstOrigin) {
        return stripTrailingSlash(firstOrigin);
      }
    }

    // 3. Fallback local. (R4)
    return 'http://localhost:5173';
  }

  // ── Cupo unificado (R3, R10) ────────────────────────────────────────────────
  /**
   * Cupo unificado del titular. Crea el grupo de forma perezosa si no existe
   * (misma mecánica que invite()), sin exigir plan family (decisión A de #21).
   */
  async getQuota(ownerId: string): Promise<FamilyQuota> {
    let group = await this.groupRepo.findOne({ where: { owner_id: ownerId } });
    if (!group) {
      // Usa el DEFAULT de la columna (5); no se hardcodea el tope aquí.
      group = await this.groupRepo.save(
        this.groupRepo.create({ owner_id: ownerId }),
      );
    }

    const members = await this.memberRepo.count({
      where: {
        family_group_id: group.id,
        status: In(['pending', 'accepted']),
      },
    });
    const minors = await this.patientRepo.count({
      where: { owner_id: ownerId, is_minor: true },
    });

    const occupied = 1 + members + minors;
    return {
      group,
      max_members: group.max_members,
      members,
      minors,
      occupied,
      available: group.max_members - occupied,
    };
  }

  // ── Downgrade helper reutilizable (#27, R6, R7) ─────────────────────────────
  /**
   * Consulta si el usuario ya tiene un FamilyGroup propio, SIN crearlo (a
   * diferencia de getQuota(), que crea el grupo de forma perezosa). Se usa
   * para decidir si procede loguear una advertencia de downgrade cuando el
   * gate de plan de otro flujo (p. ej. MinorsService.create()) rechaza la
   * petición.
   */
  async hasExistingGroup(ownerId: string): Promise<boolean> {
    const group = await this.groupRepo.findOne({ where: { owner_id: ownerId } });
    return !!group;
  }

  // ── POST /family/invite (R9–R16, R35) ──────────────────────────────────────
  async invite(user: User, dto: InviteDto): Promise<FamilyMember> {
    // R10/R35: solo el owner con plan family invita.
    if (user.plan !== 'family') {
      // R36: downgrade — si ya tenía grupo pero perdió el plan, solo advertencia
      // (sin lógica de resolución de miembros), además del 403.
      const existingGroup = await this.groupRepo.findOne({
        where: { owner_id: user.id },
      });
      if (existingGroup) {
        this.logger.warn(
          `El titular ${user.id} tiene un grupo familiar pero ya no tiene plan 'family' (downgrade)`,
        );
      }
      throw new ForbiddenException(
        'Solo un titular con plan familiar puede invitar miembros',
      );
    }

    // R3/R4: cupo unificado (crea el grupo perezosamente si no existe). Cuenta
    // titular + miembros(pending/accepted) + menores contra max_members.
    const quota = await this.getQuota(user.id);
    const group = quota.group;
    if (quota.available < 1) {
      throw new BadRequestException(
        'El grupo familiar ya alcanzó su cupo máximo (miembros y menores).',
      );
    }

    // R9: normalizar email y resolver cuenta existente.
    const email = dto.email.trim().toLowerCase();
    const existing = await this.userRepo.findOne({ where: { email } });

    const member = await this.memberRepo.save(
      this.memberRepo.create({
        family_group_id: group.id,
        user_id: existing?.id ?? null,
        email,
        relationship: dto.relationship,
        invited_by: user.id,
        status: 'pending',
      }),
    );

    // R14/R16: email-sin-cuenta → email de invitación en try/catch que no rompe.
    if (!existing) {
      try {
        const base = this.resolvePublicBaseUrl();
        const acceptUrl = `${base}/family/accept/${member.id}`;
        await this.notifications.sendFamilyInvitation({
          email,
          inviterName: user.nombre,
          acceptUrl,
        });
      } catch (err) {
        this.logger.error(
          `Error enviando invitación familiar a ${email}: ${(err as Error).message}`,
          (err as Error).stack,
        );
      }
    }
    // R15: si existe cuenta, la invitación se descubre vía GET /family/invitations.

    return member;
  }

  // ── GET /family/members (R17, R18) ─────────────────────────────────────────
  async listMembers(user: User) {
    const groupId = await this.resolveGroupId(user);
    if (!groupId) return [];

    const members = await this.memberRepo.find({
      where: { family_group_id: groupId },
      relations: { user: true },
      order: { invited_at: 'ASC' },
    });

    return members.map((m) => ({
      id: m.id,
      nombre: m.user?.nombre ?? m.email,
      relationship: m.relationship,
      status: m.status,
      accepted_at: m.accepted_at,
    }));
  }

  // ── GET /family/invitations (R19) ──────────────────────────────────────────
  listInvitations(user: User) {
    return this.memberRepo.find({
      where: { user_id: user.id, status: 'pending' },
      order: { invited_at: 'DESC' },
    });
  }

  // ── POST /family/accept/:invitationId (R20–R22) ────────────────────────────
  async accept(user: User, invitationId: string): Promise<FamilyMember> {
    const member = await this.loadInvitationForRecipient(user, invitationId);
    member.status = 'accepted';
    member.accepted_at = new Date();
    if (!member.user_id) member.user_id = user.id;
    await this.memberRepo.save(member);

    await this.userRepo.update(user.id, {
      family_group_id: member.family_group_id,
    });

    return member;
  }

  // ── POST /family/reject/:invitationId (R23) ────────────────────────────────
  async reject(user: User, invitationId: string): Promise<FamilyMember> {
    const member = await this.loadInvitationForRecipient(user, invitationId);
    member.status = 'rejected';
    // No se toca user.family_group_id.
    return this.memberRepo.save(member);
  }

  // ── DELETE /family/members/:memberId (R24–R26) ─────────────────────────────
  async removeMember(user: User, memberId: string) {
    // Solo el owner del grupo puede remover.
    const group = await this.groupRepo.findOne({
      where: { owner_id: user.id },
    });
    if (!group) throw new ForbiddenException();

    const member = await this.memberRepo.findOne({
      where: { id: memberId, family_group_id: group.id },
    });
    if (!member) throw new ForbiddenException();

    // R24: desvincular al miembro (libera cupo). R25: NO se toca historial/paciente.
    if (member.user_id) {
      await this.userRepo.update(member.user_id, { family_group_id: null });
    }
    await this.memberRepo.remove(member);

    return { message: 'Miembro removido del grupo familiar' };
  }

  // ── GET /family/group (R27) ────────────────────────────────────────────────
  async getGroup(user: User) {
    const groupId = await this.resolveGroupId(user);
    if (!groupId) throw new NotFoundException('No perteneces a ningún grupo familiar');

    const group = await this.groupRepo.findOne({
      where: { id: groupId },
      relations: { owner: true },
    });
    if (!group) throw new NotFoundException('Grupo familiar no encontrado');

    // R9: desglose del cupo unificado desde el punto de vista del titular del
    // grupo (owner_id), no del solicitante, para que miembros y titular vean lo
    // mismo. getQuota() no crea grupo aquí porque el owner ya lo tiene.
    const quota = await this.getQuota(group.owner_id);

    return {
      id: group.id,
      owner: {
        id: group.owner?.id ?? group.owner_id,
        nombre: group.owner?.nombre ?? null,
      },
      max_members: quota.max_members,
      members: quota.members, // pending + accepted (ocupan cupo)
      minors: quota.minors, // menores dependientes
      occupied: quota.occupied, // 1 + members + minors
      available: quota.available,
    };
  }

  // ── Helpers internos ───────────────────────────────────────────────────────

  /** Grupo del solicitante: como owner (owner_id) o como miembro (family_group_id). */
  private async resolveGroupId(user: User): Promise<string | null> {
    const owned = await this.groupRepo.findOne({
      where: { owner_id: user.id },
    });
    if (owned) return owned.id;
    return user.family_group_id ?? null;
  }

  /** Carga la invitación (404) y verifica que el solicitante es el destinatario (403). */
  private async loadInvitationForRecipient(
    user: User,
    invitationId: string,
  ): Promise<FamilyMember> {
    const member = await this.memberRepo.findOne({
      where: { id: invitationId },
    });
    if (!member) throw new NotFoundException('Invitación no encontrada');

    const email = user.email.trim().toLowerCase();
    const isRecipient =
      member.user_id === user.id || member.email === email;
    if (!isRecipient) throw new ForbiddenException();

    return member;
  }
}
