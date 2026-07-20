import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessCodesController } from './access-codes.controller';
import { AccessCodesService } from './access-codes.service';
import { AccessCode } from './entities/access-code.entity';
import { Patient } from '../patients/entities/patient.entity';
import { User } from '../auth/entities/user.entity';
import { MedicalHistory } from '../medical-history/entities/medical-history.entity';
import { Medication } from '../medications/entities/medication.entity';
import { Allergy } from '../allergies/entities/allergy.entity';
import { Vaccine } from '../vaccines/entities/vaccine.entity';
import { PatientScopeGuard } from '../common/guards/patient-scope.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccessCode, Patient, User,
      MedicalHistory, Medication, Allergy, Vaccine,
    ]),
  ],
  controllers: [AccessCodesController],
  providers: [AccessCodesService, PatientScopeGuard],
})
export class AccessCodesModule {}
