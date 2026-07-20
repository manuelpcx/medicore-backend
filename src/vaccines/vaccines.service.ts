import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vaccine } from './entities/vaccine.entity';
import { Patient } from '../patients/entities/patient.entity';
import { CreateVaccineDto } from './dto/create-vaccine.dto';

@Injectable()
export class VaccinesService {
  constructor(
    @InjectRepository(Vaccine) private repo: Repository<Vaccine>,
    @InjectRepository(Patient) private patientRepo: Repository<Patient>,
  ) {}

  private async pid(userId: string, patientId?: string | null) {
    if (patientId) return patientId;
    const p = await this.patientRepo.findOne({ where: { user_id: userId } });
    if (!p) throw new NotFoundException('Paciente no encontrado');
    return p.id;
  }

  findAll(userId: string, patientId?: string | null) {
    return this.pid(userId, patientId).then((id) =>
      this.repo.find({ where: { patient_id: id }, order: { fecha: 'DESC' } }),
    );
  }

  async create(userId: string, dto: CreateVaccineDto, patientId?: string | null) {
    const id = await this.pid(userId, patientId);
    return this.repo.save(this.repo.create({ ...dto, patient_id: id }));
  }

  async remove(userId: string, vaccineId: string, patientId?: string | null) {
    const id = await this.pid(userId, patientId);
    const v = await this.repo.findOne({ where: { id: vaccineId } });
    if (!v) throw new NotFoundException('Vacuna no encontrada');
    if (v.patient_id !== id) throw new ForbiddenException();
    await this.repo.remove(v);
    return { message: 'Vacuna eliminada' };
  }
}
