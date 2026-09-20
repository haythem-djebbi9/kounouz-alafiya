import { ApiPropertyOptional } from '@nestjs/swagger';
import { QrCodeStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class ListQrCodesQueryDto {
  @ApiPropertyOptional({ description: 'Code, numéro de série, produit ou lot.' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  batchId?: string;

  @ApiPropertyOptional({ enum: QrCodeStatus })
  @IsOptional()
  @IsEnum(QrCodeStatus)
  status?: QrCodeStatus;

  @ApiPropertyOptional({ description: 'true = codes déjà scannés, false = jamais scannés.' })
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  scanned?: boolean;

  @ApiPropertyOptional({ description: 'Date de génération minimale (ISO 8601).' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'Date de génération maximale (ISO 8601).' })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 10, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
