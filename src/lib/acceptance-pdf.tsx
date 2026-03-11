import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 50,
    paddingBottom: 60,
    paddingLeft: 55,
    paddingRight: 55,
    color: '#1a1a1a',
  },
  // Header
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
    paddingBottom: 12,
    marginBottom: 18,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#1e40af',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 9,
    color: '#6b7280',
  },
  // Section
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1e40af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
    paddingBottom: 3,
    marginBottom: 7,
  },
  // Data grid
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  labelCell: {
    width: '35%',
    color: '#6b7280',
  },
  valueCell: {
    width: '65%',
    fontFamily: 'Helvetica-Bold',
  },
  // Legal text
  legalParagraph: {
    marginBottom: 6,
    lineHeight: 1.5,
    textAlign: 'justify',
  },
  legalItem: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  legalBullet: {
    width: 14,
    color: '#2563eb',
    fontFamily: 'Helvetica-Bold',
  },
  legalItemText: {
    flex: 1,
    lineHeight: 1.5,
    textAlign: 'justify',
  },
  // Acceptance stamp
  stampBox: {
    borderWidth: 1.5,
    borderColor: '#16a34a',
    borderRadius: 4,
    padding: 14,
    marginTop: 10,
    backgroundColor: '#f0fdf4',
  },
  stampTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#15803d',
    marginBottom: 8,
    textAlign: 'center',
  },
  stampRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  stampLabel: {
    width: '30%',
    color: '#374151',
    fontSize: 9,
  },
  stampValue: {
    flex: 1,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#1a1a1a',
  },
  constanciaId: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: '#86efac',
    fontSize: 8,
    color: '#6b7280',
    textAlign: 'center',
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 55,
    right: 55,
    borderTopWidth: 0.5,
    borderTopColor: '#d1d5db',
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
  },
  // Warning
  warningBox: {
    backgroundColor: '#fffbeb',
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
    paddingLeft: 8,
    paddingTop: 5,
    paddingBottom: 5,
    paddingRight: 8,
    marginBottom: 10,
  },
  warningText: {
    fontSize: 9,
    color: '#92400e',
    lineHeight: 1.4,
  },
})

export interface AcceptancePdfData {
  constanciaId: string
  tenantName: string
  // Internal (not rendered)
  assetId?: string
  tenantId?: string
  // Asset
  assetTag: string
  assetType: string
  brandName: string
  modelName: string
  serialNumber: string | null
  // Person
  personName: string
  personEmail: string
  // Acceptance
  acceptedAt: Date
  ipAddress: string | null
  // Token
  acceptanceTokenId: string
}

export function AcceptancePdfDocument({ data }: { data: AcceptancePdfData }) {
  const formatDate = (d: Date) =>
    d.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })
  const formatDateTime = (d: Date) =>
    d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' }) + ' UTC'

  return (
    <Document
      title={`Constancia de Recepción — ${data.assetTag}`}
      author={data.tenantName}
      subject="Constancia de Recepción y Compromiso de Uso Responsable de Equipo"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Constancia de Recepción y Compromiso de Uso Responsable</Text>
          <Text style={styles.headerSubtitle}>{data.tenantName} — Documento generado electrónicamente</Text>
        </View>

        {/* Asset data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del Equipo</Text>
          <View style={styles.row}><Text style={styles.labelCell}>Identificador:</Text><Text style={styles.valueCell}>{data.assetTag}</Text></View>
          <View style={styles.row}><Text style={styles.labelCell}>Tipo:</Text><Text style={styles.valueCell}>{data.assetType}</Text></View>
          <View style={styles.row}><Text style={styles.labelCell}>Marca y modelo:</Text><Text style={styles.valueCell}>{data.brandName} {data.modelName}</Text></View>
          {data.serialNumber && (
            <View style={styles.row}><Text style={styles.labelCell}>Número de serie:</Text><Text style={styles.valueCell}>{data.serialNumber}</Text></View>
          )}
          <View style={styles.row}><Text style={styles.labelCell}>Fecha de entrega:</Text><Text style={styles.valueCell}>{formatDate(data.acceptedAt)}</Text></View>
        </View>

        {/* Recipient data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del Receptor</Text>
          <View style={styles.row}><Text style={styles.labelCell}>Nombre completo:</Text><Text style={styles.valueCell}>{data.personName}</Text></View>
          <View style={styles.row}><Text style={styles.labelCell}>Correo electrónico:</Text><Text style={styles.valueCell}>{data.personEmail}</Text></View>
        </View>

        {/* Legal text */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Términos y Condiciones de Uso</Text>

          <Text style={styles.legalParagraph}>
            Mediante la aceptación electrónica del presente documento, el receptor declara haber recibido el equipo
            identificado precedentemente en perfectas condiciones de funcionamiento, y manifiesta expresamente su conformidad
            con los siguientes términos y condiciones:
          </Text>

          <View style={styles.legalItem}>
            <Text style={styles.legalBullet}>1.</Text>
            <Text style={styles.legalItemText}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Uso exclusivamente corporativo: </Text>
              El equipo asignado es propiedad de {data.tenantName} y se entrega al receptor para uso exclusivo en el
              desempeño de sus funciones laborales. Queda expresamente prohibido su uso para actividades personales,
              comerciales ajenas a la organización, o cualquier fin ilícito.
            </Text>
          </View>

          <View style={styles.legalItem}>
            <Text style={styles.legalBullet}>2.</Text>
            <Text style={styles.legalItemText}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Custodia y cuidado: </Text>
              El receptor asume plena responsabilidad por la integridad física del equipo desde la fecha de recepción.
              Deberá conservarlo en condiciones adecuadas, evitar golpes, derrames de líquidos, exposición a temperaturas
              extremas y cualquier otra situación que pueda provocar daño o deterioro.
            </Text>
          </View>

          <View style={styles.legalItem}>
            <Text style={styles.legalBullet}>3.</Text>
            <Text style={styles.legalItemText}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Seguridad de la información: </Text>
              El receptor se compromete a mantener la confidencialidad de toda la información corporativa almacenada
              o procesada en el equipo. No deberá compartir credenciales de acceso ni permitir el uso del equipo a
              terceros sin autorización expresa del área de IT.
            </Text>
          </View>

          <View style={styles.legalItem}>
            <Text style={styles.legalBullet}>4.</Text>
            <Text style={styles.legalItemText}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Prohibición de modificaciones no autorizadas: </Text>
              No se podrá instalar software no licenciado, modificar la configuración de seguridad, desinstalar
              herramientas de gestión remota, ni realizar cambios de hardware sin la previa autorización del
              departamento de sistemas.
            </Text>
          </View>

          <View style={styles.legalItem}>
            <Text style={styles.legalBullet}>5.</Text>
            <Text style={styles.legalItemText}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Pérdida, robo o daño: </Text>
              En caso de pérdida, robo o daño total o parcial del equipo, el receptor deberá notificarlo de inmediato
              al área de IT. La organización evaluará las circunstancias y podrá reclamar al receptor el costo de
              reposición en caso de negligencia comprobada.
            </Text>
          </View>

          <View style={styles.legalItem}>
            <Text style={styles.legalBullet}>6.</Text>
            <Text style={styles.legalItemText}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Devolución del equipo: </Text>
              Al finalizar la relación laboral o ante requerimiento de la organización, el receptor deberá devolver
              el equipo en el mismo estado en que fue entregado, considerando el desgaste normal de uso. La
              información corporativa almacenada podrá ser borrada por el equipo de IT previo a cualquier reasignación.
            </Text>
          </View>

          <View style={styles.legalItem}>
            <Text style={styles.legalBullet}>7.</Text>
            <Text style={styles.legalItemText}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Auditoría y monitoreo: </Text>
              La organización se reserva el derecho de auditar el uso del equipo y de los sistemas corporativos con
              el objetivo de garantizar el cumplimiento de las políticas de seguridad y uso aceptable. El receptor
              presta conformidad con dichas actividades de monitoreo.
            </Text>
          </View>

          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              El incumplimiento de los términos aquí establecidos podrá dar lugar a acciones disciplinarias conforme
              a la normativa laboral vigente y/o acciones legales según corresponda.
            </Text>
          </View>
        </View>

        {/* Acceptance stamp */}
        <View style={styles.stampBox}>
          <Text style={styles.stampTitle}>✓  ACEPTACIÓN ELECTRÓNICA REGISTRADA</Text>
          <View style={styles.stampRow}>
            <Text style={styles.stampLabel}>Firmante:</Text>
            <Text style={styles.stampValue}>{data.personName} &lt;{data.personEmail}&gt;</Text>
          </View>
          <View style={styles.stampRow}>
            <Text style={styles.stampLabel}>Fecha y hora:</Text>
            <Text style={styles.stampValue}>{formatDateTime(data.acceptedAt)}</Text>
          </View>
          {data.ipAddress && (
            <View style={styles.stampRow}>
              <Text style={styles.stampLabel}>Dirección IP:</Text>
              <Text style={styles.stampValue}>{data.ipAddress}</Text>
            </View>
          )}
          <View style={styles.stampRow}>
            <Text style={styles.stampLabel}>Token:</Text>
            <Text style={styles.stampValue}>{data.acceptanceTokenId}</Text>
          </View>
          <Text style={styles.constanciaId}>
            ID de constancia: {data.constanciaId}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{data.tenantName} — Sistema de Inventario IT</Text>
          <Text style={styles.footerText}>Documento generado electrónicamente — {formatDate(data.acceptedAt)}</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Pág. ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
