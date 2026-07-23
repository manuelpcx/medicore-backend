/**
 * Error interno tipado: MercadoPago respondió con status no-OK y body JSON
 * parseable. NUNCA debe llegar crudo al cliente HTTP: `PaymentsService` lo
 * maneja específicamente o lo mapea a `ServiceUnavailableException` genérica
 * (mismo patrón que `FlowApiError`, ver `flow-api.error.ts` histórico).
 * Defensa en profundidad: si aun así se fugara, NO es `HttpException`, por lo
 * que `HttpExceptionFilter` (rama else) responde el genérico
 * 'Error interno del servidor' sin filtrar detalle.
 */
export class MercadoPagoApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: Record<string, any>,
  ) {
    super(`MercadoPago API error ${status}`);
    this.name = 'MercadoPagoApiError';
  }
}
