import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsDateString, IsBoolean, Matches } from 'class-validator';
import { EstadoMedicamento } from '../entities/medication.entity';

export class CreateMedicationDto {
  @ApiProperty({ example: 'Metformina' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: '500mg' })
  @IsString()
  dosis: string;

  @ApiProperty({ example: 'Cada 12 horas' })
  @IsString()
  frecuencia: string;

  @ApiPropertyOptional({ example: '08:00 y 20:00' })
  @IsOptional()
  @IsString()
  horario?: string;

  @ApiPropertyOptional({ enum: EstadoMedicamento })
  @IsOptional()
  @IsEnum(EstadoMedicamento)
  estado?: EstadoMedicamento;

  @ApiPropertyOptional({ example: 'Dr. López' })
  @IsOptional()
  @IsString()
  medico_recetante?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  fecha_inicio?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  fecha_fin?: string;

  @ApiPropertyOptional({
    example: '08:00',
    description: 'Hora de notificación en formato HH:mm (24h). Null desactiva el aviso puntual.',
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'horario_notificacion debe tener formato HH:mm' })
  horario_notificacion?: string | null;

  @ApiPropertyOptional({ example: true, description: 'Activa/desactiva todos los recordatorios de este medicamento.' })
  @IsOptional()
  @IsBoolean()
  notificacion_activa?: boolean;
}
