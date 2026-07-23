import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoApiError } from './mercadopago-api.error';

export interface MercadoPagoAutoRecurring {
  frequency: number;
  frequency_type: string;
  transaction_amount: number;
  currency_id: string;
}

export interface CreateMercadoPagoSubscriptionInput {
  reason: string;
  payerEmail: string;
  externalReference: string;
  autoRecurring: MercadoPagoAutoRecurring;
  backUrl: string;
  cardTokenId: string;
}

export interface MercadoPagoSubscriptionCreated {
  id: string;
  init_point: string;
  status: string;
  /** Fecha del próximo cobro, si MercadoPago la devuelve. Usado por
   * `parsePeriodEnd()` en el flujo síncrono de checkout con tarjeta. */
  next_payment_date?: string;
}

/**
 * Cliente HTTP para la API de MercadoPago (pagos recurrentes, planes
 * pro/family). Reemplaza `flow-client.service.ts`. Sin dependencias de
 * cliente HTTP: usa el `fetch` global de Node 20+ (mismo patrón que
 * `FlowClientService`/`RecaptchaService`).
 *
 * Autenticación: header `Authorization: Bearer <MERCADOPAGO_ACCESS_TOKEN>`
 * en toda llamada — SIN firma HMAC de request (a diferencia de Flow).
 *
 * Sin sandbox separado: única URL `https://api.mercadopago.com` para test y
 * producción; se distinguen solo por el tipo de credencial (verificado
 * contra `spec3.json` oficial y snapshots de `web.archive.org`, ver
 * `specs/migrar-pagos-a-mercadopago/design.md` §1).
 *
 * Degrada con warning si falta la credencial: la app arranca igual, cada
 * endpoint de pago responde 503 solo cuando se invoca (`assertConfigured()`),
 * sin bloquear el bootstrap completo.
 */
@Injectable()
export class MercadoPagoClientService {
  private readonly logger = new Logger(MercadoPagoClientService.name);
  private readonly baseUrl = 'https://api.mercadopago.com';
  private readonly accessToken: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.accessToken = this.config.get<string>('MERCADOPAGO_ACCESS_TOKEN') || undefined;

    if (!this.accessToken) {
      this.logger.warn(
        'MERCADOPAGO_ACCESS_TOKEN ausente: pagos con MercadoPago deshabilitados en este entorno.',
      ); // NO lanza — mismo patrón de degradación elegante que Flow/Resend.
    }
  }

  /** true si hay credencial de MercadoPago configurada. */
  isConfigured(): boolean {
    return !!this.accessToken;
  }

  /** Lanza 503 sin red si falta la credencial. */
  assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Pagos con MercadoPago no están disponibles en este entorno (credenciales no configuradas).',
      );
    }
  }

  // ── Transporte HTTP ──────────────────────────────────────────────────────
  private async request<T = Record<string, any>>(
    path: string,
    init: RequestInit,
  ): Promise<T> {
    this.assertConfigured();
    const url = `${this.baseUrl}${path}`;
    let res: Response;
    try {
      res = await fetch(url, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          ...(init.headers ?? {}),
        },
        signal: AbortSignal.timeout(10000),
      });
    } catch (err) {
      // Error de red / DNS / timeout (AbortError): 503, no crashea.
      this.logger.error(
        `Error de red llamando a MercadoPago (${url}): ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new ServiceUnavailableException(
        'MercadoPago no está disponible en este momento. Intenta nuevamente.',
      );
    }

    if (!res.ok) {
      let detail = '';
      try {
        detail = await res.text();
      } catch {
        // ignorar: el detalle es solo para el log
      }
      this.logger.error(`MercadoPago respondió ${res.status} en ${url}: ${detail}`);
      // Body JSON parseable a objeto → error tipado inspeccionable por
      // PaymentsService. NUNCA debe llegar crudo al cliente HTTP.
      let parsed: unknown;
      try {
        parsed = JSON.parse(detail);
      } catch {
        parsed = undefined;
      }
      if (parsed !== null && typeof parsed === 'object') {
        throw new MercadoPagoApiError(res.status, parsed as Record<string, any>);
      }
      // Body no parseable: 503 genérica.
      throw new ServiceUnavailableException(
        'MercadoPago no está disponible en este momento. Intenta nuevamente.',
      );
    }

    try {
      return (await res.json()) as T;
    } catch (err) {
      this.logger.error(
        `Respuesta de MercadoPago no es JSON válido (${url}): ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new ServiceUnavailableException(
        'MercadoPago no está disponible en este momento. Intenta nuevamente.',
      );
    }
  }

  // ── Recursos de la API de MercadoPago ───────────────────────────────────

  /**
   * POST /preapproval — crea la suscripción "sin plan asociado" (SIN
   * `preapproval_plan_id`) CON `card_token_id` + `status: 'authorized'`
   * explícito (ver `specs/mercadopago-checkout-bricks-tarjeta/design.md`
   * §0, Fuente C): confirmado contra el schema OpenAPI oficial en vivo,
   * acotando el bloque `requestBody`, que `POST /preapproval` NO exige
   * `issuer_id`/`payment_method_id`/`payment_method_option_id`/
   * `installments` (a diferencia de `POST /v1/payments`) — solo
   * `card_token_id` sumado a los campos ya usados por el flujo anterior.
   * El `card_token_id` lo genera el Brick `<CardPayment>` del lado del
   * frontend; nunca es el número de tarjeta/CVV crudo.
   */
  async createSubscription(
    input: CreateMercadoPagoSubscriptionInput,
  ): Promise<MercadoPagoSubscriptionCreated> {
    const res = await this.request<Record<string, any>>('/preapproval', {
      method: 'POST',
      body: JSON.stringify({
        reason: input.reason,
        payer_email: input.payerEmail,
        external_reference: input.externalReference,
        auto_recurring: input.autoRecurring,
        back_url: input.backUrl,
        card_token_id: input.cardTokenId,
        status: 'authorized',
      }),
    });
    const id = res.id;
    const initPoint = res.init_point;
    if (!id || !initPoint) {
      this.logger.error(
        `POST /preapproval no devolvió id/init_point reconocibles. Respuesta: ${JSON.stringify(res)}`,
      );
      throw new ServiceUnavailableException('MercadoPago no confirmó la creación de la suscripción.');
    }
    return {
      id: String(id),
      init_point: String(initPoint),
      status: String(res.status ?? 'pending'),
      next_payment_date: typeof res.next_payment_date === 'string' ? res.next_payment_date : undefined,
    };
  }

  /** GET /preapproval/{id} — estado autoritativo de la suscripción (nunca confiar solo en el webhook). */
  async getSubscription(id: string): Promise<Record<string, any>> {
    return this.request<Record<string, any>>(`/preapproval/${encodeURIComponent(id)}`, {
      method: 'GET',
    });
  }

  /**
   * PUT /preapproval/{id} con `{"status": "cancelled"}` — endpoint
   * verificado contra la especificación OpenAPI oficial de MercadoPago
   * (`updateSubscription`, ver design.md §1).
   */
  async cancelSubscription(id: string): Promise<void> {
    await this.request<Record<string, any>>(`/preapproval/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'cancelled' }),
    });
  }
}
