import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class CheckoutDto {
  @ApiProperty({ enum: ['pro', 'family'], example: 'pro' })
  @IsIn(['pro', 'family'], { message: 'Plan inválido' })
  plan: 'pro' | 'family';

  @ApiProperty({
    description:
      'Token de tarjeta generado del lado del cliente por el Brick CardPayment ' +
      'de @mercadopago/sdk-react. NUNCA es el número de tarjeta/CVV crudo.',
    example: 'ff8080814c11e237014c11e587...',
  })
  @IsString()
  @IsNotEmpty({ message: 'card_token_id requerido' })
  card_token_id: string;
}
