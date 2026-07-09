import { Controller, Post, Delete, Body, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AccessCodesService } from './access-codes.service';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Access Codes')
@Controller('access-codes')
export class AccessCodesController {
  constructor(private readonly service: AccessCodesService) {}

  @Post('generate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generar código QR temporal (10 min)' })
  generate(@CurrentUser('id') userId: string) {
    return this.service.generate(userId);
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
  @HttpCode(200)
  @ApiOperation({ summary: 'Revocar acceso manualmente' })
  revoke(@CurrentUser('id') userId: string) {
    return this.service.revoke(userId);
  }
}
