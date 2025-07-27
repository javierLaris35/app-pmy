"use client"

import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from "@react-pdf/renderer"
import { Download } from "lucide-react"

interface EnhancedPDFData {
  localidad: string
  fecha: string
  paquetesNormales: string
  paquetesConCobro: string
  totalPaquetes: string
  devoluciones: Array<{
    id: string
    guia: string
    motivo: string
    isValid: boolean
  }>
  recolecciones: Array<{
    id: string
    guia: string
    sucursal: string
    isValid: boolean
  }>
}

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 20,
    fontSize: 9,
    fontFamily: "Helvetica",
  },
  header: {
    border: "2px solid black",
    padding: 15,
    marginBottom: 15,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 15,
  },
  fedexLogo: {
    flexDirection: "row",
  },
  fedexPurple: {
    backgroundColor: "#663399",
    color: "white",
    padding: "8 12",
    fontSize: 16,
    fontWeight: "bold",
  },
  fedexOrange: {
    backgroundColor: "#FF6600",
    color: "white",
    padding: "8 12",
    fontSize: 16,
    fontWeight: "bold",
  },
  dateSection: {
    alignItems: "flex-end",
  },
  dateLabel: {
    fontSize: 8,
    fontWeight: "bold",
    marginBottom: 5,
  },
  dateValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  locationSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  locationLabel: {
    fontSize: 8,
    fontWeight: "bold",
    marginBottom: 3,
  },
  locationValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  packageTotals: {
    flexDirection: "row",
    border: "1px solid black",
    padding: 10,
  },
  packageColumn: {
    flex: 1,
    alignItems: "center",
    borderRight: "1px solid black",
    paddingHorizontal: 5,
  },
  packageColumnLast: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 5,
  },
  packageLabel: {
    fontSize: 7,
    fontWeight: "bold",
    marginBottom: 5,
    textAlign: "center",
  },
  packageValue: {
    border: "1px solid black",
    padding: 5,
    minHeight: 20,
    minWidth: 60,
    textAlign: "center",
    fontWeight: "bold",
  },
  statusCodes: {
    backgroundColor: "#F5F5F5",
    border: "1px solid #CCCCCC",
    padding: 10,
    marginBottom: 15,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
  },
  mainContent: {
    flexDirection: "row",
    gap: 15,
  },
  column: {
    flex: 1,
    border: "2px solid black",
  },
  columnHeader: {
    backgroundColor: "#666666",
    color: "white",
    padding: 8,
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 10,
  },
  table: {
    width: "100%",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottom: "2px solid black",
    backgroundColor: "#F0F0F0",
  },
  tableHeaderCell: {
    padding: 5,
    borderRight: "1px solid black",
    fontWeight: "bold",
    fontSize: 8,
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1px solid #CCCCCC",
    minHeight: 20,
  },
  tableCell: {
    padding: 3,
    borderRight: "1px solid black",
    fontSize: 7,
    textAlign: "center",
  },
  tableCellLeft: {
    padding: 3,
    borderRight: "1px solid black",
    fontSize: 7,
    textAlign: "left",
  },
  noColumn: {
    width: 25,
  },
  guiaColumn: {
    flex: 2,
  },
  motivoColumn: {
    flex: 2,
  },
  sucursalColumn: {
    flex: 1,
  },
  signatureSection: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  signatureBox: {
    width: 180,
    height: 50,
    border: "1px solid black",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: 5,
  },
  signatureLabel: {
    fontSize: 8,
    fontWeight: "bold",
  },
  pageInfo: {
    position: "absolute",
    bottom: 10,
    right: 20,
    fontSize: 8,
    color: "#666666",
  },
})

const EnhancedFedExPDFDocument = ({ data }: { data: EnhancedPDFData }) => {
  const validDevoluciones = data.devoluciones.filter((d) => d.guia && d.isValid)
  const validRecolecciones = data.recolecciones.filter((r) => r.guia && r.isValid)

  // Calculate how many pages we need (max 30 items per column per page)
  const maxItemsPerColumn = 30
  const maxItemsPerPage = maxItemsPerColumn * 2
  const totalItems = validDevoluciones.length + validRecolecciones.length
  const totalPages = Math.max(1, Math.ceil(totalItems / maxItemsPerPage))

  const renderPage = (pageNumber: number) => {
    const startIndex = (pageNumber - 1) * maxItemsPerPage
    const devolucionesForPage = validDevoluciones.slice(
      Math.max(0, startIndex - validRecolecciones.length),
      Math.max(0, startIndex - validRecolecciones.length + maxItemsPerColumn),
    )
    const recoleccionesForPage = validRecolecciones.slice(
      Math.max(0, startIndex),
      Math.max(0, startIndex + maxItemsPerColumn),
    )

    // Fill empty rows to maintain consistent layout
    const emptyDevRows = Array.from(
      { length: Math.max(0, maxItemsPerColumn - devolucionesForPage.length) },
      (_, i) => ({
        no: devolucionesForPage.length + i + 1,
        guia: "",
        motivo: "",
      }),
    )

    const emptyRecRows = Array.from(
      { length: Math.max(0, maxItemsPerColumn - recoleccionesForPage.length) },
      (_, i) => ({
        no: recoleccionesForPage.length + i + 1,
        guia: "",
        sucursal: "",
      }),
    )

    return (
      <Page key={pageNumber} size="LETTER" style={styles.page}>
        {/* Header - only on first page */}
        {pageNumber === 1 && (
          <>
            <View style={styles.header}>
              <View style={styles.headerTop}>
                <View style={styles.fedexLogo}>
                  <Text style={styles.fedexPurple}>Fed</Text>
                  <Text style={styles.fedexOrange}>Ex</Text>
                </View>
                <View style={styles.dateSection}>
                  <Text style={styles.dateLabel}>FECHA</Text>
                  <Text style={styles.dateValue}>{new Date(data.fecha).toLocaleDateString("es-MX")}</Text>
                </View>
              </View>

              <View style={styles.locationSection}>
                <View>
                  <Text style={styles.locationLabel}>LOCALIDAD:</Text>
                  <Text style={styles.locationValue}>{data.localidad}</Text>
                </View>
                <View>
                  <Text style={styles.locationLabel}>PAQUETES RECIBOS DE FedEx</Text>
                </View>
              </View>

              <View style={styles.packageTotals}>
                <View style={styles.packageColumn}>
                  <Text style={styles.packageLabel}>PAQUETES NORMALES:</Text>
                  <View style={styles.packageValue}>
                    <Text>{data.paquetesNormales}</Text>
                  </View>
                </View>
                <View style={styles.packageColumn}>
                  <Text style={styles.packageLabel}>PAQUETES CON COBRO:</Text>
                  <View style={styles.packageValue}>
                    <Text>{data.paquetesConCobro}</Text>
                  </View>
                </View>
                <View style={styles.packageColumnLast}>
                  <Text style={styles.packageLabel}>TOTAL DE PAQUETES:</Text>
                  <View style={styles.packageValue}>
                    <Text>{data.totalPaquetes}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.statusCodes}>
              <View style={styles.statusRow}>
                <Text>DEX 03: DATOS INCORRECTOS / DOM NO EXISTE</Text>
                <Text>DEX 07: RECHAZO DE PAQUETES POR EL CLIENTE</Text>
                <Text>DEX 08: VISITA / DOMICILIO CERRADO</Text>
              </View>
            </View>
          </>
        )}

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Devoluciones Column */}
          <View style={styles.column}>
            <Text style={styles.columnHeader}>DEVOLUCIÓN (Envío no entregado)</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.noColumn]}>No</Text>
                <Text style={[styles.tableHeaderCell, styles.guiaColumn]}>GUÍA</Text>
                <Text style={[styles.tableHeaderCell, styles.motivoColumn]}>MOTIVO</Text>
              </View>
              {[...devolucionesForPage, ...emptyDevRows].map((item, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.noColumn]}>{item.no || ""}</Text>
                  <Text style={[styles.tableCellLeft, styles.guiaColumn]}>{item.guia || ""}</Text>
                  <Text style={[styles.tableCellLeft, styles.motivoColumn]}>{item.motivo || ""}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Recolecciones Column */}
          <View style={styles.column}>
            <Text style={styles.columnHeader}>RECOLECCIONES</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.noColumn]}>No</Text>
                <Text style={[styles.tableHeaderCell, styles.guiaColumn]}>NO. GUÍA</Text>
                <Text style={[styles.tableHeaderCell, styles.sucursalColumn]}>SUCURSAL</Text>
              </View>
              {[...recoleccionesForPage, ...emptyRecRows].map((item, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.noColumn]}>{item.no || ""}</Text>
                  <Text style={[styles.tableCellLeft, styles.guiaColumn]}>{item.guia || ""}</Text>
                  <Text style={[styles.tableCell, styles.sucursalColumn]}>{item.sucursal || ""}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Signature Section - only on last page */}
        {pageNumber === totalPages && (
          <View style={styles.signatureSection}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>FIRMA RESPONSABLE</Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>FIRMA SUPERVISOR</Text>
            </View>
          </View>
        )}

        {/* Page Info */}
        <Text style={styles.pageInfo}>
          Página {pageNumber} de {totalPages} - Generado el {new Date().toLocaleDateString("es-MX")}
        </Text>
      </Page>
    )
  }

  return <Document>{Array.from({ length: totalPages }, (_, i) => renderPage(i + 1))}</Document>
}

interface EnhancedPDFGeneratorProps {
  data: EnhancedPDFData
  fileName?: string
}

export function EnhancedPDFGenerator({ data, fileName = "control-paquetes-fedex.pdf" }: EnhancedPDFGeneratorProps) {
  return (
    <PDFDownloadLink
      document={<EnhancedFedExPDFDocument data={data} />}
      fileName={fileName}
      className="inline-flex items-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors shadow-lg"
    >
      {({ blob, url, loading, error }) =>
        loading ? (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Generando PDF...
          </div>
        ) : (
          <div className="flex items-center">
            <Download className="w-4 h-4 mr-2" />
            Descargar PDF
          </div>
        )
      }
    </PDFDownloadLink>
  )
}
