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
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto, SelfRegisterRole } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterStaffDto } from './dto/register-staff.dto.js';
import { JwtPayload } from './types/jwt-payload.type.js';

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
  createdAt: true,
  producer: true,
  consumer: true,
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
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
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Ce compte a été désactivé.');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }

    const tokens = await this.issueTokens({ sub: user.id, email: user.email, role: user.role });
    const safeUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: SAFE_USER_SELECT,
    });
    return { user: safeUser, ...tokens };
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
