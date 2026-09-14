import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { RegisterStaffDto } from './dto/register-staff.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { Public } from './decorators/public.decorator.js';
import { Roles } from './decorators/roles.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard.js';
import type { JwtPayload } from './types/jwt-payload.type.js';
import type { JwtRefreshPayload } from './strategies/jwt-refresh.strategy.js';
import { Role } from '@prisma/client';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: "Inscription publique (producteur ou consommateur)" })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Renouvellement du jeton d'accès via le refresh token" })
  refresh(@Body() _dto: RefreshTokenDto, @CurrentUser() user: JwtRefreshPayload) {
    return this.authService.refresh(user.sub, user.refreshToken);
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Déconnexion — invalide le refresh token courant' })
  async logout(@CurrentUser() user: JwtPayload) {
    await this.authService.logout(user.sub);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: "Profil de l'utilisateur connecté" })
  me(@CurrentUser() user: JwtPayload) {
    return this.authService.me(user.sub);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Post('register-staff')
  @ApiOperation({ summary: 'Créer un compte interne (Admin, Équipe de vérification, Agent terrain) — Admin uniquement' })
  registerStaff(@Body() dto: RegisterStaffDto) {
    return this.authService.registerStaff(dto);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Get('users')
  @ApiOperation({ summary: 'Liste des comptes — Admin uniquement' })
  findAllUsers() {
    return this.authService.findAllUsers();
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Activer / désactiver un compte — Admin uniquement' })
  setUserActive(@Param('id') id: string, @Body() dto: UpdateUserStatusDto) {
    return this.authService.setUserActive(id, dto.isActive);
  }
}
