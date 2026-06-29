import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './core/auth/auth.module';
import { UsersModule } from './core/users/users.module';
import { RolesModule } from './core/roles/roles.module';
import { PermissionsModule } from './core/permissions/permissions.module';
import { TenantsModule } from './core/tenants/tenants.module';
import { AuditLogsModule } from './core/audit-logs/audit-logs.module';
import { FilesModule } from './core/files/files.module';
import { QueueModule } from './core/queue/queue.module';
import { SettingsModule } from './core/settings/settings.module';
import { NotificationsModule } from './core/notifications/notifications.module';
import { VillageProfileModule } from './modules/village-profile/village-profile.module';
import { PopulationModule } from './modules/population/population.module';
import { FamiliesModule } from './modules/families/families.module';
import { TerritoriesModule } from './modules/territories/territories.module';
import { CivilEventsModule } from './modules/civil-events/civil-events.module';
import { LettersModule } from './modules/letters/letters.module';
import { ComplaintsModule } from './modules/complaints/complaints.module';
import { CmsModule } from './modules/cms/cms.module';
import { SocialAssistanceModule } from './modules/social-assistance/social-assistance.module';
import { AssetsModule } from './modules/assets/assets.module';
import { DevelopmentModule } from './modules/development/development.module';
import { FinanceModule } from './modules/finance/finance.module';
import { ReportsModule } from './modules/reports/reports.module';
import { BumdesModule } from './modules/bumdes/bumdes.module';
import { AssistantModule } from './modules/assistant/assistant.module';
import { PublicModule } from './modules/public/public.module';
import { HealthModule } from './health/health.module';
import { StorageModule } from './core/storage/storage.module';
import { PaginationQueryValidationMiddleware } from './common/middleware/pagination-query-validation.middleware';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60000, limit: 100 }],
    }),
    DatabaseModule,
    StorageModule,
    HealthModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    TenantsModule,
    AuditLogsModule,
    QueueModule,
    FilesModule,
    SettingsModule,
    NotificationsModule,
    VillageProfileModule,
    PopulationModule,
    FamiliesModule,
    TerritoriesModule,
    CivilEventsModule,
    LettersModule,
    ComplaintsModule,
    CmsModule,
    SocialAssistanceModule,
    AssetsModule,
    DevelopmentModule,
    FinanceModule,
    ReportsModule,
    BumdesModule,
    AssistantModule,
    PublicModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PaginationQueryValidationMiddleware).forRoutes('*');
  }
}
