import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { FlowApiError } from './flow-api.error';

/**
 * Cliente HTTP para la API de Flow.cl (pagos recurrentes, planes pro/family).
 * Sin dependencias de cliente HTTP: usa el `fetch` global de Node 20+ (mismo
 * patrón que `RecaptchaService`).
 *
 * Degrada con warning si faltan credenciales (R5): la app arranca igual, cada
 * endpoint de pago responde 503 solo cuando se invoca (R6), sin bloquear el
 * bootstrap completo (a diferencia de `RecaptchaService` en producción).
 *
 * Nota sobre incertidumbres documentadas en `specs/pagos-flow-suscripciones/design.md`
 * §8 (endpoint exacto de cancelación, valores de `getRegisterStatus`, forma de
 * la respuesta de `subscription/create`/`subscription/get`): esta clase
 * implementa el mejor candidato documentado por el leader contra
 * developers.flow.cl, con parseo defensivo donde el campo no está confirmado.
 * NO se pudo verificar contra el sandbox real de Flow en este entorno (sin
 * credenciales ni acceso a internet) — ver `progress/impl_pagos-flow-suscripciones.md`.
 */
@Injectable()
export class FlowClientService {
  private readonly logger = new Logger(FlowClientService.name);

  private readonly apiKey: string | undefined;
  private readonly secretKey: string | undefined;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('FLOW_API_KEY') || undefined;
    this.secretKey = this.config.get<string>('FLOW_SECRET_KEY') || undefined;

    const env = this.config.get<string>('FLOW_ENV');
    this.baseUrl =
      env === 'production'
        ? 'https://www.flow.cl/api'
        : 'https://sandbox.flow.cl/api'; // sandbox por defecto (R4)

    if (!this.apiKey || !this.secretKey) {
      this.logger.warn(
        'FLOW_API_KEY/FLOW_SECRET_KEY ausentes: pagos con Flow deshabilitados en este entorno.',
      ); // R5 — NO lanza, a diferencia de RecaptchaService en producción.
    }
  }

  /** true si hay credenciales de Flow configuradas (R6). */
  isConfigured(): boolean {
    return !!this.apiKey && !!this.secretKey;
  }

  /** Lanza 503 sin red si faltan credenciales (R6). */
  assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Pagos con Flow no están disponibles en este entorno (credenciales no configuradas).',
      );
    }
  }

  // ── Firma HMAC-SHA256 (R3) ──────────────────────────────────────────────────
  /**
   * Firma los parámetros con HMAC-SHA256 sobre la concatenación
   * `nombre1valor1nombre2valor2...` de TODOS los parámetros (incluido
   * `apiKey`) ordenados alfabéticamente por nombre, usando `FLOW_SECRET_KEY`.
   * Anexa el resultado como parámetro `s`.
   *
   * Ejemplo oficial verificado (design.md §5): params
   * `{amount:'5000', apiKey:'XXXX', currency:'CLP'}` → string a firmar
   * `"amount5000apiKeyXXXXcurrencyCLP"` (orden alfabético: amount, apiKey, currency).
   */
  private sign(params: Record<string, string>): URLSearchParams {
    const all: Record<string, string> = { ...params, apiKey: this.apiKey! };
    const keys = Object.keys(all).sort();
    const toSign = keys.map((k) => `${k}${all[k]}`).join('');
    const s = createHmac('sha256', this.secretKey!).update(toSign).digest('hex');
    return new URLSearchParams({ ...all, s });
  }

  // ── Transporte HTTP (R7) ────────────────────────────────────────────────────
  private async post(path: string, params: Record<string, string>): Promise<Record<string, any>> {
    this.assertConfigured();
    const body = this.sign(params);
    return this.request(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
  }

  private async get(path: string, params: Record<string, string>): Promise<Record<string, any>> {
    this.assertConfigured();
    const qs = this.sign(params);
    return this.request(`${path}?${qs.toString()}`, { method: 'GET' });
  }

  private async request(pathWithQs: string, init: RequestInit): Promise<Record<string, any>> {
    const url = `${this.baseUrl}${pathWithQs}`;
    let res: Response;
    try {
      res = await fetch(url, { ...init, signal: AbortSignal.timeout(10000) });
    } catch (err) {
      // Error de red / DNS / timeout (AbortError): 503, no crashea (R7).
      this.logger.error(
        `Error de red llamando a Flow (${url}): ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new ServiceUnavailableException('Flow no está disponible en este momento. Intenta nuevamente.');
    }

    if (!res.ok) {
      let detail = '';
      try {
        detail = await res.text();
      } catch {
        // ignorar: el detalle es solo para el log
      }
      this.logger.error(`Flow respondió ${res.status} en ${url}: ${detail}`);
      // Body JSON parseable a objeto → error tipado inspeccionable por
      // PaymentsService (R1). NUNCA debe llegar crudo al cliente HTTP.
      let parsed: unknown;
      try {
        parsed = JSON.parse(detail);
      } catch {
        parsed = undefined;
      }
      if (parsed !== null && typeof parsed === 'object') {
        throw new FlowApiError(res.status, parsed as Record<string, any>);
      }
      // Body no parseable: 503 genérica idéntica a hoy (R2).
      throw new ServiceUnavailableException('Flow no está disponible en este momento. Intenta nuevamente.');
    }

    try {
      return (await res.json()) as Record<string, any>;
    } catch (err) {
      this.logger.error(
        `Respuesta de Flow no es JSON válido (${url}): ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new ServiceUnavailableException('Flow no está disponible en este momento. Intenta nuevamente.');
    }
  }

  // ── Recursos de la API de Flow ──────────────────────────────────────────────

  async createCustomer(input: { name: string; email: string; externalId: string }): Promise<{ customerId: string }> {
    const res = await this.post('/customer/create', {
      name: input.name,
      email: input.email,
      externalId: input.externalId,
    });
    return { customerId: String(res.customerId ?? res.id ?? '') };
  }

  /**
   * GET /customer/list — paginado {total, hasMore, data[]}. `limit` máx 100.
   * `start`/`limit` van como strings dentro de la firma HMAC (todo `sign()`
   * opera sobre Record<string, string>).
   */
  async listCustomers(input: { start: number; limit: number }): Promise<{
    total: number;
    hasMore: boolean;
    data: Record<string, any>[];
  }> {
    const res = await this.get('/customer/list', {
      start: String(input.start),
      limit: String(input.limit),
    });
    return {
      total: Number(res.total ?? 0),
      hasMore: Boolean(res.hasMore),
      data: Array.isArray(res.data) ? (res.data as Record<string, any>[]) : [],
    };
  }

  /**
   * GET /customer/get — mismo shape de customer que customer/list
   * (customerId, externalId, email, name, status, y creditCardType /
   * last4CardDigits / registerDate cuando ya hay tarjeta registrada).
   */
  async getCustomer(customerId: string): Promise<Record<string, any>> {
    return this.get('/customer/get', { customerId });
  }

  async registerCustomer(input: {
    customerId: string;
    urlReturn: string;
  }): Promise<{ url: string; token: string }> {
    const res = await this.post('/customer/register', {
      customerId: input.customerId,
      url_return: input.urlReturn, // únicos params + apiKey/s: contrato oficial (no existe url_confirmation)
    });
    return { url: String(res.url ?? ''), token: String(res.token ?? '') };
  }

  /**
   * Devuelve la respuesta cruda de `customer/getRegisterStatus`: los valores
   * exactos para distinguir "confirmado" de "rechazado/pendiente" NO están
   * confirmados contra la documentación real (design.md §8, punto 2). El
   * criterio de interpretación fail-closed vive en
   * `PaymentsService.isConfirmedSuccess()`, no aquí.
   */
  async getRegisterStatus(token: string): Promise<Record<string, any>> {
    return this.get('/customer/getRegisterStatus', { token });
  }

  async createSubscription(input: { customerId: string; planId: string }): Promise<{ subscriptionId: string }> {
    const res = await this.post('/subscription/create', {
      customerId: input.customerId,
      planId: input.planId,
    });
    const subscriptionId = res.subscriptionId ?? res.subscription_id ?? res.id;
    if (!subscriptionId) {
      this.logger.error(
        `subscription/create no devolvió un id de suscripción reconocible. Respuesta: ${JSON.stringify(res)}`,
      );
      throw new ServiceUnavailableException('Flow no confirmó la creación de la suscripción.');
    }
    return { subscriptionId: String(subscriptionId) };
  }

  /**
   * Devuelve la respuesta cruda de `subscription/get`: la forma exacta
   * (nombre del campo de fecha de fin de periodo) NO está confirmada
   * (design.md §8, punto 3). `PaymentsService.parsePeriodEnd()` la mapea
   * defensivamente.
   */
  async getSubscription(subscriptionId: string): Promise<Record<string, any>> {
    return this.get('/subscription/get', { subscriptionId });
  }

  /**
   * Cancela una suscripción en Flow. Endpoint NO confirmado con certeza
   * contra la documentación real (design.md §8, punto 1): se usa el
   * candidato más probable por el patrón CRUD ya observado en otros recursos
   * de Flow (`plans/delete`, `customer/delete`) → `subscription/delete`. Si
   * el nombre real difiere, es un cambio de una sola línea (el `path` de
   * abajo), sin afectar el resto del diseño.
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    await this.post('/subscription/delete', { subscriptionId });
  }
}
