import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { VerificationStatus } from '@prisma/client';

export class CreateVerificationDto {
  @ApiProperty()
  @IsString()
  requestId!: string;

  @ApiProperty()
  @IsString()
  sampleId!: string;

  @ApiProperty()
  @IsString()
  analysisId!: string;

  @ApiProperty({ enum: VerificationStatus, enumName: 'VerificationDecision' })
  @IsEnum(VerificationStatus)
  status!: VerificationStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
