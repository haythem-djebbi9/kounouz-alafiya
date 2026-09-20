import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as QRCode from 'qrcode';
import { AuditStatus, Role, VerificationRequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { RegisterDto, SelfRegisterRole } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterStaffDto } from './dto/register-staff.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import {
  ChangeEmailDto,
  DeleteAccountDto,
  DisableTwoFactorDto,
  TwoFactorLoginDto,
} from './dto/account-security.dto.js';
import { JwtPayload } from './types/jwt-payload.type.js';
import { buildOtpauthUrl, generateTotpSecret, verifyTotp } from '../common/totp.js';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  language: true,
  mutedNotificationTypes: true,
  passwordChangedAt: true,
  twoFactorEnabled: true,
  createdAt: true,
  producer: true,
  consumer: true,
} as const;

// Jeton intermédiaire émis entre la vérification du mot de passe et celle du
// code TOTP : signé avec un secret distinct pour ne jamais être accepté comme
// jeton d'accès.
const TWO_FACTOR_TOKEN_PURPOSE = '2fa-login';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email.');
    }

    if (dto.role === SelfRegisterRole.PRODUCER && (!dto.farmName || !dto.location)) {
      throw new BadRequestException(
        "Le nom de l'exploitation et la localisation sont requis pour un compte producteur.",
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: dto.role as unknown as Role,
        ...(dto.role === SelfRegisterRole.PRODUCER
          ? {
              producer: {
                create: {
                  name: dto.name,
                  farmName: dto.farmName!,
                  location: dto.location!,
                },
              },
            }
          : {
              consumer: {
                create: {
                  name: dto.name,
                  country: dto.country,
                },
              },
            }),
      },
      select: SAFE_USER_SELECT,
    });

    const tokens = await this.issueTokens({ sub: user.id, email: user.email, role: user.role });
    return { user, ...tokens };
  }

  async registerStaff(dto: RegisterStaffDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: dto.role as unknown as Role,
      },
      select: SAFE_USER_SELECT,
    });

    return user;
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      await this.audit.log(null, 'LOGIN_FAILED', 'User', '-', {
        module: 'AUTH',
        status: AuditStatus.FAILED,
        details: `Compte inconnu : ${dto.email.slice(0, 120)}`,
      });
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }
    if (!user.isActive) {
      await this.audit.log(user.id, 'LOGIN_BLOCKED', 'User', user.id, {
        module: 'AUTH',
        status: AuditStatus.FAILED,
        details: 'Connexion refusée : compte désactivé.',
      });
      throw new UnauthorizedException('Ce compte a été désactivé.');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      await this.audit.log(user.id, 'LOGIN_FAILED', 'User', user.id, {
        module: 'AUTH',
        status: AuditStatus.FAILED,
        details: 'Mot de passe incorrect.',
      });
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }

    if (user.twoFactorEnabled && user.twoFactorSecret) {
      const twoFactorToken = await this.jwt.signAsync(
        { sub: user.id, purpose: TWO_FACTOR_TOKEN_PURPOSE },
        { secret: this.twoFactorTokenSecret(), expiresIn: '5m' },
      );
      return { twoFactorRequired: true as const, twoFactorToken };
    }

    return this.completeLogin(user.id, user.email, user.role);
  }

  async loginWithTwoFactor(dto: TwoFactorLoginDto) {
    let payload: { sub: string; purpose: string };
    try {
      payload = await this.jwt.verifyAsync(dto.twoFactorToken, { secret: this.twoFactorTokenSecret() });
    } catch {
      throw new UnauthorizedException('Session de connexion expirée, veuillez recommencer.');
    }
    if (payload.purpose !== TWO_FACTOR_TOKEN_PURPOSE) {
      throw new UnauthorizedException();
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new UnauthorizedException();
    }
    if (!verifyTotp(user.twoFactorSecret, dto.code)) {
      await this.audit.log(user.id, 'LOGIN_FAILED', 'User', user.id, {
        module: 'AUTH',
        status: AuditStatus.FAILED,
        details: 'Code de double authentification incorrect.',
      });
      throw new UnauthorizedException('Code de vérification incorrect.');
    }

    return this.completeLogin(user.id, user.email, user.role);
  }

  private async completeLogin(userId: string, email: string, role: Role) {
    const tokens = await this.issueTokens({ sub: userId, email, role });
    await this.prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
    await this.audit.log(userId, 'LOGIN', 'User', userId, { module: 'AUTH', details: 'Connexion réussie.' });
    const safeUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: SAFE_USER_SELECT,
    });
    return { user: safeUser, ...tokens };
  }

  private twoFactorTokenSecret() {
    return `${this.config.getOrThrow<string>('JWT_ACCESS_SECRET')}:${TWO_FACTOR_TOKEN_PURPOSE}`;
  }

  async changeEmail(userId: string, dto: ChangeEmailDto) {
    const user = await this.requirePassword(userId, dto.currentPassword);
    const newEmail = dto.newEmail.trim().toLowerCase();
    if (newEmail === user.email.toLowerCase()) {
      throw new BadRequestException("C'est déjà votre adresse e-mail actuelle.");
    }
    const existing = await this.prisma.user.findUnique({ where: { email: newEmail } });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email.');
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { email: newEmail },
      select: SAFE_USER_SELECT,
    });
    await this.audit.log(userId, 'CHANGE_EMAIL', 'User', userId);
    return updated;
  }

  // Étape 1 : génère un secret (non encore actif) et son QR code à scanner.
  async setupTwoFactor(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    if (user.twoFactorEnabled) {
      throw new BadRequestException("L'authentification à deux facteurs est déjà activée.");
    }
    const secret = generateTotpSecret();
    await this.prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: secret } });
    const otpauthUrl = buildOtpauthUrl(secret, user.email);
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 220 });
    return { secret, otpauthUrl, qrDataUrl };
  }

  // Étape 2 : l'activation n'est effective qu'après un premier code valide,
  // ce qui prouve que l'application d'authentification est bien configurée.
  async enableTwoFactor(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret) {
      throw new BadRequestException("Lancez d'abord la configuration de l'authentification à deux facteurs.");
    }
    if (!verifyTotp(user.twoFactorSecret, code)) {
      throw new BadRequestException('Code de vérification incorrect.');
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
      select: SAFE_USER_SELECT,
    });
    await this.audit.log(userId, 'ENABLE_2FA', 'User', userId);
    return updated;
  }

  async disableTwoFactor(userId: string, dto: DisableTwoFactorDto) {
    const user = await this.requirePassword(userId, dto.currentPassword);
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException("L'authentification à deux facteurs n'est pas activée.");
    }
    if (!verifyTotp(user.twoFactorSecret, dto.code)) {
      throw new BadRequestException('Code de vérification incorrect.');
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
      select: SAFE_USER_SELECT,
    });
    await this.audit.log(userId, 'DISABLE_2FA', 'User', userId);
    return updated;
  }

  // La traçabilité doit survivre au compte : un producteur ayant déjà soumis
  // une demande (échantillons, lots, produits en dépendent) voit son compte
  // désactivé et ses sessions révoquées au lieu d'une suppression physique.
  async deleteAccount(userId: string, dto: DeleteAccountDto) {
    const user = await this.requirePassword(userId, dto.currentPassword);
    if (user.role !== Role.PRODUCER && user.role !== Role.CONSUMER) {
      throw new BadRequestException('Les comptes internes sont gérés par un administrateur.');
    }

    const producer = await this.prisma.producer.findUnique({
      where: { userId },
      include: {
        _count: { select: { orderItems: true, payouts: true } },
        verificationRequests: { where: { status: { not: VerificationRequestStatus.DRAFT } }, select: { id: true } },
      },
    });

    const hasTraceability =
      !!producer &&
      (producer.verificationRequests.length > 0 || producer._count.orderItems > 0 || producer._count.payouts > 0);

    if (hasTraceability) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { isActive: false, refreshTokenHash: null, twoFactorEnabled: false, twoFactorSecret: null },
      });
      await this.audit.log(userId, 'DEACTIVATE_OWN_ACCOUNT', 'User', userId);
      return { outcome: 'DEACTIVATED' as const };
    }

    await this.prisma.$transaction(async (tx) => {
      if (producer) {
        await tx.verificationRequest.deleteMany({ where: { producerId: producer.id } });
      }
      await tx.auditLog.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    });
    return { outcome: 'DELETED' as const };
  }

  private async requirePassword(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException();
    }
    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      throw new BadRequestException('Mot de passe actuel incorrect.');
    }
    return user;
  }

  async refresh(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive || !user.refreshTokenHash) {
      throw new UnauthorizedException('Session invalide, veuillez vous reconnecter.');
    }

    const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!matches) {
      throw new UnauthorizedException('Session invalide, veuillez vous reconnecter.');
    }

    return this.issueTokens({ sub: user.id, email: user.email, role: user.role });
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
    await this.audit.log(userId, 'LOGOUT', 'User', userId, { module: 'AUTH' });
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: SAFE_USER_SELECT,
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.language !== undefined ? { language: dto.language } : {}),
      },
      select: SAFE_USER_SELECT,
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException();
    }
    const matches = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!matches) {
      throw new BadRequestException('Mot de passe actuel incorrect.');
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash, passwordChangedAt: new Date() } });
    await this.audit.log(userId, 'CHANGE_PASSWORD', 'User', userId, { module: 'AUTH' });
  }

  // Équipe & Utilisateurs (Admin uniquement) — gestion de base des comptes.
  findAllUsers() {
    return this.prisma.user.findMany({
      select: SAFE_USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async setUserActive(id: string, isActive: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }
    return this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: SAFE_USER_SELECT,
    });
  }

  private async issueTokens(payload: JwtPayload): Promise<AuthTokens> {
    const accessExpiresIn = this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
    const refreshExpiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { ...payload },
        {
          secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
          expiresIn: accessExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
        },
      ),
      this.jwt.signAsync(
        { ...payload },
        {
          secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
          expiresIn: refreshExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
        },
      ),
    ]);

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: payload.sub },
      data: { refreshTokenHash },
    });

    return { accessToken, refreshToken };
  }
}
