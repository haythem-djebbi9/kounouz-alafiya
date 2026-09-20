import { ApiPropertyOptional } from '@nestjs/swagger';
import { SampleStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, Max, Min } from 'class-validator';

export type SampleTab = 'ALL' | 'COLLECTED' | 'RECEIVED' | 'IN_LABORATORY' | 'COMPLETED' | 'ISSUES';

const TABS: SampleTab[] = ['ALL', 'COLLECTED', 'RECEIVED', 'IN_LABORATORY', 'COMPLETED', 'ISSUES'];

export class ListSamplesQueryDto {
  @ApiPropertyOptional({ enum: TABS })
  @IsOptional()
  @IsEnum(TABS as unknown as object)
  tab?: SampleTab;

  @ApiPropertyOptional({ enum: SampleStatus })
  @IsOptional()
  @IsEnum(SampleStatus)
  status?: SampleStatus;

  @ApiPropertyOptional({ description: 'Code échantillon, demande, lot ou producteur.' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Date de collecte minimale (ISO 8601).' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'Date de collecte maximale (ISO 8601).' })
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

  @ApiPropertyOptional({ default: 10, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
