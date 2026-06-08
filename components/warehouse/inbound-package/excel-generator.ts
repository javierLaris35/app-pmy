import ExcelJS from "exceljs";

export const generateWarehouseExcel = async (
  session: any,
  sortedPackages: any[],
  shouldDownload: boolean = true
): Promise<Buffer | Blob | void> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Recepción de Envíos");

  worksheet.columns = [
    { header: "Guía / Código Pieza", key: "trackingNumber", width: 30 },
    { header: "Carrier / Clasificación", key: "carrier", width: 18 },
    { header: "ID Único DHL", key: "dhlUniqueId", width: 20 },
    { header: "Sucursal Destino", key: "subsidiary", width: 25 },
    { header: "Código Postal", key: "zipCode", width: 15 },
    { header: "Destinatario", key: "recipientName", width: 25 },
    { header: "Dirección", key: "recipientAddress", width: 35 },
    { header: "Fecha Vencimiento", key: "commitDateTime", width: 18 },
    { header: "Alertas / Cobros", key: "alerts", width: 25 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { name: "Arial", bold: true, color: { argb: "FFFFFF" }, size: 10 };
  headerRow.height = 25;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "4D148C" },
    };
    cell.alignment = { vertical: "middle", horizontal: "left" };
  });

  const isToday = (date: Date) => new Date().toDateString() === new Date(date).toDateString();

  sortedPackages.forEach((pkg) => {
    const isDHL = String(pkg.shipmentType || "").toLowerCase() === "dhl";

    const alertsArray: string[] = [];
    if (isToday(new Date(pkg.commitDateTime))) alertsArray.push("VENCE HOY");
    if (pkg.isHighValue) alertsArray.push("ALTO VALOR");
    if (pkg.isCharge) alertsArray.push("CARGA");
    if (pkg.hasPayment) alertsArray.push(`COBRO: $${Number(pkg.paymentAmount).toLocaleString()}`);

    const formattedExpiration = pkg.commitDateTime
      ? new Date(pkg.commitDateTime).toLocaleDateString("es-MX")
      : "N/A";

    const mainRow = worksheet.addRow({
      trackingNumber: pkg.trackingNumber,
      carrier: String(pkg.shipmentType || "").toUpperCase(),
      dhlUniqueId: isDHL ? String(pkg.dhlUniqueId || "N/A") : "",
      subsidiary: pkg.subsidiary?.name || "S/N",
      zipCode: pkg.recipientZip,
      recipientName: pkg.recipientName || "Sin Nombre",
      recipientAddress: pkg.recipientAddress || "Dirección no disponible",
      commitDateTime: formattedExpiration,
      alerts: alertsArray.join(" | "),
    });

    mainRow.getCell("trackingNumber").font = { bold: true, name: "Arial", size: 10 };
    mainRow.height = 20;

    (pkg.existingPieces || []).forEach((piece: string) => {
      const subRow = worksheet.addRow({
        trackingNumber: `   - ${piece}`,
        carrier: "PIEZA (REG)",
        dhlUniqueId: "",
        subsidiary: pkg.subsidiary?.name || "S/N",
        zipCode: pkg.recipientZip,
        recipientName: "",
        recipientAddress: "",
        commitDateTime: "",
        alerts: "",
      });
      applySubRowStyles(subRow);
    });

    (pkg.pieces || []).forEach((piece: string) => {
      const subRow = worksheet.addRow({
        trackingNumber: `   - ${piece}`,
        carrier: "PIEZA (NUEVA)",
        dhlUniqueId: "",
        subsidiary: pkg.subsidiary?.name || "S/N",
        zipCode: pkg.recipientZip,
        recipientName: "",
        recipientAddress: "",
        commitDateTime: "",
        alerts: "",
      });
      applySubRowStyles(subRow, true);
    });
  });

  function applySubRowStyles(row: ExcelJS.Row, isNew = false) {
    row.height = 18;
    row.eachCell((cell, colNumber) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "F8FAFC" },
      };
      cell.font = {
        name: "Arial",
        size: 9,
        color: isNew && colNumber === 2 ? { argb: "166534" } : { argb: "475569" },
        bold: isNew && colNumber === 2,
      };
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();

  if (shouldDownload) {
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `Recepcion_Bodega_${session.id.slice(0, 8)}.xlsx`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  } else {
    return buffer as unknown as Buffer;
  }
};