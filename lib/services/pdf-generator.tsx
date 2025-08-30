// components/pdf/EnhancedFedExPDF.tsx
import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from '@react-pdf/renderer';
import { Charge, Collection, Devolution } from '../types';

Font.register({ family: 'Helvetica', src: undefined });

// Enhanced status to DEX code mapping
const STATUS_TO_DEX_CODE: Record<string, string> = {
  "03": "DEX03",
  "07": "DEX07",
  "08": "DEX08",
  "12": "DEX12",
  "GF": "GUIA FRAUDE",
  DEX03: "DEX03",
  DEX07: "DEX07",
  DEX08: "DEX08",
  NO_ENTREGADO: "DEX03",
  RECHAZADO: "DEX07",
  PENDIENTE: "DEX08",
  ENTREGADO: "",
  "DATOS INCORRECTOS": "DEX03",
  "RECHAZO DE PAQUETES": "DEX07",
  "DOMICILIO CERRADO": "DEX08",
  "VISITA FALLIDA": "DEX08",
};

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
  logo: {
    width: 120,
    height: 40,
  },
  fallbackLogo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fedExText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  fedExPurple: {
    color: '#662d91',
  },
  fedExOrange: {
    color: '#ff6600',
  },
  dateContainer: {
    alignItems: 'flex-end',
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 12,
    border: '1px solid #000',
    padding: 4,
    width: 80,
    textAlign: 'center',
  },
  locationSection: {
    marginBottom: 15,
  },
  locality: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subsidiary: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#646464',
    marginBottom: 10,
  },
  summarySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryBox: {
    width: 80,
    border: '1px solid #c8c8c8',
    borderRadius: 4,
    padding: 5,
  },
  summaryHeader: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#464646',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: '#fff',
    padding: 3,
    border: '1px solid #eee',
  },
  sectionHeader: {
    backgroundColor: '#662d91',
    color: '#fff',
    padding: 5,
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  sectionHeaderOrange: {
    backgroundColor: '#ff6600',
  },
  sectionHeaderGreen: {
    backgroundColor: '#008000',
  },
  table: {
    width: '100%',
  },
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
  tableRowEven: {
    backgroundColor: '#fcfcfc',
  },
  tableCell: {
    padding: 2,
  },
  dexCode: {
    color: '#b40000',
    fontWeight: 'bold',
  },
  footer: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    marginTop: 20,
    fontSize: 9,
    color: '#505050',
  },
});

const getStatusCode = (status: string): string => {
  const cleanStatus = status.trim().toUpperCase();
  
  if (STATUS_TO_DEX_CODE[cleanStatus]) {
    return STATUS_TO_DEX_CODE[cleanStatus];
  }

  for (const [key, value] of Object.entries(STATUS_TO_DEX_CODE)) {
    if (cleanStatus.includes(key.toUpperCase()) || key.toUpperCase().includes(cleanStatus)) {
      return value;
    }
  }

  return status || "";
};

export const EnhancedFedExPDF = ({
  collections,
  devolutions,
  charges = [],
  subsidiaryName,
}: {
  collections: Collection[];
  devolutions: Devolution[];
  charges?: Charge[];
  subsidiaryName: string;
}) => {
  const currentDate = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // Calcular totales
  const normalPackages = collections.filter(c => 
    !c.isPickUp && c.status !== "PICK UP" && c.status !== "Pick Up" && 
    c.status !== "pick up" && c.status !== 'PU'
  ).length;

  const pickupPackages = collections.filter(c => 
    c.isPickUp || c.status === "PICK UP" || c.status === "Pick Up" || 
    c.status === "pick up"
  ).length;

  const totalCollectionPackages = collections.length;
  const totalDevolutionPackages = devolutions.length;
  const totalPackages = totalDevolutionPackages + totalCollectionPackages;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
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

        {/* Location Section */}
        <View style={styles.locationSection}>
          <Text style={styles.locality}>LOCALIDAD:</Text>
          <Text style={styles.subsidiary}>{subsidiaryName.toUpperCase()}</Text>
          <Text>La Paz o San Jose del Cabo</Text>
          <Text style={styles.subtitle}>DEVOLUCIONES Y RECOLECCIONES</Text>
        </View>

        {/* Package Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryHeader}>PAQUETES NORMALES</Text>
            <View style={styles.summaryValue}>
              <Text>{normalPackages}</Text>
            </View>
          </View>
          
          <View style={styles.summaryBox}>
            <Text style={styles.summaryHeader}>PAQUETES CON COBRO</Text>
            <View style={styles.summaryValue}>
              <Text>{pickupPackages}</Text>
            </View>
          </View>
          
          <View style={styles.summaryBox}>
            <Text style={styles.summaryHeader}>TOTAL DE PAQUETES</Text>
            <View style={styles.summaryValue}>
              <Text>{totalPackages}</Text>
            </View>
          </View>
        </View>

        {/* Two Column Layout */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {/* Left Column - Devoluciones */}
          <View style={{ width: '48%' }}>
            <View style={styles.sectionHeader}>
              <Text>DEVOLUCION (Envío no entregado)</Text>
            </View>
            
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={{ width: '15%' }}>No.</Text>
                <Text style={{ width: '40%' }}>NO. GUIA</Text>
                <Text style={{ width: '45%' }}>MOTIVO</Text>
              </View>
              
              {devolutions.map((devolution, index) => {
                const statusCode = getStatusCode(devolution.status);
                return (
                  <View 
                    key={index} 
                    style={[
                      styles.tableRow,
                      index % 2 === 0 && styles.tableRowEven
                    ]}
                  >
                    <Text style={[styles.tableCell, { width: '15%' }]}>{index + 1}</Text>
                    <Text style={[styles.tableCell, { width: '40%' }]}>{devolution.trackingNumber}</Text>
                    <Text style={[
                      styles.tableCell, 
                      { width: '45%' },
                      (statusCode.includes('DEX') || statusCode.includes('GUIA FRAUDE')) && styles.dexCode
                    ]}>
                      {statusCode}
                    </Text>
                  </View>
                );
              })}
              
              {/* Fill empty rows */}
              {Array.from({ length: Math.max(0, 15 - devolutions.length) }).map((_, index) => (
                <View 
                  key={index + devolutions.length} 
                  style={[
                    styles.tableRow,
                    (index + devolutions.length) % 2 === 0 && styles.tableRowEven
                  ]}
                >
                  <Text style={[styles.tableCell, { width: '15%' }]}>{index + devolutions.length + 1}</Text>
                  <Text style={[styles.tableCell, { width: '40%' }]}></Text>
                  <Text style={[styles.tableCell, { width: '45%' }]}></Text>
                </View>
              ))}
            </View>
          </View>

          {/* Right Column - Recolecciones y Cobros */}
          <View style={{ width: '48%' }}>
            {/* Recolecciones */}
            <View style={[styles.sectionHeader, styles.sectionHeaderOrange]}>
              <Text>RECOLECCIONES</Text>
            </View>
            
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={{ width: '60%' }}>NO. GUIA</Text>
                <Text style={{ width: '20%' }}>SUCURSAL</Text>
                <Text style={{ width: '20%' }}>No.</Text>
              </View>
              
              {collections.map((collection, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.tableRow,
                    index % 2 === 0 && styles.tableRowEven
                  ]}
                >
                  <Text style={[styles.tableCell, { width: '60%' }]}>{collection.trackingNumber}</Text>
                  <Text style={[styles.tableCell, { width: '20%' }]}>
                    {subsidiaryName.substring(0, 3).toUpperCase()}
                  </Text>
                  <Text style={[styles.tableCell, { width: '20%' }]}>{index + 1}</Text>
                </View>
              ))}
              
              {/* Fill empty rows */}
              {Array.from({ length: Math.max(0, 15 - collections.length) }).map((_, index) => (
                <View 
                  key={index + collections.length} 
                  style={[
                    styles.tableRow,
                    (index + collections.length) % 2 === 0 && styles.tableRowEven
                  ]}
                >
                  <Text style={[styles.tableCell, { width: '60%' }]}></Text>
                  <Text style={[styles.tableCell, { width: '20%' }]}></Text>
                  <Text style={[styles.tableCell, { width: '20%' }]}>{index + collections.length + 1}</Text>
                </View>
              ))}
            </View>

            {/* Cobros */}
            <View style={[styles.sectionHeader, styles.sectionHeaderGreen, { marginTop: 20 }]}>
              <Text>COBROS</Text>
            </View>
            
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={{ width: '60%' }}>NO. GUIA</Text>
                <Text style={{ width: '20%' }}>SUCURSAL</Text>
                <Text style={{ width: '20%' }}>No.</Text>
              </View>
              
              {charges.map((charge, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.tableRow,
                    { backgroundColor: '#e2f0d9' }
                  ]}
                >
                  <Text style={[styles.tableCell, { width: '60%' }]}>{charge.trackingNumber}</Text>
                  <Text style={[styles.tableCell, { width: '20%' }]}>
                    {subsidiaryName.substring(0, 3).toUpperCase()}
                  </Text>
                  <Text style={[styles.tableCell, { width: '20%' }]}>
                    {collections.length + index + 1}
                  </Text>
                </View>
              ))}
              
              {/* Fill empty rows or show message */}
              {charges.length === 0 && (
                <View style={[styles.tableRow, { backgroundColor: '#f2f2f2' }]}>
                  <Text style={[styles.tableCell, { width: '100%', textAlign: 'center', fontStyle: 'italic' }]}>
                    No hay paquetes con cobro
                  </Text>
                </View>
              )}
              
              {Array.from({ length: Math.max(0, 5 - charges.length) }).map((_, index) => (
                <View 
                  key={index + charges.length} 
                  style={[
                    styles.tableRow,
                    { backgroundColor: '#f2f2f2' }
                  ]}
                >
                  <Text style={[styles.tableCell, { width: '60%' }]}></Text>
                  <Text style={[styles.tableCell, { width: '20%' }]}></Text>
                  <Text style={[styles.tableCell, { width: '20%' }]}></Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>DEX 03: DATOS INCORRECTOS / DOM NO EXISTE</Text>
          <Text>DEX 07: RECHAZO DE PAQUETES POR EL CLIENTE</Text>
          <Text>DEX 08: VISITA / DOMICILIO CERRADO</Text>
        </View>
      </Page>
    </Document>
  );
};

// Función de conveniencia para generar el PDF
/*export const generateEnhancedFedExPDF = (
  collections: Collection[],
  devolutions: Devolution[],
  subsidiaryName: string,
  charges?: Charge[]
) => {
  return (
    <EnhancedFedExPDF
      collections={collections}
      devolutions={devolutions}
      charges={charges}
      subsidiaryName={subsidiaryName}
    />
  );
};*/