import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { Patient } from './entities/patient.entity';
import { User } from '../auth/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Patient, User])],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [TypeOrmModule],
})
export class PatientsModule {}
