import React, { useMemo } from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import { Collection, Devolution } from '../types';
import { STATUS_TO_DEX_CODE } from '@/utils/shipment-status.utils';

const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontSize: 10,
    fontFamily: 'Helvetica',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 4,
  },
  fallbackLogo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fedExText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  fedExPurple: { color: '#662d91' },
  fedExOrange: { color: '#ff6600' },
  dateContainer: { alignItems: 'flex-end' },
  dateLabel: { fontSize: 11, fontWeight: 'bold', marginBottom: 2 },
  dateValue: {
    fontSize: 12,
    border: '1px solid #000',
    padding: 4,
    width: 80,
    textAlign: 'center',
  },
  locationSection: { marginBottom: 15 },
  locality: { fontSize: 12, fontWeight: 'bold', marginBottom: 5 },
  subsidiary: { fontSize: 15, fontWeight: 'bold', marginBottom: 5 },
  subtitle: { fontSize: 16, color: '#646464', marginBottom: 10 },
  summarySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  summaryBox: {
    flex: 1,
    minWidth: 140,
    border: '1px solid #c8c8c8',
    borderRadius: 4,
    padding: 8,
  },
  summaryHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#464646',
    marginBottom: 4,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: '#fff',
    padding: 6,
    border: '1px solid #eee',
    borderRadius: 3,
  },
  sectionHeader: {
    backgroundColor: '#662d91',
    color: '#fff',
    padding: 5,
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  sectionHeaderOrange: { backgroundColor: '#ff6600' },
  table: { width: '100%' },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    padding: 4,
    fontSize: 9,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #dcdcdc',
    padding: 4,
    fontSize: 8,
  },
  tableRowEven: { backgroundColor: '#fcfcfc' },
  tableCell: { padding: 2 },
  col15: { width: '15%' },
  col20: { width: '20%' },
  col40: { width: '40%' },
  col45: { width: '45%' },
  col60: { width: '60%' },
  dexCode: { color: '#b40000', fontWeight: 'bold' },
  footer: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    marginTop: 20,
    fontSize: 9,
    color: '#505050',
  },
  signatureSection: {
    marginTop: 30,
    width: '100%',
    alignItems: 'center',
  },
  signatureLine: {
    borderTop: '1px solid #000',
    width: '60%',
    paddingTop: 5,
    marginBottom: 5,
  },
  signatureText: { fontSize: 10, textAlign: 'center', color: '#505050' },
  columnGap: { width: '4%' },
});

const getStatusCode = (status: string = ""): string => {
  const cleanStatus = status.trim().toUpperCase();
  if (STATUS_TO_DEX_CODE[cleanStatus]) return STATUS_TO_DEX_CODE[cleanStatus];

  const foundKey = Object.keys(STATUS_TO_DEX_CODE).find(key => 
    cleanStatus.includes(key.toUpperCase()) || key.toUpperCase().includes(cleanStatus)
  );
  
  return foundKey ? STATUS_TO_DEX_CODE[foundKey] : status;
};

export const EnhancedFedExPDF = ({
  collections = [],
  devolutions = [],
  subsidiaryName = "",
}: {
  collections: Collection[];
  devolutions: Devolution[];
  subsidiaryName: string;
}) => {
  const currentDate = useMemo(() => new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }), []);

  const totalCollectionPackages = collections.length;
  const totalDevolutionPackages = devolutions.length;
  const totalPackages = totalDevolutionPackages + totalCollectionPackages;

  // Rellena hasta 15 SOLO si hay datos. Si no hay nada, devuelve null.
  const renderEmptyRows = (currentCount: number, target: number, isCollection: boolean = false) => {
    if (currentCount === 0) return null;
    const remaining = Math.max(0, target - currentCount);
    return Array.from({ length: remaining }).map((_, i) => (
      <View key={`empty-${isCollection ? 'coll' : 'dev'}-${i}`} style={[styles.tableRow, (currentCount + i) % 2 === 0 ? styles.tableRowEven : {}]}>
        <Text style={[styles.tableCell, isCollection ? styles.col60 : styles.col15]}></Text>
        <Text style={[styles.tableCell, isCollection ? styles.col20 : styles.col40]}></Text>
        <Text style={[styles.tableCell, isCollection ? styles.col20 : styles.col45]}></Text>
      </View>
    ));
  };

  return (
    <Document title={`Reporte_${subsidiaryName}`}>
      <Page size="A4" style={styles.page}>
        {/* Header y Resumen se mantienen igual */}
        <View style={styles.header}>
          <View style={styles.fallbackLogo}>
            <Text style={[styles.fedExText, styles.fedExPurple]}>Fed</Text>
            <Text style={[styles.fedExText, styles.fedExOrange]}>Ex</Text>
            <Text style={{ fontSize: 8, marginLeft: 2 }}>®</Text>
          </View>
          <View style={styles.dateContainer}>
            <Text style={styles.dateLabel}>FECHA</Text>
            <View style={styles.dateValue}>
              <Text>{currentDate}</Text>
            </View>
          </View>
        </View>

        <View style={styles.locationSection}>
          <Text style={styles.locality}>LOCALIDAD:</Text>
          <Text style={styles.subsidiary}>{subsidiaryName.toUpperCase()}</Text>
          <Text style={styles.subtitle}>DEVOLUCIONES Y RECOLECCIONES</Text>
        </View>

        <View style={styles.summarySection}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryHeader}>TOTAL RECOLECCIONES</Text>
            <View style={styles.summaryValue}><Text>{totalCollectionPackages}</Text></View>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryHeader}>TOTAL DEVOLUCIONES</Text>
            <View style={styles.summaryValue}><Text>{totalDevolutionPackages}</Text></View>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryHeader}>TOTAL GENERAL</Text>
            <View style={styles.summaryValue}><Text>{totalPackages}</Text></View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {/* Columna Devoluciones: Estructura fija, filas dinámicas */}
          <View style={{ width: '48%' }}>
            <View style={styles.sectionHeader}><Text>DEVOLUCION (Envío no entregado)</Text></View>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.col15}>No.</Text>
                <Text style={styles.col40}>NO. GUIA</Text>
                <Text style={styles.col45}>MOTIVO</Text>
              </View>
              {devolutions.map((dev, index) => {
                const statusCode = getStatusCode(dev.status);
                const isDex = statusCode.includes('DEX') || statusCode.includes('FRAUDE');
                return (
                  <View key={`dev-${dev.trackingNumber}-${index}`} style={[styles.tableRow, index % 2 === 0 ? styles.tableRowEven : {}]}>
                    <Text style={[styles.tableCell, styles.col15]}>{index + 1}</Text>
                    <Text style={[styles.tableCell, styles.col40]}>{dev.trackingNumber}</Text>
                    <Text style={[styles.tableCell, styles.col45, isDex ? styles.dexCode : {}]}>{statusCode}</Text>
                  </View>
                );
              })}
              {renderEmptyRows(devolutions.length, 15, false)}
            </View>
          </View>

          <View style={styles.columnGap} />

          {/* Columna Recolecciones: Estructura fija, filas dinámicas */}
          <View style={{ width: '48%' }}>
            <View style={[styles.sectionHeader, styles.sectionHeaderOrange]}><Text>RECOLECCIONES</Text></View>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.col60}>NO. GUIA</Text>
                <Text style={styles.col20}>SUC.</Text>
                <Text style={styles.col20}>No.</Text>
              </View>
              {collections.map((coll, index) => (
                <View key={`coll-${coll.trackingNumber}-${index}`} style={[styles.tableRow, index % 2 === 0 ? styles.tableRowEven : {}]}>
                  <Text style={[styles.tableCell, styles.col60]}>{coll.trackingNumber}</Text>
                  <Text style={[styles.tableCell, styles.col20]}>{subsidiaryName.substring(0, 3).toUpperCase()}</Text>
                  <Text style={[styles.tableCell, styles.col20]}>{index + 1}</Text>
                </View>
              ))}
              {renderEmptyRows(collections.length, 15, true)}
            </View>
          </View>
        </View>

        <View style={styles.signatureSection}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureText}>Nombre y Firma</Text>
        </View>

        {/* Footer actualizado con DEX 17 */}
        <View style={styles.footer}>
          <Text>DEX 03: DATOS INCORRECTOS / DOM NO EXISTE</Text>
          <Text>DEX 07: RECHAZO DE PAQUETES POR EL CLIENTE</Text>
          <Text>DEX 08: VISITA / DOMICILIO CERRADO</Text>
          <Text>DEX 17: CAMBIO DE FECHA SOLICITADO</Text>
        </View>
      </Page>
    </Document>
  );
};