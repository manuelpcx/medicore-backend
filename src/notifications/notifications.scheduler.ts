import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { format, addDays, addMinutes, subMinutes, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

import { NotificationsService } from './notifications.service';
import { User } from '../auth/entities/user.entity';
import { Medication, EstadoMedicamento } from '../medications/entities/medication.entity';
import { MedicalHistory } from '../medical-history/entities/medical-history.entity';
import { Patient } from '../patients/entities/patient.entity';

const TZ = 'America/Santiago';

@Injectable()
export class NotificationsScheduler {
  private readonly logger = new Logger(NotificationsScheduler.name);

  constructor(
    private readonly notifService: NotificationsService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Medication) private readonly medRepo: Repository<Medication>,
    @InjectRepository(MedicalHistory) private readonly historyRepo: Repository<MedicalHistory>,
    @InjectRepository(Patient) private readonly patientRepo: Repository<Patient>,
  ) {}

  // ── Job 1: Resumen diario de medicamentos — 08:00 Santiago ─────────────────
  @Cron('0 8 * * *', { timeZone: TZ, name: 'daily-meds-reminder' })
  async handleDailyMedsReminder(): Promise<void> {
    this.logger.log('[Cron] Iniciando resumen diario de medicamentos…');

    try {
      // Traer todos los pacientes que tienen al menos 1 medicamento activo
      const activeMeds = await this.medRepo.find({
        where: { estado: EstadoMedicamento.ACTIVO, notificacion_activa: true },
        relations: { patient: { user: true } },
      });

      // Agrupar por user_id
      const byUser = new Map<string, { user: User; meds: Medication[] }>();
      for (const med of activeMeds) {
        const user = med.patient?.user;
        if (!user || !user.activo || !user.notif_daily_meds) continue;

        if (!byUser.has(user.id)) {
          byUser.set(user.id, { user, meds: [] });
        }
        byUser.get(user.id)!.meds.push(med);
      }

      let sent = 0;
      for (const { user, meds } of byUser.values()) {
        await this.notifService.sendDailyMedsReminder({
          nombre: user.nombre,
          email: user.email,
          medications: meds,
        });
        sent++;
      }

      this.logger.log(`[Cron] Resumen diario enviado a ${sent} usuario(s).`);
    } catch (err) {
      this.logger.error('[Cron] Error en resumen diario:', (err as Error).message);
    }
  }

  // ── Job 2: Aviso puntual de toma — cada 15 minutos ─────────────────────────
  @Cron('0,15,30,45 * * * *', { name: 'single-med-reminder' })
  async handleSingleMedReminder(): Promise<void> {
    try {
      const nowUtc = new Date();
      const nowLocal = toZonedTime(nowUtc, TZ);
      const windowCenter = format(nowLocal, 'HH:mm');

      // Calcular ventana ±7 minutos
      const minTime = format(toZonedTime(subMinutes(nowUtc, 7), TZ), 'HH:mm');
      const maxTime = format(toZonedTime(addMinutes(nowUtc, 7), TZ), 'HH:mm');

      this.logger.log(`[Cron] Ventana de notificación: ${minTime} – ${maxTime} (${TZ})`);

      // Buscar medicamentos activos con horario_notificacion en la ventana
      const meds = await this.medRepo
        .createQueryBuilder('med')
        .leftJoinAndSelect('med.patient', 'patient')
        .leftJoinAndSelect('patient.user', 'user')
        .where('med.estado = :estado', { estado: EstadoMedicamento.ACTIVO })
        .andWhere('med.notificacion_activa = true')
        .andWhere('med.horario_notificacion IS NOT NULL')
        .andWhere('med.horario_notificacion >= :minTime', { minTime })
        .andWhere('med.horario_notificacion <= :maxTime', { maxTime })
        .getMany();

      let sent = 0;
      for (const med of meds) {
        const user = med.patient?.user;
        if (!user || !user.activo || !user.notif_single_med) continue;

        await this.notifService.sendSingleMedReminder({
          nombre: user.nombre,
          email: user.email,
          medication: med,
        });
        sent++;
      }

      if (sent > 0) {
        this.logger.log(`[Cron] Avisos puntuales enviados: ${sent}`);
      }
    } catch (err) {
      this.logger.error('[Cron] Error en aviso puntual:', (err as Error).message);
    }
  }

  // ── Job 3: Recordatorio de controles médicos — 19:00 Santiago ──────────────
  @Cron('0 19 * * *', { timeZone: TZ, name: 'appointment-reminder' })
  async handleAppointmentReminder(): Promise<void> {
    this.logger.log('[Cron] Iniciando recordatorios de controles médicos…');

    try {
      // Calcular rango de mañana (fecha completa para comparar columna date)
      const mananaLocal = toZonedTime(addDays(new Date(), 1), TZ);
      const mananaStr = format(mananaLocal, 'yyyy-MM-dd');

      // Buscar registros con proxima_cita = mañana y recordatorio activo
      const appointments = await this.historyRepo
        .createQueryBuilder('h')
        .leftJoinAndSelect('h.patient', 'patient')
        .leftJoinAndSelect('patient.user', 'user')
        .where('h.recordatorio_activo = true')
        .andWhere('h.proxima_cita IS NOT NULL')
        .andWhere("TO_CHAR(h.proxima_cita, 'YYYY-MM-DD') = :manana", { manana: mananaStr })
        .getMany();

      let sent = 0;
      for (const appt of appointments) {
        const user = appt.patient?.user;
        if (!user || !user.activo || !user.notif_appointments) continue;

        await this.notifService.sendAppointmentReminder({
          nombre: user.nombre,
          email: user.email,
          appointment: appt,
        });
        sent++;
      }

      this.logger.log(`[Cron] Recordatorios de controles enviados: ${sent}`);
    } catch (err) {
      this.logger.error('[Cron] Error en recordatorios de controles:', (err as Error).message);
    }
  }
}
