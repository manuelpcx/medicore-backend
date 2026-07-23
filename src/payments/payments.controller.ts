import { Body, Controller, Get, Headers, HttpCode, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CheckoutDto } from './dto/checkout.dto';
import { MercadoPagoWebhookDto } from './dto/mercadopago-webhook.dto';
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
  @ApiOperation({ summary: 'Crear la suscripción de pago y devolver la URL de checkout (init_point) de MercadoPago' })
  checkout(@CurrentUser() user: User, @Body() dto: CheckoutDto) {
    return this.service.checkout(user, dto.plan); // JwtAuthGuard global ya exige sesión (sin @Public())
  }

  @Public()
  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Notificación asíncrona de MercadoPago (subscription_preapproval). Público: MercadoPago lo invoca sin sesión.',
  })
  webhook(
    @Body() dto: MercadoPagoWebhookDto,
    @Headers('x-signature') xSignatureHeader: string | undefined,
    @Headers('x-request-id') xRequestIdHeader: string | undefined,
    @Query('data.id') dataIdQueryParam: string | undefined,
  ) {
    return this.service.handleWebhook({ dto, xSignatureHeader, xRequestIdHeader, dataIdQueryParam });
  }

  @Get('subscription')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Estado de la suscripción de pago del usuario autenticado' })
  getSubscription(@CurrentUser() user: User) {
    return this.service.getSubscription(user);
  }

  @Post('subscription/cancel')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Programar la cancelación al fin del periodo pagado (no baja el plan de inmediato)' })
  cancel(@CurrentUser() user: User) {
    return this.service.cancel(user);
  }
}
