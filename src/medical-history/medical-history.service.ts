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

  // Resuelve el patient_id: el del menor validado por el guard si viene
  // `patientId`, o el Patient del propio adulto autenticado en caso contrario.
  private async getPatientId(
    userId: string,
    patientId?: string | null,
  ): Promise<string> {
    if (patientId) return patientId;
    const p = await this.patientRepo.findOne({ where: { user_id: userId } });
    if (!p) throw new NotFoundException('Paciente no encontrado');
    return p.id;
  }

  async findAll(userId: string, patientId?: string | null) {
    const pid = await this.getPatientId(userId, patientId);
    return this.historyRepo.find({
      where: { patient_id: pid },
      order: { fecha: 'DESC' },
    });
  }

  async create(userId: string, dto: CreateHistoryDto, patientId?: string | null) {
    const pid = await this.getPatientId(userId, patientId);
    const entry = this.historyRepo.create({ ...dto, patient_id: pid });
    return this.historyRepo.save(entry);
  }

  async findOne(userId: string, id: string, patientId?: string | null) {
    const pid = await this.getPatientId(userId, patientId);
    const entry = await this.historyRepo.findOne({ where: { id } });
    if (!entry) throw new NotFoundException('Consulta no encontrada');
    if (entry.patient_id !== pid) throw new ForbiddenException();
    return entry;
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateHistoryDto,
    patientId?: string | null,
  ) {
    const entry = await this.findOne(userId, id, patientId);
    Object.assign(entry, dto);
    return this.historyRepo.save(entry);
  }

  async remove(userId: string, id: string, patientId?: string | null) {
    const entry = await this.findOne(userId, id, patientId);
    await this.historyRepo.remove(entry);
    return { message: 'Consulta eliminada' };
  }
}
