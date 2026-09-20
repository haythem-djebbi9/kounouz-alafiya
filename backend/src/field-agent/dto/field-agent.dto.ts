import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CollectionPriority } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  Equals,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

// Origines de prélèvement proposées à l'agent (libellés traduits côté client).
export const HARVEST_SOURCES = ['PRODUCTION_HIVES', 'STORAGE', 'EXTRACTION', 'PACKAGED_STOCK'] as const;

// Matériel standard d'une mission de collecte.
export const EQUIPMENT_KEYS = [
  'SAMPLING_KIT',
  'STERILE_CONTAINERS',
  'SECURE_SEALS',
  'LABELS_QR',
  'CAMERA',
  'GPS',
] as const;

// Événements que l'agent peut ajouter lui-même à la chaîne de possession.
// La réception chez Kounouz et au laboratoire appartient à l'équipe de
// vérification.
export const AGENT_EVENT_TYPES = ['RELEASED_FOR_TRANSPORT', 'IN_TRANSIT', 'LOCATION_UPDATE', 'ISSUE'] as const;
export type AgentEventType = (typeof AGENT_EVENT_TYPES)[number];

export class DayRangeQueryDto {
  @ApiPropertyOptional({ description: 'Début de la journée locale (ISO 8601).' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'Fin de la journée locale (ISO 8601).' })
  @IsOptional()
  @IsISO8601()
  to?: string;
}

export const ASSIGNMENT_SCOPES = ['TODAY', 'UPCOMING', 'ACTIVE', 'COMPLETED', 'ALL'] as const;
export type AssignmentScope = (typeof ASSIGNMENT_SCOPES)[number];

export class ListAssignmentsQueryDto extends DayRangeQueryDto {
  @ApiPropertyOptional({ enum: ASSIGNMENT_SCOPES })
  @IsOptional()
  @IsIn(ASSIGNMENT_SCOPES)
  scope?: AssignmentScope;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

class ScheduleFieldsDto {
  @ApiProperty({ description: 'Date de visite (ISO 8601).' })
  @IsISO8601()
  scheduledDate!: string;

  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @Matches(TIME_PATTERN)
  timeWindowStart?: string;

  @ApiPropertyOptional({ example: '12:00' })
  @IsOptional()
  @Matches(TIME_PATTERN)
  timeWindowEnd?: string;
}

export class ClaimAssignmentDto extends ScheduleFieldsDto {
  @ApiProperty()
  @IsUUID()
  requestId!: string;
}

export class CreateAssignmentDto extends ClaimAssignmentDto {
  @ApiProperty()
  @IsUUID()
  agentId!: string;

  @ApiPropertyOptional({ enum: CollectionPriority })
  @IsOptional()
  @IsIn(Object.values(CollectionPriority))
  priority?: CollectionPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(50)
  @Max(10000)
  expectedQuantityGrams?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  numberOfSamples?: number;

  @ApiPropertyOptional({ enum: HARVEST_SOURCES })
  @IsOptional()
  @IsIn(HARVEST_SOURCES)
  harvestSource?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  specialInstructions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class RescheduleAssignmentDto extends ScheduleFieldsDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class UpdateEquipmentDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  checkedEquipment!: string[];
}

export class CollectSampleDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  honeyType!: string;

  @ApiProperty({ description: 'Quantité prélevée, dans l’unité indiquée.' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  quantity!: number;

  @ApiProperty({ enum: ['g', 'kg'] })
  @IsIn(['g', 'kg'])
  unit!: 'g' | 'kg';

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  numberOfSamples!: number;

  @ApiProperty({ enum: HARVEST_SOURCES })
  @IsIn(HARVEST_SOURCES)
  harvestSource!: string;

  @ApiProperty()
  @IsISO8601()
  collectionDate!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsLatitude()
  latitude!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsLongitude()
  longitude!: number;

  @ApiPropertyOptional({ description: 'Précision GPS en mètres.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  gpsAccuracy?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  photos?: string[];

  @ApiPropertyOptional({ description: 'Instantané météo { temperature, humidity, windSpeed, code }.' })
  @IsOptional()
  @IsObject()
  weather?: Record<string, number>;
}

export class RegisterSealDto {
  @ApiPropertyOptional({ description: 'Numéro imprimé sur le scellé ; généré si absent.' })
  @IsOptional()
  @Matches(/^[A-Za-z0-9-]{4,40}$/)
  sealCode?: string;

  @ApiProperty({ description: 'Photo du scellé posé.' })
  @IsString()
  photoUrl!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiProperty({ description: "L'agent atteste l'intégrité du scellé posé." })
  @IsBoolean()
  @Equals(true)
  integrityConfirmed!: boolean;
}

export class CompleteAssignmentDto {
  @ApiProperty({ description: 'Le producteur a confirmé le prélèvement sur place.' })
  @IsBoolean()
  @Equals(true)
  producerConfirmed!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class AddCustodyEventDto {
  @ApiProperty({ enum: AGENT_EVENT_TYPES })
  @IsIn(AGENT_EVENT_TYPES)
  type!: AgentEventType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  occurredAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Détenteur physique (ex: transporteur partenaire).' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  handlerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @ApiPropertyOptional({ description: 'Photo de preuve de remise.' })
  @IsOptional()
  @IsString()
  evidenceUrl?: string;
}

export class ReportsQueryDto {
  @ApiPropertyOptional({ description: 'Nombre de mois couverts (1 à 12).' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  months?: number;
}

export class SearchQueryDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  q!: string;
}
