import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ProductVariantInputDto } from '../../products/dto/product-variant.dto.js';
import {
  ArrayMaxSize,
  IsArray,
  ValidateNested,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateBatchProductDto {
  @ApiProperty({ description: 'Lot emballé dont découle le produit.' })
  @IsUUID()
  batchId!: string;

  @ApiProperty()
  @IsUUID()
  categorieId!: string;

  @ApiProperty({ example: 'Kounouz Miel de Thym' })
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  nom!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiProperty({ description: 'Prix de vente public.' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  prix!: number;

  @ApiPropertyOptional({ description: 'Stock initial.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ description: "Poids net en grammes, tel qu'imprimé sur l'étiquette." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  netWeightG?: number;

  @ApiPropertyOptional({ example: '100 % miel pur' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  ingredients?: string;

  @ApiPropertyOptional({ example: 'À conserver au frais et au sec' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  storageInstructions?: string;

  @ApiPropertyOptional({ example: '2 ans' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  shelfLife?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({
    type: [ProductVariantInputDto],
    description:
      "Formats vendus (SKU). Par défaut : un SKU par format réellement emballé, au prix de vente indiqué.",
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => ProductVariantInputDto)
  variants?: ProductVariantInputDto[];

  @ApiPropertyOptional({ description: 'Gamme commerciale.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  gamme?: string;
}
