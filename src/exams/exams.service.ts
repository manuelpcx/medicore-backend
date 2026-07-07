import {
  Injectable, NotFoundException, ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exam } from './entities/exam.entity';
import { Patient } from '../patients/entities/patient.entity';
import { CreateExamDto } from './dto/create-exam.dto';
import { join, isAbsolute } from 'path';
import { existsSync, unlinkSync } from 'fs';

@Injectable()
export class ExamsService {
  constructor(
    @InjectRepository(Exam) private repo: Repository<Exam>,
    @InjectRepository(Patient) private patientRepo: Repository<Patient>,
  ) {}

  private async pid(userId: string) {
    const p = await this.patientRepo.findOne({ where: { user_id: userId } });
    if (!p) throw new NotFoundException('Paciente no encontrado');
    return p.id;
  }

  /**
   * Resuelve la ruta física del archivo. `archivo_path` (de multer) puede ser
   * absoluto (UPLOAD_PATH absoluto, p.ej. Railway `/data/uploads`) o relativo
   * (UPLOAD_PATH relativo, p.ej. `./uploads` en local). No usar join() a ciegas:
   * join(cwd, rutaAbsoluta) produce una ruta incorrecta.
   */
  private resolveFilePath(archivoPath: string): string {
    return isAbsolute(archivoPath) ? archivoPath : join(process.cwd(), archivoPath);
  }

  findAll(userId: string) {
    return this.pid(userId).then((id) =>
      this.repo.find({ where: { patient_id: id }, order: { fecha: 'DESC' } }),
    );
  }

  async create(userId: string, dto: CreateExamDto, file?: Express.Multer.File) {
    const id = await this.pid(userId);
    const exam = this.repo.create({
      ...dto,
      patient_id: id,
      archivo_path: file ? file.path : undefined,
      archivo_nombre: file ? file.originalname : undefined,
      archivo_mimetype: file ? file.mimetype : undefined,
    });
    return this.repo.save(exam);
  }

  async findOne(userId: string, examId: string) {
    const id = await this.pid(userId);
    const exam = await this.repo.findOne({ where: { id: examId } });
    if (!exam) throw new NotFoundException('Examen no encontrado');
    if (exam.patient_id !== id) throw new ForbiddenException();
    return exam;
  }

  async getFile(userId: string, examId: string) {
    const exam = await this.findOne(userId, examId);
    if (!exam.archivo_path) throw new NotFoundException('Este examen no tiene archivo adjunto');
    const fullPath = this.resolveFilePath(exam.archivo_path);
    if (!existsSync(fullPath)) throw new NotFoundException('Archivo no encontrado en el servidor');
    return { path: fullPath, mimetype: exam.archivo_mimetype, nombre: exam.archivo_nombre };
  }

  async remove(userId: string, examId: string) {
    const exam = await this.findOne(userId, examId);
    if (exam.archivo_path) {
      const fullPath = this.resolveFilePath(exam.archivo_path);
      if (existsSync(fullPath)) unlinkSync(fullPath);
    }
    await this.repo.remove(exam);
    return { message: 'Examen eliminado' };
  }
}
