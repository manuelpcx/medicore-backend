import { Controller, Get, Post, Delete, Body, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { VaccinesService } from './vaccines.service';
import { CreateVaccineDto } from './dto/create-vaccine.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PatientScopeGuard } from '../common/guards/patient-scope.guard';
import { ScopedPatientId } from '../common/decorators/scoped-patient-id.decorator';

@ApiTags('Vaccines')
@ApiBearerAuth()
@ApiQuery({ name: 'patientId', required: false, description: 'Operar sobre un menor propio' })
@UseGuards(PatientScopeGuard)
@Controller('vaccines')
export class VaccinesController {
  constructor(private readonly service: VaccinesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar vacunas' })
  findAll(@CurrentUser('id') userId: string, @ScopedPatientId() patientId: string | null) {
    return this.service.findAll(userId, patientId);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar vacuna' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateVaccineDto,
    @ScopedPatientId() patientId: string | null,
  ) {
    return this.service.create(userId, dto, patientId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar vacuna' })
  remove(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedPatientId() patientId: string | null,
  ) {
    return this.service.remove(userId, id, patientId);
  }
}
