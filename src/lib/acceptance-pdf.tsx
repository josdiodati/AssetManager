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

const DEFAULT_TITLE = 'Constancia de Recepción y Compromiso de Uso Responsable'
const DEFAULT_WARNING = 'El incumplimiento de los términos aquí establecidos podrá dar lugar a acciones disciplinarias conforme a la normativa laboral vigente y/o acciones legales según corresponda.'

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
  acceptedAt: Date | null
  ipAddress: string | null
  // Token
  acceptanceTokenId: string
  // Template overrides
  clauses?: Array<{ title: string; body: string }>
  documentTitle?: string
  warningText?: string
}

export function AcceptancePdfDocument({ data }: { data: AcceptancePdfData }) {
  const formatDate = (d: Date) =>
    d.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })
  const formatDateTime = (d: Date) =>
    d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' }) + ' UTC'

  const docTitle = data.documentTitle ?? DEFAULT_TITLE
  const warningText = data.warningText ?? DEFAULT_WARNING
  const clauses = data.clauses ?? []

  return (
    <Document
      title={`${docTitle} — ${data.assetTag}`}
      author={data.tenantName}
      subject={docTitle}
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{docTitle}</Text>
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
          {data.acceptedAt && (
            <View style={styles.row}><Text style={styles.labelCell}>Fecha de entrega:</Text><Text style={styles.valueCell}>{formatDate(data.acceptedAt)}</Text></View>
          )}
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

          {clauses.map((clause, idx) => (
            <View key={idx} style={styles.legalItem}>
              <Text style={styles.legalBullet}>{idx + 1}.</Text>
              <Text style={styles.legalItemText}>
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>{clause.title}: </Text>
                {clause.body}
              </Text>
            </View>
          ))}

          <View style={styles.warningBox}>
            <Text style={styles.warningText}>{warningText}</Text>
          </View>
        </View>

        {/* Acceptance stamp — only when acceptedAt is present */}
        {data.acceptedAt && (
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
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{data.tenantName} — Sistema de Inventario IT</Text>
          <Text style={styles.footerText}>
            Documento generado electrónicamente{data.acceptedAt ? ` — ${formatDate(data.acceptedAt)}` : ''}
          </Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Pág. ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
