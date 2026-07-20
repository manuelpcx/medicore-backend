import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MedicalHistoryController } from './medical-history.controller';
import { MedicalHistoryService } from './medical-history.service';
import { MedicalHistory } from './entities/medical-history.entity';
import { Patient } from '../patients/entities/patient.entity';
import { PatientScopeGuard } from '../common/guards/patient-scope.guard';

@Module({
  imports: [TypeOrmModule.forFeature([MedicalHistory, Patient])],
  controllers: [MedicalHistoryController],
  providers: [MedicalHistoryService, PatientScopeGuard],
  exports: [TypeOrmModule, MedicalHistoryService],
})
export class MedicalHistoryModule {}
