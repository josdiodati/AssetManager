import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendAcceptanceEmail({
  to,
  personName,
  assetTag,
  assetTypeName,
  brandName,
  modelName,
  serialNumber,
  acceptanceUrl,
}: {
  to: string
  personName: string
  assetTag: string
  assetTypeName: string
  brandName?: string | null
  modelName?: string | null
  serialNumber?: string | null
  acceptanceUrl: string
}) {
  const from = process.env.EMAIL_FROM ?? 'noreply@kawellu.com.ar'

  const deviceDesc = [brandName, modelName].filter(Boolean).join(' ') || assetTypeName

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 40px 20px;">
  <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: #1d4ed8; padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 600;">Confirmación de Activo</h1>
    </div>
    <div style="padding: 32px;">
      <p style="color: #374151; font-size: 15px; margin: 0 0 20px;">Hola <strong>${personName}</strong>,</p>
      <p style="color: #374151; font-size: 15px; margin: 0 0 24px;">Se te ha asignado el siguiente activo y necesitamos tu confirmación:</p>

      <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 0 0 28px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #6b7280; font-size: 13px; width: 40%;">Asset Tag</td>
            <td style="padding: 6px 0; color: #111827; font-size: 13px; font-weight: 600; font-family: monospace;">${assetTag}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Tipo</td>
            <td style="padding: 6px 0; color: #111827; font-size: 13px;">${assetTypeName}</td>
          </tr>
          ${deviceDesc !== assetTypeName ? `
          <tr>
            <td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Dispositivo</td>
            <td style="padding: 6px 0; color: #111827; font-size: 13px;">${deviceDesc}</td>
          </tr>` : ''}
          ${serialNumber ? `
          <tr>
            <td style="padding: 6px 0; color: #6b7280; font-size: 13px;">N° Serie</td>
            <td style="padding: 6px 0; color: #111827; font-size: 13px; font-family: monospace;">${serialNumber}</td>
          </tr>` : ''}
        </table>
      </div>

      <div style="text-align: center; margin: 0 0 28px;">
        <a href="${acceptanceUrl}" style="display: inline-block; background: #1d4ed8; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600;">
          Confirmar recepción del activo
        </a>
      </div>

      <p style="color: #6b7280; font-size: 13px; margin: 0;">Este enlace expira en 30 días. Si tenés preguntas, contactá a tu área de IT.</p>
    </div>
    <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">Este es un mensaje automático del sistema de inventario.</p>
    </div>
  </div>
</body>
</html>`

  const result = await resend.emails.send({
    from,
    to,
    subject: `Confirmación de activo asignado — ${assetTag}`,
    html,
  })

  return result
}
