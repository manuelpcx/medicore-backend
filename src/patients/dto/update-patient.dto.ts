import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePatientDto {
  @ApiPropertyOptional({ example: 75.5 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  peso?: number;

  @ApiPropertyOptional({ example: 1.75 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  altura?: number;

  @ApiPropertyOptional({ example: '120/80' })
  @IsOptional()
  @IsString()
  presion_arterial?: string;

  @ApiPropertyOptional({ example: 72 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  frecuencia_cardiaca?: number;

  @ApiPropertyOptional({ example: 36.6 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  temperatura?: number;

  @ApiPropertyOptional({ example: '+52 55 1234 5678' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contacto_emergencia?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telefono_emergencia?: string;
}
