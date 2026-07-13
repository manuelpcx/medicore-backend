import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AllergiesController } from './allergies.controller';
import { AllergiesService } from './allergies.service';
import { Allergy } from './entities/allergy.entity';
import { Patient } from '../patients/entities/patient.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Allergy, Patient])],
  controllers: [AllergiesController],
  providers: [AllergiesService],
  exports: [TypeOrmModule, AllergiesService],
})
export class AllergiesModule {}
