import { Module } from '@nestjs/common';
import { VerificationPortalModule } from '../verification-portal/verification-portal.module.js';
import { CollectionAssignmentsController, FieldAgentController } from './field-agent.controller.js';
import { FieldAgentService } from './field-agent.service.js';

@Module({
  imports: [VerificationPortalModule],
  controllers: [FieldAgentController, CollectionAssignmentsController],
  providers: [FieldAgentService],
})
export class FieldAgentModule {}
