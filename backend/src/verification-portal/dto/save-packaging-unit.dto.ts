import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PackagingStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsISO8601, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class SavePackagingUnitDto {
  @ApiProperty({ description: "Format de l'unité.", example: '500 g' })
  @IsString()
  @MaxLength(60)
  unitSize!: string;

  @ApiProperty({ description: "Nombre d'exemplaires de ce format." })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ description: 'Date de conditionnement (ISO 8601).' })
  @IsOptional()
  @IsISO8601()
  packagingDate?: string;

  @ApiPropertyOptional({ description: 'Date de péremption (ISO 8601).' })
  @IsOptional()
  @IsISO8601()
  expiryDate?: string;

  @ApiPropertyOptional({ enum: PackagingStatus })
  @IsOptional()
  @IsEnum(PackagingStatus)
  status?: PackagingStatus;
}
