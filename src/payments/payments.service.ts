import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, In, Repository } from 'typeorm';
import { Subscription, SubscriptionPlan } from './entities/subscription.entity';
import { User } from '../auth/entities/user.entity';
import {
  MercadoPagoAutoRecurring,
  MercadoPagoClientService,
  MercadoPagoSubscriptionCreated,
} from './mercadopago-client.service';
import { MercadoPagoApiError } from './mercadopago-api.error';
import { verifyMercadoPagoSignature } from './mercadopago-signature.util';
import { MercadoPagoWebhookDto } from './dto/mercadopago-webhook.dto';

export interface HandleWebhookInput {
  dto: MercadoPagoWebhookDto;
  xSignatureHeader: string | undefined;
  xRequestIdHeader: string | undefined;
  dataIdQueryParam: string | undefined;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  // "Suscripción vigente" = status IN ('pending', 'active', 'past_due').
  private readonly VIGENTE = ['pending', 'active', 'past_due'] as const;

  constructor(
    @InjectRepository(Subscription) private readonly subRepo: Repository<Subscription>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly mercadoPago: MercadoPagoClientService,
    private readonly config: ConfigService,
  ) {}

  // ── Checkout ──────────────────────────────────────────────────────────────
  async checkout(user: User, plan: SubscriptionPlan): Promise<{ checkout_url: string }> {
    this.mercadoPago.assertConfigured();

    const vigentes = await this.subRepo.find({
      where: { user_id: user.id, status: In(this.VIGENTE) },
    });
    const bloqueante = vigentes.find((s) => s.status === 'active' || s.status === 'past_due');
    if (bloqueante) {
      throw new ConflictException('Ya tienes una suscripción en curso.'); // 409, sin regresión
    }
    for (const stuck of vigentes) {
      stuck.status = 'expired'; // intento previo 'pending' que nunca se completó
    }
    if (vigentes.length) await this.subRepo.save(vigentes);

    let created: MercadoPagoSubscriptionCreated;
    try {
      created = await this.mercadoPago.createSubscription({
        reason: this.planReason(plan),
        payerEmail: user.email,
        externalReference: user.id,
        autoRecurring: this.buildAutoRecurring(plan),
        backUrl: `${this.frontendBaseUrl()}/elegir-plan`,
      }); // POST /preapproval "sin plan asociado", SIN preapproval_plan_id ni card_token_id, status: 'pending'
    } catch (err) {
      this.sanitizeMercadoPagoError(err);
    }

    await this.subRepo.save(
      this.subRepo.create({
        user_id: user.id,
        plan,
        mp_preapproval_id: created.id,
        status: 'pending',
      }),
    );

    return { checkout_url: created.init_point };
  }

  // ── Webhook (R9–R18) ─────────────────────────────────────────────────────
  /**
   * `POST /payments/webhook`, público (R9). Valida la firma `x-signature`
   * ANTES de procesar el body (R10, R11); si el tipo no es
   * `subscription_preapproval` no hace nada (R12); busca la Subscription
   * local por `mp_preapproval_id` (R13); si no es `pending` no hace nada
   * (idempotencia, R14); SIEMPRE reconsulta el estado autoritativo contra
   * MercadoPago antes de activar (R15) y aplica el mapeo de estados
   * (R16–R18).
   */
  async handleWebhook(input: HandleWebhookInput): Promise<{ message: string }> {
    const secret = this.config.get<string>('MERCADOPAGO_WEBHOOK_SECRET');
    const valid = verifyMercadoPagoSignature({
      xSignatureHeader: input.xSignatureHeader,
      xRequestIdHeader: input.xRequestIdHeader,
      dataIdQueryParam: input.dataIdQueryParam,
      secret: secret ?? '',
    });
    if (!secret || !valid) {
      this.logger.warn(
        'Webhook de MercadoPago rechazado: firma x-signature inválida, ausente o MERCADOPAGO_WEBHOOK_SECRET no configurado.',
      );
      throw new UnauthorizedException('Firma inválida.'); // R11 — sin filtrar detalle interno, nada modificado
    }

    const { dto } = input;
    if (dto.type && dto.type !== 'subscription_preapproval') {
      return { message: 'OK' }; // R12 — fuera de alcance (payment, subscription_authorized_payment, ...)
    }

    const sub = await this.subRepo.findOne({ where: { mp_preapproval_id: dto.data.id } });
    if (!sub) {
      this.logger.warn(`Webhook con data.id sin Subscription local asociada: ${dto.data.id}`);
      return { message: 'OK' }; // R13 — sin reintento en bucle
    }
    if (sub.status !== 'pending') {
      return { message: 'OK' }; // R14 — idempotencia; cancel()/PaymentsScheduler gobiernan lo posterior
    }

    // R15 — SIEMPRE reconsultar el estado autoritativo, nunca confiar en el payload del webhook.
    let authoritative: Record<string, any>;
    try {
      authoritative = await this.mercadoPago.getSubscription(sub.mp_preapproval_id!);
    } catch (err) {
      this.sanitizeMercadoPagoError(err);
    }

    const status = authoritative.status;
    if (status === 'authorized') {
      await this.dataSource.transaction(async (trx) => {
        sub.status = 'active';
        sub.current_period_end = this.parsePeriodEnd(authoritative); // null + warning si no es fecha válida
        await trx.save(sub);
        await trx.update(User, { id: sub.user_id }, { plan: sub.plan });
      }); // R16 — atómico: Subscription + User.plan
    } else if (status === 'cancelled') {
      sub.status = 'expired';
      await this.subRepo.save(sub); // R17 — NO activa el plan
    }
    // R18 — 'pending'/'paused': sin cambios, se espera próxima notificación o polling del frontend.

    return { message: 'OK' };
  }

  // ── Consultar estado (R19) ───────────────────────────────────────────────
  async getSubscription(user: User) {
    const sub = await this.subRepo.findOne({
      where: { user_id: user.id, status: In(this.VIGENTE) },
      order: { created_at: 'DESC' },
    });
    if (!sub) {
      return { plan: 'free', status: null, current_period_end: null, cancel_at_period_end: false };
    }
    return {
      plan: sub.plan,
      status: sub.status,
      current_period_end: sub.current_period_end,
      cancel_at_period_end: sub.cancel_at_period_end,
    }; // R19 — lee solo la tabla local, mismo contrato
  }

  // ── Cancelación (R20–R23) ────────────────────────────────────────────────
  async cancel(user: User): Promise<{ message: string; current_period_end: Date | null }> {
    const sub = await this.subRepo.findOne({
      where: { user_id: user.id, status: In(['active', 'past_due']) },
      order: { created_at: 'DESC' },
    });
    if (!sub) {
      throw new NotFoundException('No tienes una suscripción activa para cancelar.');
    }
    if (sub.cancel_at_period_end) {
      return {
        message: 'La cancelación ya estaba programada.',
        current_period_end: sub.current_period_end,
      }; // R20 — idempotente, sin volver a llamar a MercadoPago
    }

    // Si falla, lanza (503) ANTES de tocar la BD local (R22, fail-closed).
    try {
      await this.mercadoPago.cancelSubscription(sub.mp_preapproval_id!); // R21 — PUT /preapproval/{id} {status:'cancelled'}
    } catch (err) {
      this.sanitizeMercadoPagoError(err);
    }

    sub.cancel_at_period_end = true;
    await this.subRepo.save(sub); // R23 — status y user.plan NO cambian aquí
    return {
      message: 'Cancelación programada. Conservas tu plan hasta el fin del periodo pagado.',
      current_period_end: sub.current_period_end,
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Re-lanza cualquier `MercadoPagoApiError` como 503 genérica; lo demás
   * pasa tal cual. Garantiza que el body/message crudos de MercadoPago NUNCA
   * llegan al cliente HTTP.
   */
  private sanitizeMercadoPagoError(err: unknown): never {
    if (err instanceof MercadoPagoApiError) {
      throw new ServiceUnavailableException(
        'MercadoPago no está disponible en este momento. Intenta nuevamente.',
      );
    }
    throw err;
  }

  /**
   * Arma `auto_recurring` directamente (sin consultar `GET
   * /preapproval_plan/{id}`, retirado en el fix de
   * `fix-mercadopago-preapproval-sin-plan`): mismos montos que
   * `medicore-frontend/src/utils/plans.ts` ya muestra al usuario (Pro
   * $4.990/mes, Family $8.990/mes, CLP sin decimales).
   */
  private buildAutoRecurring(plan: SubscriptionPlan): MercadoPagoAutoRecurring {
    return {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: plan === 'pro' ? 4990 : 8990,
      currency_id: 'CLP',
    };
  }

  /** Razón/descripción de la suscripción mostrada por MercadoPago en el checkout. */
  private planReason(plan: SubscriptionPlan): string {
    return plan === 'pro' ? 'Medicore Plan Pro' : 'Medicore Plan Family';
  }

  /**
   * Deriva `current_period_end` de `next_payment_date` (R16). Si el campo no
   * viene o no es una fecha válida, persiste `null` con advertencia en log,
   * sin bloquear la activación del plan.
   */
  private parsePeriodEnd(details: Record<string, any>): Date | null {
    const raw = details?.next_payment_date;
    if (!raw) {
      this.logger.warn(
        `No se pudo determinar current_period_end (falta next_payment_date) en la respuesta de MercadoPago: ${JSON.stringify(details)}`,
      );
      return null;
    }
    const parsed = new Date(raw);
    if (isNaN(parsed.getTime())) {
      this.logger.warn(`next_payment_date no es una fecha válida: ${String(raw)}`);
      return null;
    }
    return parsed;
  }

  /**
   * URL pública base del frontend para `back_url`. Misma resolución que
   * `FamilyService.resolvePublicBaseUrl()`: APP_URL → primer origen de
   * CORS_ORIGIN → fallback local.
   */
  private frontendBaseUrl(): string {
    const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

    const appUrl = this.config.get<string>('APP_URL')?.trim();
    if (appUrl) return stripTrailingSlash(appUrl);

    const corsOrigin = this.config.get<string>('CORS_ORIGIN');
    if (corsOrigin) {
      const firstOrigin = corsOrigin.split(',')[0].trim();
      if (firstOrigin) return stripTrailingSlash(firstOrigin);
    }

    return 'http://localhost:5173';
  }
}
