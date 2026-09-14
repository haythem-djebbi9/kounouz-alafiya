import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateLaboratoryDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  accreditationNo!: string;

  @ApiProperty()
  @IsString()
  country!: string;

  @ApiProperty()
  @IsString()
  contactInfo!: string;
}
