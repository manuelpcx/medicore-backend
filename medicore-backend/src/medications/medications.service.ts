import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Medication } from './entities/medication.entity';
import { Patient } from '../patients/entities/patient.entity';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';

@Injectable()
export class MedicationsService {
  constructor(
    @InjectRepository(Medication) private repo: Repository<Medication>,
    @InjectRepository(Patient) private patientRepo: Repository<Patient>,
  ) {}

  private async pid(userId: string) {
    const p = await this.patientRepo.findOne({ where: { user_id: userId } });
    if (!p) throw new NotFoundException('Paciente no encontrado');
    return p.id;
  }

  findAll(userId: string) {
    return this.pid(userId).then((id) =>
      this.repo.find({ where: { patient_id: id }, order: { created_at: 'DESC' } }),
    );
  }

  async create(userId: string, dto: CreateMedicationDto) {
    const id = await this.pid(userId);
    return this.repo.save(this.repo.create({ ...dto, patient_id: id }));
  }

  async findOne(userId: string, medId: string) {
    const id = await this.pid(userId);
    const m = await this.repo.findOne({ where: { id: medId } });
    if (!m) throw new NotFoundException('Medicamento no encontrado');
    if (m.patient_id !== id) throw new ForbiddenException();
    return m;
  }

  async update(userId: string, medId: string, dto: UpdateMedicationDto) {
    const m = await this.findOne(userId, medId);
    Object.assign(m, dto);
    return this.repo.save(m);
  }

  async remove(userId: string, medId: string) {
    const m = await this.findOne(userId, medId);
    await this.repo.remove(m);
    return { message: 'Medicamento eliminado' };
  }
}
