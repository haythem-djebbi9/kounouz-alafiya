import { ApiProperty } from '@nestjs/swagger';
import { CollectionMethod } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

// Même DTO pour un brouillon et une soumission : les champs obligatoires ne
// sont exigés qu'au moment de la soumission (voir VerificationRequestsService).
export class CreateVerificationRequestDto {
  @ApiProperty({ required: false, description: "Rucher d'origine (par défaut : rucher principal)." })
  @IsOptional()
  @IsUUID()
  farmId?: string;

  @ApiProperty({ description: 'Ex: Miel de Jujubier (Sedra)', required: false })
  @IsOptional()
  @IsString()
  honeyType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ required: false, description: 'Déduit du gouvernorat / délégation si absent' })
  @IsOptional()
  @IsString()
  collectionLocation?: string;

  @ApiProperty({ description: 'Quantité en kg', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  farmSize?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  floralOrigin?: string;

  @ApiProperty({ required: false, enum: ['MONOFLORAL', 'MULTIFLORAL'] })
  @IsOptional()
  @IsIn(['MONOFLORAL', 'MULTIFLORAL'])
  floralCategory?: string;

  @ApiProperty({ required: false, example: 'Printemps 2026' })
  @IsOptional()
  @IsString()
  productionSeason?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  harvestStartDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  harvestEndDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  governorate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  delegation?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  hivesCount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  beekeepingMethod?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  hiveType?: string;

  @ApiProperty({ required: false, enum: CollectionMethod })
  @IsOptional()
  @IsEnum(CollectionMethod)
  preferredCollectionMethod?: CollectionMethod;

  @ApiProperty({ required: false, default: true, description: 'false = enregistrer comme brouillon' })
  @IsOptional()
  @IsBoolean()
  submit?: boolean;
}
