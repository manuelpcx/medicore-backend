import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsDateString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { TipoConsulta } from '../entities/medical-history.entity';

export class CreateHistoryDto {
  @ApiProperty({ example: '2026-05-20' })
  @IsDateString()
  fecha: string;

  @ApiProperty({ example: 'Cardiología' })
  @IsString()
  especialidad: string;

  @ApiProperty({ example: 'Dr. García' })
  @IsString()
  doctor: string;

  @ApiPropertyOptional({ example: 'Hospital General' })
  @IsOptional()
  @IsString()
  institucion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  diagnostico?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiPropertyOptional({ enum: TipoConsulta, default: TipoConsulta.CONTROL })
  @IsOptional()
  @IsEnum(TipoConsulta)
  tipo?: TipoConsulta;

  @ApiPropertyOptional({
    example: '2026-07-15',
    description: 'Fecha del próximo control/turno derivado de esta consulta.',
  })
  @IsOptional()
  @IsDateString()
  proxima_cita?: string | null;

  @ApiPropertyOptional({
    example: 'especialidad',
    description: '"control" | "especialidad" | "examen"',
  })
  @IsOptional()
  @IsString()
  tipo_proxima_cita?: string | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  recordatorio_activo?: boolean;
}
