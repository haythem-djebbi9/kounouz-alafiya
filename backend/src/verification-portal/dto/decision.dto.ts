import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export enum DecisionOutcome {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  REQUEST_ADDITIONAL_ANALYSIS = 'REQUEST_ADDITIONAL_ANALYSIS',
}

export enum EvaluationVerdict {
  VALID = 'VALID',
  COMPLIANT = 'COMPLIANT',
  CONFIRMED = 'CONFIRMED',
  APPROVED = 'APPROVED',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
}

/** Grille d'évaluation qualité reprise dans le rapport de vérification. */
export class EvaluationDto {
  @ApiPropertyOptional({ enum: EvaluationVerdict, description: 'Authenticité / profil variétal.' })
  @IsOptional()
  @IsEnum(EvaluationVerdict)
  authenticity?: EvaluationVerdict;

  @ApiPropertyOptional({ enum: EvaluationVerdict, description: 'Paramètres physico-chimiques.' })
  @IsOptional()
  @IsEnum(EvaluationVerdict)
  physicochemical?: EvaluationVerdict;

  @ApiPropertyOptional({ enum: EvaluationVerdict, description: 'Analyse pollinique.' })
  @IsOptional()
  @IsEnum(EvaluationVerdict)
  pollen?: EvaluationVerdict;

  @ApiPropertyOptional({ enum: EvaluationVerdict, description: "Résidus d'antibiotiques." })
  @IsOptional()
  @IsEnum(EvaluationVerdict)
  antibiotics?: EvaluationVerdict;

  @ApiPropertyOptional({ enum: EvaluationVerdict, description: 'Appréciation globale.' })
  @IsOptional()
  @IsEnum(EvaluationVerdict)
  overall?: EvaluationVerdict;
}

export class DecisionDto {
  @ApiPropertyOptional({
    enum: DecisionOutcome,
    description: 'Obligatoire à la confirmation ; facultatif pour un brouillon.',
  })
  @IsOptional()
  @IsEnum(DecisionOutcome)
  outcome?: DecisionOutcome;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comments?: string;

  @ApiPropertyOptional({ type: EvaluationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => EvaluationDto)
  evaluation?: EvaluationDto;
}
