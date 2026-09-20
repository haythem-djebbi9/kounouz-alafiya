import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum ReviewDecision {
  /** Prise en charge du dossier : NEW -> IN_REVIEW. */
  START_REVIEW = 'START_REVIEW',
  /** Accepté, la collecte de l'échantillon peut être organisée. */
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  REQUEST_INFO = 'REQUEST_INFO',
}

export class ReviewActionDto {
  @ApiProperty({ enum: ReviewDecision })
  @IsEnum(ReviewDecision)
  decision!: ReviewDecision;

  @ApiPropertyOptional({
    description:
      'Message transmis au producteur. Obligatoire pour REJECT (motif) et REQUEST_INFO (précision attendue).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @ApiPropertyOptional({ description: 'Note interne Kounouz, jamais visible du producteur.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  internalNotes?: string;
}
