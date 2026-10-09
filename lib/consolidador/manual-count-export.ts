import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import type { ManualCountReport } from "@/lib/types/manual-count";
import { CAUSE_LABEL, COLLECTION_CAUSE_LABEL, VERDICT_LABEL, outcomeLabel } from "./manual-count-labels";

/** Exporta el resultado del "Conteo manual vs sistema" a Excel (una fila por guía). */
export async function exportManualCountToExcel(report: ManualCountReport): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Conteo manual");
  ws.columns = [
    { header: "Día", key: "day", width: 12 },
    { header: "Guía", key: "tn", width: 18 },
    { header: "Contó", key: "manual", width: 10 },
    { header: "FedEx dice", key: "fedex", width: 34 },
    { header: "Sistema", key: "system", width: 26 },
    { header: "Cobrado", key: "charged", width: 12 },
    { header: "Debía cobrar", key: "expected", width: 13 },
    { header: "Entregado el", key: "deliveredDay", width: 13 },
    { header: "Resultado", key: "verdict", width: 18 },
    { header: "Causa", key: "cause", width: 24 },
    { header: "Explicación", key: "explanation", width: 70 },
  ];
  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFF" } };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "3d2b1f" } };

  for (const r of report.rows) {
    ws.addRow({
      day: r.day ?? report.day,
      tn: r.trackingNumber,
      manual: r.manual ? outcomeLabel(r.manual) : "—",
      fedex: r.fedexLabel,
      system: r.systemLabel,
      charged: r.charged.map(outcomeLabel).join(" + ") || "—",
      expected: r.expected ? outcomeLabel(r.expected) : "No cobra",
      deliveredDay: r.deliveredDay ?? "",
      verdict: VERDICT_LABEL[r.verdict],
      cause: r.cause ? CAUSE_LABEL[r.cause] : "",
      explanation: r.explanation,
    });
  }

  ws.autoFilter = { from: "A1", to: "K1" };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  // Recolecciones (solo si se pegaron).
  if (report.collections) {
    const wr = wb.addWorksheet("Recolecciones");
    wr.columns = [
      { header: "Día", key: "day", width: 12 },
      { header: "Guía", key: "tn", width: 18 },
      { header: "Contó", key: "counted", width: 8 },
      { header: "FedEx dice", key: "fedex", width: 26 },
      { header: "Sistema", key: "system", width: 26 },
      { header: "Cobrado", key: "charged", width: 22 },
      { header: "Resultado", key: "verdict", width: 18 },
      { header: "Causa", key: "cause", width: 28 },
      { header: "Explicación", key: "explanation", width: 70 },
    ];
    wr.getRow(1).font = { bold: true, color: { argb: "FFFFFF" } };
    wr.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "3d2b1f" } };
    for (const r of report.collections.rows) {
      wr.addRow({
        day: r.day,
        tn: r.trackingNumber,
        counted: r.counted ? "Sí" : "No",
        fedex: r.fedexLabel,
        system: r.systemLabel,
        charged: r.chargedLabel,
        verdict: VERDICT_LABEL[r.verdict],
        cause: r.cause ? COLLECTION_CAUSE_LABEL[r.cause] : "",
        explanation: r.explanation,
      });
    }
    wr.autoFilter = { from: "A1", to: "I1" };
    wr.views = [{ state: "frozen", ySplit: 1 }];
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, `Conteo_manual_${report.subsidiaryName ?? report.subsidiaryId}_${report.scope === "week" ? `semana_${report.from}` : report.day}.xlsx`);
}
