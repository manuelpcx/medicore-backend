import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { FamilyService } from './family.service';
import { FamilyAccessGuard } from './guards/family-access.guard';
import { InviteDto } from './dto/invite.dto';
import { MedicalHistoryService } from '../medical-history/medical-history.service';
import { MedicationsService } from '../medications/medications.service';
import { ExamsService } from '../exams/exams.service';
import { AllergiesService } from '../allergies/allergies.service';
import { VaccinesService } from '../vaccines/vaccines.service';

@ApiTags('Family')
@ApiBearerAuth()
@Controller('family')
export class FamilyController {
  constructor(
    private readonly service: FamilyService,
    private readonly medicalHistory: MedicalHistoryService,
    private readonly medications: MedicationsService,
    private readonly exams: ExamsService,
    private readonly allergies: AllergiesService,
    private readonly vaccines: VaccinesService,
  ) {}

  // ── Gestión del grupo ──────────────────────────────────────────────────────

  @Post('invite')
  @ApiOperation({ summary: 'Invitar a un miembro al grupo familiar' })
  invite(@CurrentUser() user: User, @Body() dto: InviteDto) {
    return this.service.invite(user, dto);
  }

  @Get('members')
  @ApiOperation({ summary: 'Listar los miembros del grupo familiar' })
  listMembers(@CurrentUser() user: User) {
    return this.service.listMembers(user);
  }

  @Get('invitations')
  @ApiOperation({ summary: 'Listar las invitaciones pendientes dirigidas a mí' })
  listInvitations(@CurrentUser() user: User) {
    return this.service.listInvitations(user);
  }

  @Post('accept/:invitationId')
  @ApiOperation({ summary: 'Aceptar una invitación al grupo familiar' })
  accept(
    @CurrentUser() user: User,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
  ) {
    return this.service.accept(user, invitationId);
  }

  @Post('reject/:invitationId')
  @ApiOperation({ summary: 'Rechazar una invitación al grupo familiar' })
  reject(
    @CurrentUser() user: User,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
  ) {
    return this.service.reject(user, invitationId);
  }

  @Delete('members/:memberId')
  @ApiOperation({ summary: 'Remover a un miembro del grupo (solo owner)' })
  removeMember(
    @CurrentUser() user: User,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    return this.service.removeMember(user, memberId);
  }

  @Get('group')
  @ApiOperation({ summary: 'Información del grupo familiar' })
  getGroup(@CurrentUser() user: User) {
    return this.service.getGroup(user);
  }

  // ── Historial de los miembros (solo owner, vía FamilyAccessGuard) ──────────

  @Get('members/:memberId/history')
  @UseGuards(FamilyAccessGuard)
  @ApiOperation({ summary: 'Historial médico de un miembro (owner)' })
  memberHistory(@Req() req: { familyMember: { user_id: string } }) {
    return this.medicalHistory.findAll(req.familyMember.user_id);
  }

  @Get('members/:memberId/medications')
  @UseGuards(FamilyAccessGuard)
  @ApiOperation({ summary: 'Medicamentos de un miembro (owner)' })
  memberMedications(@Req() req: { familyMember: { user_id: string } }) {
    return this.medications.findAll(req.familyMember.user_id);
  }

  @Get('members/:memberId/exams')
  @UseGuards(FamilyAccessGuard)
  @ApiOperation({ summary: 'Exámenes de un miembro (owner)' })
  memberExams(@Req() req: { familyMember: { user_id: string } }) {
    return this.exams.findAll(req.familyMember.user_id);
  }

  @Get('members/:memberId/allergies')
  @UseGuards(FamilyAccessGuard)
  @ApiOperation({ summary: 'Alergias de un miembro (owner)' })
  memberAllergies(@Req() req: { familyMember: { user_id: string } }) {
    return this.allergies.findAll(req.familyMember.user_id);
  }

  @Get('members/:memberId/vaccines')
  @UseGuards(FamilyAccessGuard)
  @ApiOperation({ summary: 'Vacunas de un miembro (owner)' })
  memberVaccines(@Req() req: { familyMember: { user_id: string } }) {
    return this.vaccines.findAll(req.familyMember.user_id);
  }
}
