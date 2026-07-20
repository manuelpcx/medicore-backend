import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';
import { Exam } from './entities/exam.entity';
import { Patient } from '../patients/entities/patient.entity';
import { PatientScopeGuard } from '../common/guards/patient-scope.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Exam, Patient])],
  controllers: [ExamsController],
  providers: [ExamsService, PatientScopeGuard],
  exports: [TypeOrmModule, ExamsService],
})
export class ExamsModule {}
