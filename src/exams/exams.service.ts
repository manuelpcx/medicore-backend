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
import { existsSync, unlinkSync, openSync, readSync, closeSync } from 'fs';

// Mimetype canónico detectado por magic bytes, o null si no es un tipo permitido.
function detectMimeFromMagicBytes(filePath: string): string | null {
  const buf = Buffer.alloc(12);
  let read = 0;
  const fd = openSync(filePath, 'r');
  try {
    read = readSync(fd, buf, 0, 12, 0);
  } finally {
    closeSync(fd);
  }
  const b = buf.subarray(0, read);
  // PDF: 25 50 44 46  ("%PDF")
  if (b.length >= 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'application/pdf';
  // JPEG: FF D8 FF
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return 'image/png';
  // WEBP: "RIFF" (0-3) .... "WEBP" (8-11)
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  return null;
}

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
    let mimetype: string | undefined;
    if (file) {
      const detected = detectMimeFromMagicBytes(this.resolveFilePath(file.path)); // R5
      if (!detected || detected !== file.mimetype) {                              // R7, R8
        const full = this.resolveFilePath(file.path);
        if (existsSync(full)) unlinkSync(full);                                   // R9 (borra huérfano)
        throw new BadRequestException(
          'El contenido del archivo no coincide con un tipo permitido (PDF, JPEG, PNG o WEBP).',
        );
      }
      mimetype = detected;                                                        // R10 (canónico)
    }
    const exam = this.repo.create({
      ...dto,
      patient_id: id,
      archivo_path: file ? file.path : undefined,
      archivo_nombre: file ? file.originalname : undefined,
      archivo_mimetype: mimetype,
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
