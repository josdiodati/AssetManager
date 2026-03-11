export const DEFAULT_TEMPLATE_SUBJECT = 'Confirmación de recepción de equipo'

export const DEFAULT_TEMPLATE_BODY = `<h2>Confirmación de recepción de equipo</h2>
<p>Hola {{personName}},</p>
<p>Se te ha asignado el siguiente equipo:</p>
<ul>
  <li><strong>Tag:</strong> {{assetTag}}</li>
  <li><strong>Tipo:</strong> {{assetType}}</li>
  <li><strong>Marca/Modelo:</strong> {{brand}} {{model}}</li>
  <li><strong>N/S:</strong> {{serialNumber}}</li>
</ul>
<p>Por favor confirma la recepción:</p>
<p><a href="{{acceptanceUrl}}">Confirmar recepción</a></p>`
