import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';
import { FieldAgentService } from './field-agent.service.js';
import {
  AddCustodyEventDto,
  ClaimAssignmentDto,
  CollectSampleDto,
  CompleteAssignmentDto,
  CreateAssignmentDto,
  DayRangeQueryDto,
  ListAssignmentsQueryDto,
  RegisterSealDto,
  ReportsQueryDto,
  RescheduleAssignmentDto,
  SearchQueryDto,
  UpdateEquipmentDto,
} from './dto/field-agent.dto.js';
import { SensitiveAction } from '../common/admin-override.js';

// Portail Agent Terrain : missions de collecte, prélèvement, scellé et chaîne
// de possession jusqu'à la remise à Kounouz.
@ApiBearerAuth()
@ApiTags('field-agent')
@Roles(Role.FIELD_AGENT)
@Controller('field-agent')
export class FieldAgentController {
  constructor(private readonly service: FieldAgentService) {}

  @Get('dashboard')
  dashboard(@CurrentUser() user: JwtPayload, @Query() query: DayRangeQueryDto) {
    return this.service.dashboard(user.sub, query);
  }

  @Get('search')
  search(@CurrentUser() user: JwtPayload, @Query() query: SearchQueryDto) {
    return this.service.search(user.sub, query.q);
  }

  @Get('reports')
  reports(@CurrentUser() user: JwtPayload, @Query() query: ReportsQueryDto) {
    return this.service.reports(user.sub, query.months);
  }

  @Get('assignments')
  listAssignments(@CurrentUser() user: JwtPayload, @Query() query: ListAssignmentsQueryDto) {
    return this.service.listAssignments(user.sub, query);
  }

  @Get('assignments/available')
  available() {
    return this.service.findAvailable();
  }

  @Post('assignments/claim')
  claim(@CurrentUser() user: JwtPayload, @Body() dto: ClaimAssignmentDto) {
    return this.service.claim(user.sub, dto);
  }

  @Get('assignments/:id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Query() query: DayRangeQueryDto) {
    return this.service.findOne(user.sub, id, query);
  }

  @Patch('assignments/:id/start')
  start(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.start(user.sub, id);
  }

  @Patch('assignments/:id/reschedule')
  reschedule(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: RescheduleAssignmentDto) {
    return this.service.reschedule(user.sub, id, dto);
  }

  @Patch('assignments/:id/equipment')
  equipment(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateEquipmentDto) {
    return this.service.updateEquipment(user.sub, id, dto.checkedEquipment);
  }

  @Post('assignments/:id/sample')
  collect(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: CollectSampleDto) {
    return this.service.collectSample(user.sub, id, dto);
  }

  @Patch('assignments/:id/complete')
  complete(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: CompleteAssignmentDto) {
    return this.service.complete(user.sub, id, dto);
  }

  @Get('samples')
  samples(@CurrentUser() user: JwtPayload) {
    return this.service.listSamples(user.sub);
  }

  @Get('samples/next-code')
  nextSampleCode() {
    return this.service.nextSampleCode();
  }

  @Get('samples/:id')
  custody(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.custody(user.sub, id);
  }

  @Post('samples/:id/seal')
  seal(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: RegisterSealDto) {
    return this.service.registerSeal(user.sub, id, dto);
  }

  @Post('samples/:id/events')
  addEvent(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: AddCustodyEventDto) {
    return this.service.addEvent(user.sub, id, dto);
  }
}

// Planification des missions par l'équipe de vérification.
@ApiBearerAuth()
@ApiTags('collection-assignments')
@Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
// Actions opérationnelles « A* » : override admin motivé et audité.
@SensitiveAction()
@Controller('collection-assignments')
export class CollectionAssignmentsController {
  constructor(private readonly service: FieldAgentService) {}

  @Get('agents')
  agents() {
    return this.service.listAgents();
  }

  @Get()
  list(@Query('requestId') requestId: string) {
    return this.service.listForRequest(requestId);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateAssignmentDto) {
    return this.service.createByStaff(user.sub, dto);
  }

  @Patch(':id/cancel')
  cancel(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.cancelByStaff(user.sub, id);
  }
}
