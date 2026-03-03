import { View, Text, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  table: { width: '100%', marginTop: 4 },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  headerCell: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#374151' },
  row: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
  },
  rowAlt: { backgroundColor: '#f9fafb' },
  cell: { fontSize: 8, fontFamily: 'Helvetica', color: '#374151' },
});

interface Column {
  header: string;
  width: string;
  align?: 'left' | 'right';
}

interface PdfTableProps {
  title: string;
  columns: Column[];
  rows: string[][];
}

export function PdfTable({ title, columns, rows }: PdfTableProps) {
  if (rows.length === 0) return null;

  return (
    <View wrap={false}>
      <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {title} ({rows.length})
      </Text>
      <View style={styles.table}>
        <View style={styles.headerRow}>
          {columns.map((col) => (
            <Text
              key={col.header}
              style={[styles.headerCell, { width: col.width, textAlign: col.align ?? 'left' }]}
            >
              {col.header}
            </Text>
          ))}
        </View>
        {rows.map((row, ri) => (
          <View key={ri} style={[styles.row, ri % 2 === 1 ? styles.rowAlt : {}]}>
            {row.map((cell, ci) => (
              <Text
                key={ci}
                style={[styles.cell, { width: columns[ci].width, textAlign: columns[ci].align ?? 'left' }]}
              >
                {cell}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}
