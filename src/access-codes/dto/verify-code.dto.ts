import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class VerifyCodeDto {
  @ApiProperty({ example: 'A1B2C3D4', description: 'Código de 8 caracteres' })
  @IsString()
  @Length(8, 8)
  code: string;
}
