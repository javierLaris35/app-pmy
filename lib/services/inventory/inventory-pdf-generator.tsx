// components/pdf/InventoryPDFReport.tsx
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
import { InventoryReport } from "@/lib/types";

Font.register({ family: "Helvetica", src: undefined });

const styles = StyleSheet.create({
  page: { padding: 20, fontSize: 10, fontFamily: "Helvetica", flexDirection: "column" },
  header: { flexDirection: "row", marginBottom: 1, width: "100%" },
  logo: { width: 120, height: 120 },
  leftHeader: { flex: 1, alignItems: "flex-start", textAlign: "left" },
  rightHeader: { alignItems: "flex-end", textAlign: "right" },
  title: { fontSize: 14, fontWeight: "bold", marginBottom: 2 },
  subTitle: { fontSize: 11, fontWeight: "bold", marginTop: 2 },
  row: { fontSize: 10, flexDirection: "row", marginBottom: 2 },
  cell: { fontWeight: 700, paddingRight: 4, minWidth: 40 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#9d5137",
    padding: 4,
    fontSize: 9,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1px solid #ccc",
    fontSize: 9,
    padding: 4,
  },
  trackingSection: { marginTop: 12, borderTop: "1px solid #ccc" },
  trackingRow: {
    fontSize: 9,
    padding: 4,
    borderBottom: "1px solid #ccc",
    flexDirection: "row",
  },
});

export const InventoryPDFReport = ({ report }: { report: InventoryReport }) => {
  const timeZone = "America/Hermosillo";
  const createdDate = toZonedTime(new Date(report.createdAt), timeZone);
  const formattedDate = format(createdDate, "yyyy-MM-dd", { timeZone });

  const truncate = (text: string, maxLength: number): string =>
    !text ? "" : text.length > maxLength ? text.slice(0, maxLength - 3) + "..." : text;

  return (
    <Document>
      <Page size="LETTER" style={styles.page} orientation="landscape">
        <View style={styles.header}>
          <View style={styles.leftHeader}>
            <Text style={styles.title}>📦 Inventario</Text>
            <View style={styles.row}>
              <Text style={styles.cell}>Sucursal:</Text>
              <Text>{report.subsidiary.name}</Text>
            </View>
            {report.vehicle && (
              <View style={styles.row}>
                <Text style={styles.cell}>Unidad:</Text>
                <Text>{report.vehicle.name}</Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={styles.cell}>Paquetes:</Text>
              <Text>{report.packages.length}</Text>
            </View>
            <Text>Fecha: {formattedDate}</Text>
          </View>
          <View style={styles.rightHeader}>
            <Image src="/logo-no-fondo.png" style={styles.logo} />
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={{ width: 25 }}>[#]</Text>
          <Text style={{ width: 63 }}>Guía</Text>
          <Text style={{ width: 145 }}>Nombre</Text>
          <Text style={{ width: 155 }}>Dirección</Text>
          <Text style={{ width: 65 }}>Cobro</Text>
          <Text style={{ width: 55 }}>Fecha</Text>
          <Text style={{ width: 45 }}>Hora</Text>
          <Text style={{ width: 55 }}>Celular</Text>
        </View>

        {report.packages.map((pkg, i) => {
          const icons = `${pkg.isCharge ? "[C]" : ""}${pkg.payment ? "[$]" : ""}${pkg.isHighValue ? "[H]" : ""}`;
          const zoned = toZonedTime(new Date(pkg.commitDateTime), timeZone);
          const commitDate = format(zoned, "yyyy-MM-dd", { timeZone });
          const commitTime = format(zoned, "HH:mm:ss", { timeZone });

          return (
            <View style={styles.tableRow} key={i}>
              <Text style={{ width: 25 }}>{icons} {i + 1}</Text>
              <Text style={{ width: 63 }}>{pkg.trackingNumber}</Text>
              <Text style={{ width: 145 }}>{truncate(pkg.recipientName, 26)}</Text>
              <Text style={{ width: 155 }}>{truncate(pkg.recipientAddress, 28)}</Text>
              <Text style={{ width: 65 }}>
                {pkg.payment ? `${pkg.payment.type} $${pkg.payment.amount}` : ""}
              </Text>
              <Text style={{ width: 55 }}>{commitDate}</Text>
              <Text style={{ width: 45 }}>{commitTime}</Text>
              <Text style={{ width: 55 }}>{pkg.recipientPhone}</Text>
            </View>
          );
        })}

        {report.missingTrackings.length > 0 && (
          <View style={styles.trackingSection}>
            <Text style={styles.subTitle}>* Guías Faltantes</Text>
            {report.missingTrackings.map((tracking, i) => (
              <View style={styles.trackingRow} key={`missing-${i}`}>
                <Text>{tracking}</Text>
              </View>
            ))}
          </View>
        )}

        {report.unScannedTrackings.length > 0 && (
          <View style={styles.trackingSection}>
            <Text style={styles.subTitle}>** Guías Sin Escaneo</Text>
            {report.unScannedTrackings.map((tracking, i) => (
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
