"use client"

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import { SessionState } from "./warehouse/inbound-package/inbound-package"
import type { Vehicles } from "@/lib/types"

interface PDFProps {
  session: SessionState
  vehiculo?: Vehicles | { id: string } | null
}

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 8, fontFamily: "Helvetica", color: "#1e293b" },
  header: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 2, borderBottomColor: "#4d148c", paddingBottom: 10, marginBottom: 15 },
  title: { fontSize: 16, fontWeight: "bold", textTransform: "uppercase", color: "#0f172a" },
  subtitle: { fontSize: 9, color: "#64748b", marginTop: 2 },
  metaSection: { flexDirection: "row", marginBottom: 15, gap: 10 },
  metaBox: { flex: 1, padding: 8, backgroundColor: "#f8fafc", borderRadius: 4, borderLeftWidth: 3, borderLeftColor: "#4d148c" },
  metaTitle: { fontSize: 7, color: "#64748b", textTransform: "uppercase", marginBottom: 3 },
  metaValue: { fontSize: 10, fontWeight: "bold" },
  statsGrid: { flexDirection: "row", gap: 8, marginBottom: 20 },
  statCard: { flex: 1, padding: 8, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 4, textAlign: "center", backgroundColor: "#ffffff" },
  statLabel: { fontSize: 6, color: "#64748b", textTransform: "uppercase", marginBottom: 2 },
  statValue: { fontSize: 12, fontWeight: "bold" },
  table: { width: "100%", borderStyle: "solid", borderWidth: 1, borderColor: "#e2e8f0" },
  tableHeader: { flexDirection: "row", backgroundColor: "#f1f5f9", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  tableColHeader: { padding: 5, borderRightWidth: 1, borderRightColor: "#e2e8f0", fontSize: 7, fontWeight: "bold", textTransform: "uppercase" },
  tableRowGroup: { flexDirection: "column", borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  tableRowMain: { flexDirection: "row", backgroundColor: "#ffffff" },
  tableCol: { padding: 5, borderRightWidth: 1, borderRightColor: "#e2e8f0", fontSize: 7 }, // Tamaño reducido para el texto de guías
  subTableRow: { flexDirection: "row", backgroundColor: "#fcfcfc" },
  subTableCol: { padding: 5, borderRightWidth: 1, borderRightColor: "#e2e8f0", fontSize: 7, color: "#475569" },
  badge: { fontSize: 6, padding: 2, borderRadius: 2, marginRight: 3, color: "#ffffff", textAlign: 'center' },
  signatureSection: { flexDirection: "row", justifyContent: "space-between", marginTop: 40, paddingHorizontal: 20 },
  signatureBox: { width: 180, borderTopWidth: 1, borderTopColor: "#94a3b8", paddingTop: 8, textAlign: "center" },
  signatureName: { fontSize: 9, fontWeight: "bold", marginTop: 4 }
})

export const PackageEntryPDF = ({ session, vehiculo }: PDFProps) => {
  const safeDate = new Date().toLocaleDateString("es-MX");
  const totalCount = session.packages.reduce((acc, p) => acc + 1 + (p.pieces?.length || 0) + (p.existingPieces?.length || 0), 0)
  const fedexCount = session.packages.reduce((acc, p) => String(p.shipmentType || "").toLowerCase() === "fedex" ? acc + 1 + (p.pieces?.length || 0) + (p.existingPieces?.length || 0) : acc, 0)
  const dhlCount = session.packages.reduce((acc, p) => String(p.shipmentType || "").toLowerCase() === "dhl" ? acc + 1 + (p.pieces?.length || 0) + (p.existingPieces?.length || 0) : acc, 0)
  const totalCharges = session.packages.reduce((acc, p) => acc + (Number(p.paymentAmount) || 0), 0)

  const getUnidadText = (v: any) => {
    if (!v) return "N/A";
    const data = (typeof v.id === 'object' && v.id !== null) ? v.id : v;
    return String(data.plateNumber || data.placa || data.name || data.id || "N/A");
  };

  const getSubsidiaryName = (pkg: any) => {
    if (pkg?.subsidiary?.name) return String(pkg.subsidiary.name);
    if (typeof pkg?.subsidiaryId === 'string') return pkg.subsidiaryId;
    if (typeof pkg?.subsidiaryId === 'object' && pkg?.subsidiaryId !== null) return String(pkg.subsidiaryId.name || "S/N");
    return "S/N";
  };

  const sortedPackages = [...session.packages].sort((a, b) => {
    const zipA = String(a.recipientZip || "");
    const zipB = String(b.recipientZip || "");
    const cmpZip = zipA.localeCompare(zipB, undefined, { numeric: true });
    if (cmpZip !== 0) return cmpZip;
    const sucursalA = getSubsidiaryName(a);
    const sucursalB = getSubsidiaryName(b);
    const cmpSucursal = sucursalA.localeCompare(sucursalB);
    if (cmpSucursal !== 0) return cmpSucursal;
    const carrierA = String(a.shipmentType || "").toUpperCase();
    const carrierB = String(b.shipmentType || "").toUpperCase();
    return carrierA.localeCompare(carrierB);
  })

  return (
    <Document title={`Reporte de Recepción - ${session.id}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Bodega Obregón</Text>
            <Text style={styles.subtitle}>Reporte de Recepción de Envíos</Text>
          </View>
          <View style={{ textAlign: "right" }}>
            <Text style={{ fontSize: 9, fontWeight: "bold" }}>FECHA: {safeDate}</Text>
            <Text style={styles.subtitle}>ID Sesión: {String(session.id || "").slice(0, 8)}</Text>
          </View>
        </View>

        <View style={styles.metaSection}>
          <View style={styles.metaBox}>
            <Text style={styles.metaTitle}>Información de Unidad</Text>
            <Text style={styles.metaValue}>Unidad: {getUnidadText(vehiculo)}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}><Text style={styles.statLabel}>Total</Text><Text style={styles.statValue}>{totalCount}</Text></View>
          <View style={styles.statCard}><Text style={styles.statLabel}>FedEx</Text><Text style={styles.statValue}>{fedexCount}</Text></View>
          <View style={styles.statCard}><Text style={styles.statLabel}>DHL</Text><Text style={styles.statValue}>{dhlCount}</Text></View>
          <View style={styles.statCard}><Text style={styles.statLabel}>Cobros</Text><Text style={styles.statValue}>${totalCharges.toLocaleString()}</Text></View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            {/* Anchos optimizados: Tracking 25%, DHL ID 20%, el resto distribuido */}
            <Text style={[styles.tableColHeader, { width: "25%" }]}>Guía</Text>
            <Text style={[styles.tableColHeader, { width: "20%" }]}>DHL ID</Text>
            <Text style={[styles.tableColHeader, { width: "10%" }]}>Carrier</Text>
            <Text style={[styles.tableColHeader, { width: "20%" }]}>Sucursal</Text>
            <Text style={[styles.tableColHeader, { width: "25%", borderRightWidth: 0 }]}>Alertas</Text>
          </View>

          {sortedPackages.map((pkg) => (
            <View key={pkg.id} style={styles.tableRowGroup}>
              <View style={styles.tableRowMain}>
                <Text style={[styles.tableCol, { width: "25%", fontWeight: "bold" }]}>{pkg.trackingNumber}</Text>
                <Text style={[styles.tableCol, { width: "20%", fontFamily: "Courier" }]}>{pkg.dhlUniqueId || "-"}</Text>
                <Text style={[styles.tableCol, { width: "10%" }]}>{pkg.shipmentType}</Text>
                <Text style={[styles.tableCol, { width: "20%" }]}>{getSubsidiaryName(pkg)}</Text>
                <View style={[styles.tableCol, { width: "25%", borderRightWidth: 0, flexDirection: "row" }]}>
                  {pkg.isHighValue && <Text style={[styles.badge, { backgroundColor: "#7e22ce" }]}>VALOR</Text>}
                  {pkg.isCharge && <Text style={[styles.badge, { backgroundColor: "#2563eb" }]}>CARGA</Text>}
                </View>
              </View>

              {[...(pkg.existingPieces || []), ...(pkg.pieces || [])].map((piece, idx) => (
                <View key={idx} style={styles.subTableRow}>
                  <Text style={[styles.subTableCol, { width: "25%", paddingLeft: 15 }]}>- {piece}</Text>
                  <Text style={[styles.subTableCol, { width: "20%" }]}>-</Text>
                  <Text style={[styles.subTableCol, { width: "10%" }]}>PIEZA</Text>
                  <Text style={[styles.subTableCol, { width: "20%" }]}>-</Text>
                  <Text style={[styles.subTableCol, { width: "25%", borderRightWidth: 0 }]}>-</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}><Text style={styles.metaTitle}>Entregado por</Text><Text style={styles.signatureName}>{session.enteredByName || "___________"}</Text></View>
          <View style={styles.signatureBox}><Text style={styles.metaTitle}>Recibido por</Text><Text style={styles.signatureName}>{session.receivedByName || "___________"}</Text></View>
        </View>
      </Page>
    </Document>
  )
}