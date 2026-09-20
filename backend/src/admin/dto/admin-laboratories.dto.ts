import { ApiProperty, PartialType } from '@nestjs/swagger';
import { LaboratoryStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PageQueryDto } from '../admin-common.js';

export class ListLaboratoriesQueryDto extends PageQueryDto {
  @ApiProperty({ required: false, enum: LaboratoryStatus })
  @IsOptional()
  @IsEnum(LaboratoryStatus)
  status?: LaboratoryStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  accreditation?: string;
}

export class LaboratoryDetailQueryDto {
  @ApiProperty({ required: false, description: 'Fenêtre des statistiques en mois (0 = depuis toujours)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  months?: number;
}

export class CreateLaboratoryAdminDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  country!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl({ require_protocol: false })
  website?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  tagline?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  contactName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  accreditationNo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;

  @ApiProperty({ required: false, enum: [LaboratoryStatus.PENDING, LaboratoryStatus.ACTIVE] })
  @IsOptional()
  @IsIn([LaboratoryStatus.PENDING, LaboratoryStatus.ACTIVE])
  status?: 'PENDING' | 'ACTIVE';
}

export class UpdateLaboratoryAdminDto extends PartialType(CreateLaboratoryAdminDto) {}

export class SetLaboratoryStatusDto {
  @ApiProperty({ enum: LaboratoryStatus })
  @IsEnum(LaboratoryStatus)
  status!: LaboratoryStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class CreateAccreditationDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  issuingBody?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  certificateNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  validUntil?: string;
}
