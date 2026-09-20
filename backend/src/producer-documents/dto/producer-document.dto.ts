import { ApiProperty } from '@nestjs/swagger';
import { ProducerDocumentStatus, ProducerDocumentType } from '@prisma/client';
import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadProducerDocumentDto {
  @ApiProperty({ enum: ProducerDocumentType })
  @IsEnum(ProducerDocumentType)
  type!: ProducerDocumentType;
}

export class ReviewProducerDocumentDto {
  @ApiProperty({ enum: [ProducerDocumentStatus.VERIFIED, ProducerDocumentStatus.REJECTED] })
  @IsIn([ProducerDocumentStatus.VERIFIED, ProducerDocumentStatus.REJECTED])
  status!: ProducerDocumentStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
