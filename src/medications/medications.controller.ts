import { Controller, Get, Post, Patch, Delete, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MedicationsService } from './medications.service';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Medications')
@ApiBearerAuth()
@Controller('medications')
export class MedicationsController {
  constructor(private readonly service: MedicationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar medicamentos' })
  findAll(@CurrentUser('id') userId: string) {
    return this.service.findAll(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Agregar medicamento' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateMedicationDto) {
    return this.service.create(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener medicamento' })
  findOne(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar medicamento' })
  update(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMedicationDto) {
    return this.service.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar medicamento' })
  remove(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(userId, id);
  }
}
