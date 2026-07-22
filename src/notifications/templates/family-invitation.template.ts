export interface FamilyInvitationEmailData {
  email: string;
  inviterName: string;
  acceptUrl: string;
}

export function familyInvitationSubject(inviterName: string): string {
  return `👪 ${inviterName} te invitó a su plan familiar en MediHistory`;
}

export function familyInvitationHtml(data: FamilyInvitationEmailData): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Invitación a tu plan familiar</title>
</head>
<body style="margin:0; padding:0; background-color:#EEF2F5; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#EEF2F5;">
    <tr>
      <td align="center" style="padding:36px 16px;">
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; width:100%;">

          <!-- Marca -->
          <tr>
            <td align="center" style="padding-bottom:22px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="width:34px; height:34px; background-color:#0E7C86; border-radius:9px; text-align:center; vertical-align:middle;">
                    <span style="color:#ffffff; font-size:17px; font-weight:700; line-height:34px;">M</span>
                  </td>
                  <td style="padding-left:9px; vertical-align:middle;">
                    <span style="color:#0F1B2D; font-size:15px; font-weight:700; letter-spacing:0.2px;">MediHistory</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card principal -->
          <tr>
            <td style="background-color:#FFFFFF; border-radius:16px; border:1px solid #E3E9EF; overflow:hidden; box-shadow:0 6px 16px rgba(15,27,45,0.08);">

              <!-- Header -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#0E7C86; padding:30px 32px 26px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color:rgba(255,255,255,0.16); border-radius:999px; padding:5px 12px 5px 10px;">
                          <span style="color:#ffffff; font-size:11px; font-weight:700; letter-spacing:0.5px; text-transform:uppercase;">👪&nbsp; Plan Familiar</span>
                        </td>
                      </tr>
                    </table>
                    <h1 style="margin:16px 0 0; color:#ffffff; font-size:23px; font-weight:700; line-height:1.3;">
                      ${data.inviterName} te invitó a su<br>historial médico familiar
                    </h1>
                  </td>
                </tr>
              </table>

              <!-- Cuerpo -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:28px 32px 4px;">
                    <p style="margin:0; color:#0F1B2D; font-size:15px; line-height:1.65;">
                      En MediHistory, <strong>${data.inviterName.split(' ')[0]}</strong> organiza el historial médico de su familia en un solo lugar. Al aceptar, formarás parte de su grupo familiar:
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Lista de beneficios -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;">
                <tr>
                  <td style="padding:0 32px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F1F5F8; border-radius:12px; padding:4px;">

                      <tr>
                        <td style="padding:14px 16px;">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="width:26px; height:26px; background-color:#E1F3F4; border-radius:7px; text-align:center; vertical-align:middle;">
                                <span style="color:#0A5A62; font-size:13px; font-weight:700; line-height:26px;">✓</span>
                              </td>
                              <td style="padding-left:12px; vertical-align:middle;">
                                <span style="color:#0F1B2D; font-size:13.5px; font-weight:600;">${data.inviterName} podrá ayudarte a gestionar tu historial</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:0 16px 14px;">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="width:26px; height:26px; background-color:#E1F3F4; border-radius:7px; text-align:center; vertical-align:middle;">
                                <span style="color:#0A5A62; font-size:13px; font-weight:700; line-height:26px;">✓</span>
                              </td>
                              <td style="padding-left:12px; vertical-align:middle;">
                                <span style="color:#0F1B2D; font-size:13.5px; font-weight:600;">Tus datos médicos siguen siendo solo tuyos y privados</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:0 16px 16px;">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="width:26px; height:26px; background-color:#E1F3F4; border-radius:7px; text-align:center; vertical-align:middle;">
                                <span style="color:#0A5A62; font-size:13px; font-weight:700; line-height:26px;">✓</span>
                              </td>
                              <td style="padding-left:12px; vertical-align:middle;">
                                <span style="color:#0F1B2D; font-size:13.5px; font-weight:600;">Puedes salir del grupo familiar cuando quieras</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>

              <!-- Botón -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding:26px 32px 10px;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td align="center" style="background-color:#0E7C86; border-radius:11px;">
                          <a href="${data.acceptUrl}" style="display:block; color:#ffffff; text-decoration:none; font-size:15px; font-weight:700; padding:14px 28px;">
                            Crear cuenta y aceptar invitación
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:0 32px 30px;">
                    <p style="margin:0; color:#93A0B4; font-size:12px; line-height:1.5;">
                      ¿No esperabas esta invitación? Puedes ignorar este correo sin problema.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:22px 12px 0; text-align:center;">
              <p style="margin:0; color:#93A0B4; font-size:12px; line-height:1.6;">
                Este correo fue enviado a ${data.email} porque ${data.inviterName} te invitó a su plan familiar en MediHistory.
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
