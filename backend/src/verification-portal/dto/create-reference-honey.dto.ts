import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateReferenceHoneyDto {
  @ApiProperty({ example: 'Miel de thym' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  honeyType!: string;

  @ApiProperty({ example: 'Sfax' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  region!: string;

  @ApiProperty({ example: 'Printemps 2026' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  harvestSeason!: string;

  @ApiPropertyOptional({ description: 'ISO 8601.' })
  @IsOptional()
  @IsISO8601()
  collectionDate?: string;

  @ApiPropertyOptional({ example: 'Ambre doré' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  color?: string;

  @ApiPropertyOptional({ example: 'Fluide' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  texture?: string;

  @ApiPropertyOptional({ example: 'Thymus capitatus' })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  floralSource?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @ApiPropertyOptional({ description: "Résultats d'analyse de l'étalon, base de comparaison." })
  @IsOptional()
  @IsObject()
  analysisResults?: Record<string, unknown>;
}
