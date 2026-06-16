import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsDateString, IsOptional, IsEnum } from 'class-validator';
import { ResultadoBadge } from '../entities/exam.entity';

export class CreateExamDto {
  @ApiProperty({ example: 'Hemograma completo' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: '2026-05-01' })
  @IsDateString()
  fecha: string;

  @ApiPropertyOptional({ example: 'Laboratorio Central' })
  @IsOptional()
  @IsString()
  laboratorio?: string;

  @ApiPropertyOptional({ example: 'Sangre' })
  @IsOptional()
  @IsString()
  tipo?: string;

  @ApiPropertyOptional({ enum: ResultadoBadge })
  @IsOptional()
  @IsEnum(ResultadoBadge)
  resultado_badge?: ResultadoBadge;
}
