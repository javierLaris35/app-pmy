// components/pdf/RouteClosurePDF.tsx
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
import { format } from 'date-fns-tz';
import { PackageInfo, PackageDispatch } from '@/lib/types';

Font.register({ family: 'Helvetica', src: undefined });

// Colores del branding (basados en el logo naranja)
const colors = {
  primary: '#8c5e4e',     // Marrón principal
  secondary: '#4cc9f0',   // Azul secundario 
  accent: '#ff6b6b',      // Rojo para alertas
  light: '#f8f9fa',       // Fondo claro
  dark: '#212529',        // Texto oscuro
  border: '#dee2e6',      // Bordes sutiles
  success: '#40c057',     // Verde para éxito
};

const styles = StyleSheet.create({
  page: {
    padding: 12,
    fontSize: 8,
    fontFamily: 'Helvetica',
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottom: `2px solid ${colors.primary}`,
  },
  logo: {
    width: 45,
    height: 45,
  },
  headerText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
  },
  dateText: {
    fontSize: 7,
    color: colors.dark,
    textAlign: 'right',
  },
  compactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
    padding: 6,
    backgroundColor: colors.light,
    borderRadius: 4,
    border: `1px solid ${colors.border}`,
  },
  compactItem: {
    width: '32%',
    marginBottom: 4,
  },
  compactLabel: {
    fontSize: 6,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 1,
  },
  compactValue: {
    fontSize: 7,
    color: colors.dark,
  },
  mainContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  leftColumn: {
    width: '58%',
    paddingRight: 8,
  },
  rightColumn: {
    width: '40%',
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 5,
    padding: 3,
    textAlign: 'center',
    backgroundColor: colors.light,
    borderRadius: 3,
    border: `1px solid ${colors.border}`,
  },
  tableContainer: {
    maxHeight: 200, // Reducido para dar espacio a las firmas
    border: `1px solid ${colors.border}`,
    borderRadius: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    color: 'white',
    padding: 3,
    fontSize: 7,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: `1px solid ${colors.border}`,
    fontSize: 6.5,
    padding: 2,
    minHeight: 16,
  },
  tableRowEven: {
    backgroundColor: colors.light,
  },
  multiColumnContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  column: {
    width: '48%',
  },
  collectionItem: {
    fontSize: 7,
    marginBottom: 2,
    padding: 2,
    borderBottom: `1px solid ${colors.border}`,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  statBox: {
    width: '48%',
    border: `1px solid ${colors.primary}`,
    borderRadius: 3,
    padding: 5,
    alignItems: 'center',
    marginBottom: 5,
    backgroundColor: colors.light,
  },
  statTitle: {
    fontSize: 7,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.dark,
    textAlign: 'center',
  },
  dexContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  dexBox: {
    width: '23%',
    border: `1px solid ${colors.border}`,
    borderRadius: 2,
    padding: 4,
    alignItems: 'center',
    marginBottom: 4,
    backgroundColor: colors.light,
  },
  dexTitle: {
    fontSize: 7,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 1,
  },
  dexValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.dark,
    textAlign: 'center',
  },
  // Nuevos estilos para las dos firmas
  signatureContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    borderTop: `1px solid ${colors.border}`,
    paddingTop: 8,
  },
  signatureBox: {
    width: '48%',
    alignItems: 'center',
  },
  signatureLine: {
    borderTop: `1px solid ${colors.dark}`,
    width: '80%',
    paddingTop: 3,
    marginBottom: 3,
  },
  signatureText: {
    fontSize: 8,
    color: colors.dark,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  signatureSubtext: {
    fontSize: 7,
    color: colors.dark,
    textAlign: 'center',
    marginTop: 2,
  },
  footer: {
    marginTop: 8,
    fontSize: 6,
    color: colors.dark,
    textAlign: 'center',
    borderTop: `1px solid ${colors.border}`,
    paddingTop: 3,
    opacity: 0.7,
  },
});

interface RouteClosurePDFProps {
  returnedPackages: PackageInfo[];
  packageDispatch: PackageDispatch;
  actualKms: string;
  collections?: string[];
  podPackages?: PackageInfo[];
}

export const RouteClosurePDF = ({
  returnedPackages,
  packageDispatch,
  actualKms,
  collections = [],
  podPackages = [],
}: RouteClosurePDFProps) => {
  
  const timeZone = 'America/Hermosillo';
  const currentDate = new Date();
  const formattedDate = format(currentDate, 'yyyy-MM-dd', { timeZone });
  const formattedTime = format(currentDate, 'HH:mm:ss', { timeZone });

  // Extraer información del packageDispatch
  const { subsidiary, vehicle, shipments, trackingNumber, drivers, routes, createdAt, kms } = packageDispatch;
  
  // Calcular estadísticas
  const validReturns = returnedPackages.filter(p => p.isValid);
  const originalCount = shipments?.length || 0;
  const deliveredCount = originalCount - validReturns.length;
  const returnRate = originalCount > 0 ? (validReturns.length / originalCount) * 100 : 0;
  const podDeliveredCount = podPackages?.length || 0;

  // Contar códigos DEX
  const dex03Count = validReturns.filter(p => p.lastHistory?.exceptionCode === '03').length;
  const dex07Count = validReturns.filter(p => p.lastHistory?.exceptionCode === '07').length;
  const dex08Count = validReturns.filter(p => p.lastHistory?.exceptionCode === '08').length;
  const dex12Count = validReturns.filter(p => p.lastHistory?.exceptionCode === '12').length;

  // Formatear fecha de creación
  const dispatchDate = createdAt ? format(new Date(createdAt), 'yyyy-MM-dd', { timeZone }) : 'N/A';
  
  // Obtener primer conductor
  const mainDriver = drivers && drivers.length > 0 ? drivers[0].name : 'No asignado';
  
  // Obtener nombres de rutas
  const routeNames = routes?.map(r => r.name).join(', ') || 'No asignado';

  // Dividir recolecciones en columnas
  const splitCollectionsIntoColumns = (collections: string[], columns: number) => {
    const result = [];
    const itemsPerColumn = Math.ceil(collections.length / columns);
    
    for (let i = 0; i < columns; i++) {
      result.push(collections.slice(i * itemsPerColumn, (i + 1) * itemsPerColumn));
    }
    
    return result;
  };

  const collectionColumns = splitCollectionsIntoColumns(collections, 2);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src="/logo-no-fondo.png" style={styles.logo} />
          <Text style={styles.headerText}>CIERRE DE RUTA</Text>
          <View>
            <Text style={styles.dateText}>{formattedDate}</Text>
            <Text style={styles.dateText}>{formattedTime}</Text>
          </View>
        </View>

        {/* Información general compacta */}
        <View style={styles.compactGrid}>
          <View style={styles.compactItem}>
            <Text style={styles.compactLabel}>SUCURSAL</Text>
            <Text style={styles.compactValue}>{subsidiary?.name || 'N/A'}</Text>
          </View>
          
          <View style={styles.compactItem}>
            <Text style={styles.compactLabel}>UNIDAD</Text>
            <Text style={styles.compactValue}>{vehicle?.name || 'N/A'}</Text>
          </View>
          
          <View style={styles.compactItem}>
            <Text style={styles.compactLabel}>CONDUCTOR</Text>
            <Text style={styles.compactValue}>{mainDriver}</Text>
          </View>
          
          <View style={styles.compactItem}>
            <Text style={styles.compactLabel}>RUTAS</Text>
            <Text style={styles.compactValue}>{routeNames}</Text>
          </View>
          
          <View style={styles.compactItem}>
            <Text style={styles.compactLabel}>FECHA SALIDA</Text>
            <Text style={styles.compactValue}>{dispatchDate}</Text>
          </View>
          
          <View style={styles.compactItem}>
            <Text style={styles.compactLabel}>KM INICIAL/FINAL</Text>
            <Text style={styles.compactValue}>{kms || 'N/A'} / {actualKms} km</Text>
          </View>
          
          <View style={styles.compactItem}>
            <Text style={styles.compactLabel}>NO. SEGUIMIENTO</Text>
            <Text style={styles.compactValue}>{trackingNumber}</Text>
          </View>
          
          <View style={styles.compactItem}>
            <Text style={styles.compactLabel}>TOTAL PAQUETES</Text>
            <Text style={styles.compactValue}>{originalCount}</Text>
          </View>
          
          <View style={styles.compactItem}>
            <Text style={styles.compactLabel}>ENTREGAS</Text>
            <Text style={styles.compactValue}>{deliveredCount}</Text>
          </View>
        </View>

        {/* Contenido principal - Dos columnas */}
        <View style={styles.mainContainer}>
          {/* Columna izquierda - Paquetes devueltos */}
          <View style={styles.leftColumn}>
            <Text style={styles.sectionTitle}>PAQUETES DEVUELTOS ({validReturns.length})</Text>
            
            {validReturns.length > 0 ? (
              <View style={styles.tableContainer}>
                <View style={styles.tableHeader}>
                  <Text style={{ width: '22%' }}>GUÍA</Text>
                  <Text style={{ width: '18%' }}>MOTIVO</Text>
                  <Text style={{ width: '30%' }}>DESTINATARIO</Text>
                  <Text style={{ width: '30%' }}>TELÉFONO</Text>
                </View>
                
                {validReturns.map((pkg, i) => (
                  <View style={[styles.tableRow, i % 2 === 0 && styles.tableRowEven]} key={i}>
                    <Text style={{ width: '22%' }}>{pkg.trackingNumber}</Text>
                    <Text style={{ width: '18%' }}>{pkg.lastHistory?.exceptionCode ? `DEX-${pkg.lastHistory.exceptionCode}` : 'Devuelto'}</Text>
                    <Text style={{ width: '30%' }}>{pkg.recipientName || 'N/A'}</Text>
                    <Text style={{ width: '30%' }}>{pkg.recipientPhone || 'N/A'}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ textAlign: 'center', fontSize: 7, padding: 8, color: colors.dark }}>
                No hay paquetes devueltos
              </Text>
            )}
            
            {/* Totales y códigos DEX */}
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <Text style={styles.statTitle}>TOTAL DEVUELTOS</Text>
                <Text style={styles.statValue}>{validReturns.length}</Text>
              </View>
              
              <View style={styles.statBox}>
                <Text style={styles.statTitle}>PODs ENTREGADOS</Text>
                <Text style={styles.statValue}>{podDeliveredCount}</Text>
              </View>
            </View>
            
            <Text style={[styles.sectionTitle, { marginTop: 5 }]}>CONTEO POR CÓDIGO DEX</Text>
            <View style={styles.dexContainer}>
              <View style={styles.dexBox}>
                <Text style={styles.dexTitle}>DEX-03</Text>
                <Text style={styles.dexValue}>{dex03Count}</Text>
              </View>
              
              <View style={styles.dexBox}>
                <Text style={styles.dexTitle}>DEX-07</Text>
                <Text style={styles.dexValue}>{dex07Count}</Text>
              </View>
              
              <View style={styles.dexBox}>
                <Text style={styles.dexTitle}>DEX-08</Text>
                <Text style={styles.dexValue}>{dex08Count}</Text>
              </View>
              
              <View style={styles.dexBox}>
                <Text style={styles.dexTitle}>DEX-12</Text>
                <Text style={styles.dexValue}>{dex12Count}</Text>
              </View>
            </View>
          </View>

          {/* Columna derecha - Recolecciones */}
          <View style={styles.rightColumn}>
            <Text style={styles.sectionTitle}>RECOLECCIONES ({collections.length})</Text>
            
            {collections.length > 0 ? (
              <View style={[styles.tableContainer, { maxHeight: 200 }]}>
                <View style={styles.multiColumnContainer}>
                  {collectionColumns.map((column, colIndex) => (
                    <View key={colIndex} style={styles.column}>
                      {column.map((tracking, i) => (
                        <Text key={i} style={styles.collectionItem}>
                          {tracking}
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <Text style={{ textAlign: 'center', fontSize: 7, padding: 8, color: colors.dark }}>
                No hay recolecciones
              </Text>
            )}
            
            {/* Estadísticas generales */}
            <View style={[styles.statsContainer, { marginTop: 6 }]}>
              <View style={styles.statBox}>
                <Text style={styles.statTitle}>PAQUETES EN SALIDA</Text>
                <Text style={styles.statValue}>{originalCount}</Text>
              </View>
              
              <View style={styles.statBox}>
                <Text style={styles.statTitle}>ENTREGAS EFECTIVAS</Text>
                <Text style={styles.statValue}>{deliveredCount}</Text>
              </View>
            </View>
            
            <View style={styles.statBox}>
              <Text style={styles.statTitle}>TASA DE DEVOLUCIÓN</Text>
              <Text style={[styles.statValue, { color: returnRate > 20 ? colors.accent : colors.success }]}>
                {returnRate.toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Dos Firmas */}
        <View style={styles.signatureContainer}>
          {/* Firma izquierda - Conductor */}
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureText}>FIRMA DE CONFORMIDAD</Text>
            <Text style={styles.signatureSubtext}>
              {mainDriver} - Conductor
            </Text>
          </View>

          {/* Firma derecha - Quien recibe */}
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureText}>NOMBRE Y FIRMA</Text>
            <Text style={styles.signatureSubtext}>
              Personal que recibe
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Documento generado automáticamente por el Sistema de Gestión de Rutas</Text>
          <Text>Impreso el {formattedDate} a las {formattedTime}</Text>
        </View>
      </Page>
    </Document>
  );
};