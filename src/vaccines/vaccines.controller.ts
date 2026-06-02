import { Controller, Get, Post, Delete, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { VaccinesService } from './vaccines.service';
import { CreateVaccineDto } from './dto/create-vaccine.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Vaccines')
@ApiBearerAuth()
@Controller('vaccines')
export class VaccinesController {
  constructor(private readonly service: VaccinesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar vacunas' })
  findAll(@CurrentUser('id') userId: string) {
    return this.service.findAll(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar vacuna' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateVaccineDto) {
    return this.service.create(userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar vacuna' })
  remove(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(userId, id);
  }
}
