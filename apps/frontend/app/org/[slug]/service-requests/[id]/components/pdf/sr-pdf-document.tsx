import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import type { ServiceRequestDetail } from '@fieldrunner/shared';
import { PdfTable } from './pdf-table';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
    color: '#1f2937',
  },
  // Header
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  orgRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orgLogo: { width: 32, height: 32, borderRadius: 4 },
  orgName: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
  headerRight: { alignItems: 'flex-end' },
  title: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#111827' },
  subtitle: { fontSize: 9, color: '#6b7280', marginTop: 2 },
  // Section
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 6, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 4 },
  // Key-value grid
  kvGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  kvItem: { width: '50%', flexDirection: 'row', paddingVertical: 3 },
  kvLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#6b7280', width: '45%' },
  kvValue: { fontSize: 8, color: '#1f2937', width: '55%' },
  // Stat boxes
  statRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  statBox: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 4, padding: 8 },
  statLabel: { fontSize: 7, color: '#6b7280', textTransform: 'uppercase' },
  statValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  // Equipment / Assignment cards
  card: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 4, padding: 8, marginBottom: 6 },
  cardTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
  cardDetail: { fontSize: 8, color: '#6b7280', marginTop: 2 },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: '#9ca3af',
    borderTopWidth: 0.5,
    borderTopColor: '#e5e7eb',
    paddingTop: 6,
  },
});

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString();
}

interface SrPdfDocumentProps {
  sr: ServiceRequestDetail;
  orgName: string;
  orgImageUrl: string | null;
  generatedAt: string;
}

export function SrPdfDocument({ sr, orgName, orgImageUrl, generatedAt }: SrPdfDocumentProps) {
  const totalLaborHours = sr.billableLaborHours + sr.nonBillableLaborHours;
  const hasFinancials = sr.billableTotal > 0 || sr.costTotal > 0 || totalLaborHours > 0 || sr.nonBillableTotal > 0;

  const address = [sr.customerLocationStreetAddress, sr.customerLocationCity, sr.customerLocationState, sr.customerLocationPostalCode].filter(Boolean).join(', ');

  const customerFields: [string, string | null | undefined][] = [
    ['Name', sr.customerName],
    ['Contact', sr.customerContactName],
    ['Email', sr.customerContactEmail],
    ['Phone', sr.customerContactPhone],
    ['Location', sr.customerLocationName],
    ['Address', address || null],
  ];

  const detailFields: [string, string | null | undefined][] = [
    ['Type', sr.type],
    ['Priority', sr.priority],
    ['Status', sr.status],
    ['Account Manager', sr.accountManagerName],
    ['Service Manager', sr.serviceManagerName],
    ['Created', sr.dateTimeCreated ? new Date(sr.dateTimeCreated).toLocaleString() : null],
    ['Due Date', sr.dueDate ? formatDate(sr.dueDate) : null],
    ['Status Age', sr.statusAgeHours ? `${sr.statusAgeHours.toFixed(1)} hours` : null],
    ['Reference #', sr.referenceNo || null],
    ['PO #', sr.purchaseOrderNo || null],
  ];

  // Build work item table rows
  const laborRows = sr.labor.map((l) => [
    l.dateWorked,
    l.userName || '-',
    l.itemDescription,
    `${l.duration}h`,
    `$${l.totalPrice.toFixed(2)}`,
  ]);

  const materialRows = sr.materials.map((m) => [
    m.dateUsed,
    m.itemDescription,
    String(m.quantity),
    `$${m.totalPrice.toFixed(2)}`,
  ]);

  const expenseRows = sr.expenses.map((e) => [
    e.dateUsed,
    e.userName || '-',
    e.itemDescription,
    String(e.quantity),
    `$${e.totalPrice.toFixed(2)}`,
  ]);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.orgRow}>
            {orgImageUrl && <Image src={orgImageUrl} style={styles.orgLogo} />}
            <Text style={styles.orgName}>{orgName}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.title}>Service Request Report</Text>
            <Text style={styles.subtitle}>SR #{sr.serviceRequestId} | {sr.status}</Text>
            <Text style={styles.subtitle}>Generated {generatedAt}</Text>
          </View>
        </View>

        {/* Description */}
        {sr.description && (
          <View style={{ marginBottom: 4 }}>
            <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold' }}>{sr.description}</Text>
            {sr.detailedDescription && (
              <Text style={{ fontSize: 8, color: '#6b7280', marginTop: 4 }}>{sr.detailedDescription}</Text>
            )}
          </View>
        )}

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.kvGrid}>
            {detailFields
              .filter(([, v]) => v)
              .map(([label, value]) => (
                <View key={label} style={styles.kvItem}>
                  <Text style={styles.kvLabel}>{label}</Text>
                  <Text style={styles.kvValue}>{value}</Text>
                </View>
              ))}
          </View>
        </View>

        {/* Customer */}
        {customerFields.some(([, v]) => v) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer</Text>
            <View style={styles.kvGrid}>
              {customerFields
                .filter(([, v]) => v)
                .map(([label, value]) => (
                  <View key={label} style={styles.kvItem}>
                    <Text style={styles.kvLabel}>{label}</Text>
                    <Text style={styles.kvValue}>{value}</Text>
                  </View>
                ))}
            </View>
          </View>
        )}

        {/* Financials */}
        {hasFinancials && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Financials</Text>
            <View style={styles.statRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Billable Total</Text>
                <Text style={styles.statValue}>{formatCurrency(sr.billableTotal)}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Cost Total</Text>
                <Text style={styles.statValue}>{formatCurrency(sr.costTotal)}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Labor Hours</Text>
                <Text style={styles.statValue}>{totalLaborHours.toFixed(1)}h</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Non-Billable</Text>
                <Text style={styles.statValue}>{formatCurrency(sr.nonBillableTotal)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Labor */}
        {laborRows.length > 0 && (
          <View style={styles.section}>
            <PdfTable
              title="Labor"
              columns={[
                { header: 'Date', width: '18%' },
                { header: 'User', width: '20%' },
                { header: 'Description', width: '34%' },
                { header: 'Duration', width: '12%' },
                { header: 'Total', width: '16%', align: 'right' },
              ]}
              rows={laborRows}
            />
          </View>
        )}

        {/* Materials */}
        {materialRows.length > 0 && (
          <View style={styles.section}>
            <PdfTable
              title="Materials"
              columns={[
                { header: 'Date', width: '20%' },
                { header: 'Description', width: '44%' },
                { header: 'Qty', width: '16%' },
                { header: 'Total', width: '20%', align: 'right' },
              ]}
              rows={materialRows}
            />
          </View>
        )}

        {/* Expenses */}
        {expenseRows.length > 0 && (
          <View style={styles.section}>
            <PdfTable
              title="Expenses"
              columns={[
                { header: 'Date', width: '16%' },
                { header: 'User', width: '18%' },
                { header: 'Description', width: '34%' },
                { header: 'Qty', width: '12%' },
                { header: 'Total', width: '20%', align: 'right' },
              ]}
              rows={expenseRows}
            />
          </View>
        )}

        {/* Equipment */}
        {sr.equipment.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Equipment ({sr.equipment.length})</Text>
            {sr.equipment.map((e) => (
              <View key={e.equipmentId} style={styles.card}>
                <Text style={styles.cardTitle}>{e.equipName || 'Unnamed Equipment'}</Text>
                {e.equipType && <Text style={styles.cardDetail}>Type: {e.equipType}</Text>}
                {e.mfrName && <Text style={styles.cardDetail}>Manufacturer: {e.mfrName}</Text>}
                {e.modelNo && <Text style={styles.cardDetail}>Model: {e.modelNo}</Text>}
                {e.serialNo && <Text style={styles.cardDetail}>Serial #: {e.serialNo}</Text>}
                {e.refNo && <Text style={styles.cardDetail}>Ref #: {e.refNo}</Text>}
                {e.nextServiceDate && <Text style={styles.cardDetail}>Next Service: {formatDate(e.nextServiceDate)}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Assignments */}
        {sr.assignments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Assignments ({sr.assignments.length})</Text>
            {sr.assignments.map((a) => (
              <View key={a.assignmentId} style={styles.card}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.cardTitle}>
                    {a.assigneeUserNames.length > 0 ? a.assigneeUserNames.join(', ') : `Assignment #${a.assignmentId}`}
                  </Text>
                  <Text style={{ fontSize: 8, color: a.isComplete ? '#059669' : '#d97706' }}>
                    {a.isComplete ? 'Complete' : 'Pending'}
                  </Text>
                </View>
                <Text style={styles.cardDetail}>Type: {a.type}</Text>
                {a.startDate && <Text style={styles.cardDetail}>Start: {new Date(a.startDate).toLocaleString()}</Text>}
                {a.endDate && <Text style={styles.cardDetail}>End: {new Date(a.endDate).toLocaleString()}</Text>}
                {a.assignmentComment && <Text style={styles.cardDetail}>{a.assignmentComment}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Custom Fields */}
        {sr.customFields.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Custom Fields</Text>
            <View style={styles.kvGrid}>
              {sr.customFields.map((cf) => (
                <View key={cf.name} style={styles.kvItem}>
                  <Text style={styles.kvLabel}>{cf.name}</Text>
                  <Text style={styles.kvValue}>{cf.value || '-'}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
          <Text>Generated from Fieldrunner</Text>
        </View>
      </Page>
    </Document>
  );
}
