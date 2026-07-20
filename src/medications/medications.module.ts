import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MedicationsController } from './medications.controller';
import { MedicationsService } from './medications.service';
import { Medication } from './entities/medication.entity';
import { Patient } from '../patients/entities/patient.entity';
import { PatientScopeGuard } from '../common/guards/patient-scope.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Medication, Patient])],
  controllers: [MedicationsController],
  providers: [MedicationsService, PatientScopeGuard],
  exports: [TypeOrmModule, MedicationsService],
})
export class MedicationsModule {}
