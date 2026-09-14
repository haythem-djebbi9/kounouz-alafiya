import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuditModule } from './audit/audit.module.js';
import { AuthModule } from './auth/auth.module.js';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';
import { RolesGuard } from './auth/guards/roles.guard.js';
import { ProducersModule } from './producers/producers.module.js';
import { VerificationRequestsModule } from './verification-requests/verification-requests.module.js';
import { SamplesModule } from './samples/samples.module.js';
import { SealsModule } from './seals/seals.module.js';
import { LaboratoryModule } from './laboratory/laboratory.module.js';
import { VerificationsModule } from './verifications/verifications.module.js';
import { BatchesModule } from './batches/batches.module.js';
import { PackagingModule } from './packaging/packaging.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { QrCodesModule } from './qr-codes/qr-codes.module.js';
import { ProductsModule } from './products/products.module.js';
import { AntiFraudModule } from './anti-fraud/anti-fraud.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { UploadsModule } from './uploads/uploads.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuditModule,
    AuthModule,
    ProducersModule,
    VerificationRequestsModule,
    SamplesModule,
    SealsModule,
    LaboratoryModule,
    VerificationsModule,
    BatchesModule,
    PackagingModule,
    CategoriesModule,
    QrCodesModule,
    ProductsModule,
    AntiFraudModule,
    ReportsModule,
    UploadsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Ordre important : authentification d'abord, puis vérification du rôle.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
