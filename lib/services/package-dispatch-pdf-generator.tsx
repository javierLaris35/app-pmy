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
    marginBottom: 8,
    width: '100%',
  },
  logo: {
    width: 120,
    height: 120,
    //marginRight: 10,
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
    fontWeight: 700,
    paddingRight: 4,
    minWidth: 40,
    paddingTop: 5
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
    fontSize: 11,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #ccc',
    fontSize: 11,
    padding: 4,
  },
});

export const FedExPackageDispatchPDF = ({
  drivers,
  routes,
  vehicle,
  packages,
  subsidiaryName,
}: {
  drivers: Driver[];
  routes: Route[];
  vehicle: Vehicles;
  packages: PackageInfo[];
  subsidiaryName: string;
}) => {
  const timeZone = 'America/Hermosillo';
  const currentDate = new Date();
  const formattedDate = format(currentDate, 'yyyy-MM-dd', { timeZone });

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
            
          </View>
          <View style={styles.rightHeader}>
            <Image src="/logo-no-fondo.png" style={styles.logo} />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.columns}>
            <View style={styles.column}>
              <Text style={styles.simbology}>
                Simbología: [C] Carga [$] Pago [H] Valor alto
              </Text>
            </View>
            <View>
            <View style={styles.column}>
              <View style={styles.row}>
                <Text style={styles.cell}>Número de seguimiento:</Text>
                <Text>730249391125</Text>
              </View>
            </View>
          </View>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={{ width: 40 }}>[#]</Text>
          <Text style={{ width: 80 }}>No. Guia</Text>
          <Text style={{ width: 105 }}>Nombre</Text>
          <Text style={{ width: 105 }}>Dirección</Text>
          <Text style={{ width: 60 }}>Cobro</Text>
          <Text style={{ width: 65 }}>Fecha</Text>
          <Text style={{ width: 55 }}>Hora</Text>
          <Text style={{ width: 65 }}>Celular</Text>
          <Text style={{ width: 90 }}>Nombre y Firma</Text>
        </View>

        {packages.map((pkg, i) => {
          const icons = `${pkg.isCharge ? '[C]' : ''}${
            pkg.payment ? '[$]' : ''
          }${pkg.isHighValue ? '[H]' : ''}`;

          const zoned = toZonedTime(new Date(pkg.commitDateTime), timeZone);
          const commitDate = format(zoned, 'yyyy-MM-dd', { timeZone });
          const commitTime = format(zoned, 'HH:mm:ss', { timeZone });

          return (
            <View style={styles.tableRow} key={i}>
              <Text style={{ width: 40 }}>
                {icons} {i + 1}
              </Text>
              <Text style={{ width: 80 }}>{pkg.trackingNumber}</Text>
              <Text style={{ width: 105 }}>{pkg.recipientName}</Text>
              <Text style={{ width: 105 }}>{pkg.recipientAddress}</Text>
              <Text style={{ width: 60 }}>{pkg.payment?.amount || ''}</Text>
              <Text style={{ width: 65 }}>{commitDate}</Text>
              <Text style={{ width: 55 }}>{commitTime}</Text>
              <Text style={{ width: 65 }}>{pkg.recipientPhone}</Text>
              <Text style={{ width: 90 }}></Text>
            </View>
          );
        })}
      </Page>
    </Document>
  );
};
