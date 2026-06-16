import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { NotificationsService } from './notifications.service';
import { NotificationsScheduler } from './notifications.scheduler';
import { NotificationsController } from './notifications.controller';

import { User } from '../auth/entities/user.entity';
import { Medication } from '../medications/entities/medication.entity';
import { MedicalHistory } from '../medical-history/entities/medical-history.entity';
import { Patient } from '../patients/entities/patient.entity';

@Module({
  imports: [
    ScheduleModule,   // ya se registra globalmente en AppModule; aquí lo importamos para los decoradores
    TypeOrmModule.forFeature([User, Medication, MedicalHistory, Patient]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsScheduler],
  exports: [NotificationsService],
})
export class NotificationsModule {}
