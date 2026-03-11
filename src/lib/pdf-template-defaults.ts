// Non-server constants — safe to import from both client and server modules

export const DEFAULT_PDF_CLAUSES = [
  { title: 'Uso exclusivamente corporativo', body: 'El equipo asignado es propiedad de la organización y se entrega al receptor para uso exclusivo en el desempeño de sus funciones laborales. Queda expresamente prohibido su uso para actividades personales, comerciales ajenas a la organización, o cualquier fin ilícito.' },
  { title: 'Custodia y cuidado', body: 'El receptor asume plena responsabilidad por la integridad física del equipo desde la fecha de recepción. Deberá conservarlo en condiciones adecuadas, evitar golpes, derrames de líquidos, exposición a temperaturas extremas y cualquier otra situación que pueda provocar daño o deterioro.' },
  { title: 'Seguridad de la información', body: 'El receptor se compromete a mantener la confidencialidad de toda la información corporativa almacenada o procesada en el equipo. No deberá compartir credenciales de acceso ni permitir el uso del equipo a terceros sin autorización expresa del área de IT.' },
  { title: 'Prohibición de modificaciones no autorizadas', body: 'No se podrá instalar software no licenciado, modificar la configuración de seguridad, desinstalar herramientas de gestión remota, ni realizar cambios de hardware sin la previa autorización del departamento de sistemas.' },
  { title: 'Pérdida, robo o daño', body: 'En caso de pérdida, robo o daño total o parcial del equipo, el receptor deberá notificarlo de inmediato al área de IT. La organización evaluará las circunstancias y podrá reclamar al receptor el costo de reposición en caso de negligencia comprobada.' },
  { title: 'Devolución del equipo', body: 'Al finalizar la relación laboral o ante requerimiento de la organización, el receptor deberá devolver el equipo en el mismo estado en que fue entregado, considerando el desgaste normal de uso. La información corporativa almacenada podrá ser borrada por el equipo de IT previo a cualquier reasignación.' },
  { title: 'Auditoría y monitoreo', body: 'La organización se reserva el derecho de auditar el uso del equipo y de los sistemas corporativos con el objetivo de garantizar el cumplimiento de las políticas de seguridad y uso aceptable. El receptor presta conformidad con dichas actividades de monitoreo.' },
]

export const DEFAULT_PDF_WARNING = 'El incumplimiento de los términos aquí establecidos podrá dar lugar a acciones disciplinarias conforme a la normativa laboral vigente y/o acciones legales según corresponda.'

export const DEFAULT_PDF_TITLE = 'Constancia de Recepción y Compromiso de Uso Responsable'
