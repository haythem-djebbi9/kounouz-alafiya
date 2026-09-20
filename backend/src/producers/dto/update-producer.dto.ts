import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

// Profil producteur modifiable par le producteur lui-même. Le statut, le badge
// "vérifié" et la CIN déjà enregistrée restent sous le contrôle de Kounouz.
export class UpdateProducerDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  farmName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  // --- Informations personnelles ---------------------------------------

  @ApiProperty({ required: false, example: '+216 22 123 456' })
  @IsOptional()
  @Matches(/^\+?[0-9\s-]{8,20}$/, { message: 'Numéro de téléphone invalide.' })
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({ required: false, description: 'CIN — acceptée uniquement si aucune CIN n\'est encore enregistrée' })
  @IsOptional()
  @Matches(/^[0-9]{8}$/, { message: 'La CIN doit comporter 8 chiffres.' })
  nationalId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  governorate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Matches(/^[0-9]{4}$/, { message: 'Le code postal doit comporter 4 chiffres.' })
  postalCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  // --- Exploitation ---------------------------------------------------------

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  activityType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  registrationStatus?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  farmGovernorate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  farmDelegation?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  farmAddress?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  farmPhotos?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  hivesCount?: number;

  @ApiProperty({ required: false, minimum: 1, maximum: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  productionStartMonth?: number;

  @ApiProperty({ required: false, minimum: 1, maximum: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  productionEndMonth?: number;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  mainFlora?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  annualProductionKg?: number;

  // --- Règlements -------------------------------------------------------------

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Matches(/^[A-Z]{2}[0-9A-Z\s]{10,32}$/, { message: 'IBAN invalide.' })
  iban?: string;
}
