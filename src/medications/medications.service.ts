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

  private async pid(userId: string, patientId?: string | null) {
    if (patientId) return patientId;
    const p = await this.patientRepo.findOne({ where: { user_id: userId } });
    if (!p) throw new NotFoundException('Paciente no encontrado');
    return p.id;
  }

  findAll(userId: string, patientId?: string | null) {
    return this.pid(userId, patientId).then((id) =>
      this.repo.find({ where: { patient_id: id }, order: { created_at: 'DESC' } }),
    );
  }

  async create(userId: string, dto: CreateMedicationDto, patientId?: string | null) {
    const id = await this.pid(userId, patientId);
    const med = this.repo.create({ ...dto, patient_id: id });
    // Un medicamento permanente no tiene fecha de fin.
    if (med.permanente) med.fecha_fin = null as any;
    return this.repo.save(med);
  }

  async findOne(userId: string, medId: string, patientId?: string | null) {
    const id = await this.pid(userId, patientId);
    const m = await this.repo.findOne({ where: { id: medId } });
    if (!m) throw new NotFoundException('Medicamento no encontrado');
    if (m.patient_id !== id) throw new ForbiddenException();
    return m;
  }

  async update(userId: string, medId: string, dto: UpdateMedicationDto, patientId?: string | null) {
    const m = await this.findOne(userId, medId, patientId);
    Object.assign(m, dto);
    // Un medicamento permanente no tiene fecha de fin.
    if (m.permanente) m.fecha_fin = null as any;
    return this.repo.save(m);
  }

  async remove(userId: string, medId: string, patientId?: string | null) {
    const m = await this.findOne(userId, medId, patientId);
    await this.repo.remove(m);
    return { message: 'Medicamento eliminado' };
  }
}
