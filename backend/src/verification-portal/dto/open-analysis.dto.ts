import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class OpenAnalysisDto {
  @ApiProperty()
  @IsUUID()
  sampleId!: string;

  @ApiProperty()
  @IsUUID()
  labId!: string;

  @ApiPropertyOptional({ description: "Analyste Kounouz responsable du bulletin." })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional({ description: 'Échéance prévue (ISO 8601).' })
  @IsOptional()
  @IsISO8601()
  expectedCompletion?: string;
}
