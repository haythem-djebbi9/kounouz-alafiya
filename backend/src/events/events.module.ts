import { Global, Module } from '@nestjs/common';
import { DomainEventsService } from './domain-events.service.js';
import { EventHandlersRegistry } from './event-handlers.registry.js';
import { EventsWorker } from './events.worker.js';
import { WorkflowAutomationHandlers } from './workflow-automation.handlers.js';

@Global()
@Module({
  providers: [DomainEventsService, EventHandlersRegistry, EventsWorker, WorkflowAutomationHandlers],
  exports: [DomainEventsService, EventHandlersRegistry, EventsWorker],
})
export class EventsModule {}
