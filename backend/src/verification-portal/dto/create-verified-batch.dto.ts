import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsISO8601, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateVerifiedBatchDto {
  @ApiProperty({ description: 'Vérification approuvée dont découle le lot.' })
  @IsUUID()
  verificationId!: string;

  @ApiProperty({ description: 'Quantité commerciale du lot, en kilogrammes.' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  quantityKg!: number;

  @ApiProperty({ description: 'Date de production (ISO 8601).' })
  @IsISO8601()
  productionDate!: string;

  @ApiPropertyOptional({ description: 'Par défaut, le gouvernorat de la demande.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  origin?: string;

  @ApiPropertyOptional({ description: 'Par défaut, la saison de production de la demande.' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  harvestSeason?: string;

  @ApiPropertyOptional({ description: 'Date de péremption (ISO 8601).' })
  @IsOptional()
  @IsISO8601()
  expiryDate?: string;

  @ApiPropertyOptional({ description: 'À consommer de préférence avant (ISO 8601).' })
  @IsOptional()
  @IsISO8601()
  bestBefore?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
