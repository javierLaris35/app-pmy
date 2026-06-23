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
import { sortByZip } from "@/lib/tracking/sort-by-zip";

Font.register({ family: "Helvetica", src: undefined });

const colors = {
  primary: "#8c5e4e",
  secondary: "#4cc9f0",
  accent: "#ff6b6b",
  light: "#f8f9fa",
  dark: "#212529",
  border: "#000000",
  success: "#40c057",
  warning: "#fd7e14",
  info: "#17a2b8",
};

// Estilos con fuentes grandes y ESPACIADO MÍNIMO (Intactos)
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
    height: 35,
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
    height: 25,
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
    height: 25,
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
    flex: 1, 
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
    minHeight: 15,
    alignItems: 'center',
  },
  tableRowEven: { backgroundColor: colors.light },
  paymentRow: {
    backgroundColor: "#fff2cc",
    fontWeight: "bold",
  },
  expiringTodayRow: {
    backgroundColor: '#ffe6e6',
    borderLeftColor: colors.accent,
  },
  zoneSeparator: {
    borderTopWidth: 2,
    borderTopColor: colors.primary,
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
    height: 15,
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
    height: 10,
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
    paddingVertical: 0.2,
    justifyContent: 'center',
    alignItems: 'flex-start',
    height: '100%',
  },
  tableCellText: {
    fontSize: 9,
    lineHeight: 0.9,
    flexWrap: 'nowrap',
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
  /** Si la sucursal lo configura, ordena por CP; si no, conserva el orden de escaneo. */
  sortByPostalCode?: boolean;
}

const getColumnWidths = (isHermosillo: boolean) => {  
  const baseConfig = {
    number: 30, tracking: 65, name: 135, address: 155,
    zipCode: 26, payment: 63, date: 47, time: 38,
    phone: 50, signature: 40
  };

  if (isHermosillo) {
    return {
      number: 30, tracking: 65, name: 135, address: 155,
      zipCode: 26, payment: 63, date: 47, time: 0,
      phone: 55, signature: 42
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
  sortByPostalCode = true,
}: FedExPackageDispatchPDFProps) => {
  const timeZone = "America/Hermosillo";
  const currentDate = new Date();
  
  const formattedDate = format(currentDate, "yyyy-MM-dd", { timeZone });
  const formattedTime = format(currentDate, "HH:mm:ss", { timeZone });

  const isHermosillo = subsidiaryName?.toLowerCase().includes('hermosillo');
  const columnWidths = getColumnWidths(isHermosillo);

  // Orden: por código postal (recipientZip) si la sucursal lo configura; si no,
  // se conserva el orden en que se escanearon los paquetes.
  const orderedPackages = sortByPostalCode ? sortByZip(packages) : packages;

  const calculatePackageStats = () => {
    let f2Count = 0, cargaCount = 0, fedexCount = 0, dhlCount = 0;
    let expiringTodayCount = 0, withPaymentCount = 0, totalPaymentAmount = 0, highValueCount = 0;

    orderedPackages.forEach((pkg) => {
      if (pkg?.isCharge) f2Count++;
      if (pkg?.isHighValue) { cargaCount++; highValueCount++; }
      if (pkg?.payment?.amount) { withPaymentCount++; totalPaymentAmount += pkg.payment.amount; }
      if (pkg?.shipmentType === 'fedex') fedexCount++;
      if (pkg?.shipmentType === 'dhl') dhlCount++;

      try {
        if (pkg?.commitDateTime) {
          const pkgZoned = toZonedTime(new Date(pkg.commitDateTime), timeZone);
          const pkgCommitDate = format(pkgZoned, 'yyyy-MM-dd', { timeZone });
          if (pkgCommitDate === formattedDate) expiringTodayCount++;
        }
      } catch (error) {
        console.error('Error procesando fecha del paquete:', error);
      }
    });

    return {
      total: orderedPackages.length, f2Count, cargaCount, highValueCount,
      expiringTodayCount, withPaymentCount, totalPaymentAmount,
      regularCount: orderedPackages.length - f2Count - highValueCount,
      fedexCount, dhlCount,
    };
  };

  const truncate = (text: string, maxLength: number): string => {
    if (!text) return '';
    return text.length > maxLength ? text.slice(0, maxLength - 3) + '...' : text;
  };

  const packageStats = calculatePackageStats();
  const mainDriver = drivers && drivers.length > 0 ? drivers[0].name : "No asignado";
  const routeNames = routes?.map((r) => r.name).join(" → ") || "No asignado";

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
      {/* Al usar wrap={true}, la página crecerá automáticamente a la hoja siguiente si se llena */}
      <Page size="LETTER" style={styles.page} orientation="landscape" wrap>
        
        {/* ENCABEZADOS PRINCIPALES: Al estar al principio y sin prop "fixed", 
            se renderizan SOLO EN LA PRIMERA HOJA (como tú querías) */}
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
          <View style={styles.infoItem}>
            <Text style={[styles.infoText, styles.infoLabel]}>Fedex</Text>
            <Text style={[styles.infoText, styles.infoValue]}>{packageStats.fedexCount}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={[styles.infoText, styles.infoLabel]}>DHL</Text>
            <Text style={[styles.infoText, styles.infoValue]}>{packageStats.dhlCount}</Text>
          </View>
        </View>

        <View style={styles.symbologyContainer}>
          <Text style={styles.symbologyText}>
            SIMBOLOGÍA: [C] CARGA/F2/31.5 • [$] PAGO • [H] VALOR ALTO • [A] AÉREO (PRIORIDAD)
          </Text>
        </View>

        {/* TABLA DE PAQUETES VÁLIDOS */}
        <View style={styles.tableContainer}>
          {/* El atributo 'fixed' clona automáticamente este header si la tabla se brinca a una hoja nueva */}
          <View style={styles.tableHeader} fixed>
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

          {/* Ya no mapeamos "data" en bloques, mapeamos TODA la lista (ordenada por CP). El wrap hace la división */}
          {orderedPackages.map((pkg, i) => {
            const aeIcon = pkg.consolidated?.type === 'aereo' ? '[A]' : '';
            const icons = `${aeIcon}${pkg.isCharge ? '[C]' : ''}${pkg.payment ? '[$]' : ''}${pkg.isHighValue ? '[H]' : ''}`;

            const zoned = toZonedTime(new Date(pkg.commitDateTime), timeZone);
            const commitDate = format(zoned, 'yyyy-MM-dd', { timeZone });
            const commitTime = format(zoned, 'HH:mm:ss', { timeZone });
            const hasPayment = pkg.payment?.amount != null;

            const isExpiringToday = commitDate === formattedDate;
            const isBold = hasPayment || isExpiringToday;
            const textWeight = isBold ? 'bold' : 'normal';

            // Separador de zona: línea gruesa cuando cambian los 2 primeros dígitos
            // del CP. Solo tiene sentido cuando la lista va ordenada por CP.
            const zone = (pkg.recipientZip || '').slice(0, 2);
            const prevZone = i > 0 ? (orderedPackages[i - 1].recipientZip || '').slice(0, 2) : null;
            const zoneChanged = sortByPostalCode && i > 0 && zone !== prevZone;

            return (
              <View
                style={[
                  styles.tableRow,
                  i % 2 === 0 && styles.tableRowEven,
                  hasPayment && styles.paymentRow,
                  isExpiringToday && styles.expiringTodayRow,
                  zoneChanged && styles.zoneSeparator
                ]}
                key={i}
              >
                <TableCell width={columnWidths.number} style={{ fontWeight: textWeight }}>
                  {icons} {i + 1}
                </TableCell>
                <TableCell width={columnWidths.tracking} style={{ fontWeight: textWeight }}>
                  {pkg.trackingNumber}
                </TableCell>
                <TableCell 
                  width={columnWidths.name} 
                  style={{ fontWeight: textWeight }}
                  truncate={true}
                  maxChars={22}
                >
                  {truncate(pkg.recipientName || '', 25)}
                </TableCell>
                <TableCell 
                  width={columnWidths.address} 
                  style={{ fontWeight: textWeight }}
                  truncate={true}
                  maxChars={26}
                >
                  {truncate(pkg.recipientAddress || '', 28)}
                </TableCell>
                <TableCell width={columnWidths.zipCode} style={{ fontWeight: textWeight }}>
                  {pkg.recipientZip || ''}
                </TableCell>
                <TableCell width={columnWidths.payment} style={{ fontWeight: textWeight }}>
                  {hasPayment ? `${pkg.payment?.type} $${pkg.payment?.amount}` : ''}
                </TableCell>
                <TableCell width={columnWidths.date} style={{ fontWeight: textWeight }}>
                  {commitDate}
                </TableCell>
                {!isHermosillo && (
                  <TableCell width={columnWidths.time} style={{ fontWeight: textWeight }}>
                    {commitTime}
                  </TableCell>
                )}
                <TableCell width={columnWidths.phone} style={{ fontWeight: textWeight }}>
                  {formatMexicanPhoneNumberWithOutMexicanLada(pkg.recipientPhone)}
                </TableCell>
                <TableCell width={columnWidths.signature} style={{ fontWeight: textWeight }}>
                  {}
                </TableCell>
              </View>
            );
          })}
        </View>

        {/* TABLA DE TRACKINGS INVÁLIDOS */}
        {invalidTrackings.length > 0 && (
          // El atributo 'break' empuja forzosamente esta tabla a iniciar en una página NUEVA
          <View style={[styles.tableContainer, { borderColor: '#ff9999' }]} break>
            <View style={[styles.tableHeader, { backgroundColor: '#ff9999' }]} fixed>
              <Text style={[styles.symbologyText, { color: 'white', fontSize: 10, width: '100%', textAlign: 'center' }]}>
                TRACKINGS INVÁLIDOS / NO ENCONTRADOS
              </Text>
            </View>
            
            <View style={styles.tableHeader} fixed>
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

            {invalidTrackings.map((tracking, index) => {
              const globalIndex = orderedPackages.length + index;
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

        {/* PIE DE PÁGINA (Al ser 'fixed' se incrustan solos debajo en cada hoja impresa) 
        <Text 
          style={styles.pageNumber} 
          fixed 
          render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} 
        />

        <Text style={styles.footer} fixed>
          Documento generado automáticamente - PMY App v.1.0 - {formattedDate} {formattedTime}
        </Text>*/}
      </Page>
    </Document>
  );
};