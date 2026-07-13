import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MedicationsController } from './medications.controller';
import { MedicationsService } from './medications.service';
import { Medication } from './entities/medication.entity';
import { Patient } from '../patients/entities/patient.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Medication, Patient])],
  controllers: [MedicationsController],
  providers: [MedicationsService],
  exports: [TypeOrmModule, MedicationsService],
})
export class MedicationsModule {}
