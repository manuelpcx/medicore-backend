import { Controller, Post, Delete, Body, HttpCode, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AccessCodesService } from './access-codes.service';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { PatientScopeGuard } from '../common/guards/patient-scope.guard';
import { ScopedPatientId } from '../common/decorators/scoped-patient-id.decorator';

@ApiTags('Access Codes')
@Controller('access-codes')
export class AccessCodesController {
  constructor(private readonly service: AccessCodesService) {}

  @Post('generate')
  @ApiBearerAuth()
  @ApiQuery({ name: 'patientId', required: false, description: 'Operar sobre un menor propio' })
  @UseGuards(PatientScopeGuard)
  @ApiOperation({ summary: 'Generar código QR temporal (10 min)' })
  generate(@CurrentUser('id') userId: string, @ScopedPatientId() patientId: string | null) {
    return this.service.generate(userId, patientId);
  }

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verificar código y obtener snapshot del paciente (médico)' })
  verify(@Body() dto: VerifyCodeDto) {
    return this.service.verify(dto.code);
  }

  @Delete('revoke')
  @ApiBearerAuth()
  @ApiQuery({ name: 'patientId', required: false, description: 'Operar sobre un menor propio' })
  @UseGuards(PatientScopeGuard)
  @HttpCode(200)
  @ApiOperation({ summary: 'Revocar acceso manualmente' })
  revoke(@CurrentUser('id') userId: string, @ScopedPatientId() patientId: string | null) {
    return this.service.revoke(userId, patientId);
  }
}
