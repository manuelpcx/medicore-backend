import {
  BadRequestException,
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, In, IsNull, LessThan, Not, Repository } from 'typeorm';
import { Subscription, SubscriptionPlan, SubscriptionStatus } from './entities/subscription.entity';
import { User } from '../auth/entities/user.entity';
import {
  MercadoPagoAutoRecurring,
  MercadoPagoClientService,
  MercadoPagoSubscriptionCreated,
} from './mercadopago-client.service';
import { MercadoPagoApiError } from './mercadopago-api.error';
import { verifyMercadoPagoSignature } from './mercadopago-signature.util';
import { hasProcessedCharge } from './mercadopago-summarized.util';
import { MercadoPagoWebhookDto } from './dto/mercadopago-webhook.dto';

export interface HandleWebhookInput {
  dto: MercadoPagoWebhookDto;
  xSignatureHeader: string | undefined;
  xRequestIdHeader: string | undefined;
  dataIdQueryParam: string | undefined;
}

/**
 * Forma de retorno de `getSubscription()` y (desde esta feature) también de
 * `checkout()`: el frontend consume el mismo tipo `SubscriptionState` en
 * ambos casos (ver `specs/mercadopago-checkout-bricks-tarjeta/design.md`
 * §3). `plan: 'free'` + `status: null` representa "sin suscripción vigente".
 */
export interface SubscriptionState {
  plan: SubscriptionPlan | 'free';
  status: SubscriptionStatus | null;
  current_period_end: Date | null;
  cancel_at_period_end: boolean;
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

  // ── Checkout (síncrono, con tokenización de tarjeta) ─────────────────────
  /**
   * `card_token_id` viene del Brick `<CardPayment>` de `@mercadopago/sdk-react`
   * en el frontend (nunca datos crudos de tarjeta). Llama a `POST
   * /preapproval` de forma SÍNCRONA con `card_token_id` + `status:
   * 'authorized'` y persiste la `Subscription` recién DESPUÉS de recibir esa
   * respuesta — nunca antes (a diferencia del flujo redirect de `#41`/`#42`,
   * ver design.md §8 punto 4).
   *
   * IMPORTANTE (desde `mercadopago-activar-plan-en-cobro-real`, R1-R4): la
   * respuesta síncrona `status:'authorized'` de `POST /preapproval` SOLO
   * confirma que la TARJETA es válida (a veces un cargo de validación de
   * $0) — NO que el cobro real del monto del plan se realizó. Por eso la
   * `Subscription` se crea en `'pending'`, SIN tocar `User.plan`; el plan
   * solo se activa cuando la rama `subscription_preapproval` del webhook (ya
   * existente, sin cambios) o la reconciliación de respaldo
   * (`reconcilePendingPayments()`, desde `fix-reconciliacion-authorized-payments-404`
   * usa `GET /preapproval/{id}` y su campo `summarized`) confirman el cobro
   * real.
   */
  async checkout(user: User, plan: SubscriptionPlan, cardTokenId: string): Promise<SubscriptionState> {
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
        cardTokenId,
      }); // POST /preapproval "sin plan asociado", CON card_token_id, status: 'authorized'
    } catch (err) {
      this.sanitizeCheckoutError(err);
    }

    if (created.status !== 'authorized') {
      // 2xx pero no autorizado: NO se persiste nada como activo (R16).
      this.logger.warn(
        `POST /preapproval devolvió status='${created.status}' (no 'authorized') para user ${user.id}, plan ${plan}. mp_preapproval_id=${created.id}`,
      );
      throw new BadRequestException('El pago no quedó confirmado. Intenta nuevamente.');
    }

    const sub = this.subRepo.create({
      user_id: user.id,
      plan,
      mp_preapproval_id: created.id,
      status: 'pending', // R1 — YA NO 'active': solo confirma que la tarjeta es válida, no el cobro real.
      current_period_end: this.parsePeriodEnd(created),
    });
    await this.subRepo.save(sub); // R2 — User.plan NO se toca aquí (se activa vía webhook/reconciliación)

    return {
      plan: sub.plan,
      status: sub.status,
      current_period_end: sub.current_period_end,
      cancel_at_period_end: sub.cancel_at_period_end,
    }; // R3
  }

  // ── Webhook (R5–R13, R28, R31) ────────────────────────────────────────────
  /**
   * `POST /payments/webhook`, público. Valida la firma `x-signature` ANTES
   * de procesar el body (R28, sin cambios respecto a `#41`/`#42`); despacha
   * por `type`:
   * - ausente o `'subscription_preapproval'` → lógica ya existente desde
   *   `#41` (cambios de autorización/cancelación de la suscripción), SIN
   *   cambios de comportamiento.
   * - cualquier otro `type` (incluido `'subscription_authorized_payment'`,
   *   retirado en `fix-reconciliacion-authorized-payments-404` R7: el
   *   endpoint `GET /authorized_payments/{id}` que usaba nunca tuvo
   *   evidencia de recibirse en producción, ver design.md §1.2) → 200 sin
   *   acción (R31, fuera de alcance: `payment`, `merchant_order`,
   *   `subscription_preapproval_plan`, `point_integration_wh`,
   *   `chargebacks`, `delivery`, ...). La activación diferida depende ahora
   *   de la rama `subscription_preapproval` de este webhook (sin cambios) y
   *   de `reconcilePendingPayments()` (reconciliación de respaldo vía
   *   `GET /preapproval/{id}`).
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
      throw new UnauthorizedException('Firma inválida.'); // R28 — sin filtrar detalle interno, nada modificado
    }

    const { dto } = input;
    const type = dto.type;

    if (type && type !== 'subscription_preapproval') {
      return { message: 'OK' }; // R31 — fuera de alcance
    }

    // type ausente o 'subscription_preapproval' — lógica EXISTENTE desde
    // #41/#42, sin cambios de comportamiento (verificación #43/#44).
    const sub = await this.subRepo.findOne({ where: { mp_preapproval_id: dto.data.id } });
    if (!sub) {
      this.logger.warn(`Webhook con data.id sin Subscription local asociada: ${dto.data.id}`);
      return { message: 'OK' }; // sin reintento en bucle
    }
    if (sub.status !== 'pending') {
      return { message: 'OK' }; // idempotencia; cancel()/PaymentsScheduler gobiernan lo posterior
    }

    // SIEMPRE reconsultar el estado autoritativo, nunca confiar en el payload del webhook.
    let authoritative: Record<string, any>;
    try {
      authoritative = await this.mercadoPago.getSubscription(sub.mp_preapproval_id!);
    } catch (err) {
      this.sanitizeMercadoPagoError(err);
    }

    const status = authoritative.status;
    if (status === 'authorized') {
      await this.activateSubscription(sub); // reemplaza el bloque inline anterior (T4), mismo comportamiento observable
    } else if (status === 'cancelled') {
      sub.status = 'expired';
      await this.subRepo.save(sub); // NO activa el plan
    }
    // 'pending'/'paused': sin cambios, se espera próxima notificación o polling del frontend.

    return { message: 'OK' };
  }

  /**
   * Activación compartida (R11, R14; reutilizada sin cambios por R3 de
   * `fix-reconciliacion-authorized-payments-404`): usada tanto por la rama
   * `subscription_preapproval` del webhook como por
   * `reconcilePendingPayments()`. Marca `Subscription.status='active'` +
   * `User.plan` en una transacción; recalcula `current_period_end` vía
   * `GET /preapproval/{id}`, sin bloquear la activación si ese dato no está
   * disponible o no es una fecha válida.
   */
  private async activateSubscription(sub: Subscription): Promise<void> {
    let periodEnd: Date | null = null;
    try {
      const authoritative = await this.mercadoPago.getSubscription(sub.mp_preapproval_id!);
      periodEnd = this.parsePeriodEnd(authoritative); // null + warning si no es fecha válida
    } catch (err) {
      this.logger.warn(
        `No se pudo recalcular current_period_end vía GET /preapproval/${sub.mp_preapproval_id} al activar la Subscription ${sub.id}: ${err instanceof Error ? err.message : String(err)}`,
      ); // R14 — no bloquea la activación
    }

    await this.dataSource.transaction(async (trx) => {
      sub.status = 'active';
      sub.current_period_end = periodEnd;
      await trx.save(sub);
      await trx.update(User, { id: sub.user_id }, { plan: sub.plan });
    }); // atómico: Subscription 'active' + User.plan
  }

  // ── Reconciliación de respaldo (R1–R5, R9) ────────────────────────────────
  /**
   * Invocada por `PaymentsScheduler` cada 10 minutos. Único mecanismo de
   * activación diferida confirmado-funcional hoy (`fix-reconciliacion-authorized-payments-404`,
   * design.md §1.2: ningún webhook tiene evidencia de recibirse en este
   * entorno de producción). Revisa `Subscription`s `pending` con más de 3
   * minutos de antigüedad llamando `GET /preapproval/{id}` (mismo endpoint
   * ya confirmado funcional que usa `activateSubscription()`, NO el
   * endpoint de búsqueda plural `GET /authorized_payments`, que da 404 real
   * en producción) e interpretando su campo `summarized` vía
   * `hasProcessedCharge()` (R2). Si una `Subscription` lleva más de 72h sin
   * resolución, la marca `'payment_failed'` en vez de dejarla pendiente
   * indefinidamente (R5). Cada fila se procesa en su propio try/catch
   * (loguea y continúa con las demás, sin abortar el batch — mismo patrón
   * que `PaymentsScheduler.handleDowngrade()`, R9).
   */
  async reconcilePendingPayments(): Promise<void> {
    const RECONCILE_AFTER_MS = 3 * 60 * 1000; // 3 minutos
    const FAIL_AFTER_MS = 72 * 60 * 60 * 1000; // 72 horas (valor conservador, ver design.md §7.2/§7.5)

    const threshold = new Date(Date.now() - RECONCILE_AFTER_MS);
    const stale = await this.subRepo.find({
      where: { status: 'pending', mp_preapproval_id: Not(IsNull()), created_at: LessThan(threshold) },
    });
    if (stale.length === 0) return;

    this.logger.log(`[Cron] Reconciliando ${stale.length} Subscription(s) pending…`);

    for (const sub of stale) {
      try {
        const authoritative = await this.mercadoPago.getSubscription(sub.mp_preapproval_id!); // GET /preapproval/{id}
        if (hasProcessedCharge(authoritative.summarized)) {
          await this.activateSubscription(sub); // R3
          continue;
        }

        if (Date.now() - sub.created_at.getTime() >= FAIL_AFTER_MS) {
          sub.status = 'payment_failed';
          await this.subRepo.save(sub); // R5 — timeout largo, sin limbo indefinido
        }
        // R4 — sin cobro detectado y sin superar el timeout: sin cambios, se reintenta en la próxima corrida.
      } catch (err) {
        this.logger.error(
          `Error reconciliando la Subscription ${sub.id} (mp_preapproval_id=${sub.mp_preapproval_id}): ${err instanceof Error ? err.message : String(err)}`,
        ); // R9 — continúa con el resto
      }
    }
  }

  // ── Consultar estado (R19) ───────────────────────────────────────────────
  async getSubscription(user: User): Promise<SubscriptionState> {
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
   * Variante de `sanitizeMercadoPagoError()` usada SOLO por `checkout()`
   * (ver design.md §5): distingue 4xx (rechazo de negocio — tarjeta
   * inválida, datos rechazados) de 5xx (indisponibilidad de MercadoPago),
   * porque el checkout con tarjeta necesita mostrarle al usuario un mensaje
   * accionable ("tarjeta rechazada, intenta con otra") en vez del genérico
   * 503 que sí basta para el resto del flujo (webhook/cancel).
   */
  private sanitizeCheckoutError(err: unknown): never {
    if (err instanceof MercadoPagoApiError) {
      if (err.status >= 400 && err.status < 500) {
        const body = err.body as { message?: unknown; error?: unknown } | undefined;
        const detail =
          typeof body?.message === 'string'
            ? body.message
            : typeof body?.error === 'string'
              ? body.error
              : undefined;
        throw new BadRequestException(
          detail ??
            'MercadoPago rechazó la tarjeta o los datos de pago. Verifica los datos e intenta con otra tarjeta.',
        ); // R17 — nunca el body crudo, pero SÍ el detalle si viene
      }
      throw new ServiceUnavailableException(
        'MercadoPago no está disponible en este momento. Intenta nuevamente.',
      ); // R18 — 5xx / cuerpo no parseable
    }
    throw err; // errores no tipados (red/timeout) ya vienen como
    // ServiceUnavailableException desde mercadopago-client.service.ts
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
