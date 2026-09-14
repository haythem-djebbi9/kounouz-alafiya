import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { LabAnalysisStatus } from '@prisma/client';

export class CreateLabAnalysisDto {
  @ApiProperty()
  @IsString()
  sampleId!: string;

  @ApiProperty()
  @IsString()
  labId!: string;

  @ApiProperty()
  @IsDateString()
  analysisDate!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reportFileUrl?: string;

  @ApiProperty({
    description: 'Résultats bruts : humidité, pH, HMF, sucres, proline, pollen, pesticides…',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  results!: Record<string, unknown>;

  @ApiProperty({ enum: LabAnalysisStatus })
  @IsEnum(LabAnalysisStatus)
  status!: LabAnalysisStatus;
}
