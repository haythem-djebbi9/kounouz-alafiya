import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';

// Renseigné par le frontend — jamais requis, un scan doit toujours réussir
// même sans ces informations. Aucune donnée personnelle : le pays vient du
// fuseau horaire du navigateur, les coordonnées seulement si la géolocalisation
// a déjà été autorisée, et visitorId est un identifiant aléatoire local.
export class RecordScanDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiProperty({ required: false, description: 'Code pays ISO 3166-1 alpha-2' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  countryCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  visitorId?: string;
}

export const REPORT_REASONS = ['DAMAGED_SEAL', 'LABEL_MISMATCH', 'SUSPICIOUS_PRODUCT', 'OTHER'] as const;

export class ReportLabelDto {
  @ApiProperty({ enum: REPORT_REASONS })
  @IsIn(REPORT_REASONS)
  reason!: (typeof REPORT_REASONS)[number];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  visitorId?: string;
}
