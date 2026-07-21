import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';
import { Exam } from './entities/exam.entity';
import { Patient } from '../patients/entities/patient.entity';
import { User } from '../auth/entities/user.entity';
import { PatientScopeGuard } from '../common/guards/patient-scope.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Exam, Patient, User])],
  controllers: [ExamsController],
  providers: [ExamsService, PatientScopeGuard],
  exports: [TypeOrmModule, ExamsService],
})
export class ExamsModule {}
