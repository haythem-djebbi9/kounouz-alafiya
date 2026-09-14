import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum RequestStatusTransition {
  IN_REVIEW = 'IN_REVIEW',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export class UpdateRequestStatusDto {
  @ApiProperty({ enum: RequestStatusTransition })
  @IsEnum(RequestStatusTransition)
  status!: RequestStatusTransition;
}
