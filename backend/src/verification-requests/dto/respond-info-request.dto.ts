import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Réponse du producteur à une demande d'informations complémentaires (VR-06).
 *
 * Seuls des champs appartenant au producteur peuvent être complétés. Le type
 * de miel — identité même de la demande — et tout ce qui relève de Kounouz
 * (statut, méthode de collecte retenue, notes internes) restent hors d'atteinte.
 */
export class RespondInfoRequestDto {
  @ApiProperty({ description: 'Réponse à la question posée par Kounouz.' })
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  message!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Quantité en kg' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  harvestStartDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  harvestEndDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  floralOrigin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  productionSeason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  hivesCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  beekeepingMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  hiveType?: string;

  @ApiPropertyOptional({ description: 'Rucher d\'origine (doit appartenir au producteur).' })
  @IsOptional()
  @IsUUID()
  farmId?: string;

  @ApiPropertyOptional({ type: [String], description: 'Photos complémentaires déjà téléversées.' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  photos?: string[];
}
