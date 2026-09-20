import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** Options d'impression cochées à la génération (§17). */
export class QrOptionsDto {
  @ApiPropertyOptional({ description: 'Imprimer le numéro de lot sous le code.' })
  @IsOptional()
  @IsBoolean()
  includeBatchNumber?: boolean;

  @ApiPropertyOptional({ description: 'Ajouter les éléments de sécurité Kounouz.' })
  @IsOptional()
  @IsBoolean()
  includeSecurityFeatures?: boolean;

  @ApiPropertyOptional({ description: 'Imprimer le numéro de série.' })
  @IsOptional()
  @IsBoolean()
  addSerialNumber?: boolean;

  @ApiPropertyOptional({ description: 'Journaliser les scans pour le suivi anti-contrefaçon.' })
  @IsOptional()
  @IsBoolean()
  enableTracking?: boolean;
}

export class GenerateQrCodesDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty({ description: 'Nombre de codes à tirer, borné par les unités conditionnées.' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ example: 'PRODUCT_VERIFICATION' })
  @IsString()
  @MaxLength(60)
  qrType!: string;

  @ApiProperty({ example: 'DYNAMIC' })
  @IsString()
  @MaxLength(60)
  qrFormat!: string;

  @ApiPropertyOptional({ description: 'Par défaut, la page de vérification publique Kounouz.' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  destinationUrl?: string;

  @ApiProperty({ example: 'MULTI' })
  @IsString()
  @MaxLength(20)
  language!: string;

  @ApiProperty({ example: 'KOUNOUZ_STANDARD' })
  @IsString()
  @MaxLength(60)
  template!: string;

  @ApiPropertyOptional({ type: QrOptionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => QrOptionsDto)
  options?: QrOptionsDto;
}
