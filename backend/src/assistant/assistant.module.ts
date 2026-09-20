import { Module } from '@nestjs/common';
import { OperationsModule } from '../operations/operations.module.js';
import { AssistantController } from './assistant.controller.js';
import { AssistantService } from './assistant.service.js';

@Module({
  imports: [OperationsModule],
  controllers: [AssistantController],
  providers: [AssistantService],
})
export class AssistantModule {}
