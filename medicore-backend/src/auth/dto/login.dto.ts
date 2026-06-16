import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'jesus@ejemplo.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Contraseña123!' })
  @IsString()
  password: string;
}
