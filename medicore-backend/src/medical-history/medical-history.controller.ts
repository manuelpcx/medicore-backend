import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MedicalHistoryService } from './medical-history.service';
import { CreateHistoryDto } from './dto/create-history.dto';
import { UpdateHistoryDto } from './dto/update-history.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Medical History')
@ApiBearerAuth()
@Controller('history')
export class MedicalHistoryController {
  constructor(private readonly service: MedicalHistoryService) {}

  @Get()
  @ApiOperation({ summary: 'Listar historial clínico' })
  findAll(@CurrentUser('id') userId: string) {
    return this.service.findAll(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear registro de consulta' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateHistoryDto) {
    return this.service.create(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener consulta por ID' })
  findOne(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar consulta' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHistoryDto,
  ) {
    return this.service.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar consulta' })
  remove(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(userId, id);
  }
}
