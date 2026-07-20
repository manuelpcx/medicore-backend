import { Controller, Get, Post, Patch, Delete, Body, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MedicationsService } from './medications.service';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PatientScopeGuard } from '../common/guards/patient-scope.guard';
import { ScopedPatientId } from '../common/decorators/scoped-patient-id.decorator';

@ApiTags('Medications')
@ApiBearerAuth()
@ApiQuery({ name: 'patientId', required: false, description: 'Operar sobre un menor propio' })
@UseGuards(PatientScopeGuard)
@Controller('medications')
export class MedicationsController {
  constructor(private readonly service: MedicationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar medicamentos' })
  findAll(@CurrentUser('id') userId: string, @ScopedPatientId() patientId: string | null) {
    return this.service.findAll(userId, patientId);
  }

  @Post()
  @ApiOperation({ summary: 'Agregar medicamento' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateMedicationDto,
    @ScopedPatientId() patientId: string | null,
  ) {
    return this.service.create(userId, dto, patientId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener medicamento' })
  findOne(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedPatientId() patientId: string | null,
  ) {
    return this.service.findOne(userId, id, patientId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar medicamento' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMedicationDto,
    @ScopedPatientId() patientId: string | null,
  ) {
    return this.service.update(userId, id, dto, patientId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar medicamento' })
  remove(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedPatientId() patientId: string | null,
  ) {
    return this.service.remove(userId, id, patientId);
  }
}
