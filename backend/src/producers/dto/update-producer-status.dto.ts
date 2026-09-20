import { ApiProperty } from '@nestjs/swagger';
import { ProducerStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateProducerStatusDto {
  @ApiProperty({ enum: ProducerStatus })
  @IsEnum(ProducerStatus)
  status!: ProducerStatus;
}
