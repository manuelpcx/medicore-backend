import type { Medication } from '../../medications/entities/medication.entity';

export interface SingleMedEmailData {
  nombre: string;
  email: string;
  medication: Pick<
    Medication,
    'nombre' | 'dosis' | 'frecuencia' | 'horario' | 'horario_notificacion' | 'medico_recetante'
  >;
}

export function singleMedSubject(medNombre: string): string {
  return `⏰ Hora de tomar tu ${medNombre}`;
}

export function singleMedHtml(data: SingleMedEmailData): string {
  const { medication: med } = data;
  const horario = med.horario_notificacion ?? med.horario ?? '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recordatorio de medicamento</title>
</head>
<body style="margin:0; padding:0; background-color:#F5F2EC; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F2EC;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="520" cellpadding="0" cellspacing="0" border="0" style="max-width:520px; width:100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#2C6E5A; border-radius:10px; padding:7px 16px;">
                    <span style="color:#ffffff; font-size:18px; font-weight:700; letter-spacing:1px;">Medicore</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#FDFCFA; border-radius:14px; border:1px solid #E2DDD5; overflow:hidden;">

              <!-- Header con ícono de reloj -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding:32px 28px 24px;">
                    <div style="width:60px; height:60px; background-color:#E8F4F0; border-radius:50%; margin:0 auto 16px; display:table-cell; vertical-align:middle; text-align:center; font-size:28px; line-height:60px;">⏰</div>
                    <h1 style="margin:0 0 6px; color:#1A1916; font-size:24px; font-weight:700;">
                      ${med.nombre}
                    </h1>
                    <p style="margin:0; color:#2C6E5A; font-size:18px; font-weight:600;">${med.dosis}</p>
                  </td>
                </tr>
              </table>

              <!-- Saludo -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 28px 20px;">
                    <p style="margin:0; color:#6B6760; font-size:14px; text-align:center; line-height:1.6;">
                      Hola <strong style="color:#1A1916;">${data.nombre}</strong>, es momento de tomar tu medicamento.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Detalles -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #E2DDD5; border-bottom:1px solid #E2DDD5;">
                <tr>
                  <td style="padding:16px 28px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="50%" style="padding:6px 0;">
                          <p style="margin:0; font-size:11px; color:#A09C96; text-transform:uppercase; letter-spacing:0.5px;">Frecuencia</p>
                          <p style="margin:4px 0 0; font-size:14px; color:#1A1916; font-weight:500;">${med.frecuencia}</p>
                        </td>
                        ${horario ? `
                        <td width="50%" style="padding:6px 0;">
                          <p style="margin:0; font-size:11px; color:#A09C96; text-transform:uppercase; letter-spacing:0.5px;">Horario</p>
                          <p style="margin:4px 0 0; font-size:14px; color:#1A1916; font-weight:500;">${horario}</p>
                        </td>` : ''}
                      </tr>
                      ${med.medico_recetante ? `
                      <tr>
                        <td colspan="2" style="padding:6px 0 0;">
                          <p style="margin:0; font-size:11px; color:#A09C96; text-transform:uppercase; letter-spacing:0.5px;">Recetado por</p>
                          <p style="margin:4px 0 0; font-size:14px; color:#1A1916; font-weight:500;">${med.medico_recetante}</p>
                        </td>
                      </tr>` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Nota final -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:20px 28px 28px; text-align:center;">
                    <p style="margin:0; color:#6B6760; font-size:13px; line-height:1.5;">
                      Si ya lo tomaste, ¡excelente! Sigue con tu tratamiento. 💚
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 0; text-align:center;">
              <p style="margin:0; color:#A09C96; font-size:12px; line-height:1.6;">
                Para desactivar los recordatorios, ingresa a tu perfil en Medicore.<br>
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
