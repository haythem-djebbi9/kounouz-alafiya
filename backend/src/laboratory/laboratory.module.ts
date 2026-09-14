import { Module } from '@nestjs/common';
import { LaboratoriesController } from './laboratories.controller.js';
import { LabAnalysesController } from './lab-analyses.controller.js';
import { ReferenceSamplesController } from './reference-samples.controller.js';
import { LaboratoryService } from './laboratory.service.js';

@Module({
  controllers: [LaboratoriesController, LabAnalysesController, ReferenceSamplesController],
  providers: [LaboratoryService],
  exports: [LaboratoryService],
})
export class LaboratoryModule {}
