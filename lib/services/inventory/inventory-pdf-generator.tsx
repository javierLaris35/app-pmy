// components/pdf/InventoryPDFReport.tsx
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from "@react-pdf/renderer";
import { format, toZonedTime } from "date-fns-tz";
import { InventoryReport, InventoryRequest } from "@/lib/types";

Font.register({ family: "Helvetica", src: undefined });

const colors = {
  primary: "#8c5e4e",
  secondary: "#4cc9f0",
  accent: "#ff6b6b",
  light: "#f8f9fa",
  dark: "#212529",
  border: "#dee2e6",
  success: "#40c057",
  warning: "#f59f00",
  danger: "#e03131",
  info: "#339af0",
};

const styles = StyleSheet.create({
  page: { padding: 15, fontSize: 8, fontFamily: "Helvetica", flexDirection: "column", backgroundColor: "#FFFFFF" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingBottom: 8, borderBottom: `2px solid ${colors.primary}` },
  logo: { width: 45, height: 45 },
  headerText: { fontSize: 14, fontWeight: "bold", color: colors.primary, textAlign: "center" },
  dateText: { fontSize: 8, color: colors.dark, textAlign: "right" },
  compactGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 10, padding: 8, backgroundColor: colors.light, borderRadius: 4, border: `1px solid ${colors.border}` },
  compactItem: { width: "32%", marginBottom: 5 },
  compactLabel: { fontSize: 7, fontWeight: "bold", color: colors.primary, marginBottom: 2 },
  compactValue: { fontSize: 8, color: colors.dark, fontWeight: "bold" },
  mainContainer: { flexDirection: "column", marginBottom: 10 },
  tableContainer: { border: `1px solid ${colors.border}`, borderRadius: 4, marginBottom: 10 },
  tableHeader: { flexDirection: "row", backgroundColor: colors.primary, color: "white", padding: 4, fontSize: 7, fontWeight: "bold" },
  tableRow: { flexDirection: "row", borderBottom: `1px solid ${colors.border}`, fontSize: 7, padding: 3, minHeight: 16 },
  tableRowEven: { backgroundColor: colors.light },
  sectionTitle: { fontSize: 10, fontWeight: "bold", color: colors.primary, marginBottom: 6, padding: 4, textAlign: "center", backgroundColor: colors.light, borderRadius: 3, border: `1px solid ${colors.border}` },
  statsContainer: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, flexWrap: "wrap" },
  statBox: { width: "23%", border: `1px solid ${colors.primary}`, borderRadius: 3, padding: 6, alignItems: "center", marginBottom: 5, backgroundColor: colors.light },
  statTitle: { fontSize: 7, fontWeight: "bold", color: colors.primary, textAlign: "center", marginBottom: 2 },
  statValue: { fontSize: 12, fontWeight: "bold", color: colors.dark, textAlign: "center" },
  signatureContainer: { flexDirection: "row", justifyContent: "space-between", marginTop: 15, borderTop: `1px solid ${colors.border}`, paddingTop: 10 },
  signatureBox: { width: "48%", alignItems: "center" },
  signatureLine: { borderTop: `1px solid ${colors.dark}`, width: "80%", paddingTop: 3, marginBottom: 3 },
  signatureText: { fontSize: 9, color: colors.dark, textAlign: "center", fontWeight: "bold" },
  signatureSubtext: { fontSize: 8, color: colors.dark, textAlign: "center", marginTop: 2 },
  footer: { marginTop: 10, fontSize: 7, color: colors.dark, textAlign: "center", borderTop: `1px solid ${colors.border}`, paddingTop: 4, opacity: 0.7 },
  badge: { fontSize: 6, fontWeight: "bold", padding: 1, borderRadius: 2, marginRight: 1 },
  badgeCharge: { backgroundColor: colors.success, color: "white" },
  badgePayment: { backgroundColor: colors.warning, color: "white" },
  badgeHighValue: { backgroundColor: colors.danger, color: "white" },
  trackingListsContainer: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  trackingList: { width: "48%" },
  trackingItem: { fontSize: 7, marginBottom: 2, padding: 2, borderBottom: `1px solid ${colors.border}` },
});

export const InventoryPDFReport = ({ report }: { report: InventoryRequest }) => {
  const timeZone = "America/Hermosillo";
  const currentDate = new Date();
  const formattedDate = format(currentDate, "yyyy-MM-dd", { timeZone });
  const formattedTime = format(currentDate, "HH:mm:ss", { timeZone });
  
  const createdDate = toZonedTime(new Date(report.createdAt || report.date), timeZone);
  const reportDate = format(createdDate, "yyyy-MM-dd", { timeZone });

  const truncate = (text: string, maxLength: number): string =>
    !text ? "" : text.length > maxLength ? text.slice(0, maxLength - 3) + "..." : text;

  // Estadísticas
  const validPackages = report.packages.filter(p => p.isValid);
  const chargePackages = report.packages.filter(p => p.isCharge);
  const highValuePackages = report.packages.filter(p => p.isHighValue);
  const paymentPackages = report.packages.filter(p => p.payment);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src="/logo-no-fondo.png" style={styles.logo} />
          <Text style={styles.headerText}>INVENTARIO DE PAQUETES</Text>
          <View>
            <Text style={styles.dateText}>{formattedDate}</Text>
            <Text style={styles.dateText}>{formattedTime}</Text>
          </View>
        </View>

        {/* Información general compacta */}
        <View style={styles.compactGrid}>
          <View style={styles.compactItem}>
            <Text style={styles.compactLabel}>SUCURSAL</Text>
            <Text style={styles.compactValue}>{report.subsidiary.name}</Text>
          </View>
          <View style={styles.compactItem}>
            <Text style={styles.compactLabel}>FECHA INVENTARIO</Text>
            <Text style={styles.compactValue}>{reportDate}</Text>
          </View>
          <View style={styles.compactItem}>
            <Text style={styles.compactLabel}>TOTAL PAQUETES</Text>
            <Text style={styles.compactValue}>{report.packages.length}</Text>
          </View>
          <View style={styles.compactItem}>
            <Text style={styles.compactLabel}>VÁLIDOS</Text>
            <Text style={styles.compactValue}>{validPackages.length}</Text>
          </View>
          <View style={styles.compactItem}>
            <Text style={styles.compactLabel}>CARGA</Text>
            <Text style={styles.compactValue}>{chargePackages.length}</Text>
          </View>
          <View style={styles.compactItem}>
            <Text style={styles.compactLabel}>ALTO VALOR</Text>
            <Text style={styles.compactValue}>{highValuePackages.length}</Text>
          </View>
        </View>

        {/* Tabla de paquetes - COLUMNAS MÁS ANCHAS */}
        <View>
          <Text style={styles.sectionTitle}>
            PAQUETES DEL INVENTARIO ({report.packages.length})
          </Text>
          
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <Text style={{ width: 25 }}>#</Text>
              <Text style={{ width: 80 }}>GUÍA</Text>
              <Text style={{ width: 100 }}>NOMBRE</Text>
              <Text style={{ width: 110 }}>DIRECCIÓN</Text>
              <Text style={{ width: 70 }}>COBRO</Text>
              <Text style={{ width: 60 }}>FECHA</Text>
              <Text style={{ width: 50 }}>HORA</Text>
            </View>
            
            {report.packages.map((pkg, i) => {
              const zoned = pkg.commitDateTime ? toZonedTime(new Date(pkg.commitDateTime), timeZone) : null;
              const commitDate = zoned ? format(zoned, "yyyy-MM-dd", { timeZone }) : "N/A";
              const commitTime = zoned ? format(zoned, "HH:mm", { timeZone }) : "N/A";

              // Formato completo del pago
              const paymentText = pkg.payment ? 
                `${pkg.payment.type} $${pkg.payment.amount}` : "";

              return (
                <View style={[styles.tableRow, i % 2 === 0 && styles.tableRowEven]} key={i}>
                  <Text style={{ width: 25 }}>
                    {pkg.isCharge && <Text style={[styles.badge, styles.badgeCharge]}>C</Text>}
                    {pkg.payment && <Text style={[styles.badge, styles.badgePayment]}>$</Text>}
                    {pkg.isHighValue && <Text style={[styles.badge, styles.badgeHighValue]}>H</Text>}
                    {i + 1}
                  </Text>
                  <Text style={{ width: 80 }}>{pkg.trackingNumber}</Text>
                  <Text style={{ width: 100 }}>{truncate(pkg.recipientName || "", 20)}</Text>
                  <Text style={{ width: 110 }}>{truncate(pkg.recipientAddress || "", 22)}</Text>
                  <Text style={{ width: 70 }}>{paymentText}</Text>
                  <Text style={{ width: 60 }}>{commitDate}</Text>
                  <Text style={{ width: 50 }}>{commitTime}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Estadísticas abajo */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statTitle}>TOTAL PAQUETES</Text>
            <Text style={styles.statValue}>{report.packages.length}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statTitle}>VÁLIDOS</Text>
            <Text style={styles.statValue}>{validPackages.length}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statTitle}>PAQUETES CARGA</Text>
            <Text style={styles.statValue}>{chargePackages.length}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statTitle}>ALTO VALOR</Text>
            <Text style={styles.statValue}>{highValuePackages.length}</Text>
          </View>
        </View>

        {/* Guías faltantes y sin escaneo */}
        {(report.missingTrackings.length > 0 || report.unScannedTrackings.length > 0) && (
          <View style={styles.trackingListsContainer}>
            {/* Guías faltantes */}
            {report.missingTrackings.length > 0 && (
              <View style={styles.trackingList}>
                <Text style={styles.sectionTitle}>GUIAS FALTANTES ({report.missingTrackings.length})</Text>
                <View style={styles.tableContainer}>
                  {report.missingTrackings.slice(0, 15).map((tracking, i) => (
                    <Text style={styles.trackingItem} key={`missing-${i}`}>
                      {tracking}
                    </Text>
                  ))}
                  {report.missingTrackings.length > 15 && (
                    <Text style={[styles.trackingItem, { fontStyle: 'italic' }]}>
                      ...y {report.missingTrackings.length - 15} más
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Guías sin escaneo */}
            {report.unScannedTrackings.length > 0 && (
              <View style={styles.trackingList}>
                <Text style={styles.sectionTitle}>GUIAS SIN ESCANEO ({report.unScannedTrackings.length})</Text>
                <View style={styles.tableContainer}>
                  {report.unScannedTrackings.slice(0, 15).map((tracking, i) => (
                    <Text style={styles.trackingItem} key={`unscanned-${i}`}>
                      {tracking}
                    </Text>
                  ))}
                  {report.unScannedTrackings.length > 15 && (
                    <Text style={[styles.trackingItem, { fontStyle: 'italic' }]}>
                      ...y {report.unScannedTrackings.length - 15} más
                    </Text>
                  )}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Firmas */}
        <View style={styles.signatureContainer}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureText}>RESPONSABLE DE INVENTARIO</Text>
            <Text style={styles.signatureSubtext}>Nombre y firma</Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureText}>SUPERVISOR</Text>
            <Text style={styles.signatureSubtext}>Nombre y firma</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Documento generado automáticamente por el Sistema de Gestión de Inventarios</Text>
          <Text>Impreso el {formattedDate} a las {formattedTime}</Text>
        </View>
      </Page>
    </Document>
  );
};