import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ReferenceSampleStatus } from '@prisma/client';

/** Mise en conservation de la portion de référence d'un échantillon contrôlé. */
export class RegisterReferenceSampleDto {
  @ApiProperty({ example: 'Chambre froide B — étagère 3' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  storageLocation!: string;

  @ApiProperty({ example: '4 °C, à l\'abri de la lumière' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  storageConditions!: string;

  @ApiProperty({ example: '24 mois' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  retentionPeriod!: string;

  @ApiPropertyOptional({ example: 'Pot scellé, aucune altération visible' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  condition?: string;
}

/** Changement d'état de la portion conservée (contre-analyse, destruction). */
export class UpdateReferenceSampleStatusDto {
  @ApiProperty({ enum: ReferenceSampleStatus })
  @IsEnum(ReferenceSampleStatus)
  status!: ReferenceSampleStatus;

  @ApiProperty({ example: 'Contre-analyse demandée par la décision VT-2026-012' })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}
