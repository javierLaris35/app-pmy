// components/pdf/FedExPackageDispatchPDF.tsx
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
import { format, toZonedTime } from 'date-fns-tz';
import { Driver, PackageInfo, Route, Vehicles } from '@/lib/types';
import { formatMexicanPhoneNumber, formatMexicanPhoneNumberWithOutMexicanLada } from '@/lib/utils';

Font.register({ family: 'Helvetica', src: undefined }); // Uses built-in Helvetica

const styles = StyleSheet.create({
  page: {
    padding: 15,
    fontSize: 10,
    fontFamily: 'Helvetica',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    marginBottom: 1,
    width: '100%',
  },
  logo: {
    width: 100,
    height: 100,
  },
  leftHeader: {
    flex: 1,
    alignItems: 'flex-start',
    textAlign: 'left',
  },
  centerHeader: {
    flex: 1,
    alignItems: 'center',
    textAlign: 'center',
  },
  rightHeader: {
    alignItems: 'flex-end',
    textAlign: 'right',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2
  },
  subTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2
  },
  section: {
    marginBottom: 6,
  },
  row: {
    fontSize: 10,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 2,
  },
  cell: {
    fontWeight: 700,
    paddingRight: 4,
    minWidth: 40,
  },
  simbology: {
    fontWeight: 400,
    paddingRight: 4,
    minWidth: 40,
  },
  columns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    flex: 1,
    paddingRight: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#9d5137',
    padding: 4,
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #ccc',
    fontSize: 9,
    padding: 4,
  },
  paymentRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #d4ac0d',
    fontSize: 9,
    padding: 4,
    backgroundColor: '#fff2cc', // Amarillo claro para toda la fila
  },
  textBold: {
    fontWeight: 'bold',
  },
  invalidSection: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#ffe6e6', // Fondo rojo claro para destacar
    border: '1px solid #ff9999',
  },
  invalidTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#cc0000',
    marginBottom: 4,
  },
  invalidRow: {
    flexDirection: 'row',
    marginBottom: 2,
    fontSize: 9,
  },
  invalidTracking: {
    fontWeight: 'bold',
    color: '#cc0000',
    marginRight: 10,
  }
});

export const FedExPackageDispatchPDF = ({
  drivers,
  routes,
  vehicle,
  packages,
  invalidTrackings,
  subsidiaryName,
  trackingNumber,
}: {
  drivers: Driver[];
  routes: Route[];
  vehicle: Vehicles;
  packages: PackageInfo[];
  invalidTrackings?: string[];
  subsidiaryName: string;
  trackingNumber: string;
}) => {
  const timeZone = 'America/Hermosillo';
  const currentDate = new Date();
  const formattedDate = format(currentDate, 'yyyy-MM-dd', { timeZone });

  const truncate = (text: string, maxLength: number): string => {
    if (!text) return '';
    return text.length > maxLength ? text.slice(0, maxLength - 3) + '...' : text;
  };

  return (
    <Document>
      <Page size="LETTER" style={styles.page} orientation="landscape">
        <View style={styles.header}>
          <View style={styles.leftHeader}>
            <Text style={styles.title}>Salida a Ruta</Text>
            
            <Text style={styles.cell}>Información de la Ruta</Text>
            
            <View style={styles.row}>
              <Text style={styles.cell}>Sucursal:</Text>
              <Text>{subsidiaryName}</Text>
            </View>

            <View style={styles.row}>
                <Text style={styles.cell}>Conductores:</Text>
                <Text>{drivers.map((d) => d.name).join(' - ')}</Text>
            </View>
            <View style={styles.row}>
                <Text style={styles.cell}>Ruta:</Text>
                <Text>{routes.map((r) => r.name).join(' -> ')}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>Unidad:</Text>
              <Text>{vehicle.name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>No. Paquetes:</Text>
              <Text>{packages.length}</Text>
            </View>
            <Text>Fecha: {formattedDate}</Text>
          </View>
          
          <View style={styles.centerHeader}>
            {/* Espacio para contenido central si lo necesitas */}
          </View>
          <View style={styles.rightHeader}>
            <Image src="/logo-no-fondo.png" style={styles.logo} />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.columns}>
            <View style={styles.column}>
              <Text style={styles.simbology}>
                Simbología: [C] Carga/F2/31.5 [$] Pago [H] Valor alto
              </Text>
            </View>
            <View>
            <View style={styles.column}>
              <View style={styles.row}>
                <Text style={styles.cell}>Número de seguimiento:</Text>
                <Text>{trackingNumber}</Text>
              </View>
            </View>
          </View>
          </View>
        </View>

        {/* Tabla con nuevas columnas optimizadas - manteniendo fontSize */}
        <View style={styles.tableHeader}>
          <Text style={{ width: 22 }}>[#]</Text>
          <Text style={{ width: 60 }}>No. Guia</Text>
          <Text style={{ width: 110 }}>Nombre</Text>
          <Text style={{ width: 125 }}>Dirección</Text>
          <Text style={{ width: 28 }}>CP</Text>
          <Text style={{ width: 38 }}>Cobro</Text>
          <Text style={{ width: 50 }}>Fecha</Text>
          <Text style={{ width: 38 }}>Hora</Text>
          <Text style={{ width: 50 }}>Celular</Text>
          <Text style={{ width: 75 }}>Nombre y Firma</Text>
        </View>

        {packages.map((pkg, i) => {
          const icons = `${pkg.isCharge ? '[C]' : ''}${
            pkg.payment ? '[$]' : ''
          }${pkg.isHighValue ? '[H]' : ''}`;

          const zoned = toZonedTime(new Date(pkg.commitDateTime), timeZone);
          const commitDate = format(zoned, 'yyyy-MM-dd', { timeZone });
          const commitTime = format(zoned, 'HH:mm:ss', { timeZone });
          const hasPayment = pkg.payment?.amount != null;
          const rowStyle = hasPayment ? styles.paymentRow : styles.tableRow;
          const hasZipCode = pkg.recipientZip ?? '';

          return (
            <View style={rowStyle} key={i}>
              <Text style={[{ width: 22 }, hasPayment && styles.textBold]}>
                {icons} {i + 1}
              </Text>
              <Text style={[{ width: 60 }, hasPayment && styles.textBold]}>
                {pkg.trackingNumber}
              </Text>
              <Text style={[{ width: 110 }, hasPayment && styles.textBold]}>
                {truncate(pkg.recipientName, 22)}
              </Text>
              <Text style={[{ width: 125 }, hasPayment && styles.textBold]}>
                {truncate(pkg.recipientAddress, 26)}
              </Text>
              <Text style={[{ width: 28 }, hasPayment && styles.textBold]}>
                {hasZipCode}
              </Text>
              <Text style={[{ width: 38 }, hasPayment && styles.textBold]}>
                {hasPayment ? `${pkg.payment?.type} $${pkg.payment?.amount}` : ''}
              </Text>
              <Text style={[{ width: 50 }, hasPayment && styles.textBold]}>
                {commitDate}
              </Text>
              <Text style={[{ width: 38 }, hasPayment && styles.textBold]}>
                {commitTime}
              </Text>
              <Text style={[{ width: 50 }, hasPayment && styles.textBold]}>
                {formatMexicanPhoneNumberWithOutMexicanLada(pkg.recipientPhone)}
              </Text>
              <Text style={[{ width: 75 }, hasPayment && styles.textBold]}>
                {}
              </Text>
            </View>
          );
        })}

        {invalidTrackings && invalidTrackings.length > 0 && (
          <View style={styles.invalidSection}>
            <Text style={styles.invalidTitle}>
              Guías Inválidas ({invalidTrackings.length})
            </Text>
            <View style={styles.row}>
              {invalidTrackings.map((tracking, index) => (
                <Text style={styles.invalidRow} key={index}>
                  <Text style={styles.invalidTracking}>{tracking}</Text>
                  {index < invalidTrackings.length - 1 && ' • '}
                </Text>
              ))}
            </View>
          </View>
        )}
      </Page>
    </Document>
  );
};