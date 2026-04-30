"use client"

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer"
import { SessionState, ScannedShipment } from "@/lib/types" 

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1e293b",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between", // <- CORREGIDO AQUÍ
    borderBottomWidth: 2,
    borderBottomColor: "#4d148c", 
    paddingBottom: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    textTransform: "uppercase",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 9,
    color: "#64748b",
    marginTop: 2,
  },
  metaSection: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 20,
  },
  metaBox: {
    flex: 1,
    padding: 10,
    backgroundColor: "#f8fafc",
    borderRadius: 4,
  },
  metaTitle: {
    fontSize: 8,
    color: "#64748b",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 11,
    fontWeight: "bold",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 25,
  },
  statCard: {
    flex: 1,
    padding: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    textAlign: "center",
  },
  statLabel: {
    fontSize: 7,
    color: "#64748b",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "bold",
  },
  table: {
    width: "100%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  tableCol: {
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
  },
  tableColHeader: {
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  signatureSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 50,
    paddingHorizontal: 20,
  },
  signatureBox: {
    width: 200,
    borderTopWidth: 1,
    borderTopColor: "#94a3b8",
    paddingTop: 10,
    textAlign: "center",
  },
  signatureName: {
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 5,
  },
  badge: {
    fontSize: 7,
    paddingVertical: 2, // <- CORREGIDO AQUÍ (React-pdf es muy estricto con esto)
    paddingHorizontal: 4, // <- CORREGIDO AQUÍ
    borderRadius: 2,
    marginRight: 4,
    color: "#ffffff",
  },
})

const sucursalMap: Record<string, string> = {
  alamos: "Álamos",
  navojoa: "Navojoa",
  huatabampo: "Huatabampo",
  "pueblo-yaqui": "Pueblo Yaqui",
  "villa-juarez": "Villa Juárez",
  vicam: "Vicam",
}

interface PDFProps {
  session: SessionState
  vehiculo?: any
}

export const PackageEntryPDF = ({ session, vehiculo }: PDFProps) => {
  const fedexCount = session.packages.filter(p => p.shipmentType === "FEDEX").length
  const dhlCount = session.packages.filter(p => p.shipmentType === "DHL").length
  const totalCharges = session.packages.reduce((acc, p) => acc + (p.chargeAmount || 0), 0)

  // Ordenar paquetes para el reporte (Mismo orden que en pantalla)
  const sortedPackages = [...session.packages].sort((a, b) => {
    const cmpSucursal = (sucursalMap[a.subsidiaryId] || a.subsidiaryId).localeCompare(sucursalMap[b.subsidiaryId] || b.subsidiaryId)
    if (cmpSucursal !== 0) return cmpSucursal
    const cmpCarrier = a.shipmentType.localeCompare(b.shipmentType)
    if (cmpCarrier !== 0) return cmpCarrier
    return a.recipientZip.localeCompare(b.recipientZip)
  })

  // Fecha segura para evitar errores de renderizado
  const safeDate = new Date().toLocaleDateString("es-MX")
  const safeStartTime = new Date(session.startTime).toLocaleTimeString("es-MX")
  const safeEndTime = session.endTime ? new Date(session.endTime).toLocaleTimeString("es-MX") : "En Proceso"

  return (
    <Document title={`Reporte de Recepción - ${session.id}`}>
      <Page size="A4" style={styles.page}>
        {/* Encabezado */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Bodega Obregón</Text>
            <Text style={styles.subtitle}>Reporte de Recepción de Envíos en Bodega</Text>
          </View>
          <View style={{ textAlign: "right" }}>
            <Text style={{ fontSize: 10, fontWeight: "bold" }}>FECHA: {safeDate}</Text>
            <Text style={styles.subtitle}>ID Sesión: {session.id.slice(0, 8)}</Text>
          </View>
        </View>

        {/* Info de Ruta */}
        <View style={styles.metaSection}>
          <View style={styles.metaBox}>
            <Text style={styles.metaTitle}>Información de Unidad</Text>
            <Text style={styles.metaValue}>
              Placa: {vehiculo?.placa || "N/A"} - {vehiculo?.marca || ""}
            </Text>
            <Text style={styles.subtitle}>Vehículo ID: {session.vehicleId}</Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaTitle}>Tiempo de Operación</Text>
            <Text style={styles.metaValue}>Inicio: {safeStartTime}</Text>
            <Text style={styles.subtitle}>Fin: {safeEndTime}</Text>
          </View>
        </View>

        {/* Resumen Estadístico */}
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

        {/* Tabla de Contenido */}
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
                {pkg.trackingNumber}
              </Text>
              <Text style={[styles.tableCol, { width: "15%" }]}>{pkg.shipmentType}</Text>
              <Text style={[styles.tableCol, { width: "20%" }]}>
                {sucursalMap[pkg.subsidiaryId] || pkg.subsidiaryId}
              </Text>
              <Text style={[styles.tableCol, { width: "10%" }]}>{pkg.recipientZip}</Text>
              <View style={[styles.tableCol, { width: "30%", borderRightWidth: 0, flexDirection: "row" }]}>
                {pkg.isHighValue && (
                  <Text style={[styles.badge, { backgroundColor: "#7e22ce" }]}>ALTO VALOR</Text>
                )}
                {pkg.hasCharge && (
                  <Text style={[styles.badge, { backgroundColor: "#d97706" }]}>
                    ${pkg.chargeAmount}
                  </Text>
                )}
                {pkg.isCargo && (
                  <Text style={[styles.badge, { backgroundColor: "#2563eb" }]}>CARGA</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Sección de Firmas */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={styles.metaTitle}>Entregado por (Operador)</Text>
            <Text style={styles.signatureName}>{session.enteredByName || "___________________"}</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.metaTitle}>Recibido por (Bodega)</Text>
            <Text style={styles.signatureName}>{session.receivedByName || "___________________"}</Text>
          </View>
        </View>

        {/* Footer */}
        <Text
          style={{
            position: "absolute",
            bottom: 30,
            left: 40,
            right: 40,
            textAlign: "center",
            fontSize: 8,
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