import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from './entities/patient.entity';
import { User } from '../auth/entities/user.entity';
import { UpdatePatientDto } from './dto/update-patient.dto';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private patientRepo: Repository<Patient>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async getMe(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const patient = await this.patientRepo.findOne({ where: { user_id: userId } });
    if (!patient) throw new NotFoundException('Perfil de paciente no encontrado');
    const { password, ...safeUser } = user as any;
    return { ...safeUser, perfil: patient };
  }

  async updateMe(userId: string, dto: UpdatePatientDto) {
    const patient = await this.patientRepo.findOne({ where: { user_id: userId } });
    if (!patient) throw new NotFoundException('Perfil no encontrado');
    Object.assign(patient, dto);
    await this.patientRepo.save(patient);
    return { ...patient, message: 'Perfil actualizado' };
  }
}
