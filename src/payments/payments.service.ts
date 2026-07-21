import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, In, Repository } from 'typeorm';
import { Subscription, SubscriptionPlan } from './entities/subscription.entity';
import { User } from '../auth/entities/user.entity';
import { FlowClientService } from './flow-client.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  // "Suscripción vigente" = status IN ('pending', 'active', 'past_due').
  private readonly VIGENTE = ['pending', 'active', 'past_due'] as const;

  constructor(
    @InjectRepository(Subscription) private readonly subRepo: Repository<Subscription>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly flow: FlowClientService,
    private readonly config: ConfigService,
  ) {}

  // ── Checkout (R8–R12) ────────────────────────────────────────────────────────
  async checkout(user: User, plan: SubscriptionPlan): Promise<{ checkout_url: string }> {
    this.flow.assertConfigured(); // R6

    const existing = await this.subRepo.findOne({
      where: { user_id: user.id, status: In(this.VIGENTE) },
    });
    if (existing) {
      throw new ConflictException('Ya tienes una suscripción en curso.'); // R10
    }

    this.resolveFlowPlanId(plan); // R6: incluye validar FLOW_PLAN_ID_<PLAN> antes de llamar a Flow

    // Reutiliza flow_customer_id de cualquier intento previo del usuario si existe.
    const previous = await this.subRepo.findOne({
      where: { user_id: user.id },
      order: { created_at: 'DESC' },
    });
    let flowCustomerId = previous?.flow_customer_id ?? null;

    if (!flowCustomerId) {
      const { customerId } = await this.flow.createCustomer({
        name: user.nombre,
        email: user.email,
        externalId: user.id,
      });
      flowCustomerId = customerId;
    }

    const { url, token } = await this.flow.registerCustomer({
      customerId: flowCustomerId,
      urlReturn: `${this.frontendBaseUrl()}/elegir-plan`,
      urlConfirmation: `${this.apiPublicUrl()}/payments/webhook`,
    });

    await this.subRepo.save(
      this.subRepo.create({
        user_id: user.id,
        plan,
        flow_customer_id: flowCustomerId,
        flow_register_token: token,
        status: 'pending',
      }),
    ); // R8, R11 — no toca user.plan (el plan de Flow se resuelve de nuevo al confirmar, R15)

    return { checkout_url: `${url}?token=${token}` };
  }

  // ── Webhook (R13–R18) ───────────────────────────────────────────────────────
  async handleWebhook(token: string): Promise<{ message: string }> {
    const status = await this.flow.getRegisterStatus(token); // R14 — SIEMPRE reconsulta
    const sub = await this.subRepo.findOne({ where: { flow_register_token: token } });

    if (!sub) {
      this.logger.warn(`Webhook con token sin Subscription local asociada: ${token}`);
      return { message: 'OK' }; // no hay nada que hacer localmente; no reintentar en bucle
    }
    if (sub.status === 'active') {
      return { message: 'OK' }; // R17 — idempotencia
    }

    if (!this.isConfirmedSuccess(status)) {
      sub.status = 'expired';
      await this.subRepo.save(sub);
      return { message: 'OK' }; // R16 — nunca activa
    }

    const { subscriptionId } = await this.flow.createSubscription({
      customerId: sub.flow_customer_id!,
      planId: this.resolveFlowPlanId(sub.plan),
    });
    const details = await this.flow.getSubscription(subscriptionId);

    await this.dataSource.transaction(async (trx) => {
      sub.status = 'active';
      sub.flow_subscription_id = subscriptionId;
      sub.current_period_end = this.parsePeriodEnd(details); // null + warning si el campo no viene
      await trx.save(sub);
      await trx.update(User, { id: sub.user_id }, { plan: sub.plan });
    }); // R15 — atómico: Subscription + User.plan

    return { message: 'OK' };
  }

  // ── Consultar estado (R19–R21) ──────────────────────────────────────────────
  async getSubscription(user: User) {
    const sub = await this.subRepo.findOne({
      where: { user_id: user.id, status: In(this.VIGENTE) },
      order: { created_at: 'DESC' },
    });
    if (!sub) {
      return { plan: 'free', status: null, current_period_end: null, cancel_at_period_end: false }; // R20
    }
    return {
      plan: sub.plan,
      status: sub.status,
      current_period_end: sub.current_period_end,
      cancel_at_period_end: sub.cancel_at_period_end,
    }; // R19
  }

  // ── Cancelación (R22–R26) ───────────────────────────────────────────────────
  async cancel(user: User): Promise<{ message: string; current_period_end: Date | null }> {
    const sub = await this.subRepo.findOne({
      where: { user_id: user.id, status: In(['active', 'past_due']) },
      order: { created_at: 'DESC' },
    });
    if (!sub) {
      throw new NotFoundException('No tienes una suscripción activa para cancelar.'); // R23
    }
    if (sub.cancel_at_period_end) {
      return {
        message: 'La cancelación ya estaba programada.',
        current_period_end: sub.current_period_end,
      }; // R25 — idempotente, sin volver a llamar a Flow
    }

    // Si falla, lanza (503) ANTES de tocar la BD local (R24).
    await this.flow.cancelSubscription(sub.flow_subscription_id!);

    sub.cancel_at_period_end = true;
    await this.subRepo.save(sub); // R22 — status y user.plan NO cambian aquí
    return {
      message: 'Cancelación programada. Conservas tu plan hasta el fin del periodo pagado.',
      current_period_end: sub.current_period_end,
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /** Resuelve el id del Plan de Flow correspondiente; 503 sin red si falta (R6). */
  private resolveFlowPlanId(plan: SubscriptionPlan): string {
    const key = plan === 'pro' ? 'FLOW_PLAN_ID_PRO' : 'FLOW_PLAN_ID_FAMILY';
    const value = this.config.get<string>(key);
    if (!value) {
      throw new ServiceUnavailableException(
        `Pagos con Flow no están disponibles para el plan '${plan}' en este entorno (falta ${key}).`,
      );
    }
    return value;
  }

  /**
   * Interpreta la respuesta de `customer/getRegisterStatus` de forma
   * FAIL-CLOSED (design.md §8, punto 2: los valores exactos de este campo NO
   * están confirmados contra la documentación real de Flow en este entorno,
   * sin acceso a internet). Solo un valor EXPLÍCITAMENTE reconocido como
   * éxito se trata como confirmado; cualquier otro valor (incluido
   * ausente/desconocido) se trata como NO confirmado (R16).
   */
  private isConfirmedSuccess(status: Record<string, any>): boolean {
    const raw = status?.status;
    if (raw === 1 || raw === '1') return true;
    if (typeof raw === 'string' && ['success', 'ok', 'confirmed'].includes(raw.toLowerCase())) {
      return true;
    }
    return false; // fail-closed
  }

  /**
   * Mapea defensivamente la fecha de fin de periodo desde la respuesta de
   * `subscription/get` (design.md §8, punto 3: el nombre exacto del campo NO
   * está confirmado). Si ningún candidato viene o no es una fecha válida,
   * persiste `null` y deja advertencia en el log, sin bloquear la activación
   * del plan (R15 no depende de tener esta fecha).
   */
  private parsePeriodEnd(details: Record<string, any>): Date | null {
    const candidates = [
      'next_charge_date',
      'nextChargeDate',
      'current_period_end',
      'currentPeriodEnd',
      'next_invoice_date',
    ];
    for (const key of candidates) {
      const value = details?.[key];
      if (!value) continue;
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    this.logger.warn(
      `No se pudo determinar current_period_end de la respuesta de Flow: ${JSON.stringify(details)}`,
    );
    return null;
  }

  /** URL pública de ESTE backend, usada para construir urlConfirmation (webhook). */
  private apiPublicUrl(): string {
    const configured = this.config.get<string>('API_PUBLIC_URL')?.trim();
    if (configured) return configured.replace(/\/+$/, '');
    const port = this.config.get<string>('PORT') || '3000';
    return `http://localhost:${port}`;
  }

  /**
   * URL pública base del frontend para `urlReturn`. Misma resolución que
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
