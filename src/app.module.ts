import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
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
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const isProd = config.get<string>('NODE_ENV') === 'production';
        const dbUrl = config.get<string>('DATABASE_URL');
        return {
          type: 'postgres',
          url: dbUrl,
          autoLoadEntities: true,
          // synchronize NUNCA en producción — usar migraciones
          synchronize: !isProd,
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
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
