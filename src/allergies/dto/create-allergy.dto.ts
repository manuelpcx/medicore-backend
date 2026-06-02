import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional } from 'class-validator';
import { SeveridadAlergia, TipoAlergia } from '../entities/allergy.entity';

export class CreateAllergyDto {
  @ApiProperty({ example: 'Penicilina' })
  @IsString()
  nombre: string;

  @ApiProperty({ enum: SeveridadAlergia })
  @IsEnum(SeveridadAlergia)
  severidad: SeveridadAlergia;

  @ApiPropertyOptional({ enum: TipoAlergia })
  @IsOptional()
  @IsEnum(TipoAlergia)
  tipo?: TipoAlergia;
}
