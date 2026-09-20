import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller.js';
import { AdminDashboardService } from './admin-dashboard.service.js';
import { AdminUsersService } from './admin-users.service.js';
import { AdminProducersService } from './admin-producers.service.js';
import { AdminLaboratoriesService } from './admin-laboratories.service.js';
import { AdminAuditService } from './admin-audit.service.js';
import { AdminScanAnalyticsService } from './admin-scan-analytics.service.js';
import { AdminAlertsService } from './admin-alerts.service.js';
import { AdminBusinessAnalyticsService } from './admin-business-analytics.service.js';
import { AdminSearchService } from './admin-search.service.js';

@Module({
  controllers: [AdminController],
  providers: [
    AdminDashboardService,
    AdminUsersService,
    AdminProducersService,
    AdminLaboratoriesService,
    AdminAuditService,
    AdminScanAnalyticsService,
    AdminAlertsService,
    AdminBusinessAnalyticsService,
    AdminSearchService,
  ],
})
export class AdminModule {}
