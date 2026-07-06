import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsDateString, IsOptional } from 'class-validator';

export class CreateVaccineDto {
  @ApiProperty({ example: 'COVID-19 Pfizer' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: '2024-03-15' })
  @IsDateString()
  fecha: string;

  @ApiPropertyOptional({ example: 'AB1234' })
  @IsOptional()
  @IsString()
  lote?: string;

  @ApiPropertyOptional({ example: 'IMSS' })
  @IsOptional()
  @IsString()
  institucion?: string;

  @ApiPropertyOptional({ example: '2025-03-15' })
  @IsOptional()
  @IsDateString()
  proxima_dosis?: string;
}
