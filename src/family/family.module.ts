import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FamilyController } from './family.controller';
import { FamilyService } from './family.service';
import { MinorsController } from './minors.controller';
import { MinorsService } from './minors.service';
import { FamilyAccessGuard } from './guards/family-access.guard';
import { FamilyGroup } from './entities/family-group.entity';
import { FamilyMember } from './entities/family-member.entity';
import { User } from '../auth/entities/user.entity';
import { Patient } from '../patients/entities/patient.entity';
import { Exam } from '../exams/entities/exam.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { MedicalHistoryModule } from '../medical-history/medical-history.module';
import { MedicationsModule } from '../medications/medications.module';
import { ExamsModule } from '../exams/exams.module';
import { AllergiesModule } from '../allergies/allergies.module';
import { VaccinesModule } from '../vaccines/vaccines.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FamilyGroup, FamilyMember, User, Patient, Exam]),
    NotificationsModule,
    MedicalHistoryModule,
    MedicationsModule,
    ExamsModule,
    AllergiesModule,
    VaccinesModule,
  ],
  controllers: [FamilyController, MinorsController],
  providers: [FamilyService, MinorsService, FamilyAccessGuard],
})
export class FamilyModule {}
