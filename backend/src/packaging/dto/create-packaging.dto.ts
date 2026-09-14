import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreatePackagingDto {
  @ApiProperty()
  @IsString()
  batchId!: string;

  @ApiProperty({ example: 'Pot en verre' })
  @IsString()
  packageType!: string;

  @ApiProperty({ example: '500g' })
  @IsString()
  size!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  labelDesign?: string;

  @ApiProperty()
  @IsDateString()
  productionDate!: string;
}
