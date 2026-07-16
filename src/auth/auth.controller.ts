import { Controller, Post, Patch, Delete, Body, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('register')
  @ApiOperation({ summary: 'Registrar nuevo paciente' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Iniciar sesión' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Renovar access token' })
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refresh_token);
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cerrar sesión' })
  logout(@CurrentUser('id') userId: string, @Body() dto?: LogoutDto) {
    return this.authService.logout(userId, dto?.refresh_token);
  }

  @Patch('plan')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Elegir o cambiar el plan de la cuenta (free/pro/family)' })
  updatePlan(@CurrentUser('id') userId: string, @Body() dto: UpdatePlanDto) {
    return this.authService.updatePlan(userId, dto.plan);
  }

  @Delete('account')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Eliminar cuenta permanentemente (derecho de supresión)',
    description:
      'Elimina la cuenta del usuario, todos sus datos médicos y archivos adjuntos de forma irreversible. ' +
      'Cumple con el derecho de supresión de la Ley 19.628 / Ley 21.719 (Chile).',
  })
  deleteAccount(@CurrentUser('id') userId: string) {
    return this.authService.deleteAccount(userId);
  }
}
