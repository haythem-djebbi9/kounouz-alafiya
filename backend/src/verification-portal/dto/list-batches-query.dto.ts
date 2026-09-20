import { ApiPropertyOptional } from '@nestjs/swagger';
import { BatchStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, Max, Min } from 'class-validator';

export type BatchBucket = 'ALL' | 'READY_FOR_PACKAGING' | 'IN_PACKAGING' | 'CONVERTED' | 'ON_HOLD';

const BUCKETS: BatchBucket[] = ['ALL', 'READY_FOR_PACKAGING', 'IN_PACKAGING', 'CONVERTED', 'ON_HOLD'];

export class ListBatchesQueryDto {
  @ApiPropertyOptional({ enum: BUCKETS })
  @IsOptional()
  @IsEnum(BUCKETS as unknown as object)
  bucket?: BatchBucket;

  @ApiPropertyOptional({ enum: BatchStatus })
  @IsOptional()
  @IsEnum(BatchStatus)
  status?: BatchStatus;

  @ApiPropertyOptional({ description: 'Code lot, type de miel, origine ou producteur.' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  honeyType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  governorate?: string;

  @ApiPropertyOptional({ description: 'Date de production minimale (ISO 8601).' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'Date de production maximale (ISO 8601).' })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ enum: ['NEWEST', 'OLDEST'] })
  @IsOptional()
  @IsEnum(['NEWEST', 'OLDEST'] as unknown as object)
  sort?: 'NEWEST' | 'OLDEST';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 8, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
