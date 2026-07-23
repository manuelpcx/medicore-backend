import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

class MercadoPagoWebhookDataDto {
  @ApiProperty({ example: '123456789' })
  @IsString()
  @IsNotEmpty({ message: 'data.id requerido' })
  id: string;
}

/**
 * Body de `POST /payments/webhook` (schema `WebhookNotification` de
 * MercadoPago: `{id, type, data:{id}, action?, ...}`). Reemplaza
 * `flow-webhook.dto.ts`. Solo `data.id` es estrictamente requerido para
 * procesar la notificación (R13); `type`/`action` son opcionales porque su
 * ausencia también debe manejarse sin error (R12 responde 200 igual si
 * `type` no es `subscription_preapproval`, incluida su ausencia).
 */
export class MercadoPagoWebhookDto {
  @ApiPropertyOptional({ example: 'subscription_preapproval' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: 'subscription.authorized' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiProperty({ type: MercadoPagoWebhookDataDto })
  @ValidateNested()
  @Type(() => MercadoPagoWebhookDataDto)
  data: MercadoPagoWebhookDataDto;
}
