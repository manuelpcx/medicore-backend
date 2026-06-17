import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

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

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: Transporter;

  constructor(private readonly config: ConfigService) {
    const port = this.config.get<number>('MAIL_PORT', 465);
    const secure = this.config.get<string>('MAIL_SECURE', port === 465 ? 'true' : 'false') === 'true';
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('MAIL_HOST', 'smtp.resend.com'),
      port,
      secure,
      auth: {
        user: this.config.get<string>('MAIL_USER', 'resend'),
        pass: this.config.get<string>('MAIL_PASS'),
      },
    });
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

  // ── Interno ─────────────────────────────────────────────────────────────────

  private async send(options: { to: string; subject: string; html: string }): Promise<void> {
    const from = this.config.get<string>('MAIL_FROM', 'Medi-History <no-reply@medi-history.app>');
    try {
      await this.transporter.sendMail({ from, ...options });
      this.logger.log(`Email enviado a ${options.to} — "${options.subject}"`);
    } catch (err) {
      // Nunca relanzar: un email fallido no debe tumbar el cron job
      this.logger.error(
        `Error enviando email a ${options.to}: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }
}
