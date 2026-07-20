import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { join, isAbsolute } from 'path';
import { existsSync, unlinkSync } from 'fs';
import { Patient } from '../patients/entities/patient.entity';
import { Exam } from '../exams/entities/exam.entity';
import { User } from '../auth/entities/user.entity';
import { CreateMinorDto } from './dto/create-minor.dto';

const MAX_MINORS = 5;

export interface MinorView {
  id: string;
  nombre: string | null;
  birth_date: string | null;
  edad: number | null;
  sexo: string | null;
  relacion: string | null;
  is_minor: boolean;
}

@Injectable()
export class MinorsService {
  constructor(
    @InjectRepository(Patient) private patientRepo: Repository<Patient>,
    @InjectRepository(Exam) private examRepo: Repository<Exam>,
  ) {}

  /** Edad cumplida a la fecha `at` a partir de una fecha de nacimiento. */
  private calcularEdad(birthDate: Date, at = new Date()): number {
    let edad = at.getFullYear() - birthDate.getFullYear();
    const m = at.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && at.getDate() < birthDate.getDate())) edad--;
    return edad;
  }

  private resolveFilePath(archivoPath: string): string {
    return isAbsolute(archivoPath)
      ? archivoPath
      : join(process.cwd(), archivoPath);
  }

  async create(user: User, dto: CreateMinorDto): Promise<Patient> {
    // R11 — consentimiento obligatorio.
    if (dto.consentimiento !== true) {
      throw new BadRequestException(
        'Se requiere el consentimiento del adulto para crear el perfil del menor.',
      );
    }

    // R8/R9 — fecha válida, no futura y edad < 18.
    const now = new Date();
    const birth = new Date(dto.birth_date);
    if (isNaN(birth.getTime())) {
      throw new BadRequestException('La fecha de nacimiento no es válida.');
    }
    if (birth.getTime() > now.getTime()) {
      throw new BadRequestException(
        'La fecha de nacimiento no puede ser futura.',
      );
    }
    if (this.calcularEdad(birth, now) >= 18) {
      throw new BadRequestException(
        'El perfil del menor requiere una edad inferior a 18 años.',
      );
    }

    // R10 — tope de 5 menores por adulto.
    const count = await this.patientRepo.count({
      where: { owner_id: user.id, is_minor: true },
    });
    if (count >= MAX_MINORS) {
      throw new ConflictException(
        `Has alcanzado el máximo de ${MAX_MINORS} menores.`,
      );
    }

    // R6/R7/R12 — crea el Patient dependiente vacío (sin registros de dominio).
    const minor = this.patientRepo.create({
      user_id: null,
      owner_id: user.id,
      is_minor: true,
      nombre: dto.nombre,
      sexo: dto.sexo,
      relacion: dto.relacion ?? null,
      birth_date: dto.birth_date,
      consent_by: user.id,
      consent_at: now,
    });
    return this.patientRepo.save(minor);
  }

  // R13 — menores del adulto para poblar el selector de perfil.
  async list(ownerId: string): Promise<MinorView[]> {
    const minors = await this.patientRepo.find({
      where: { owner_id: ownerId, is_minor: true },
      order: { updated_at: 'DESC' },
    });
    return minors.map((m) => ({
      id: m.id,
      nombre: m.nombre,
      birth_date: m.birth_date,
      edad: m.birth_date
        ? this.calcularEdad(new Date(m.birth_date))
        : null,
      sexo: m.sexo,
      relacion: m.relacion,
      is_minor: m.is_minor,
    }));
  }

  // R14–R17 — borrado owner-only con cascada de dominio + archivos.
  async remove(
    ownerId: string,
    minorId: string,
  ): Promise<{ message: string }> {
    const patient = await this.patientRepo.findOne({
      where: { id: minorId },
    });
    if (!patient) throw new NotFoundException('Menor no encontrado');

    // R17 — solo un menor propio del adulto puede borrarse.
    if (!patient.is_minor || patient.owner_id !== ownerId) {
      throw new ForbiddenException();
    }

    // R15 — borrar del disco los archivos de los exámenes del menor.
    const exams = await this.examRepo.find({
      where: { patient_id: minorId },
    });
    for (const exam of exams) {
      if (exam.archivo_path) {
        const full = this.resolveFilePath(exam.archivo_path);
        if (existsSync(full)) unlinkSync(full);
      }
    }

    // R14/R16 — remove del Patient; las FKs ON DELETE CASCADE borran historial,
    // medicamentos, alergias, vacunas, exámenes y códigos de ese patient_id.
    // No se toca ningún otro Patient.
    await this.patientRepo.remove(patient);
    return { message: 'Menor eliminado' };
  }
}
