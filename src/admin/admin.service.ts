import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { Patient } from '../patients/entities/patient.entity';
import { MedicalHistory } from '../medical-history/entities/medical-history.entity';
import { Medication } from '../medications/entities/medication.entity';
import { Exam } from '../exams/entities/exam.entity';
import { AccessCode } from '../access-codes/entities/access-code.entity';
import { ListUsersDto } from './dto/list-users.dto';
import { decrypt } from '../common/crypto/encryption';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Patient)
    private patientRepo: Repository<Patient>,
    @InjectRepository(MedicalHistory)
    private historyRepo: Repository<MedicalHistory>,
    @InjectRepository(Medication)
    private medRepo: Repository<Medication>,
    @InjectRepository(Exam)
    private examRepo: Repository<Exam>,
    @InjectRepository(AccessCode)
    private accessCodeRepo: Repository<AccessCode>,
  ) {}

  async getStats() {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setDate(now.getDate() - 30);

    const [
      total_users,
      users_this_week,
      users_this_month,
      active_users_last_7_days,
      total_medical_history,
      total_medications,
      total_exams,
      total_access_codes_generated,
    ] = await Promise.all([
      this.userRepo.count(),
      this.userRepo.count({ where: { created_at: MoreThanOrEqual(weekAgo) } }),
      this.userRepo.count({ where: { created_at: MoreThanOrEqual(monthAgo) } }),
      this.userRepo.count({ where: { last_login_at: MoreThanOrEqual(weekAgo) } }),
      this.historyRepo.count(),
      this.medRepo.count(),
      this.examRepo.count(),
      this.accessCodeRepo.count(),
    ]);

    const signups_by_day = await this.getSignupsByDay(30);

    return {
      total_users,
      users_this_week,
      users_this_month,
      active_users_last_7_days,
      total_medical_history,
      total_medications,
      total_exams,
      total_access_codes_generated,
      signups_by_day,
    };
  }

  /**
   * Registros por día de los últimos `days` días, con los días sin altas
   * rellenados en 0 para que el gráfico sea continuo.
   * Agrupa en SQL (no trae registros a memoria).
   */
  private async getSignupsByDay(days: number) {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    from.setDate(from.getDate() - (days - 1));

    const rows = await this.userRepo
      .createQueryBuilder('u')
      .select("TO_CHAR(u.created_at, 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('u.created_at >= :from', { from })
      .groupBy("TO_CHAR(u.created_at, 'YYYY-MM-DD')")
      .getRawMany<{ date: string; count: string }>();

    const counts = new Map(rows.map((r) => [r.date, Number(r.count)]));

    const result: { date: string; count: number }[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(from);
      d.setDate(from.getDate() + i);
      const key = this.formatDate(d);
      result.push({ date: key, count: counts.get(key) ?? 0 });
    }
    return result;
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  async listUsers(dto: ListUsersDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const base = this.userRepo
      .createQueryBuilder('u')
      .leftJoin('patients', 'p', 'p.user_id = u.id');

    // La búsqueda es solo por email: `nombre` está cifrado (IV aleatorio),
    // por lo que no es filtrable con ILIKE.
    if (dto.search) {
      base.where('u.email ILIKE :s', { s: `%${dto.search}%` });
    }

    const total = await base.getCount();

    const rows = await base
      .clone()
      .select('u.id', 'id')
      .addSelect('u.nombre', 'nombre')
      .addSelect('u.email', 'email')
      .addSelect('u.created_at', 'fecha_registro')
      .addSelect('u.last_login_at', 'fecha_ultimo_login')
      .addSelect(
        '(SELECT COUNT(*) FROM medical_history mh WHERE mh.patient_id = p.id)',
        'cantidad_consultas',
      )
      .addSelect(
        '(SELECT COUNT(*) FROM exams e WHERE e.patient_id = p.id)',
        'cantidad_examenes',
      )
      .orderBy('u.created_at', 'DESC')
      .offset(skip)
      .limit(limit)
      .getRawMany();

    const data = rows.map((r) => ({
      id: r.id,
      // `nombre` viene crudo de getRawMany (el transformer no aplica en raw) -> descifrar.
      nombre: r.nombre ? decrypt(r.nombre) : r.nombre,
      email: r.email,
      fecha_registro: r.fecha_registro,
      fecha_ultimo_login: r.fecha_ultimo_login,
      cantidad_consultas: Number(r.cantidad_consultas) || 0,
      cantidad_examenes: Number(r.cantidad_examenes) || 0,
      // El campo `plan` aún no existe en el modelo; se expone como null.
      plan: null,
    }));

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit) || 0,
      },
    };
  }

  async getUserDetail(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: { patient: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    let actividad = {
      consultas: 0,
      medicamentos: 0,
      examenes: 0,
      codigos_generados: 0,
    };

    if (user.patient?.id) {
      const patientId = user.patient.id;
      const [consultas, medicamentos, examenes, codigos_generados] =
        await Promise.all([
          this.historyRepo.count({ where: { patient_id: patientId } }),
          this.medRepo.count({ where: { patient_id: patientId } }),
          this.examRepo.count({ where: { patient_id: patientId } }),
          this.accessCodeRepo.count({ where: { patient_id: patientId } }),
        ]);
      actividad = { consultas, medicamentos, examenes, codigos_generados };
    }

    return {
      usuario: this.sanitize(user),
      actividad,
      fecha_registro: user.created_at,
      fecha_ultimo_login: user.last_login_at,
    };
  }

  /** Elimina password y cualquier dato sensible antes de exponer el usuario. */
  private sanitize(user: User) {
    const { password, patient, ...safe } = user as any;
    return safe;
  }
}
