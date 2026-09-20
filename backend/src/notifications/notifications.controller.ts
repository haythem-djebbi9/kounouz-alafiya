import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';
import { NotificationsService } from './notifications.service.js';
import { UpdateNotificationPreferenceDto } from './dto/update-notification-preference.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';

@ApiBearerAuth()
@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  findMine(@CurrentUser() user: JwtPayload) {
    return this.service.findMine(user.sub);
  }

  @Get('unread-count')
  countUnread(@CurrentUser() user: JwtPayload) {
    return this.service.countUnread(user.sub);
  }

  @Get('preferences')
  getPreferences(@CurrentUser() user: JwtPayload) {
    return this.service.getPreferences(user.sub);
  }

  @Patch('preferences/:type')
  setPreference(
    @Param('type') type: NotificationType,
    @Body() dto: UpdateNotificationPreferenceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.setPreference(user.sub, type, dto.enabled);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.markRead(id, user.sub);
  }

  @Patch('read-all')
  async markAllRead(@CurrentUser() user: JwtPayload) {
    await this.service.markAllRead(user.sub);
  }
}
