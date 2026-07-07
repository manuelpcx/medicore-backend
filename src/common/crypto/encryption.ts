/**
 * Cifrado en reposo de datos sensibles (AES-256-GCM).
 *
 * Es un módulo plano — NO un provider de Nest — porque los transformers de
 * columna se evalúan al cargar las entidades, fuera del contenedor de DI.
 *
 * Formato de un valor cifrado:  "enc:v1:" + base64( iv(12) | authTag(16) | ciphertext )
 *
 * La llave se lee de process.env.ENCRYPTION_KEY (base64 o hex, 32 bytes).
 * ⚠️ Si la llave se pierde o cambia, los datos cifrados quedan irrecuperables.
 */
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'crypto';
import { ValueTransformer } from 'typeorm';

const MARKER = 'enc:v1:';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

let cachedKey: Buffer | null = null;

function loadKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'ENCRYPTION_KEY no está definida. Genera una con `openssl rand -base64 32` ' +
        'y configúrala en el entorno (.env / Railway).',
    );
  }

  // Aceptar hex (64 chars) o base64.
  const key = /^[0-9a-fA-F]{64}$/.test(raw)
    ? Buffer.from(raw, 'hex')
    : Buffer.from(raw, 'base64');

  if (key.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY debe representar 32 bytes (AES-256); se obtuvieron ${key.length}. ` +
        'Usa `openssl rand -base64 32`.',
    );
  }

  cachedKey = key;
  return key;
}

/** Valida que la llave exista y sea correcta. Llamar en el arranque (fail-fast). */
export function assertEncryptionKey(): void {
  loadKey();
}

export function encrypt(plain: string): string {
  const key = loadKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return MARKER + Buffer.concat([iv, authTag, ciphertext]).toString('base64');
}

export function decrypt(value: string): string {
  // Dato legado en claro (aún sin cifrar): devolver tal cual.
  if (!value.startsWith(MARKER)) return value;

  const key = loadKey();
  const data = Buffer.from(value.slice(MARKER.length), 'base64');
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

/**
 * Transformer de columna TypeORM: cifra al escribir, descifra al leer.
 * Los valores null/undefined pasan sin tocarse.
 */
export function encryptedColumn(): ValueTransformer {
  return {
    to: (value: unknown) =>
      value === null || value === undefined
        ? value
        : encrypt(value instanceof Date ? value.toISOString() : String(value)),
    from: (value: unknown) =>
      value === null || value === undefined ? value : decrypt(value as string),
  };
}
