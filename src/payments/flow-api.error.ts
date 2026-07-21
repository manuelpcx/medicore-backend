/**
 * Error interno tipado: Flow respondió con status no-OK y body JSON parseable
 * (p. ej. 401 {code:501, message:'...customer with this externalId...'}).
 * NUNCA debe llegar crudo al cliente HTTP: PaymentsService lo maneja
 * específicamente o lo mapea a ServiceUnavailableException genérica (R4).
 * Defensa en profundidad: si aun así se fugara, NO es HttpException, por lo
 * que HttpExceptionFilter (rama else) responde el genérico
 * 'Error interno del servidor' sin filtrar detalle (R5) — pero eso sería un
 * bug de mapeo (R21 exige 503, no 500).
 */
export class FlowApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: Record<string, any>,
  ) {
    super(`Flow API error ${status}`);
    this.name = 'FlowApiError';
  }
}
