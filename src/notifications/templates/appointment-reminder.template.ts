import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import type { MedicalHistory } from '../../medical-history/entities/medical-history.entity';

export interface AppointmentEmailData {
  nombre: string;
  email: string;
  appointment: Pick<
    MedicalHistory,
    'especialidad' | 'doctor' | 'institucion' | 'tipo' | 'tipo_proxima_cita' | 'proxima_cita'
  >;
}

const TIPO_LABEL: Record<string, string> = {
  control:      'Control médico',
  especialidad: 'Consulta con especialista',
  examen:       'Examen médico',
  urgencia:     'Atención de urgencia',
  preventivo:   'Consulta preventiva',
};

export function appointmentSubject(): string {
  return '📅 Mañana tienes una cita médica';
}

export function appointmentHtml(data: AppointmentEmailData): string {
  const { appointment: appt } = data;

  const tipoLabel = TIPO_LABEL[appt.tipo_proxima_cita ?? appt.tipo] ?? 'Cita médica';
  const fechaManana = format(addDays(new Date(), 1), "EEEE d 'de' MMMM", { locale: es });
  const fechaMananaFormatted = fechaManana.charAt(0).toUpperCase() + fechaManana.slice(1);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recordatorio de cita médica</title>
</head>
<body style="margin:0; padding:0; background-color:#F5F2EC; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F2EC;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="540" cellpadding="0" cellspacing="0" border="0" style="max-width:540px; width:100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#2C6E5A; border-radius:10px; padding:7px 16px;">
                    <span style="color:#ffffff; font-size:18px; font-weight:700; letter-spacing:1px;">MediHistory</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card principal -->
          <tr>
            <td style="background-color:#FDFCFA; border-radius:14px; border:1px solid #E2DDD5; overflow:hidden;">

              <!-- Header verde -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#2C6E5A; padding:22px 28px;">
                    <p style="margin:0; color:rgba(255,255,255,0.8); font-size:12px; text-transform:uppercase; letter-spacing:0.8px;">Recordatorio de cita</p>
                    <h1 style="margin:6px 0 0; color:#ffffff; font-size:21px; font-weight:600;">
                      📅 ${tipoLabel}
                    </h1>
                    <p style="margin:6px 0 0; color:rgba(255,255,255,0.75); font-size:13px;">
                      ${fechaMananaFormatted}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Saludo -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:24px 28px 16px;">
                    <p style="margin:0; color:#1A1916; font-size:15px; line-height:1.6;">
                      Hola, <strong>${data.nombre}</strong>. Mañana tienes una cita médica programada:
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Detalles de la cita -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 28px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F0EDE6; border-radius:10px; overflow:hidden;">

                      <tr>
                        <td style="padding:14px 16px; border-bottom:1px solid #E2DDD5;">
                          <p style="margin:0; font-size:11px; color:#A09C96; text-transform:uppercase; letter-spacing:0.5px;">Especialidad</p>
                          <p style="margin:4px 0 0; font-size:15px; color:#1A1916; font-weight:600;">${appt.especialidad}</p>
                        </td>
                      </tr>

                      ${appt.doctor ? `
                      <tr>
                        <td style="padding:14px 16px; border-bottom:1px solid #E2DDD5;">
                          <p style="margin:0; font-size:11px; color:#A09C96; text-transform:uppercase; letter-spacing:0.5px;">Doctor</p>
                          <p style="margin:4px 0 0; font-size:15px; color:#1A1916; font-weight:500;">${appt.doctor}</p>
                        </td>
                      </tr>` : ''}

                      ${appt.institucion ? `
                      <tr>
                        <td style="padding:14px 16px;">
                          <p style="margin:0; font-size:11px; color:#A09C96; text-transform:uppercase; letter-spacing:0.5px;">Institución</p>
                          <p style="margin:4px 0 0; font-size:15px; color:#1A1916; font-weight:500;">${appt.institucion}</p>
                        </td>
                      </tr>` : ''}

                    </table>
                  </td>
                </tr>
              </table>

              <!-- Tip -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 28px 28px;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="background-color:#EBF2FA; border-left:3px solid #1E4D7B; border-radius:0 6px 6px 0; padding:12px 16px;">
                          <p style="margin:0; color:#1E4D7B; font-size:13px; line-height:1.5;">
                            💡 <strong>Tip:</strong> Recuerda llevar tu historial médico completo.
                            Puedes generarlo desde la sección <em>Acceso médico</em> de MediHistory.
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
