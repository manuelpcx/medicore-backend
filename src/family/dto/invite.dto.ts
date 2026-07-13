import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn } from 'class-validator';

const RELATIONSHIPS = ['padre', 'madre', 'hijo/a', 'cónyuge', 'otro'] as const;

export class InviteDto {
  @ApiProperty({ example: 'familiar@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: RELATIONSHIPS, example: 'hijo/a' })
  @IsIn(RELATIONSHIPS as unknown as string[])
  relationship: string;
}
