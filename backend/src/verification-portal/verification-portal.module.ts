import { Module } from '@nestjs/common';
import { VerificationPortalController } from './verification-portal.controller.js';
import { PortalDashboardService } from './portal-dashboard.service.js';
import { PortalRequestsService } from './portal-requests.service.js';
import { PortalSamplesService } from './portal-samples.service.js';
import { PortalLaboratoryService } from './portal-laboratory.service.js';
import { PortalDecisionsService } from './portal-decisions.service.js';
import { ReferenceHoneysService } from './reference-honeys.service.js';
import { SampleEventsService } from './sample-events.service.js';
import { PortalBatchesService } from './portal-batches.service.js';
import { PortalPackagingService } from './portal-packaging.service.js';
import { PortalProductsService } from './portal-products.service.js';
import { PortalQrService } from './portal-qr.service.js';

// Moteur de confiance Kounouz : revue des demandes, chaîne de possession,
// laboratoire, étalons et décision de vérification. Les modules historiques
// (samples, laboratory, verifications) restent en place pour les autres
// portails ; celui-ci sert l'équipe de vérification.
@Module({
  controllers: [VerificationPortalController],
  providers: [
    PortalDashboardService,
    PortalRequestsService,
    PortalSamplesService,
    PortalLaboratoryService,
    PortalDecisionsService,
    ReferenceHoneysService,
    SampleEventsService,
    PortalBatchesService,
    PortalPackagingService,
    PortalProductsService,
    PortalQrService,
  ],
  exports: [SampleEventsService],
})
export class VerificationPortalModule {}
