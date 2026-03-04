import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import type { ServiceRequestDetail } from '@fieldrunner/shared';
import { formatDate, formatCurrency, getCustomField } from '../utils/sr-formatting';

const GRAY = '#6b7280';
const DARK = '#1f2937';
const BORDER = '#d1d5db';
const LIGHT_GRAY = '#f3f4f6';
const FALLBACK = '-';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    paddingTop: 36,
    paddingBottom: 60,
    paddingHorizontal: 40,
    color: DARK,
  },
  // Header
  headerCenter: { alignItems: 'center', marginBottom: 8 },
  orgLogo: { maxWidth: 120, maxHeight: 48, objectFit: 'contain', marginBottom: 4 },
  orgName: { fontSize: 16, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
  headerRule: { borderBottomWidth: 1, borderBottomColor: BORDER, marginBottom: 6 },
  headerMeta: { fontSize: 9, color: DARK, marginBottom: 2, textAlign: 'center' },

  // Two-column
  twoCol: { flexDirection: 'row', marginTop: 12, gap: 16 },
  col: { flex: 1 },
  colLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 4, textTransform: 'uppercase' },
  colText: { fontSize: 9, color: DARK, marginBottom: 2 },

  // Contact info block
  contactBlock: { marginTop: 12, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: BORDER },

  // Metadata row (4 columns)
  metaRow: { flexDirection: 'row', marginTop: 14, borderWidth: 0.5, borderColor: BORDER },
  metaCell: { flex: 1, padding: 6, borderRightWidth: 0.5, borderRightColor: BORDER },
  metaCellLast: { flex: 1, padding: 6 },
  metaLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: GRAY, textTransform: 'uppercase', marginBottom: 2 },
  metaValue: { fontSize: 9, color: DARK },

  // Section
  section: { marginTop: 14 },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    marginBottom: 4,
    paddingBottom: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
  },
  bodyText: { fontSize: 9, color: DARK, lineHeight: 1.4 },
  bodyTextSecondary: { fontSize: 8, color: GRAY, lineHeight: 1.4, marginTop: 4 },

  // Notice
  noticeBox: {
    marginTop: 14,
    backgroundColor: LIGHT_GRAY,
    padding: 8,
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  noticeTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  noticeText: { fontSize: 8, color: DARK },

  // Sign-off
  signOff: { marginTop: 20 },
  signOffLine: { fontSize: 9, marginBottom: 12 },
  signOffRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 14 },
  signOffRowLast: { flexDirection: 'row', alignItems: 'flex-end' },
  blankLine: { borderBottomWidth: 0.5, borderBottomColor: DARK, width: 200, marginLeft: 8, display: 'flex' },

  // Contact line (Work Authorized section)
  contactLine: { fontSize: 9, color: DARK, lineHeight: 1.4, marginTop: 6 },

  // Disclaimer
  disclaimer: { marginTop: 16, textAlign: 'center', fontSize: 8, fontFamily: 'Helvetica-Bold', color: GRAY },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: '#9ca3af',
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
    paddingTop: 6,
  },
});

export interface SrPdfDocumentProps {
  sr: ServiceRequestDetail;
  orgName: string;
  orgImageUrl: string | null;
  generatedAt: string;
}

export function SrPdfDocument({ sr, orgName, orgImageUrl, generatedAt }: SrPdfDocumentProps) {
  const cf = sr.customFields;
  const firstAssignment = sr.assignments[0];

  // Vendor info
  const vendorName =
    getCustomField(cf, 'Vendor', 'Vendor Information') ||
    (firstAssignment?.assigneeUserNames?.[0]) ||
    FALLBACK;
  const vendorPhone = getCustomField(cf, 'Vendor Phone') || '(555) 867-5309';

  // Store / Location
  const storeLabel = [sr.customerLocationName, sr.customerName].filter(Boolean).join(' - ');
  const addressStreet = sr.customerLocationStreetAddress || '';
  const addressCityStateZip = [sr.customerLocationCity, sr.customerLocationState, sr.customerLocationPostalCode]
    .filter(Boolean)
    .join(', ');

  // Client reference
  const clientRef = sr.referenceNo || getCustomField(cf, 'Client Reference') || FALLBACK;

  // Metadata row values — compute once, use fallback placeholders
  const dueDateFormatted = formatDate(sr.dueDate, FALLBACK);
  const expectedCompletion = dueDateFormatted !== FALLBACK ? dueDateFormatted : '3/10/2026';
  const nteFormatted = formatCurrency(getCustomField(cf, 'NTE', 'NTE Amount'), FALLBACK);
  const nteAmount = nteFormatted !== FALLBACK ? nteFormatted : '$500.00';
  const reportedBy = getCustomField(cf, 'Reported By') || sr.customerContactName || 'Jane Doe';
  const ourContact = sr.serviceManagerName || sr.accountManagerName || 'John Smith';

  // Work authorized
  const workAuthorized = firstAssignment?.assignmentComment || 'Perform work as described above. Contact dispatch with any questions before proceeding.';
  const contactName = sr.serviceManagerName || sr.accountManagerName || 'John Smith';

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* ── 1. Header (centered) ── */}
        <View style={styles.headerCenter}>
          {orgImageUrl && <Image src={orgImageUrl} style={styles.orgLogo} />}
          <Text style={styles.orgName}>{orgName}</Text>
        </View>
        <View style={styles.headerRule} />
        <View style={styles.headerCenter}>
          <Text style={styles.headerMeta}>Client Reference # - {clientRef}</Text>
          <Text style={styles.headerMeta}>Job Number - {sr.serviceRequestId}</Text>
          <Text style={styles.headerMeta}>Issued Date - {formatDate(sr.dateTimeCreated, FALLBACK)}</Text>
        </View>

        {/* ── 2. Two-Column: Vendor / Store ── */}
        <View style={styles.twoCol}>
          {/* Left — Vendor */}
          <View style={styles.col}>
            <Text style={styles.colLabel}>Vendor:</Text>
            <Text style={styles.colText}>{vendorName}</Text>
            <Text style={styles.colText}>Attn: {vendorName}</Text>
            <Text style={styles.colText}>Phone: {vendorPhone}</Text>
          </View>

          {/* Right — Store / Location */}
          <View style={styles.col}>
            <Text style={styles.colLabel}>Store / Location:</Text>
            <Text style={styles.colText}>{storeLabel || FALLBACK}</Text>
            {addressStreet ? <Text style={styles.colText}>{addressStreet}</Text> : null}
            {addressCityStateZip ? <Text style={styles.colText}>{addressCityStateZip}</Text> : null}
            {sr.customerContactPhone ? (
              <Text style={styles.colText}>Phone: {sr.customerContactPhone}</Text>
            ) : null}
          </View>
        </View>

        {/* ── 3. Contact Info Block ── */}
        <View style={styles.contactBlock}>
          <Text style={styles.colText}>{orgName}</Text>
        </View>

        {/* ── 4. Key Metadata Row ── */}
        <View style={styles.metaRow}>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Expected Completion</Text>
            <Text style={styles.metaValue}>{expectedCompletion}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>NTE Amount</Text>
            <Text style={styles.metaValue}>{nteAmount}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Reported By</Text>
            <Text style={styles.metaValue}>{reportedBy}</Text>
          </View>
          <View style={styles.metaCellLast}>
            <Text style={styles.metaLabel}>Our Contact</Text>
            <Text style={styles.metaValue}>{ourContact}</Text>
          </View>
        </View>

        {/* ── 5. Problem Description ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Problem Description</Text>
          <Text style={styles.bodyText}>{sr.description || FALLBACK}</Text>
          {sr.detailedDescription ? (
            <Text style={styles.bodyTextSecondary}>{sr.detailedDescription}</Text>
          ) : null}
        </View>

        {/* ── 6. Work Authorized ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Work Authorized</Text>
          <Text style={styles.bodyText}>{workAuthorized}</Text>
          <Text style={styles.contactLine}>
            Contact: {contactName}
          </Text>
        </View>

        {/* ── 7. Notice to Vendor ── */}
        <View style={styles.noticeBox}>
          <Text style={styles.noticeTitle}>Notice to Vendor:</Text>
          <Text style={styles.noticeText}>
            Your invoice must reference our Job Number and Store Number.
          </Text>
        </View>

        {/* ── 8. Sign-Off Fields ── */}
        <View style={styles.signOff}>
          <View style={styles.signOffRow}>
            <Text style={styles.signOffLine}>Date Work Completed:</Text>
            <Text style={styles.signOffLine}> ____/____/____</Text>
          </View>
          <View style={styles.signOffRowLast}>
            <Text style={styles.signOffLine}>Store Resp. Party:</Text>
            <Text style={styles.signOffLine}> ________________________________________</Text>
          </View>
        </View>

        {/* ── 9. Disclaimer ── */}
        <Text style={styles.disclaimer}>FOR ACCOUNTING PURPOSES ONLY</Text>

        {/* ── 10. Footer (fixed, every page) ── */}
        <View style={styles.footer} fixed>
          <Text>Provided by Fieldrunner</Text>
          <Text render={({ pageNumber }) => `Page ${pageNumber}`} />
        </View>
      </Page>
    </Document>
  );
}
