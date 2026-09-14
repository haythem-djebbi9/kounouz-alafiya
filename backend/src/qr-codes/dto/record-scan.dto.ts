import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

// Renseigné par le frontend (ex: géolocalisation navigateur) — jamais requis,
// un scan doit toujours réussir même sans ces informations.
export class RecordScanDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  country?: string;
}
