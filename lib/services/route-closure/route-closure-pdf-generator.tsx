// components/pdf/RouteClosurePDF.tsx
import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from '@react-pdf/renderer';
import { format } from 'date-fns-tz';
import { PackageInfo, PackageDispatch } from '@/lib/types';

Font.register({ family: 'Helvetica', src: undefined });

const colors = {
  primary: '#8c5e4e',
  secondary: '#4cc9f0',
  accent: '#ff6b6b',
  light: '#f8f9fa',
  dark: '#212529',
  border: '#dee2e6',
  success: '#40c057',
};

const styles = StyleSheet.create({
  page: { padding: 12, fontSize: 8, fontFamily: 'Helvetica', flexDirection: 'column', backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 6, borderBottom: `2px solid ${colors.primary}` },
  logo: { width: 45, height: 45 },
  headerText: { fontSize: 13, fontWeight: 'bold', color: colors.primary, textAlign: 'center' },
  dateText: { fontSize: 7, color: colors.dark, textAlign: 'right' },
  compactGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8, padding: 6, backgroundColor: colors.light, borderRadius: 4, border: `1px solid ${colors.border}` },
  compactItem: { width: '32%', marginBottom: 4 },
  compactLabel: { fontSize: 6, fontWeight: 'bold', color: colors.primary, marginBottom: 1 },
  compactValue: { fontSize: 7, color: colors.dark },
  mainContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  leftColumn: { width: '58%', paddingRight: 8 },
  rightColumn: { width: '40%' },
  sectionTitle: { fontSize: 9, fontWeight: 'bold', color: colors.primary, marginBottom: 5, padding: 3, textAlign: 'center', backgroundColor: colors.light, borderRadius: 3, border: `1px solid ${colors.border}` },
  tableContainer: { maxHeight: 200, border: `1px solid ${colors.border}`, borderRadius: 4 },
  tableHeader: { flexDirection: 'row', backgroundColor: colors.primary, color: 'white', padding: 3, fontSize: 7, fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', borderBottom: `1px solid ${colors.border}`, fontSize: 6.5, padding: 2, minHeight: 16 },
  tableRowEven: { backgroundColor: colors.light },
  multiColumnContainer: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' },
  column: { width: '48%' },
  collectionItem: { fontSize: 7, marginBottom: 2, padding: 2, borderBottom: `1px solid ${colors.border}` },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap' },
  statBox: { width: '48%', border: `1px solid ${colors.primary}`, borderRadius: 3, padding: 5, alignItems: 'center', marginBottom: 5, backgroundColor: colors.light },
  statTitle: { fontSize: 7, fontWeight: 'bold', color: colors.primary, textAlign: 'center', marginBottom: 2 },
  statValue: { fontSize: 11, fontWeight: 'bold', color: colors.dark, textAlign: 'center' },
  dexContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap' },
  dexBox: { width: '23%', border: `1px solid ${colors.border}`, borderRadius: 2, padding: 4, alignItems: 'center', marginBottom: 4, backgroundColor: colors.light },
  dexTitle: { fontSize: 7, fontWeight: 'bold', color: colors.primary, textAlign: 'center', marginBottom: 1 },
  dexValue: { fontSize: 9, fontWeight: 'bold', color: colors.dark, textAlign: 'center' },
  signatureContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, borderTop: `1px solid ${colors.border}`, paddingTop: 8 },
  signatureBox: { width: '48%', alignItems: 'center' },
  signatureLine: { borderTop: `1px solid ${colors.dark}`, width: '80%', paddingTop: 3, marginBottom: 3 },
  signatureText: { fontSize: 8, color: colors.dark, textAlign: 'center', fontWeight: 'bold' },
  signatureSubtext: { fontSize: 7, color: colors.dark, textAlign: 'center', marginTop: 2 },
  footer: { marginTop: 8, fontSize: 6, color: colors.dark, textAlign: 'center', borderTop: `1px solid ${colors.border}`, paddingTop: 3, opacity: 0.7 },
});

interface RouteClosurePDFProps {
  returnedPackages: PackageInfo[];
  packageDispatch: PackageDispatch;
  actualKms: string;
  collections?: string[];
  podPackages?: PackageInfo[];
}

export const RouteClosurePDF = ({
  returnedPackages,
  packageDispatch,
  actualKms,
  collections = [],
  podPackages = [],
}: RouteClosurePDFProps) => {
  const timeZone = 'America/Hermosillo';
  const currentDate = new Date();
  const formattedDate = format(currentDate, 'yyyy-MM-dd', { timeZone });
  const formattedTime = format(currentDate, 'HH:mm:ss', { timeZone });

  const { subsidiary, vehicle, shipments, trackingNumber, drivers, routes, createdAt, kms } = packageDispatch;

  const validReturns = returnedPackages.filter(p => p.isValid);
  const originalCount = shipments?.length || 0;
  const deliveredCount = originalCount - validReturns.length;
  const returnRate = originalCount > 0 ? (validReturns.length / originalCount) * 100 : 0;
  const podDeliveredCount = podPackages?.length || 0;

  const dex03Count = validReturns.filter(p => p.lastHistory?.exceptionCode === '03').length;
  const dex07Count = validReturns.filter(p => p.lastHistory?.exceptionCode === '07').length;
  const dex08Count = validReturns.filter(p => p.lastHistory?.exceptionCode === '08').length;
  const dex12Count = validReturns.filter(p => p.lastHistory?.exceptionCode === '12').length;

  const dispatchDate = createdAt ? format(new Date(createdAt), 'yyyy-MM-dd', { timeZone }) : 'N/A';
  const mainDriver = drivers && drivers.length > 0 ? drivers[0].name : 'No asignado';
  const routeNames = routes?.map(r => r.name).join(', ') || 'No asignado';

  // Cobros
  const charges = shipments
    ?.filter(pkg => pkg.payment)
    .map(pkg => ({
      trackingNumber: pkg.trackingNumber,
      amount: pkg.payment?.amount || 0,
      type: pkg.payment?.type || 'N/A',
    })) || [];

  const splitCollectionsIntoColumns = (collections: string[], columns: number) => {
    const result = [];
    const itemsPerColumn = Math.ceil(collections.length / columns);
    for (let i = 0; i < columns; i++) result.push(collections.slice(i * itemsPerColumn, (i + 1) * itemsPerColumn));
    return result;
  };
  const collectionColumns = splitCollectionsIntoColumns(collections, 2);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src="/logo-no-fondo.png" style={styles.logo} />
          <Text style={styles.headerText}>CIERRE DE RUTA</Text>
          <View>
            <Text style={styles.dateText}>{formattedDate}</Text>
            <Text style={styles.dateText}>{formattedTime}</Text>
          </View>
        </View>

        {/* Información general compacta */}
        <View style={styles.compactGrid}>
          {/* ...igual que antes (omito aquí por brevedad) */}
        </View>

        {/* Contenido principal */}
        <View style={styles.mainContainer}>
          {/* Columna izquierda: Devueltos y DEX */}
          <View style={styles.leftColumn}>
            {/* ...igual que antes */}
          </View>

          {/* Columna derecha: Recolecciones */}
          <View style={styles.rightColumn}>
            <Text style={styles.sectionTitle}>RECOLECCIONES ({collections.length})</Text>
            {collections.length > 0 ? (
              <View style={[styles.tableContainer, { maxHeight: 200 }]}>
                <View style={styles.multiColumnContainer}>
                  {collectionColumns.map((column, colIndex) => (
                    <View key={colIndex} style={styles.column}>
                      {column.map((tracking, i) => (
                        <Text key={i} style={styles.collectionItem}>{tracking}</Text>
                      ))}
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <Text style={{ textAlign: 'center', fontSize: 7, padding: 8, color: colors.dark }}>No hay recolecciones</Text>
            )}

            {/* Estadísticas */}
            <View style={[styles.statsContainer, { marginTop: 6 }]}>
              <View style={styles.statBox}>
                <Text style={styles.statTitle}>PAQUETES EN SALIDA</Text>
                <Text style={styles.statValue}>{originalCount}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statTitle}>ENTREGAS EFECTIVAS</Text>
                <Text style={styles.statValue}>{deliveredCount}</Text>
              </View>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statTitle}>TASA DE DEVOLUCIÓN</Text>
              <Text style={[styles.statValue, { color: returnRate > 20 ? colors.accent : colors.success }]}>{returnRate.toFixed(1)}%</Text>
            </View>

            {/* Cobros debajo de recolecciones */}
            <Text style={[styles.sectionTitle, { marginTop: 6 }]}>COBROS ({charges.length})</Text>
            {charges.length > 0 ? (
              <View style={styles.tableContainer}>
                <View style={styles.tableHeader}>
                  <Text style={{ width: '50%' }}>GUÍA</Text>
                  <Text style={{ width: '25%' }}>TIPO</Text>
                  <Text style={{ width: '25%' }}>MONTO</Text>
                </View>
                {charges.map((c, i) => (
                  <View style={[styles.tableRow, i % 2 === 0 && styles.tableRowEven]} key={i}>
                    <Text style={{ width: '50%' }}>{c.trackingNumber}</Text>
                    <Text style={{ width: '25%' }}>{c.type}</Text>
                    <Text style={{ width: '25%' }}>${c.amount.toFixed(2)}</Text>
                  </View>
                ))}
                {/* Total */}
                <View style={[styles.tableRow, { fontWeight: 'bold', backgroundColor: colors.light }]}>
                  <Text style={{ width: '50%' }}>TOTAL</Text>
                  <Text style={{ width: '25%' }}></Text>
                  <Text style={{ width: '25%' }}>${charges.reduce((sum, c) => sum + c.amount, 0).toFixed(2)}</Text>
                </View>
              </View>
            ) : (
              <Text style={{ textAlign: 'center', fontSize: 7, padding: 8, color: colors.dark }}>No hay cobros</Text>
            )}
          </View>
        </View>

        {/* Firmas */}
        <View style={styles.signatureContainer}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureText}>FIRMA DE CONFORMIDAD</Text>
            <Text style={styles.signatureSubtext}>{mainDriver} - Conductor</Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureText}>NOMBRE Y FIRMA</Text>
            <Text style={styles.signatureSubtext}>Personal que recibe</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Documento generado automáticamente por el Sistema de Gestión de Rutas</Text>
          <Text>Impreso el {formattedDate} a las {formattedTime}</Text>
        </View>
      </Page>
    </Document>
  );
};
