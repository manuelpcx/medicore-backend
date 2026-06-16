import { Controller, Get, Post, Delete, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AllergiesService } from './allergies.service';
import { CreateAllergyDto } from './dto/create-allergy.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Allergies')
@ApiBearerAuth()
@Controller('allergies')
export class AllergiesController {
  constructor(private readonly service: AllergiesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar alergias' })
  findAll(@CurrentUser('id') userId: string) {
    return this.service.findAll(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar alergia' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateAllergyDto) {
    return this.service.create(userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar alergia' })
  remove(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(userId, id);
  }
}
