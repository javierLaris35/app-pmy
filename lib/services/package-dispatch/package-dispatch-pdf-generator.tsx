// components/pdf/FedExPackageDispatchPDF.tsx
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
import { Driver, PackageInfo, Route, Vehicles, PackageDispatch } from "@/lib/types";
import { formatMexicanPhoneNumberWithOutMexicanLada } from "@/lib/utils";

Font.register({ family: "Helvetica", src: undefined });

const colors = {
  primary: "#8c5e4e",
  secondary: "#4cc9f0",
  accent: "#ff6b6b",
  light: "#f8f9fa",
  dark: "#212529",
  border: "#dee2e6",
  success: "#40c057",
  warning: "#fd7e14",
  info: "#17a2b8",
};

// Estilos con fuentes grandes y ESPACIADO MÍNIMO
const styles = StyleSheet.create({
  page: {
    padding: 5,
    fontSize: 9,
    fontFamily: "Helvetica",
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    borderBottomStyle: "solid",
    height: 35, // ALTURA FIJA
  },
  logo: { width: 30, height: 30 },
  headerText: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.primary,
    textAlign: "center",
  },
  dateText: { 
    fontSize: 8,
    color: colors.dark, 
    textAlign: "right",
    lineHeight: 1.1,
  },
  compactGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 2,
    padding: 2,
    backgroundColor: colors.light,
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderStyle: "solid",
    height: 25, // ALTURA FIJA
  },
  compactItem: { 
    width: "32%", 
    marginBottom: 0,
    padding: 0.5,
  },
  compactLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 0.2,
  },
  compactValue: { 
    fontSize: 7,
    color: colors.dark,
    lineHeight: 1,
  },
  // INFORMACIÓN EN UNA SOLA FILA COMPACTA
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
    padding: 2,
    backgroundColor: colors.light,
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderStyle: "solid",
    height: 25, // ALTURA FIJA
  },
  infoItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 0.5,
  },
  infoText: {
    fontSize: 7,
    fontWeight: "bold",
    textAlign: "center",
    lineHeight: 1,
  },
  infoLabel: {
    color: colors.primary,
    marginBottom: 0.2,
  },
  infoValue: {
    color: colors.dark,
  },
  infoHighlight: {
    color: colors.warning,
  },
  infoUrgent: {
    color: colors.accent,
  },
  tableContainer: {
    borderWidth: 0.5,
    borderColor: colors.border,
    borderStyle: "solid",
    borderRadius: 3,
    marginBottom: 2,
    flex: 1, // OCUPA TODO EL ESPACIO RESTANTE
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    color: "white",
    padding: 1,
    fontSize: 8,
    fontWeight: "bold",
    minHeight: 10,
    alignItems: 'center',
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    borderBottomStyle: "solid",
    fontSize: 10,
    padding: 0.5,
    minHeight: 15, // ALTURA MÍNIMA PARA MÁXIMAS FILAS
    alignItems: 'center',
  },
  tableRowEven: { backgroundColor: colors.light },
  paymentRow: {
    backgroundColor: "#fff2cc",
    fontWeight: "bold",
  },
  expiringTodayRow: {
    backgroundColor: '#ffe6e6',
    /*borderLeftWidth: 2,*/
    borderLeftColor: colors.accent,
  },
  footer: {
    marginTop: 2,
    fontSize: 6,
    color: colors.dark,
    textAlign: "right",
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    borderTopStyle: "solid",
    paddingTop: 1,
    opacity: 0.7,
    height: 15, // ALTURA FIJA
  },
  symbologyContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 2,
    padding: 1,
    backgroundColor: "#f8f9fa",
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderStyle: "solid",
    height: 10, // ALTURA FIJA
  },
  symbologyText: {
    fontSize: 6,
    fontWeight: "bold",
    color: colors.primary,
    textAlign: "center",
  },
  pageNumber: {
    position: 'absolute',
    fontSize: 7,
    bottom: 8,
    left: 10,
    textAlign: 'left',
    color: colors.dark,
  },
  tableCell: {
    paddingHorizontal: 0.5,
    paddingVertical: 0.2, // MÍNIMO PADDING VERTICAL
    justifyContent: 'center',
    alignItems: 'flex-start',
    height: '100%',
  },
  // ESTILO ESPECIAL PARA EVITAR SALTO DE LÍNEA
  tableCellText: {
    fontSize: 7.5,
    lineHeight: 0.9, // LINE HEIGHT MÍNIMO
    flexWrap: 'nowrap', // EVITA SALTO DE LÍNEA
    overflow: 'hidden',
  },
});

interface FedExPackageDispatchPDFProps {
  drivers: Driver[];
  routes: Route[];
  vehicle: Vehicles;
  packages: PackageInfo[];
  invalidTrackings?: string[];
  subsidiaryName: string;
  trackingNumber: string;
  packageDispatch?: PackageDispatch;
}

// CÁLCULO SIMPLIFICADO Y FUNCIONAL
const calculateRowsPerPage = (hasHeader: boolean): number => {
  if (hasHeader) {
    // Página 1 con header - espacio limitado
    return 31; // Aproximadamente 48 paquetes en primera página
  } else {
    // Páginas sin header - mucho más espacio
    return 38; // Aproximadamente 65 paquetes en páginas siguientes
  }
};

const splitPackagesIntoPages = (packages: PackageInfo[]) => {
  const pages = [];
  
  console.log(`📦 Total paquetes a dividir: ${packages.length}`);
  
  if (packages.length === 0) return pages;
  
  // Página 1 con header
  const firstPageRows = calculateRowsPerPage(true);
  const firstPage = packages.slice(0, firstPageRows);
  if (firstPage.length > 0) {
    pages.push(firstPage);
    console.log(`📄 Página 1: ${firstPage.length} paquetes`);
  }
  
  // Páginas siguientes
  let currentIndex = firstPageRows;
  
  while (currentIndex < packages.length) {
    const otherPageRows = calculateRowsPerPage(false);
    const page = packages.slice(currentIndex, currentIndex + otherPageRows);
    if (page.length > 0) {
      pages.push(page);
      console.log(`📄 Página ${pages.length}: ${page.length} paquetes`);
    }
    currentIndex += otherPageRows;
  }
  
  console.log(`✅ Total páginas generadas: ${pages.length}`);
  return pages;
};

const splitInvalidTrackingsIntoPages = (invalidTrackings: string[]) => {
  const pages = [];
  const rowsPerPage = calculateRowsPerPage(false);
  for (let i = 0; i < invalidTrackings.length; i += rowsPerPage) {
    pages.push(invalidTrackings.slice(i, i + rowsPerPage));
  }
  return pages;
};

const getColumnWidths = (isHermosillo: boolean) => {
  const totalWidth = 612 - 10; // 612 - padding (5*2)
  
  const baseConfig = {
    number: 26,
    tracking: 55,
    name: 125,
    address: 145,
    zipCode: 22,
    payment: 55,
    date: 42,
    time: 38,
    phone: 45,
    signature: 40
  };

  if (isHermosillo) {
    return {
      number: 26,
      tracking: 55,
      name: 135,
      address: 155,
      zipCode: 22,
      payment: 55,
      date: 42,
      time: 0,
      phone: 55,
      signature: 42
    };
  }

  return baseConfig;
};

// TRUNCADO FORZADO - SIN SALTO DE LÍNEA
const truncateText = (text: string, maxChars: number): string => {
  if (!text) return '';
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars - 2) + '..';
};

export const FedExPackageDispatchPDF = ({
  drivers = [],
  routes = [],
  vehicle = {} as Vehicles,
  packages = [],
  invalidTrackings = [],
  subsidiaryName = "",
  trackingNumber = "",
  packageDispatch,
}: FedExPackageDispatchPDFProps) => {
  const timeZone = "America/Hermosillo";
  const currentDate = new Date();
  const formattedDate = format(currentDate, "yyyy-MM-dd", { timeZone });
  const formattedTime = format(currentDate, "HH:mm:ss", { timeZone });

  const isHermosillo = subsidiaryName?.toLowerCase().includes('hermosillo');
  const columnWidths = getColumnWidths(isHermosillo);

  // Calcular caracteres máximos
  const maxNameChars = Math.floor(columnWidths.name * 0.9);
  const maxAddressChars = Math.floor(columnWidths.address * 0.9);

  const calculatePackageStats = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let f2Count = 0;
    let cargaCount = 0;
    let expiringTodayCount = 0;
    let withPaymentCount = 0;
    let totalPaymentAmount = 0;
    let highValueCount = 0;

    packages.forEach((pkg) => {
      if (pkg?.isCharge) f2Count++;
      if (pkg?.isHighValue) {
        cargaCount++;
        highValueCount++;
      }
      
      if (pkg?.payment?.amount) {
        withPaymentCount++;
        totalPaymentAmount += pkg.payment.amount;
      }

      try {
        if (pkg?.commitDateTime) {
          const commitDate = new Date(pkg.commitDateTime);
          commitDate.setHours(0, 0, 0, 0);
          if (commitDate.getTime() === today.getTime()) {
            expiringTodayCount++;
          }
        }
      } catch (error) {
        console.error('Error procesando fecha del paquete:', error);
      }
    });

    return {
      total: packages.length,
      f2Count,
      cargaCount,
      highValueCount,
      expiringTodayCount,
      withPaymentCount,
      totalPaymentAmount,
      regularCount: packages.length - f2Count - highValueCount
    };
  };

  const truncate = (text: string, maxLength: number): string => {
    if (!text) return '';
    return text.length > maxLength ? text.slice(0, maxLength - 3) + '...' : text;
  };

  const packageStats = calculatePackageStats();
  const mainDriver = drivers && drivers.length > 0 ? drivers[0].name : "No asignado";
  const routeNames = routes?.map((r) => r.name).join(" → ") || "No asignado";

  const packagePages = splitPackagesIntoPages(packages);
  const invalidPages = splitInvalidTrackingsIntoPages(invalidTrackings);
  const totalPages = Math.max(packagePages.length, invalidPages.length);

  // Componente de celda optimizado
  const TableCell = ({ children, width, style = {}, truncate = false, maxChars, ...props }: any) => (
    <View style={[styles.tableCell, { width }, style]} {...props}>
      <Text style={styles.tableCellText}>
        {truncate ? truncateText(children, maxChars) : children}
      </Text>
    </View>
  );

  return (
    <Document>
      {Array.from({ length: totalPages }, (_, pageIndex) => {
        const hasHeader = pageIndex === 0;
        const currentPackagePage = packagePages[pageIndex] || [];
        const currentInvalidPage = invalidPages[pageIndex] || [];
        
        return (
          <Page key={pageIndex} size="LETTER" style={styles.page} orientation="landscape">
            {hasHeader && (
              <>
                <View style={styles.header}>
                  <Image src="/logo-no-fondo.png" style={styles.logo} />
                  <Text style={styles.headerText}>SALIDA A RUTA</Text>
                  <View>
                    <Text style={styles.dateText}>{formattedDate}</Text>
                    <Text style={styles.dateText}>{formattedTime}</Text>
                  </View>
                </View>

                <View style={styles.compactGrid}>
                  <View style={styles.compactItem}>
                    <Text style={styles.compactLabel}>Sucursal</Text>
                    <Text style={styles.compactValue}>{subsidiaryName || "N/A"}</Text>
                  </View>
                  <View style={styles.compactItem}>
                    <Text style={styles.compactLabel}>Vehículo</Text>
                    <Text style={styles.compactValue}>{vehicle?.name || "N/A"}</Text>
                  </View>
                  <View style={styles.compactItem}>
                    <Text style={styles.compactLabel}>Chofer Principal</Text>
                    <Text style={styles.compactValue}>{mainDriver}</Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoText, styles.infoLabel]}>RUTA</Text>
                    <Text style={[styles.infoText, styles.infoValue]}>{routeNames}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoText, styles.infoLabel]}>SEGUIMIENTO</Text>
                    <Text style={[styles.infoText, styles.infoValue]}>{trackingNumber}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoText, styles.infoLabel]}>TOTAL</Text>
                    <Text style={[styles.infoText, styles.infoValue]}>{packageStats.total}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoText, styles.infoLabel]}>REGULARES</Text>
                    <Text style={[styles.infoText, styles.infoValue]}>{packageStats.regularCount}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoText, styles.infoLabel]}>F2 / 31.5</Text>
                    <Text style={[styles.infoText, styles.infoHighlight]}>{packageStats.f2Count}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoText, styles.infoLabel]}>ALTO VALOR</Text>
                    <Text style={[styles.infoText, styles.infoHighlight]}>{packageStats.cargaCount}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoText, styles.infoLabel]}>CON COBRO</Text>
                    <Text style={[styles.infoText, styles.infoValue]}>{packageStats.withPaymentCount}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoText, styles.infoLabel]}>VENCEN HOY</Text>
                    <Text style={[styles.infoText, styles.infoUrgent]}>{packageStats.expiringTodayCount}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoText, styles.infoLabel]}>MONTO</Text>
                    <Text style={[styles.infoText, styles.infoValue]}>${(isNaN(Number(packageStats.totalPaymentAmount)) ? 0 : Number(packageStats.totalPaymentAmount)).toFixed(2)}</Text>
                  </View>
                </View>

                <View style={styles.symbologyContainer}>
                  <Text style={styles.symbologyText}>
                    SIMBOLOGÍA: [C] CARGA/F2/31.5 • [$] PAGO • [H] VALOR ALTO
                  </Text>
                </View>
              </>
            )}

            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <TableCell width={columnWidths.number}>[#]</TableCell>
                <TableCell width={columnWidths.tracking}>NO. GUIA</TableCell>
                <TableCell width={columnWidths.name}>NOMBRE</TableCell>
                <TableCell width={columnWidths.address}>DIRECCIÓN</TableCell>
                <TableCell width={columnWidths.zipCode}>CP</TableCell>
                <TableCell width={columnWidths.payment}>COBRO</TableCell>
                <TableCell width={columnWidths.date}>FECHA</TableCell>
                {!isHermosillo && <TableCell width={columnWidths.time}>HORA</TableCell>}
                <TableCell width={columnWidths.phone}>CELULAR</TableCell>
                <TableCell width={80}>NOMBRE Y FIRMA</TableCell>
              </View>

              {currentPackagePage.map((pkg, i) => {
                // CALCULAR CORRECTAMENTE el índice global
                let globalIndex = i;
                for (let prevPage = 0; prevPage < pageIndex; prevPage++) {
                  globalIndex += packagePages[prevPage].length;
                }
                
                const icons = `${pkg.isCharge ? '[C]' : ''}${pkg.payment ? '[$]' : ''}${pkg.isHighValue ? '[H]' : ''}`;
                
                const zoned = toZonedTime(new Date(pkg.commitDateTime), timeZone);
                const commitDate = format(zoned, 'yyyy-MM-dd', { timeZone });
                const commitTime = format(zoned, 'HH:mm:ss', { timeZone });
                const hasPayment = pkg.payment?.amount != null;
                
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const commitDateObj = new Date(pkg.commitDateTime);
                commitDateObj.setHours(0, 0, 0, 0);
                const isExpiringToday = commitDateObj.getTime() === today.getTime();

                return (
                  <View 
                    style={[
                      styles.tableRow,
                      i % 2 === 0 && styles.tableRowEven,
                      hasPayment && styles.paymentRow,
                      isExpiringToday && styles.expiringTodayRow
                    ]} 
                    key={globalIndex}
                  >
                    <TableCell width={columnWidths.number} style={{ fontWeight: hasPayment ? 'bold' : 'normal' }}>
                      {icons} {globalIndex + 1}
                    </TableCell>
                    <TableCell width={columnWidths.tracking} style={{ fontWeight: hasPayment ? 'bold' : 'normal' }}>
                      {pkg.trackingNumber}
                    </TableCell>
                    {/* NOMBRE y DIRECCIÓN con truncado forzado y SIN salto de línea */}
                    <TableCell 
                      width={columnWidths.name} 
                      style={{ fontWeight: hasPayment ? 'bold' : 'normal' }}
                      truncate={true}
                      maxChars={maxNameChars}
                    >
                      {truncate(pkg.recipientName || '', 25)}
                    </TableCell>
                    <TableCell 
                      width={columnWidths.address} 
                      style={{ fontWeight: hasPayment ? 'bold' : 'normal' }}
                      truncate={true}
                      maxChars={maxAddressChars}
                    >
                      {truncate(pkg.recipientAddress || '', 30)}
                    </TableCell>
                    <TableCell width={columnWidths.zipCode} style={{ fontWeight: hasPayment ? 'bold' : 'normal' }}>
                      {pkg.recipientZip || ''}
                    </TableCell>
                    <TableCell width={columnWidths.payment} style={{ fontWeight: hasPayment ? 'bold' : 'normal' }}>
                      {hasPayment ? `${pkg.payment?.type} $${pkg.payment?.amount}` : ''}
                    </TableCell>
                    <TableCell width={columnWidths.date} style={{ fontWeight: hasPayment ? 'bold' : 'normal' }}>
                      {commitDate}
                    </TableCell>
                    {!isHermosillo && (
                      <TableCell width={columnWidths.time} style={{ fontWeight: hasPayment ? 'bold' : 'normal' }}>
                        {commitTime}
                      </TableCell>
                    )}
                    <TableCell width={columnWidths.phone} style={{ fontWeight: hasPayment ? 'bold' : 'normal' }}>
                      {formatMexicanPhoneNumberWithOutMexicanLada(pkg.recipientPhone)}
                    </TableCell>
                    <TableCell width={columnWidths.signature} style={{ fontWeight: hasPayment ? 'bold' : 'normal' }}>
                      {}
                    </TableCell>
                  </View>
                );
              })}
            </View>

            {currentInvalidPage.length > 0 && (
              <View style={[styles.tableContainer, { borderColor: '#ff9999', marginTop: 2 }]}>
                <View style={[styles.tableHeader, { backgroundColor: '#ff9999' }]}>
                  <TableCell width={columnWidths.number}>[#]</TableCell>
                  <TableCell width={columnWidths.tracking}>NO. GUIA</TableCell>
                  <TableCell width={columnWidths.name}>NOMBRE</TableCell>
                  <TableCell width={columnWidths.address}>DIRECCIÓN</TableCell>
                  <TableCell width={columnWidths.zipCode}>CP</TableCell>
                  <TableCell width={columnWidths.payment}>COBRO</TableCell>
                  <TableCell width={columnWidths.date}>FECHA</TableCell>
                  {!isHermosillo && <TableCell width={columnWidths.time}>HORA</TableCell>}
                  <TableCell width={columnWidths.phone}>CELULAR</TableCell>
                  <TableCell width={60}>NOMBRE Y FIRMA</TableCell>
                </View>

                {currentInvalidPage.map((tracking, index) => {
                  const globalIndex = packages.length + index + (pageIndex * calculateRowsPerPage(false));
                  return (
                    <View 
                      style={[
                        styles.tableRow,
                        index % 2 === 0 && { backgroundColor: '#fff0f0' }
                      ]} 
                      key={globalIndex}
                    >
                      <TableCell width={columnWidths.number} style={{ fontWeight: 'bold', color: '#cc0000' }}>
                        {globalIndex + 1}
                      </TableCell>
                      <TableCell width={columnWidths.tracking} style={{ fontWeight: 'bold', color: '#cc0000' }}>
                        {tracking}
                      </TableCell>
                      <TableCell width={columnWidths.name}></TableCell>
                      <TableCell width={columnWidths.address}></TableCell>
                      <TableCell width={columnWidths.zipCode}></TableCell>
                      <TableCell width={columnWidths.payment}></TableCell>
                      <TableCell width={columnWidths.date}></TableCell>
                      {!isHermosillo && <TableCell width={columnWidths.time}></TableCell>}
                      <TableCell width={columnWidths.phone}></TableCell>
                      <TableCell width={columnWidths.signature}></TableCell>
                    </View>
                  );
                })}
              </View>
            )}

            <Text style={styles.pageNumber}>
              Página {pageIndex + 1} de {totalPages}
            </Text>

            <Text style={styles.footer}>
              Documento generado automáticamente - PMY App v.1.0 - {formattedDate} {formattedTime}
            </Text>
          </Page>
        );
      })}
    </Document>
  );
};