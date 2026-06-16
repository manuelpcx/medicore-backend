import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  @Get('preferences')
  @ApiOperation({ summary: 'Obtener preferencias de notificaciones del usuario autenticado' })
  async getPreferences(@CurrentUser('id') userId: string) {
    const user = await this.userRepo.findOneOrFail({ where: { id: userId } });
    return {
      data: {
        daily_meds_enabled: user.notif_daily_meds,
        single_med_enabled: user.notif_single_med,
        appointments_enabled: user.notif_appointments,
      },
      message: 'Preferencias de notificaciones',
      statusCode: 200,
    };
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Actualizar preferencias de notificaciones' })
  async updatePreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePreferencesDto,
  ) {
    const user = await this.userRepo.findOneOrFail({ where: { id: userId } });

    if (dto.daily_meds_enabled !== undefined) user.notif_daily_meds   = dto.daily_meds_enabled;
    if (dto.single_med_enabled !== undefined) user.notif_single_med   = dto.single_med_enabled;
    if (dto.appointments_enabled !== undefined) user.notif_appointments = dto.appointments_enabled;

    await this.userRepo.save(user);

    return {
      data: {
        daily_meds_enabled: user.notif_daily_meds,
        single_med_enabled: user.notif_single_med,
        appointments_enabled: user.notif_appointments,
      },
      message: 'Preferencias actualizadas',
      statusCode: 200,
    };
  }
}
