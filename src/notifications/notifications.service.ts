import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

import {
  dailyMedsSubject,
  dailyMedsHtml,
  type DailyMedsEmailData,
} from './templates/daily-meds.template';
import {
  singleMedSubject,
  singleMedHtml,
  type SingleMedEmailData,
} from './templates/single-med.template';
import {
  appointmentSubject,
  appointmentHtml,
  type AppointmentEmailData,
} from './templates/appointment-reminder.template';
import {
  familyInvitationSubject,
  familyInvitationHtml,
  type FamilyInvitationEmailData,
} from './templates/family-invitation.template';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly apiKey?: string;
  private readonly from: string;
  private readonly resend?: Resend;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    this.apiKey = apiKey;
    this.from = this.config.get<string>(
      'MAIL_FROM',
      'MediHistory <no-reply@mediHistory.app>',
    );
    // Instanciar el cliente solo si hay key: evita warnings del SDK con
    // `new Resend(undefined)` y deja un flag limpio (`!!this.resend`) que
    // gobierna el degradado a log cuando falta la key.
    this.resend = apiKey ? new Resend(apiKey) : undefined;
  }

  onModuleInit(): void {
    // Sin llamada de red: solo se comprueba la presencia de la API key.
    if (this.resend) {
      this.logger.log('Resend listo — envío de correos habilitado (API HTTP).');
    } else {
      this.logger.warn(
        'RESEND_API_KEY ausente: los correos se registrarán en log pero NO se enviarán.',
      );
    }
  }

  // ── Métodos públicos ────────────────────────────────────────────────────────

  async sendDailyMedsReminder(data: DailyMedsEmailData): Promise<void> {
    await this.send({
      to: data.email,
      subject: dailyMedsSubject(),
      html: dailyMedsHtml(data),
    });
  }

  async sendSingleMedReminder(data: SingleMedEmailData): Promise<void> {
    await this.send({
      to: data.email,
      subject: singleMedSubject(data.medication.nombre),
      html: singleMedHtml(data),
    });
  }

  async sendAppointmentReminder(data: AppointmentEmailData): Promise<void> {
    await this.send({
      to: data.email,
      subject: appointmentSubject(),
      html: appointmentHtml(data),
    });
  }

  async sendFamilyInvitation(data: FamilyInvitationEmailData): Promise<void> {
    await this.send({
      to: data.email,
      subject: familyInvitationSubject(data.inviterName),
      html: familyInvitationHtml(data),
    });
  }

  // ── Interno ─────────────────────────────────────────────────────────────────

  private async send(options: { to: string; subject: string; html: string }): Promise<void> {
    const { to, subject, html } = options;

    // Degradado sin key: log claro y sin llamada de red. Nunca lanza.
    if (!this.resend) {
      this.logger.warn(
        `RESEND_API_KEY ausente: correo a ${to} NO enviado — "${subject}"`,
      );
      return;
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.from,
        to,
        subject,
        html,
      });

      // Error de aplicación de Resend (dominio no verificado, 4xx, key
      // inválida…): se registra el motivo y NO se relanza.
      if (error) {
        this.logger.error(
          `Error de Resend enviando a ${to} — "${subject}": ${error.name} — ${error.message}`,
        );
        return;
      }

      this.logger.log(
        `Email enviado a ${to} — id ${data?.id} — "${subject}"`,
      );
    } catch (err) {
      // Rechazo de la promesa (red/timeout). Nunca relanzar: un email
      // fallido no debe tumbar el cron job ni la invitación familiar.
      this.logger.error(
        `Error enviando email a ${to}: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }
}
