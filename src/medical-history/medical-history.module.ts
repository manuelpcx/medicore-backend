import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MedicalHistoryController } from './medical-history.controller';
import { MedicalHistoryService } from './medical-history.service';
import { MedicalHistory } from './entities/medical-history.entity';
import { Patient } from '../patients/entities/patient.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MedicalHistory, Patient])],
  controllers: [MedicalHistoryController],
  providers: [MedicalHistoryService],
  exports: [TypeOrmModule, MedicalHistoryService],
})
export class MedicalHistoryModule {}
