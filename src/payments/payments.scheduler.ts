import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In, LessThan, Repository } from 'typeorm';
import { Subscription } from './entities/subscription.entity';
import { User } from '../auth/entities/user.entity';

/**
 * Job programado: baja a `free` a los usuarios cuya suscripción canceló
 * (`cancel_at_period_end=true`) y ya pasó su `current_period_end`. No
 * requiere `FlowClientService` configurado: opera solo sobre datos locales.
 */
@Injectable()
export class PaymentsScheduler {
  private readonly logger = new Logger(PaymentsScheduler.name);

  constructor(
    @InjectRepository(Subscription) private readonly subRepo: Repository<Subscription>,
    @InjectDataSource() private readonly dataSource: DataSource,
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
}
