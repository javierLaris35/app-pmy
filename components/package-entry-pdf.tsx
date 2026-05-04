"use client"

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer"
import { SessionState } from "./warehouse/inbound-package/inbound-package"

const styles = StyleSheet.create({
  // Página con márgenes más eficientes y fuente base un poco más pequeña
  page: { padding: 30, fontSize: 9, fontFamily: "Helvetica", color: "#1e293b" },
  
  // Encabezado más compacto
  header: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#4d148c", paddingBottom: 8, marginBottom: 12 },
  title: { fontSize: 14, fontWeight: "bold", textTransform: "uppercase", color: "#0f172a" },
  subtitle: { fontSize: 8, color: "#64748b", marginTop: 2 },
  
  // Metadatos (Unidad y Tiempo)
  metaSection: { flexDirection: "row", marginBottom: 12, gap: 10 },
  metaBox: { flex: 1, padding: 6, backgroundColor: "#f8fafc", borderRadius: 4 },
  metaTitle: { fontSize: 7, color: "#64748b", textTransform: "uppercase", marginBottom: 2 },
  metaValue: { fontSize: 9, fontWeight: "bold" },
  
  // Tarjetas de Estadísticas (más compactas)
  statsGrid: { flexDirection: "row", gap: 8, marginBottom: 15 },
  statCard: { flex: 1, padding: 6, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 4, textAlign: "center" },
  statLabel: { fontSize: 6, color: "#64748b", textTransform: "uppercase", marginBottom: 2 },
  statValue: { fontSize: 11, fontWeight: "bold" },
  
  // TABLA - Aquí está la clave para ahorrar espacio
  table: { width: "100%", borderStyle: "solid", borderWidth: 1, borderColor: "#e2e8f0", marginBottom: 20 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f1f5f9", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  tableColHeader: { padding: 4, borderRightWidth: 1, borderRightColor: "#e2e8f0", fontSize: 7, fontWeight: "bold", textTransform: "uppercase" },
  tableCol: { padding: 4, borderRightWidth: 1, borderRightColor: "#e2e8f0", fontSize: 8 }, 
  
  // Firmas
  signatureSection: { flexDirection: "row", justifyContent: "space-between", marginTop: 30, paddingHorizontal: 20 },
  signatureBox: { width: 180, borderTopWidth: 1, borderTopColor: "#94a3b8", paddingTop: 8, textAlign: "center" },
  signatureName: { fontSize: 9, fontWeight: "bold", marginTop: 4 },
  
  // Etiquetas (Alto valor, Carga, etc)
  badge: { fontSize: 6, paddingVertical: 1, paddingHorizontal: 3, borderRadius: 2, marginRight: 2, color: "#ffffff" },
})

interface PDFProps {
  session: SessionState
  vehiculo?: any
}

export const PackageEntryPDF = ({ session, vehiculo }: PDFProps) => {
  // 1. BLINDAJE DE CONTADORES
  const fedexCount = session.packages.filter(p => String(p.shipmentType || "").toLowerCase() === "fedex").length
  const dhlCount = session.packages.filter(p => String(p.shipmentType || "").toLowerCase() === "dhl").length
  const totalCharges = session.packages.reduce((acc, p) => acc + (Number(p.paymentAmount) || 0), 0)

  // 2. EXTRACCIÓN SEGURA DE TEXTOS
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

  const unidadText = getUnidadText(vehiculo);

  // 3. NUEVO ORDENAMIENTO: Código Postal -> Sucursal -> Carrier
  const sortedPackages = [...session.packages].sort((a, b) => {
    // Nivel 1: Ordenar por Código Postal (de menor a mayor, usando numeric para que 85000 vaya antes que 85001)
    const zipA = String(a.recipientZip || "");
    const zipB = String(b.recipientZip || "");
    const cmpZip = zipA.localeCompare(zipB, undefined, { numeric: true });
    if (cmpZip !== 0) return cmpZip;

    // Nivel 2: Ordenar por Sucursal (A-Z)
    const sucursalA = getSubsidiaryName(a);
    const sucursalB = getSubsidiaryName(b);
    const cmpSucursal = sucursalA.localeCompare(sucursalB);
    if (cmpSucursal !== 0) return cmpSucursal;
    
    // Nivel 3: Ordenar por Carrier (A-Z)
    const carrierA = String(a.shipmentType || "").toUpperCase();
    const carrierB = String(b.shipmentType || "").toUpperCase();
    return carrierA.localeCompare(carrierB);
  })

  const safeDate = new Date().toLocaleDateString("es-MX")
  const safeStartTime = session.startTime ? new Date(session.startTime).toLocaleTimeString("es-MX") : ""
  const safeEndTime = session.endTime ? new Date(session.endTime).toLocaleTimeString("es-MX") : "En Proceso"

  return (
    <Document title={`Reporte de Recepción - ${session.id}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Bodega Obregón</Text>
            <Text style={styles.subtitle}>Reporte de Recepción de Envíos en Bodega</Text>
          </View>
          <View style={{ textAlign: "right" }}>
            <Text style={{ fontSize: 9, fontWeight: "bold" }}>FECHA: {safeDate}</Text>
            <Text style={styles.subtitle}>ID Sesión: {String(session.id || "").slice(0, 8)}</Text>
          </View>
        </View>

        <View style={styles.metaSection}>
          <View style={styles.metaBox}>
            <Text style={styles.metaTitle}>Información de Unidad</Text>
            <Text style={styles.metaValue}>Unidad: {unidadText}</Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaTitle}>Tiempo de Operación</Text>
            <Text style={styles.metaValue}>Inicio: {safeStartTime}</Text>
            <Text style={styles.subtitle}>Fin: {safeEndTime}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Envíos</Text>
            <Text style={styles.statValue}>{session.packages.length}</Text>
          </View>
          <View style={[styles.statCard, { borderLeftWidth: 3, borderLeftColor: "#4d148c" }]}>
            <Text style={styles.statLabel}>FedEx</Text>
            <Text style={styles.statValue}>{fedexCount}</Text>
          </View>
          <View style={[styles.statCard, { borderLeftWidth: 3, borderLeftColor: "#d40511" }]}>
            <Text style={styles.statLabel}>DHL</Text>
            <Text style={styles.statValue}>{dhlCount}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Alto Valor</Text>
            <Text style={styles.statValue}>
              {session.packages.filter(p => p.isHighValue).length}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Cobros</Text>
            <Text style={styles.statValue}>${totalCharges.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableColHeader, { width: "25%" }]}>Guía (Tracking)</Text>
            <Text style={[styles.tableColHeader, { width: "15%" }]}>Carrier</Text>
            <Text style={[styles.tableColHeader, { width: "20%" }]}>Sucursal</Text>
            <Text style={[styles.tableColHeader, { width: "10%" }]}>C.P.</Text>
            <Text style={[styles.tableColHeader, { width: "30%", borderRightWidth: 0 }]}>Alertas / Montos</Text>
          </View>

          {sortedPackages.map((pkg) => (
            <View key={pkg.id} style={styles.tableRow}>
              <Text style={[styles.tableCol, { width: "25%", fontWeight: "bold" }]}>
                {String(pkg.trackingNumber || "N/A")}
              </Text>
              <Text style={[styles.tableCol, { width: "15%" }]}>
                {String(pkg.shipmentType || "N/A")}
              </Text>
              <Text style={[styles.tableCol, { width: "20%" }]}>
                {getSubsidiaryName(pkg)}
              </Text>
              <Text style={[styles.tableCol, { width: "10%" }]}>
                {String(pkg.recipientZip || "N/A")}
              </Text>
              <View style={[styles.tableCol, { width: "30%", borderRightWidth: 0, flexDirection: "row" }]}>
                {pkg.isHighValue && (
                  <Text style={[styles.badge, { backgroundColor: "#7e22ce" }]}>ALTO VALOR</Text>
                )}
                {pkg.hasPayment && (
                  <Text style={[styles.badge, { backgroundColor: "#d97706" }]}>
                    ${Number(pkg.paymentAmount || 0)}
                  </Text>
                )}
                {pkg.isCharge && (
                  <Text style={[styles.badge, { backgroundColor: "#2563eb" }]}>CARGA</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={styles.metaTitle}>Entregado por (Operador)</Text>
            <Text style={styles.signatureName}>
              {String(session.enteredByName || "___________________")}
            </Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.metaTitle}>Recibido por (Bodega)</Text>
            <Text style={styles.signatureName}>
              {String(session.receivedByName || "___________________")}
            </Text>
          </View>
        </View>

        <Text
          style={{
            position: "absolute",
            bottom: 20,
            left: 30,
            right: 30,
            textAlign: "center",
            fontSize: 7,
            color: "#94a3b8",
          }}
        >
          Este documento es un comprobante oficial de recepción de mercancía en Bodega Obregón.
          Generado automáticamente por el sistema de control de inventario.
        </Text>
      </Page>
    </Document>
  )
}