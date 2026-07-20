import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { MinorsService } from './minors.service';
import { CreateMinorDto } from './dto/create-minor.dto';

@ApiTags('Family')
@ApiBearerAuth()
@Controller('family/minors')
export class MinorsController {
  constructor(private readonly service: MinorsService) {}

  @Post()
  @ApiOperation({ summary: 'Agregar un menor dependiente (sin cuenta)' })
  create(@CurrentUser() user: User, @Body() dto: CreateMinorDto) {
    return this.service.create(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar los menores del adulto (selector de perfil)' })
  list(@CurrentUser('id') userId: string) {
    return this.service.list(userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un menor propio (libera cupo)' })
  remove(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(userId, id);
  }
}
