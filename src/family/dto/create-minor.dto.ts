import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Alta de un menor dependiente (`POST /family/minors`).
 * `consentimiento` debe llegar y el service exige que sea `true` (R11);
 * `birth_date` valida formato de fecha (R9), la edad < 18 se valida en el
 * service (R8).
 */
export class CreateMinorDto {
  @ApiProperty({ example: 'María Pérez' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre: string;

  @ApiProperty({ example: '2015-06-01', description: 'Fecha de nacimiento (YYYY-MM-DD)' })
  @IsDateString()
  birth_date: string;

  @ApiProperty({ enum: ['masculino', 'femenino', 'otro'] })
  @IsIn(['masculino', 'femenino', 'otro'])
  sexo: string;

  @ApiPropertyOptional({ example: 'hijo' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  relacion?: string;

  @ApiProperty({ example: true, description: 'Consentimiento del adulto (debe ser true)' })
  @IsBoolean()
  consentimiento: boolean;
}
