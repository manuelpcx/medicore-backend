import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Medication } from '../../medications/entities/medication.entity';

export interface DailyMedsEmailData {
  nombre: string;
  email: string;
  medications: Pick<Medication, 'nombre' | 'dosis' | 'frecuencia' | 'horario' | 'horario_notificacion'>[];
}

export function dailyMedsSubject(): string {
  const fecha = format(new Date(), "d 'de' MMMM", { locale: es });
  return `💊 Tus medicamentos de hoy — ${fecha}`;
}

export function dailyMedsHtml(data: DailyMedsEmailData): string {
  const fecha = format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es });
  const fechaCap = fecha.charAt(0).toUpperCase() + fecha.slice(1);

  const medRows = data.medications
    .map(
      (m) => `
      <tr>
        <td style="padding:10px 12px; border-bottom:1px solid #E2DDD5;">
          <strong style="color:#1A1916; font-size:15px;">${m.nombre}</strong>
        </td>
        <td style="padding:10px 12px; border-bottom:1px solid #E2DDD5; color:#6B6760;">
          ${m.dosis}
        </td>
        <td style="padding:10px 12px; border-bottom:1px solid #E2DDD5; color:#6B6760;">
          ${m.frecuencia}
        </td>
        <td style="padding:10px 12px; border-bottom:1px solid #E2DDD5; color:#6B6760; font-size:13px;">
          ${m.horario_notificacion ?? m.horario ?? '—'}
        </td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Medicamentos de hoy</title>
</head>
<body style="margin:0; padding:0; background-color:#F5F2EC; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F2EC;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; width:100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#2C6E5A; border-radius:10px; padding:8px 18px;">
                    <span style="color:#ffffff; font-size:20px; font-weight:700; letter-spacing:1px;">MediHistory</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#FDFCFA; border-radius:14px; border:1px solid #E2DDD5; overflow:hidden;">

              <!-- Header de la card -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#2C6E5A; padding:22px 28px;">
                    <p style="margin:0; color:#ffffff; font-size:13px; text-transform:uppercase; letter-spacing:0.8px; opacity:0.8;">Recordatorio</p>
                    <h1 style="margin:6px 0 0; color:#ffffff; font-size:22px; font-weight:600;">
                      💊 Medicamentos de hoy
                    </h1>
                    <p style="margin:6px 0 0; color:rgba(255,255,255,0.75); font-size:13px;">${fechaCap}</p>
                  </td>
                </tr>
              </table>

              <!-- Saludo -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:24px 28px 16px;">
                    <p style="margin:0; color:#1A1916; font-size:15px; line-height:1.6;">
                      Hola, <strong>${data.nombre}</strong>. Aquí está tu lista de medicamentos para hoy:
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Tabla de medicamentos -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 28px; width:calc(100% - 56px);">
                <tr style="background-color:#F0EDE6;">
                  <th style="padding:8px 12px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:#6B6760; font-weight:600; border-bottom:2px solid #E2DDD5;">Medicamento</th>
                  <th style="padding:8px 12px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:#6B6760; font-weight:600; border-bottom:2px solid #E2DDD5;">Dosis</th>
                  <th style="padding:8px 12px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:#6B6760; font-weight:600; border-bottom:2px solid #E2DDD5;">Frecuencia</th>
                  <th style="padding:8px 12px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:#6B6760; font-weight:600; border-bottom:2px solid #E2DDD5;">Horario</th>
                </tr>
                ${medRows}
              </table>

              <!-- Frase motivacional -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:20px 28px 28px;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="background-color:#E8F4F0; border-left:3px solid #2C6E5A; border-radius:0 6px 6px 0; padding:12px 16px;">
                          <p style="margin:0; color:#1A4D3E; font-size:13px; font-style:italic; line-height:1.5;">
                            Mantener tu tratamiento al día marca la diferencia. ¡Sigue adelante! 🌿
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 0; text-align:center;">
              <p style="margin:0; color:#A09C96; font-size:12px; line-height:1.6;">
                Para desactivar los recordatorios, ingresa a tu perfil en MediHistory.<br>
                Este correo fue enviado a ${data.email}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
