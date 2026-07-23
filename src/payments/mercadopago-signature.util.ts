import { createHmac, timingSafeEqual } from 'crypto';

export interface VerifyMercadoPagoSignatureInput {
  /** Header `x-signature`, formato `ts=<ts>,v1=<hmac>`. */
  xSignatureHeader: string | undefined;
  /** Header `x-request-id`. */
  xRequestIdHeader: string | undefined;
  /** Query param `data.id` de la URL de notificación (NO el body). */
  dataIdQueryParam: string | undefined;
  secret: string;
}

/**
 * Verifica la firma `x-signature` de un webhook de MercadoPago (función
 * pura, sin red — testeable de forma aislada).
 *
 * Reconstruye el template documentado
 * `id:[data.id];request-id:[x-request-id];ts:[ts];`, omitiendo del template
 * cualquier segmento cuyo valor no esté presente en la notificación, con la
 * regla: si `data.id` es alfanumérico, se envía en minúscula. Calcula
 * HMAC-SHA256 sobre ese template con `secret` y compara contra `v1` con
 * comparación segura (`timingSafeEqual`), evitando timing attacks.
 *
 * Fuente verificada: spec OpenAPI oficial de MercadoPago (schema
 * `WebhookSignatureHeader`) + snapshot de `web.archive.org` de
 * "Your integrations › Notifications › Webhooks" (ver
 * `specs/migrar-pagos-a-mercadopago/design.md` §1, Fuente B).
 */
export function verifyMercadoPagoSignature(input: VerifyMercadoPagoSignatureInput): boolean {
  const { xSignatureHeader, xRequestIdHeader, dataIdQueryParam, secret } = input;

  if (!xSignatureHeader || !secret) return false;

  const parts = xSignatureHeader.split(',').reduce<Record<string, string>>((acc, raw) => {
    const idx = raw.indexOf('=');
    if (idx === -1) return acc;
    const key = raw.slice(0, idx).trim();
    const value = raw.slice(idx + 1).trim();
    if (key) acc[key] = value;
    return acc;
  }, {});

  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const segments: string[] = [];
  if (dataIdQueryParam) {
    const isAlphanumeric = /^[a-zA-Z0-9]+$/.test(dataIdQueryParam);
    const dataId = isAlphanumeric ? dataIdQueryParam.toLowerCase() : dataIdQueryParam;
    segments.push(`id:${dataId};`);
  }
  if (xRequestIdHeader) {
    segments.push(`request-id:${xRequestIdHeader};`);
  }
  segments.push(`ts:${ts};`);

  const template = segments.join('');
  const expected = createHmac('sha256', secret).update(template).digest('hex');

  const expectedBuf = Buffer.from(expected, 'utf8');
  const actualBuf = Buffer.from(v1, 'utf8');
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}
