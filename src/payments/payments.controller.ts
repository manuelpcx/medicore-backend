import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CheckoutDto } from './dto/checkout.dto';
import { FlowWebhookDto } from './dto/flow-webhook.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Post('checkout')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear/reutilizar la suscripción de pago y devolver la URL de checkout de Flow' })
  checkout(@CurrentUser() user: User, @Body() dto: CheckoutDto) {
    return this.service.checkout(user, dto.plan); // R8–R12 (JwtAuthGuard global ya exige sesión; sin @Public())
  }

  @Public()
  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Notificación asíncrona de Flow (urlConfirmation). Público: Flow lo invoca sin sesión.' })
  webhook(@Body() dto: FlowWebhookDto) {
    return this.service.handleWebhook(dto.token); // R13, R18 (@Public + DTO valida token requerido)
  }

  @Get('subscription')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Estado de la suscripción de pago del usuario autenticado' })
  getSubscription(@CurrentUser() user: User) {
    return this.service.getSubscription(user); // R19–R21
  }

  @Post('subscription/cancel')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Programar la cancelación al fin del periodo pagado (no baja el plan de inmediato)' })
  cancel(@CurrentUser() user: User) {
    return this.service.cancel(user); // R22–R26
  }
}
