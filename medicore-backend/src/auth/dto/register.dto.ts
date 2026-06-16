import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsDateString,
  IsBoolean,
  Equals,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Jesús Méndez' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: 'jesus@ejemplo.com' })
  @IsEmail({}, { message: 'El email no es válido' })
  email: string;

  @ApiProperty({ example: 'Contraseña123!' })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;

  @ApiPropertyOptional({ example: '1990-05-15' })
  @IsOptional()
  @IsDateString()
  fecha_nacimiento?: string;

  @ApiPropertyOptional({ example: 'O+' })
  @IsOptional()
  @IsString()
  tipo_sangre?: string;

  /**
   * Consentimiento explícito — debe ser true.
   * Requerido por Ley 19.628 / Ley 21.719 (Chile) para el tratamiento
   * de datos personales sensibles (datos de salud).
   */
  @ApiProperty({
    example: true,
    description:
      'Debe ser true. El usuario acepta los Términos de Uso y la Política de Privacidad, ' +
      'incluyendo el tratamiento de sus datos personales de salud.',
  })
  @IsBoolean({ message: 'Debes aceptar los términos y la política de privacidad' })
  @Equals(true, {
    message: 'Debes aceptar los términos y la política de privacidad para continuar',
  })
  consent_accepted: boolean;
}
