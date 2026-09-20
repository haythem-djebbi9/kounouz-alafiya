import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { RegisterStaffDto } from './dto/register-staff.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import {
  ChangeEmailDto,
  DeleteAccountDto,
  DisableTwoFactorDto,
  TwoFactorCodeDto,
  TwoFactorLoginDto,
} from './dto/account-security.dto.js';
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
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('register')
  @ApiOperation({ summary: "Inscription publique (producteur ou consommateur)" })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
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
  @Patch('me')
  @ApiOperation({ summary: "Mettre à jour le nom / la langue de l'utilisateur connecté" })
  updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(user.sub, dto);
  }

  @ApiBearerAuth()
  @Patch('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Changer son mot de passe (nécessite le mot de passe actuel)' })
  async changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto) {
    await this.authService.changePassword(user.sub, dto);
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('2fa/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion — seconde étape (code TOTP) si la 2FA est activée' })
  loginWithTwoFactor(@Body() dto: TwoFactorLoginDto) {
    return this.authService.loginWithTwoFactor(dto);
  }

  @ApiBearerAuth()
  @Patch('change-email')
  @ApiOperation({ summary: "Changer son adresse e-mail (nécessite le mot de passe actuel)" })
  changeEmail(@CurrentUser() user: JwtPayload, @Body() dto: ChangeEmailDto) {
    return this.authService.changeEmail(user.sub, dto);
  }

  @ApiBearerAuth()
  @Post('2fa/setup')
  @ApiOperation({ summary: "Préparer l'authentification à deux facteurs (secret + QR code)" })
  setupTwoFactor(@CurrentUser() user: JwtPayload) {
    return this.authService.setupTwoFactor(user.sub);
  }

  @ApiBearerAuth()
  @Post('2fa/enable')
  @ApiOperation({ summary: "Activer la 2FA après validation d'un premier code" })
  enableTwoFactor(@CurrentUser() user: JwtPayload, @Body() dto: TwoFactorCodeDto) {
    return this.authService.enableTwoFactor(user.sub, dto.code);
  }

  @ApiBearerAuth()
  @Post('2fa/disable')
  @ApiOperation({ summary: 'Désactiver la 2FA (mot de passe + code)' })
  disableTwoFactor(@CurrentUser() user: JwtPayload, @Body() dto: DisableTwoFactorDto) {
    return this.authService.disableTwoFactor(user.sub, dto);
  }

  @ApiBearerAuth()
  @Post('delete-account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Supprimer son compte (désactivation si des données de traçabilité existent)' })
  deleteAccount(@CurrentUser() user: JwtPayload, @Body() dto: DeleteAccountDto) {
    return this.authService.deleteAccount(user.sub, dto);
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
