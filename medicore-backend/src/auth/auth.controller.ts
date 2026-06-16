import { Controller, Post, Delete, Body, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Registrar nuevo paciente' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Iniciar sesión' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Renovar access token' })
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refresh_token);
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cerrar sesión' })
  logout(@CurrentUser('id') userId: string) {
    return this.authService.logout(userId);
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
