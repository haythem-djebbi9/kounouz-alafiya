import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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
import { NotificationsModule } from './notifications/notifications.module.js';
import { SupportModule } from './support/support.module.js';
import { ContactModule } from './contact/contact.module.js';
import { ProducerDocumentsModule } from './producer-documents/producer-documents.module.js';
import { SalesModule } from './sales/sales.module.js';
import { VerificationPortalModule } from './verification-portal/verification-portal.module.js';
import { FieldAgentModule } from './field-agent/field-agent.module.js';
import { AdminModule } from './admin/admin.module.js';
import { HealthModule } from './health/health.module.js';
import { EventsModule } from './events/events.module.js';
import { VariantsModule } from './products/variants.module.js';
import { OperationsModule } from './operations/operations.module.js';
import { AssistantModule } from './assistant/assistant.module.js';
import { ActorContextInterceptor } from './common/actor-context.interceptor.js';
import { AdminOverrideInterceptor } from './common/admin-override.js';
import { IdempotencyInterceptor, IdempotencyJanitor } from './common/idempotency.js';
import { SignedFilesInterceptor } from './files/signed-files.interceptor.js';
import { requestContextMiddleware } from './common/request-context.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Limitation de débit globale (§12 Sécurité API). Les routes sensibles
    // (connexion, vérification publique) resserrent ce plafond via @Throttle.
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: Number(process.env.THROTTLE_TTL ?? 60_000),
          limit: Number(process.env.THROTTLE_LIMIT ?? 120),
        },
      ],
    }),
    PrismaModule,
    AuditModule,
    EventsModule,
    VariantsModule,
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
    NotificationsModule,
    SupportModule,
    ContactModule,
    ProducerDocumentsModule,
    SalesModule,
    VerificationPortalModule,
    FieldAgentModule,
    AdminModule,
    HealthModule,
    OperationsModule,
    AssistantModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Ordre important : débit d'abord (on rejette avant tout travail),
    // puis authentification, puis vérification du rôle.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    // Intercepteurs globaux, du plus externe au plus interne :
    //  1. identité de l'acteur dans le contexte (audit, événements) ;
    //  2. URL signées des fichiers privés (entrée nettoyée, sortie signée) ;
    //  3. override administratif motivé sur les actions sensibles ;
    //  4. idempotence des commandes (la réponse mémorisée est non signée,
    //     elle est re-signée à chaque rejeu par l'intercepteur 2).
    { provide: APP_INTERCEPTOR, useClass: ActorContextInterceptor },
    { provide: APP_INTERCEPTOR, useClass: SignedFilesInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AdminOverrideInterceptor },
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
    IdempotencyJanitor,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // IP et navigateur de chaque requête, pour le journal d'audit.
    // '{*path}' : nouvelle syntaxe path-to-regexp (l'ancien '*' est déprécié).
    consumer.apply(requestContextMiddleware).forRoutes('{*path}');
  }
}
