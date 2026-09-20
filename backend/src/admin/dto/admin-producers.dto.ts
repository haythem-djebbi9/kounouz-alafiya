import { ApiProperty } from '@nestjs/swagger';
import { ProducerStatus } from '@prisma/client';
import { IsEmail, IsEnum, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PageQueryDto } from '../admin-common.js';

export class ListProducersQueryDto extends PageQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  region?: string;

  @ApiProperty({ required: false, enum: ProducerStatus })
  @IsOptional()
  @IsEnum(ProducerStatus)
  status?: ProducerStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  honeyType?: string;

  @ApiProperty({ required: false, enum: ['VERIFIED', 'IN_REVIEW', 'ISSUE', 'NONE'] })
  @IsOptional()
  @IsIn(['VERIFIED', 'IN_REVIEW', 'ISSUE', 'NONE'])
  verification?: 'VERIFIED' | 'IN_REVIEW' | 'ISSUE' | 'NONE';
}

export class CreateProducerDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  farmName!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(60)
  governorate!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiProperty({ required: false, enum: [ProducerStatus.PENDING, ProducerStatus.ACTIVE] })
  @IsOptional()
  @IsIn([ProducerStatus.PENDING, ProducerStatus.ACTIVE])
  status?: 'PENDING' | 'ACTIVE';
}

export class SetProducerStatusDto {
  @ApiProperty({ enum: ProducerStatus })
  @IsEnum(ProducerStatus)
  status!: ProducerStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
