import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Allergy } from './entities/allergy.entity';
import { Patient } from '../patients/entities/patient.entity';
import { CreateAllergyDto } from './dto/create-allergy.dto';

@Injectable()
export class AllergiesService {
  constructor(
    @InjectRepository(Allergy) private repo: Repository<Allergy>,
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

  async create(userId: string, dto: CreateAllergyDto) {
    const id = await this.pid(userId);
    return this.repo.save(this.repo.create({ ...dto, patient_id: id }));
  }

  async remove(userId: string, allergyId: string) {
    const id = await this.pid(userId);
    const a = await this.repo.findOne({ where: { id: allergyId } });
    if (!a) throw new NotFoundException('Alergia no encontrada');
    if (a.patient_id !== id) throw new ForbiddenException();
    await this.repo.remove(a);
    return { message: 'Alergia eliminada' };
  }
}
