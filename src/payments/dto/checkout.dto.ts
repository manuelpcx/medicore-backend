import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class CheckoutDto {
  @ApiProperty({ enum: ['pro', 'family'], example: 'pro' })
  @IsIn(['pro', 'family'], { message: 'Plan inválido' })
  plan: 'pro' | 'family';
}
