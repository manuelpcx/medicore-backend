import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class FlowWebhookDto {
  @ApiProperty({ example: 'abc123token' })
  @IsString()
  @IsNotEmpty({ message: 'token requerido' })
  token: string;
}
