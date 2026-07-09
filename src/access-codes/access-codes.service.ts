import {
  Injectable, NotFoundException, UnauthorizedException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { AccessCode } from './entities/access-code.entity';
import { Patient } from '../patients/entities/patient.entity';
import { User } from '../auth/entities/user.entity';
import { MedicalHistory } from '../medical-history/entities/medical-history.entity';
import { Medication } from '../medications/entities/medication.entity';
import { Allergy } from '../allergies/entities/allergy.entity';
import { Vaccine } from '../vaccines/entities/vaccine.entity';
import { EstadoMedicamento } from '../medications/entities/medication.entity';

function randomCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[randomInt(0, chars.length)];
  }
  return result;
}

@Injectable()
export class AccessCodesService {
  constructor(
    @InjectRepository(AccessCode) private codeRepo: Repository<AccessCode>,
    @InjectRepository(Patient) private patientRepo: Repository<Patient>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(MedicalHistory) private historyRepo: Repository<MedicalHistory>,
    @InjectRepository(Medication) private medRepo: Repository<Medication>,
    @InjectRepository(Allergy) private allergyRepo: Repository<Allergy>,
    @InjectRepository(Vaccine) private vaccineRepo: Repository<Vaccine>,
  ) {}

  async generate(userId: string) {
    const patient = await this.patientRepo.findOne({ where: { user_id: userId } });
    if (!patient) throw new NotFoundException('Paciente no encontrado');

    // Revocar códigos anteriores activos
    await this.codeRepo.update(
      { patient_id: patient.id, revocado: false, usado: false },
      { revocado: true },
    );

    const plainCode = randomCode(8);
    const code_hash = await bcrypt.hash(plainCode, 10);
    const expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    await this.codeRepo.save(
      this.codeRepo.create({ patient_id: patient.id, code_hash, expires_at }),
    );

    return {
      code: plainCode,
      expires_at,
      message: 'Código generado. Válido por 10 minutos.',
    };
  }

  async verify(plainCode: string) {
    const allActive = await this.codeRepo.find({
      where: { revocado: false, usado: false },
    });

    let matched: AccessCode | null = null;
    for (const ac of allActive) {
      const ok = await bcrypt.compare(plainCode, ac.code_hash);
      if (ok) { matched = ac; break; }
    }

    if (!matched) throw new UnauthorizedException('Código inválido o no encontrado');
    if (new Date() > matched.expires_at) {
      await this.codeRepo.update(matched.id, { revocado: true });
      throw new UnauthorizedException('El código ha expirado');
    }

    // Marcar como usado
    await this.codeRepo.update(matched.id, { usado: true });

    return this.buildSnapshot(matched.patient_id);
  }

  async revoke(userId: string) {
    const patient = await this.patientRepo.findOne({ where: { user_id: userId } });
    if (!patient) throw new NotFoundException('Paciente no encontrado');

    const result = await this.codeRepo.update(
      { patient_id: patient.id, revocado: false, usado: false },
      { revocado: true },
    );

    return { message: `Acceso revocado (${result.affected} código/s invalidado/s)` };
  }

  private async buildSnapshot(patientId: string) {
    const patient = await this.patientRepo.findOne({
      where: { id: patientId },
      relations: { user: true },
    });
    if (!patient) throw new NotFoundException();

    const { password, ...safeUser } = patient.user as any;

    const [alergias, medicamentosActivos, ultimasConsultas, vacunas] = await Promise.all([
      this.allergyRepo.find({ where: { patient_id: patientId } }),
      this.medRepo.find({ where: { patient_id: patientId, estado: EstadoMedicamento.ACTIVO } }),
      this.historyRepo.find({
        where: { patient_id: patientId },
        order: { fecha: 'DESC' },
        take: 5,
      }),
      this.vaccineRepo.find({ where: { patient_id: patientId } }),
    ]);

    return {
      paciente: {
        nombre: safeUser.nombre,
        email: safeUser.email,
        fecha_nacimiento: safeUser.fecha_nacimiento,
        tipo_sangre: safeUser.tipo_sangre,
        peso: patient.peso,
        altura: patient.altura,
        presion_arterial: patient.presion_arterial,
        frecuencia_cardiaca: patient.frecuencia_cardiaca,
        temperatura: patient.temperatura,
        contacto_emergencia: patient.contacto_emergencia,
        telefono_emergencia: patient.telefono_emergencia,
      },
      alergias,
      medicamentos_activos: medicamentosActivos,
      ultimas_consultas: ultimasConsultas,
      vacunas,
      generado_en: new Date(),
      message: 'Snapshot de paciente (solo lectura)',
    };
  }
}
