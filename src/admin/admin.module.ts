import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../auth/entities/user.entity';
import { Patient } from '../patients/entities/patient.entity';
import { MedicalHistory } from '../medical-history/entities/medical-history.entity';
import { Medication } from '../medications/entities/medication.entity';
import { Exam } from '../exams/entities/exam.entity';
import { AccessCode } from '../access-codes/entities/access-code.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Patient,
      MedicalHistory,
      Medication,
      Exam,
      AccessCode,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
