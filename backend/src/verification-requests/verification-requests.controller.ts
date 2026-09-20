import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role, VerificationRequestStatus } from '@prisma/client';
import { VerificationRequestsService } from './verification-requests.service.js';
import { CreateVerificationRequestDto } from './dto/create-verification-request.dto.js';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';
import { SensitiveAction } from '../common/admin-override.js';
import { RespondInfoRequestDto } from './dto/respond-info-request.dto.js';

@ApiBearerAuth()
@ApiTags('verification-requests')
// Actions opérationnelles « A* » : override admin motivé et audité.
@SensitiveAction()
@Controller('verification-requests')
export class VerificationRequestsController {
  constructor(private readonly service: VerificationRequestsService) {}

  @Roles(Role.PRODUCER)
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateVerificationRequestDto) {
    return this.service.create(user.sub, dto);
  }

  @Roles(Role.PRODUCER)
  @Patch(':id/draft')
  updateDraft(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: CreateVerificationRequestDto) {
    return this.service.updateDraft(id, user.sub, dto);
  }

  @Roles(Role.PRODUCER)
  @Post(':id/submit')
  submit(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.submitDraft(id, user.sub);
  }

  @Roles(Role.PRODUCER)
  @Post(':id/respond')
  respond(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: RespondInfoRequestDto) {
    return this.service.respondToInfoRequest(id, user.sub, dto);
  }

  @Roles(Role.PRODUCER)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDraft(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.service.deleteDraft(id, user.sub);
  }

  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
  @Get()
  findAll(@Query('status') status?: VerificationRequestStatus) {
    return this.service.findAll(status);
  }

  @Roles(Role.PRODUCER)
  @Get('mine')
  findMine(@CurrentUser() user: JwtPayload) {
    return this.service.findMine(user.sub);
  }

  @Roles(Role.FIELD_AGENT)
  @Get('pending-collection')
  findPendingCollection() {
    return this.service.findPendingCollection();
  }

  // Dossier de demande interne : Kounouz, l'agent en mission et le producteur
  // propriétaire. Fermé aux CONSUMER (§Sécurité 19.5).
  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM, Role.FIELD_AGENT, Role.PRODUCER)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findOneForUser(id, user);
  }

  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateRequestStatusDto,
  ) {
    return this.service.updateStatus(id, user.sub, dto);
  }
}
