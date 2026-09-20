import { ApiPropertyOptional } from '@nestjs/swagger';
import { VerificationRequestStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export type RequestTab = 'ALL' | 'UNDER_REVIEW' | 'IN_LABORATORY' | 'VERIFIED' | 'REJECTED';

const TABS: RequestTab[] = ['ALL', 'UNDER_REVIEW', 'IN_LABORATORY', 'VERIFIED', 'REJECTED'];

export class ListRequestsQueryDto {
  @ApiPropertyOptional({ enum: TABS })
  @IsOptional()
  @IsEnum(TABS as unknown as object)
  tab?: RequestTab;

  @ApiPropertyOptional({ enum: VerificationRequestStatus })
  @IsOptional()
  @IsEnum(VerificationRequestStatus)
  status?: VerificationRequestStatus;

  @ApiPropertyOptional({ description: 'Code demande, lot, producteur, type de miel ou lieu.' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  governorate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  honeyType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional({ description: 'Date de soumission minimale (ISO 8601).' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'Date de soumission maximale (ISO 8601).' })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ enum: ['NEWEST', 'OLDEST', 'PRODUCER'] })
  @IsOptional()
  @IsEnum(['NEWEST', 'OLDEST', 'PRODUCER'] as unknown as object)
  sort?: 'NEWEST' | 'OLDEST' | 'PRODUCER';

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
