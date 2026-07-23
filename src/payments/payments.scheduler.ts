import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In, LessThan, Repository } from 'typeorm';
import { Subscription } from './entities/subscription.entity';
import { User } from '../auth/entities/user.entity';
import { PaymentsService } from './payments.service';

/**
 * Job programado: baja a `free` a los usuarios cuya suscripción canceló
 * (`cancel_at_period_end=true`) y ya pasó su `current_period_end`. No
 * requiere `FlowClientService` configurado: opera solo sobre datos locales.
 *
 * También ejecuta la reconciliación de respaldo de pagos `pending`
 * (`mercadopago-activar-plan-en-cobro-real`, R15): no depende únicamente de
 * la entrega del webhook `subscription_authorized_payment`.
 */
@Injectable()
export class PaymentsScheduler {
  private readonly logger = new Logger(PaymentsScheduler.name);

  constructor(
    @InjectRepository(Subscription) private readonly subRepo: Repository<Subscription>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR, { name: 'subscriptions-downgrade' }) // R27
  async handleDowngrade(): Promise<void> {
    const due = await this.subRepo.find({
      where: {
        cancel_at_period_end: true,
        status: In(['active', 'past_due']),
        current_period_end: LessThan(new Date()),
      },
    }); // R28 — solo toca lo vencido y con cancelación programada

    if (due.length === 0) return;

    this.logger.log(`[Cron] Bajando a free ${due.length} suscripción(es) vencida(s)…`);

    for (const sub of due) {
      try {
        await this.dataSource.transaction(async (trx) => {
          sub.status = 'cancelled';
          await trx.save(sub);
          await trx.update(User, { id: sub.user_id }, { plan: 'free' });
        });
      } catch (err) {
        this.logger.error(
          `Error bajando a free la Subscription ${sub.id}: ${(err as Error).message}`,
        );
        // continúa con el resto (R29)
      }
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES, { name: 'subscriptions-reconcile-payments' }) // R15
  async handleReconcilePendingPayments(): Promise<void> {
    try {
      await this.paymentsService.reconcilePendingPayments();
    } catch (err) {
      this.logger.error(
        `Error en la reconciliación de pagos pending: ${(err as Error).message}`,
      ); // mismo patrón que handleDowngrade(): loguea y no bloquea el resto del scheduler
    }
  }
}
