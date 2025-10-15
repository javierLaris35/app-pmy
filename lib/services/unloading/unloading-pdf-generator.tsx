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
import { PackageInfo, Vehicles } from '@/lib/types';
import { MissingPackageInfo } from '@/components/operaciones/desembarque/unloading-form';

Font.register({ family: 'Helvetica', src: undefined }); // Uses built-in Helvetica

const styles = StyleSheet.create({
  page: {
    padding: 20,
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
    width: 120,
    height: 120,
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
    marginBottom: 2,
  },
  subTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2,
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
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #ccc',
    fontSize: 9,
    padding: 4,
  },
  trackingSection: {
    marginTop: 12,
    borderTop: '1px solid #ccc',
  },
  trackingRow: {
    fontSize: 9,
    padding: 4,
    borderBottom: '1px solid #ccc',
    flexDirection: 'row',
  },
});

export const UnloadingPDFReport = ({
  vehicle,
  packages,
  subsidiaryName,
  missingPackages,
  unScannedPackages,
  unloadingTrackigNumber,
}: {
  vehicle: Vehicles;
  packages: PackageInfo[];
  missingPackages?: MissingPackageInfo[];
  unScannedPackages?: string[];
  subsidiaryName: string;
  unloadingTrackigNumber: string;
}) => {
  const packagesMissing = missingPackages ?? [];
  const packagesUnScanned = unScannedPackages ?? [];

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
            <Text style={styles.title}>Desembarque</Text>

            <Text style={styles.cell}>Información</Text>

            <View style={styles.row}>
              <Text style={styles.cell}>Sucursal:</Text>
              <Text>{subsidiaryName}</Text>
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

          <View style={styles.centerHeader}></View>

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
            <View style={styles.column}>
              <View style={styles.row}>
                <Text style={styles.cell}>Número de seguimiento:</Text>
                <Text>{unloadingTrackigNumber}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 🟤 Tabla principal con más espacio en Nombre y Dirección */}
        <View style={styles.tableHeader}>
          <Text style={{ width: 25 }}>[#]</Text>
          <Text style={{ width: 63 }}>No. Guia</Text>
          <Text style={{ width: 175 }}>Nombre</Text>
          <Text style={{ width: 185 }}>Dirección</Text>
          <Text style={{ width: 40 }}>C.P.</Text>
          <Text style={{ width: 55 }}>Cobro</Text>
          <Text style={{ width: 55 }}>Fecha</Text>
          <Text style={{ width: 45 }}>Hora</Text>
          <Text style={{ width: 50 }}>Celular</Text>
        </View>

        {packages.map((pkg, i) => {
          const icons = `${pkg.isCharge ? '[C]' : ''}${pkg.payment ? '[$]' : ''}${pkg.isHighValue ? '[H]' : ''}`;
          const zoned = toZonedTime(new Date(pkg.commitDateTime), timeZone);
          const commitDate = format(zoned, 'yyyy-MM-dd', { timeZone });
          const commitTime = format(zoned, 'HH:mm:ss', { timeZone });
          const recipientName = pkg.recipientName ?? '';
          const recipientAddress = pkg.recipientAddress ?? '';
          const recipientZip = pkg.recipientZip ?? '';

          return (
            <View style={styles.tableRow} key={i}>
              <Text style={{ width: 25 }}>
                {icons} {i + 1}
              </Text>
              <Text style={{ width: 63 }}>{pkg.trackingNumber}</Text>
              <Text style={{ width: 175 }}>{truncate(recipientName, 32)}</Text>
              <Text style={{ width: 185 }}>{truncate(recipientAddress, 38)}</Text>
              <Text style={{ width: 40 }}>{recipientZip}</Text>
              <Text style={{ width: 55 }}>
                {pkg.payment?.amount != null ? `${pkg.payment.type} $${pkg.payment.amount}` : ''}
              </Text>
              <Text style={{ width: 55 }}>{commitDate}</Text>
              <Text style={{ width: 45 }}>{commitTime}</Text>
              <Text style={{ width: 50 }}>{pkg.recipientPhone}</Text>
            </View>
          );
        })}

        {packagesMissing.length > 0 && (
          <View style={styles.trackingSection}>
            <Text style={styles.subTitle}>* Guías Faltantes</Text>
            {packagesMissing.map((missing, i) => (
              <View style={styles.trackingRow} key={`missing-${i}`}>
                <Text style={{ width: 70 }}>{missing.trackingNumber}</Text>
                <Text style={{ width: 175 }}>{missing.recipientName ?? 'Sin Nombre'}</Text>
                <Text style={{ width: 185 }}>{missing.recipientAddress ?? 'Sin Dirección'}</Text>
                <Text style={{ width: 50 }}>{missing.recipientZip ?? 'No CP'}</Text>
                <Text style={{ width: 50 }}>{missing.recipientPhone ?? 'Sin Teléfono'}</Text>
              </View>
            ))}
          </View>
        )}

        {packagesUnScanned.length > 0 && (
          <View style={styles.trackingSection}>
            <Text style={styles.subTitle}>** Guías Sin Escaneo</Text>
            {packagesUnScanned.map((tracking, i) => (
              <View style={styles.trackingRow} key={`unscanned-${i}`}>
                <Text>{tracking}</Text>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
};
