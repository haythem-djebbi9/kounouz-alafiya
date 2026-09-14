import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateReferenceSampleDto {
  @ApiProperty()
  @IsString()
  sampleId!: string;

  @ApiProperty()
  @IsString()
  storageLocation!: string;

  @ApiProperty()
  @IsString()
  storageConditions!: string;

  @ApiProperty({ example: '24 mois' })
  @IsString()
  retentionPeriod!: string;
}
