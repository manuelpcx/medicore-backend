import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VaccinesController } from './vaccines.controller';
import { VaccinesService } from './vaccines.service';
import { Vaccine } from './entities/vaccine.entity';
import { Patient } from '../patients/entities/patient.entity';
import { PatientScopeGuard } from '../common/guards/patient-scope.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Vaccine, Patient])],
  controllers: [VaccinesController],
  providers: [VaccinesService, PatientScopeGuard],
  exports: [TypeOrmModule, VaccinesService],
})
export class VaccinesModule {}
