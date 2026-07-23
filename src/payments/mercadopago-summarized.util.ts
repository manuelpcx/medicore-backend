/**
 * Interpreta `summarized` de `GET /preapproval/{id}` (Subscription de
 * MercadoPago) para decidir si hubo al menos un cobro real procesado.
 * Gate conservador (R2, design.md §1.1): exige AMBAS señales confirmadas
 * — `charged_quantity` (spec OpenAPI + SDK oficial, "ciclos cobrados con
 * éxito") Y `last_charged_date` (SDK oficial, "fecha del cobro exitoso más
 * reciente") — para minimizar falsos positivos ante una población parcial
 * del objeto por parte de MercadoPago. Ver design.md §0 para las fuentes.
 *
 * Función pura, sin red — testeable de forma aislada (mismo patrón que
 * `mercadopago-signature.util.ts`).
 */
export function hasProcessedCharge(summarized: unknown): boolean {
  if (!summarized || typeof summarized !== 'object') return false;

  const { charged_quantity, last_charged_date } = summarized as Record<string, unknown>;

  const hasChargedQuantity = typeof charged_quantity === 'number' && charged_quantity > 0;
  const hasLastChargedDate = typeof last_charged_date === 'string' && last_charged_date.length > 0;

  return hasChargedQuantity && hasLastChargedDate;
}
