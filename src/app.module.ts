import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { PatientsModule } from './patients/patients.module';
import { MedicalHistoryModule } from './medical-history/medical-history.module';
import { MedicationsModule } from './medications/medications.module';
import { ExamsModule } from './exams/exams.module';
import { AllergiesModule } from './allergies/allergies.module';
import { VaccinesModule } from './vaccines/vaccines.module';
import { AccessCodesModule } from './access-codes/access-codes.module';
import { NotificationsModule } from './notifications/notifications.module';
import { HealthModule } from './health/health.module';
import { AdminModule } from './admin/admin.module';
import { FamilyModule } from './family/family.module';
import { PaymentsModule } from './payments/payments.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // Rate limiting global: 100 req/min por IP (ver specs/add-rate-limiting-helmet)
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const isProd = config.get<string>('NODE_ENV') === 'production';
        const dbUrl = config.get<string>('DATABASE_URL');
        return {
          type: 'postgres',
          url: dbUrl,
          autoLoadEntities: true,
          // Esquema gestionado solo por migraciones en todos los entornos — synchronize desactivado
          synchronize: false,
          logging: !isProd,
          // SSL requerido en Railway / Supabase / Neon
          ssl: isProd ? { rejectUnauthorized: false } : false,
          // Mantener conexión viva en entornos serverless
          extra: isProd
            ? { connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 }
            : {},
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    PatientsModule,
    MedicalHistoryModule,
    MedicationsModule,
    ExamsModule,
    AllergiesModule,
    VaccinesModule,
    AccessCodesModule,
    NotificationsModule,
    HealthModule,
    AdminModule,
    FamilyModule,
    PaymentsModule,
  ],
  providers: [
    // El ThrottlerGuard se evalúa ANTES que el JwtAuthGuard (rate limiting
    // antes que autenticación, incluso en endpoints @Public()).
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
