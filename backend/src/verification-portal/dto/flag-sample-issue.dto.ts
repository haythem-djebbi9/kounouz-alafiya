import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class FlagSampleIssueDto {
  @ApiProperty({ description: "Nature de l'anomalie constatée (scellé, volume, transport...)." })
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  reason!: string;
}
