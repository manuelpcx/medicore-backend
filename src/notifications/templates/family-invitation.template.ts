export interface FamilyInvitationEmailData {
  email: string;
  inviterName: string;
  acceptUrl: string;
}

export function familyInvitationSubject(inviterName: string): string {
  return `👪 ${inviterName} te invitó a su plan familiar en Medicore`;
}

export function familyInvitationHtml(data: FamilyInvitationEmailData): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitación a plan familiar</title>
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
                    <span style="color:#ffffff; font-size:18px; font-weight:700; letter-spacing:1px;">Medicore</span>
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
                    <p style="margin:0; color:rgba(255,255,255,0.8); font-size:12px; text-transform:uppercase; letter-spacing:0.8px;">Invitación</p>
                    <h1 style="margin:6px 0 0; color:#ffffff; font-size:21px; font-weight:600;">
                      👪 Plan familiar
                    </h1>
                  </td>
                </tr>
              </table>

              <!-- Cuerpo -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:24px 28px 8px;">
                    <p style="margin:0; color:#1A1916; font-size:15px; line-height:1.6;">
                      <strong>${data.inviterName}</strong> te ha invitado a formar parte de su
                      plan familiar en Medicore. Al aceptar, el titular podrá ayudarte a
                      gestionar tu historial médico.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Botón -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding:20px 28px 28px;">
                    <a href="${data.acceptUrl}" style="display:inline-block; background-color:#2C6E5A; color:#ffffff; text-decoration:none; font-size:15px; font-weight:600; padding:13px 28px; border-radius:10px;">
                      Crear cuenta y aceptar
                    </a>
                    <p style="margin:14px 0 0; color:#A09C96; font-size:12px; line-height:1.5;">
                      Si no reconoces esta invitación, puedes ignorar este correo.
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
