import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdatePlanDto {
  @ApiProperty({ enum: ['free', 'pro', 'family'] })
  @IsIn(['free', 'pro', 'family'], { message: 'Plan inválido' })
  plan: 'free' | 'pro' | 'family';
}
