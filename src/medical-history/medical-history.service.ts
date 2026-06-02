import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MedicalHistory } from './entities/medical-history.entity';
import { Patient } from '../patients/entities/patient.entity';
import { CreateHistoryDto } from './dto/create-history.dto';
import { UpdateHistoryDto } from './dto/update-history.dto';

@Injectable()
export class MedicalHistoryService {
  constructor(
    @InjectRepository(MedicalHistory)
    private historyRepo: Repository<MedicalHistory>,
    @InjectRepository(Patient)
    private patientRepo: Repository<Patient>,
  ) {}

  private async getPatientId(userId: string): Promise<string> {
    const p = await this.patientRepo.findOne({ where: { user_id: userId } });
    if (!p) throw new NotFoundException('Paciente no encontrado');
    return p.id;
  }

  async findAll(userId: string) {
    const patientId = await this.getPatientId(userId);
    return this.historyRepo.find({
      where: { patient_id: patientId },
      order: { fecha: 'DESC' },
    });
  }

  async create(userId: string, dto: CreateHistoryDto) {
    const patientId = await this.getPatientId(userId);
    const entry = this.historyRepo.create({ ...dto, patient_id: patientId });
    return this.historyRepo.save(entry);
  }

  async findOne(userId: string, id: string) {
    const patientId = await this.getPatientId(userId);
    const entry = await this.historyRepo.findOne({ where: { id } });
    if (!entry) throw new NotFoundException('Consulta no encontrada');
    if (entry.patient_id !== patientId) throw new ForbiddenException();
    return entry;
  }

  async update(userId: string, id: string, dto: UpdateHistoryDto) {
    const entry = await this.findOne(userId, id);
    Object.assign(entry, dto);
    return this.historyRepo.save(entry);
  }

  async remove(userId: string, id: string) {
    const entry = await this.findOne(userId, id);
    await this.historyRepo.remove(entry);
    return { message: 'Consulta eliminada' };
  }
}
