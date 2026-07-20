import { Controller, Get, Post, Delete, Body, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AllergiesService } from './allergies.service';
import { CreateAllergyDto } from './dto/create-allergy.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PatientScopeGuard } from '../common/guards/patient-scope.guard';
import { ScopedPatientId } from '../common/decorators/scoped-patient-id.decorator';

@ApiTags('Allergies')
@ApiBearerAuth()
@ApiQuery({ name: 'patientId', required: false, description: 'Operar sobre un menor propio' })
@UseGuards(PatientScopeGuard)
@Controller('allergies')
export class AllergiesController {
  constructor(private readonly service: AllergiesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar alergias' })
  findAll(@CurrentUser('id') userId: string, @ScopedPatientId() patientId: string | null) {
    return this.service.findAll(userId, patientId);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar alergia' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAllergyDto,
    @ScopedPatientId() patientId: string | null,
  ) {
    return this.service.create(userId, dto, patientId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar alergia' })
  remove(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedPatientId() patientId: string | null,
  ) {
    return this.service.remove(userId, id, patientId);
  }
}
