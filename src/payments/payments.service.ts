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
import { FlowApiError } from './flow-api.error';

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

    const vigentes = await this.subRepo.find({
      where: { user_id: user.id, status: In(this.VIGENTE) },
    });
    const bloqueante = vigentes.find((s) => s.status === 'active' || s.status === 'past_due');
    if (bloqueante) {
      throw new ConflictException('Ya tienes una suscripción en curso.'); // R15 (409 como hoy)
    }
    for (const stuck of vigentes) {
      stuck.status = 'expired'; // R14 — intento previo que nunca se completó
    }
    if (vigentes.length) await this.subRepo.save(vigentes);

    this.resolveFlowPlanId(plan); // R6: incluye validar FLOW_PLAN_ID_<PLAN> antes de llamar a Flow

    // Reutiliza flow_customer_id de cualquier intento previo del usuario si existe.
    const previous = await this.subRepo.findOne({
      where: { user_id: user.id },
      order: { created_at: 'DESC' },
    });
    let flowCustomerId = previous?.flow_customer_id ?? null;

    if (!flowCustomerId) {
      try {
        const { customerId } = await this.flow.createCustomer({
          name: user.nombre,
          email: user.email,
          externalId: user.id,
        });
        flowCustomerId = customerId;
      } catch (err) {
        if (!this.isCustomerExistsError(err)) this.sanitizeFlowError(err);
        // Flow ya tiene un customer con este externalId (intento previo cuya
        // fila local ya no existe): recuperarlo vía customer/list (R6–R8).
        flowCustomerId = await this.recoverCustomerId(user);
        if (!flowCustomerId) {
          throw new ServiceUnavailableException(
            'No pudimos recuperar tu registro de pago en Flow. Intenta nuevamente más tarde.',
          ); // R10 — caso anómalo, sin crash, nada activado
        }
      }
    }

    // R11 — inspeccionar el customer ANTES de decidir el paso de registro.
    let customer: Record<string, any>;
    try {
      customer = await this.flow.getCustomer(flowCustomerId);
    } catch (err) {
      this.sanitizeFlowError(err); // R20 — fallo de Flow → 503 genérica, sin crash
    }

    if (this.hasRegisteredCard(customer)) {
      // Tarjeta YA registrada en Flow (intento previo completado): saltar
      // customer/register y activar de inmediato (R12–R16). La fila pending se
      // persiste ANTES de llamar a Flow para que el método compartido opere
      // sobre una entidad real (igual que el webhook); si subscription/create
      // falla, queda pending sin plan activado (fail-closed, R16) y el
      // supersede de #34 la marcará expired en el siguiente intento (R18).
      const sub = await this.subRepo.save(
        this.subRepo.create({
          user_id: user.id,
          plan,
          flow_customer_id: flowCustomerId,
          status: 'pending', // sin flow_register_token: no hay registro de tarjeta
        }),
      );
      await this.createFlowSubscriptionAndActivate(sub); // R12–R14, R16
      return { checkout_url: `${this.frontendBaseUrl()}/elegir-plan` }; // R15 — contrato intacto
    }

    // Tarjeta NO registrada → flujo actual idéntico (R17).
    let url: string;
    let token: string;
    try {
      ({ url, token } = await this.flow.registerCustomer({
        customerId: flowCustomerId,
        urlReturn: `${this.apiPublicUrl()}/payments/register-return`, // R11 de #34: el token llega por POST aquí
      }));
    } catch (err) {
      this.sanitizeFlowError(err);
    }

    await this.subRepo.save(
      this.subRepo.create({
        user_id: user.id,
        plan,
        flow_customer_id: flowCustomerId,
        flow_register_token: token,
        status: 'pending',
      }),
    ); // no toca user.plan (el plan de Flow se resuelve de nuevo al confirmar)

    return { checkout_url: `${url}?token=${token}` };
  }

  // ── Webhook (R13–R18) ───────────────────────────────────────────────────────
  async handleWebhook(token: string): Promise<{ message: string }> {
    let status: Record<string, any>;
    try {
      status = await this.flow.getRegisterStatus(token); // R14 — SIEMPRE reconsulta
    } catch (err) {
      this.sanitizeFlowError(err); // ningún FlowApiError sale del service (R4, R21)
    }
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

    await this.createFlowSubscriptionAndActivate(sub); // mismo bloque de siempre, ahora compartido (R14)

    return { message: 'OK' };
  }

  // ── Retorno del registro de tarjeta (url_return de Flow) ────────────────────
  /**
   * Procesa el POST de Flow a url_return. NUNCA lanza: cualquier resultado
   * (éxito, rechazo, token ausente/desconocido, Flow caído) termina en el
   * redirect a la SPA; el estado real lo resuelve la SPA por polling.
   */
  async handleRegisterReturn(token?: unknown): Promise<{ redirectUrl: string }> {
    if (typeof token === 'string' && token.trim() !== '') {
      try {
        await this.handleWebhook(token); // R2–R5: misma lógica segura, sin duplicar
      } catch (err) {
        this.logger.error(
          `register-return: error procesando token: ${err instanceof Error ? err.message : String(err)}`,
        ); // R10 — la Subscription queda en su estado previo
      }
    } else {
      this.logger.warn('register-return recibido sin token'); // R8
    }
    return { redirectUrl: `${this.frontendBaseUrl()}/elegir-plan` }; // R6
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
    try {
      await this.flow.cancelSubscription(sub.flow_subscription_id!);
    } catch (err) {
      this.sanitizeFlowError(err); // ningún FlowApiError sale del service (R4, R21)
    }

    sub.cancel_at_period_end = true;
    await this.subRepo.save(sub); // R22 — status y user.plan NO cambian aquí
    return {
      message: 'Cancelación programada. Conservas tu plan hasta el fin del periodo pagado.',
      current_period_end: sub.current_period_end,
    };
  }

  // ── Activación compartida (R13–R14, R16) ────────────────────────────────────
  /**
   * subscription/create + subscription/get + transacción atómica que activa el
   * plan: sub.status='active', flow_subscription_id, current_period_end
   * (parsePeriodEnd, defensivo) y User.plan. Compartido por handleWebhook()
   * y por la rama de activación inmediata de checkout() (R13-R14). Los
   * FlowApiError internos se sanean a 503 genérica (R4). Nada se activa si
   * createSubscription lanza (fail-closed, R16).
   */
  private async createFlowSubscriptionAndActivate(sub: Subscription): Promise<void> {
    let subscriptionId: string;
    let details: Record<string, any>;
    try {
      ({ subscriptionId } = await this.flow.createSubscription({
        customerId: sub.flow_customer_id!,
        planId: this.resolveFlowPlanId(sub.plan),
      }));
      details = await this.flow.getSubscription(subscriptionId);
    } catch (err) {
      this.sanitizeFlowError(err);
    }

    await this.dataSource.transaction(async (trx) => {
      sub.status = 'active';
      sub.flow_subscription_id = subscriptionId;
      sub.current_period_end = this.parsePeriodEnd(details); // null + warning si el campo no viene
      await trx.save(sub);
      await trx.update(User, { id: sub.user_id }, { plan: sub.plan });
    }); // atómico: Subscription + User.plan
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /**
   * Re-lanza cualquier FlowApiError como 503 genérica; lo demás pasa tal cual
   * (R4). Garantiza que el body/message crudos de Flow NUNCA llegan al
   * cliente HTTP (R5) y que ningún endpoint degrada a 500 por un FlowApiError
   * fugado (R21).
   */
  private sanitizeFlowError(err: unknown): never {
    if (err instanceof FlowApiError) {
      throw new ServiceUnavailableException(
        'Flow no está disponible en este momento. Intenta nuevamente.',
      );
    }
    throw err;
  }

  /** true si el FlowApiError es el rechazo por externalId duplicado (R6). */
  private isCustomerExistsError(err: unknown): err is FlowApiError {
    return (
      err instanceof FlowApiError &&
      typeof err.body?.message === 'string' &&
      err.body.message.includes('customer with this externalId')
    );
  }

  /**
   * Pagina customer/list (limit 100, start incremental) y devuelve el
   * customerId cuyo `data[].externalId === user.id`, o null si se agota
   * (R7-R8). Match EXCLUSIVAMENTE por externalId: ni name, ni email, ni el
   * parámetro `filter` (que filtra por nombre y no es criterio de identidad).
   * Tope defensivo de 50 páginas (5.000 customers) contra respuestas
   * malformadas; un fallo de listCustomers se sanea a 503 genérica (R20).
   */
  private async recoverCustomerId(user: User): Promise<string | null> {
    const limit = 100;
    const maxPages = 50;
    for (let page = 0; page < maxPages; page++) {
      let res: { total: number; hasMore: boolean; data: Record<string, any>[] };
      try {
        res = await this.flow.listCustomers({ start: page * limit, limit });
      } catch (err) {
        this.sanitizeFlowError(err); // R20
      }
      const match = res.data.find((c) => String(c.externalId) === user.id);
      if (match) {
        const customerId = String(match.customerId ?? '');
        return customerId || null; // sin customerId utilizable → caso anómalo (R10)
      }
      if (!res.hasMore || res.data.length === 0) break; // agotado sin match
    }
    return null;
  }

  /**
   * true si el customer de Flow ya tiene tarjeta registrada (R12). Fail-safe
   * deliberado: ante shape inesperado (campos ausentes, null, '') devuelve
   * false y el flujo cae en la rama actual de customer/register (R17), que es
   * la segura — registrar tarjeta de nuevo es siempre válido para Flow;
   * activar sin confirmación no.
   */
  private hasRegisteredCard(customer: Record<string, any>): boolean {
    return Boolean(customer?.creditCardType) || Boolean(customer?.registerDate);
  }

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

  /** URL pública de ESTE backend, usada para construir url_return (/payments/register-return). */
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
