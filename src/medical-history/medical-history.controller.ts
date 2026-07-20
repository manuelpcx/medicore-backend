import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, ParseUUIDPipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MedicalHistoryService } from './medical-history.service';
import { CreateHistoryDto } from './dto/create-history.dto';
import { UpdateHistoryDto } from './dto/update-history.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PatientScopeGuard } from '../common/guards/patient-scope.guard';
import { ScopedPatientId } from '../common/decorators/scoped-patient-id.decorator';

@ApiTags('Medical History')
@ApiBearerAuth()
@ApiQuery({ name: 'patientId', required: false, description: 'Operar sobre un menor propio' })
@UseGuards(PatientScopeGuard)
@Controller('history')
export class MedicalHistoryController {
  constructor(private readonly service: MedicalHistoryService) {}

  @Get()
  @ApiOperation({ summary: 'Listar historial clínico' })
  findAll(@CurrentUser('id') userId: string, @ScopedPatientId() patientId: string | null) {
    return this.service.findAll(userId, patientId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear registro de consulta' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateHistoryDto,
    @ScopedPatientId() patientId: string | null,
  ) {
    return this.service.create(userId, dto, patientId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener consulta por ID' })
  findOne(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedPatientId() patientId: string | null,
  ) {
    return this.service.findOne(userId, id, patientId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar consulta' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHistoryDto,
    @ScopedPatientId() patientId: string | null,
  ) {
    return this.service.update(userId, id, dto, patientId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar consulta' })
  remove(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedPatientId() patientId: string | null,
  ) {
    return this.service.remove(userId, id, patientId);
  }
}
