import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { ProductVariantStatus } from '@prisma/client';

/** Déclinaison (SKU) à créer : un format de pot avec son prix et son stock. */
export class ProductVariantInputDto {
  @ApiProperty({ example: '500 g' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  packageSize!: string;

  @ApiProperty({ example: 35 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;
}

export class UpdateProductVariantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ enum: ProductVariantStatus })
  @IsOptional()
  @IsEnum(ProductVariantStatus)
  status?: ProductVariantStatus;
}
