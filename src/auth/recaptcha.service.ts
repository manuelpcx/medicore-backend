import {
  Injectable,
  Logger,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Verifica un token de Google reCAPTCHA v2 ("No soy un robot") contra el
 * endpoint oficial `siteverify`. Sin dependencias de cliente HTTP: usa el
 * `fetch` global de Node 20+.
 */
@Injectable()
export class RecaptchaService {
  private readonly logger = new Logger(RecaptchaService.name);

  // Test key pública de Google: `siteverify` siempre responde success:true.
  private static readonly TEST_SECRET = '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe';
  private static readonly VERIFY_URL =
    'https://www.google.com/recaptcha/api/siteverify';

  private readonly secret: string;

  constructor(private readonly config: ConfigService) {
    const configured = this.config.get<string>('RECAPTCHA_SECRET');
    if (configured) {
      this.secret = configured;
      return;
    }

    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    if (isProd) {
      // Fail-fast: en producción reCAPTCHA es obligatorio. Al instanciarse
      // como provider durante el bootstrap, este throw aborta el arranque.
      throw new Error(
        'RECAPTCHA_SECRET no configurado: es obligatorio en producción.',
      );
    }

    // No-producción sin secret: degradar a la test key de Google, dejando traza.
    this.secret = RecaptchaService.TEST_SECRET;
    this.logger.warn(
      'RECAPTCHA_SECRET no configurado; usando test key de Google (solo no-producción)',
    );
  }

  /**
   * Lanza `BadRequestException` (400) si el token falta o Google lo rechaza;
   * `ServiceUnavailableException` (503) si Google es inalcanzable. Resuelve
   * `void` si `success:true`.
   */
  async verify(token: string | undefined): Promise<void> {
    if (!token) {
      throw new BadRequestException('Verificación reCAPTCHA requerida');
    }

    let body: { success?: boolean };
    try {
      const res = await fetch(RecaptchaService.VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: this.secret,
          response: token,
        }).toString(),
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        // Respuesta HTTP no-OK: tratarla como problema transitorio del servicio.
        throw new ServiceUnavailableException(
          'No se pudo verificar reCAPTCHA en este momento. Intenta nuevamente.',
        );
      }

      body = (await res.json()) as { success?: boolean };
    } catch (err) {
      // Re-lanzar el 503 ya construido para el caso !res.ok sin envolverlo.
      if (err instanceof ServiceUnavailableException) throw err;
      // Error de red / DNS / timeout (AbortError) / JSON inválido: 503, no crashea.
      this.logger.error(
        `Error verificando reCAPTCHA contra Google: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw new ServiceUnavailableException(
        'No se pudo verificar reCAPTCHA en este momento. Intenta nuevamente.',
      );
    }

    if (body.success !== true) {
      throw new BadRequestException(
        'La verificación reCAPTCHA falló. Vuelve a intentarlo.',
      );
    }
  }
}
