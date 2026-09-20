import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class LabResultEntryDto {
  @ApiProperty({ description: 'Clé du référentiel (moisture, hmf, ph...).' })
  @IsString()
  parameterKey!: string;

  @ApiPropertyOptional({ description: 'Valeur mesurée. Vide = paramètre non renseigné.' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  value?: string;

  @ApiPropertyOptional({
    description: 'Détail des paramètres qualitatifs (profil des sucres, comptage pollinique).',
  })
  @IsOptional()
  @IsObject()
  details?: Record<string, unknown>;
}

export class SaveAnalysisResultsDto {
  @ApiProperty({ type: [LabResultEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LabResultEntryDto)
  results!: LabResultEntryDto[];

  @ApiPropertyOptional({ description: "Date d'analyse (ISO 8601)." })
  @IsOptional()
  @IsISO8601()
  analysisDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  conclusion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  internalNotes?: string;
}
