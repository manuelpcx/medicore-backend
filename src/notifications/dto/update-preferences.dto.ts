import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePreferencesDto {
  @ApiPropertyOptional({
    description: 'Activa/desactiva el resumen diario de medicamentos (08:00)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  daily_meds_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Activa/desactiva los avisos puntuales por medicamento',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  single_med_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Activa/desactiva los recordatorios de controles médicos (19:00)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  appointments_enabled?: boolean;
}
