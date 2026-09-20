import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';
import { PeriodQueryDto } from './admin-common.js';
import { AdminDashboardService } from './admin-dashboard.service.js';
import type { ScanScope } from './admin-dashboard.service.js';
import { AdminUsersService } from './admin-users.service.js';
import { AdminProducersService } from './admin-producers.service.js';
import { AdminLaboratoriesService } from './admin-laboratories.service.js';
import { AdminAuditService, ListAuditQueryDto } from './admin-audit.service.js';
import { AdminScanAnalyticsService } from './admin-scan-analytics.service.js';
import { AdminAlertsService, ListAlertsQueryDto, UpdateAlertDto } from './admin-alerts.service.js';
import { AdminBusinessAnalyticsService } from './admin-business-analytics.service.js';
import { AdminSearchService } from './admin-search.service.js';
import {
  CreateUserDto,
  ListUsersQueryDto,
  ResetPasswordDto,
  SetUserStatusDto,
  UpdateUserDto,
} from './dto/admin-users.dto.js';
import { CreateProducerDto, ListProducersQueryDto, SetProducerStatusDto } from './dto/admin-producers.dto.js';
import {
  CreateAccreditationDto,
  CreateLaboratoryAdminDto,
  LaboratoryDetailQueryDto,
  ListLaboratoriesQueryDto,
  SetLaboratoryStatusDto,
  UpdateLaboratoryAdminDto,
} from './dto/admin-laboratories.dto.js';

function sendCsv(res: Response, filename: string, csv: string) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  // BOM : Excel ouvre ainsi correctement les accents et l'arabe.
  return res.send(`﻿${csv}`);
}

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

// Console d'administration — réservée à l'ADMIN.
@ApiBearerAuth()
@ApiTags('admin')
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly dashboard: AdminDashboardService,
    private readonly users: AdminUsersService,
    private readonly producers: AdminProducersService,
    private readonly laboratories: AdminLaboratoriesService,
    private readonly auditLogs: AdminAuditService,
    private readonly scanAnalytics: AdminScanAnalyticsService,
    private readonly alerts: AdminAlertsService,
    private readonly business: AdminBusinessAnalyticsService,
    private readonly searchService: AdminSearchService,
  ) {}

  // --- Tableau de bord & recherche ----------------------------------------

  @Get('dashboard')
  getDashboard(@Query('months') months?: string, @Query('scope') scope?: ScanScope) {
    const parsed = Math.min(Math.max(Number(months) || 9, 3), 24);
    const safeScope: ScanScope = scope === 'VALID' || scope === 'SUSPICIOUS' ? scope : 'ALL';
    return this.dashboard.overview(parsed, safeScope);
  }

  @Get('search')
  search(@Query('q') q = '') {
    return this.searchService.search(q.slice(0, 120));
  }

  // --- Utilisateurs & rôles -------------------------------------------------

  @Get('users')
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.users.list(query);
  }

  @Get('users/export')
  async exportUsers(@Query() query: ListUsersQueryDto, @Res() res: Response) {
    return sendCsv(res, `utilisateurs-${stamp()}.csv`, await this.users.exportCsv(query));
  }

  @Get('users/:id')
  getUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.findOne(id);
  }

  @Post('users')
  createUser(@CurrentUser() actor: JwtPayload, @Body() dto: CreateUserDto) {
    return this.users.create(actor.sub, dto);
  }

  @Patch('users/:id')
  updateUser(@CurrentUser() actor: JwtPayload, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(actor.sub, id, dto);
  }

  @Patch('users/:id/status')
  setUserStatus(@CurrentUser() actor: JwtPayload, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SetUserStatusDto) {
    return this.users.setStatus(actor.sub, id, dto.isActive);
  }

  @Post('users/:id/reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    await this.users.resetPassword(actor.sub, id, dto);
  }

  // --- Producteurs -----------------------------------------------------------

  @Get('producers/overview')
  producersOverview() {
    return this.producers.overview();
  }

  @Get('producers')
  listProducers(@Query() query: ListProducersQueryDto) {
    return this.producers.list(query);
  }

  @Get('producers/export')
  async exportProducers(@Query() query: ListProducersQueryDto, @Res() res: Response) {
    return sendCsv(res, `producteurs-${stamp()}.csv`, await this.producers.exportCsv(query));
  }

  @Post('producers')
  createProducer(@CurrentUser() actor: JwtPayload, @Body() dto: CreateProducerDto) {
    return this.producers.create(actor.sub, dto);
  }

  @Patch('producers/:id/status')
  setProducerStatus(
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetProducerStatusDto,
  ) {
    return this.producers.setStatus(actor.sub, id, dto);
  }

  // --- Laboratoires ----------------------------------------------------------

  @Get('laboratories')
  listLaboratories(@Query() query: ListLaboratoriesQueryDto) {
    return this.laboratories.list(query);
  }

  @Get('laboratories/export')
  async exportLaboratories(@Query() query: ListLaboratoriesQueryDto, @Res() res: Response) {
    return sendCsv(res, `laboratoires-${stamp()}.csv`, await this.laboratories.exportCsv(query));
  }

  @Get('laboratories/:id')
  getLaboratory(@Param('id', ParseUUIDPipe) id: string, @Query() query: LaboratoryDetailQueryDto) {
    return this.laboratories.detail(id, query.months ?? 12);
  }

  @Post('laboratories')
  createLaboratory(@CurrentUser() actor: JwtPayload, @Body() dto: CreateLaboratoryAdminDto) {
    return this.laboratories.create(actor.sub, dto);
  }

  @Patch('laboratories/:id')
  updateLaboratory(
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLaboratoryAdminDto,
  ) {
    return this.laboratories.update(actor.sub, id, dto);
  }

  @Patch('laboratories/:id/status')
  setLaboratoryStatus(
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetLaboratoryStatusDto,
  ) {
    return this.laboratories.setStatus(actor.sub, id, dto);
  }

  @Post('laboratories/:id/accreditations')
  addAccreditation(
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAccreditationDto,
  ) {
    return this.laboratories.addAccreditation(actor.sub, id, dto);
  }

  @Delete('laboratories/:id/accreditations/:accreditationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAccreditation(
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('accreditationId', ParseUUIDPipe) accreditationId: string,
  ) {
    await this.laboratories.removeAccreditation(actor.sub, id, accreditationId);
  }

  // --- Journal d'audit -------------------------------------------------------

  @Get('audit-logs')
  listAuditLogs(@Query() query: ListAuditQueryDto) {
    return this.auditLogs.list(query);
  }

  @Get('audit-logs/stats')
  auditStats(@Query() query: PeriodQueryDto) {
    return this.auditLogs.stats(query);
  }

  @Get('audit-logs/export')
  async exportAuditLogs(@Query() query: ListAuditQueryDto, @Res() res: Response) {
    return sendCsv(res, `journal-audit-${stamp()}.csv`, await this.auditLogs.exportCsv(query));
  }

  @Get('audit-logs/:id')
  getAuditLog(@Param('id', ParseUUIDPipe) id: string) {
    return this.auditLogs.findOne(id);
  }

  // --- Analyses ---------------------------------------------------------------

  @Get('analytics/scans')
  scanOverview(@Query() query: PeriodQueryDto) {
    return this.scanAnalytics.overview(query);
  }

  @Get('analytics/scans/export')
  async exportScans(@Query() query: PeriodQueryDto, @Res() res: Response) {
    return sendCsv(res, `scans-qr-${stamp()}.csv`, await this.scanAnalytics.exportCsv(query));
  }

  @Get('analytics/business')
  businessOverview(@Query() query: PeriodQueryDto) {
    return this.business.overview(query);
  }

  @Get('analytics/business/export')
  async exportBusiness(@Query() query: PeriodQueryDto, @Res() res: Response) {
    return sendCsv(res, `verification-ventes-${stamp()}.csv`, await this.business.exportCsv(query));
  }

  // --- Alertes anti-contrefaçon ----------------------------------------------

  @Get('alerts')
  listAlerts(@Query() query: ListAlertsQueryDto) {
    return this.alerts.list(query);
  }

  @Get('alerts/stats')
  alertStats(@Query() query: PeriodQueryDto) {
    return this.alerts.stats(query);
  }

  @Get('alerts/export')
  async exportAlerts(@Query() query: ListAlertsQueryDto, @Res() res: Response) {
    return sendCsv(res, `alertes-contrefacon-${stamp()}.csv`, await this.alerts.exportCsv(query));
  }

  @Get('alerts/:id')
  getAlert(@Param('id', ParseUUIDPipe) id: string) {
    return this.alerts.findOne(id);
  }

  @Patch('alerts/:id')
  updateAlert(@CurrentUser() actor: JwtPayload, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAlertDto) {
    return this.alerts.update(actor.sub, id, dto);
  }
}
