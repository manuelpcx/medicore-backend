import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Patients')
@ApiBearerAuth()
@Controller('patients')
export class PatientsController {
  constructor(private readonly service: PatientsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Obtener mi perfil completo' })
  getMe(@CurrentUser('id') userId: string) {
    return this.service.getMe(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Actualizar datos personales y signos vitales' })
  updateMe(@CurrentUser('id') userId: string, @Body() dto: UpdatePatientDto) {
    return this.service.updateMe(userId, dto);
  }
}
