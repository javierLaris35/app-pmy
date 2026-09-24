import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import type { ManualCountReport } from "@/lib/types/manual-count";
import { CAUSE_LABEL, VERDICT_LABEL, outcomeLabel } from "./manual-count-labels";

/** Exporta el resultado del "Conteo manual vs sistema" a Excel (una fila por guía). */
export async function exportManualCountToExcel(report: ManualCountReport): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Conteo manual");
  ws.columns = [
    { header: "Guía", key: "tn", width: 18 },
    { header: "Contó", key: "manual", width: 10 },
    { header: "FedEx dice", key: "fedex", width: 12 },
    { header: "Sistema", key: "system", width: 12 },
    { header: "Cobrado", key: "charged", width: 12 },
    { header: "Debía cobrar", key: "expected", width: 13 },
    { header: "Resultado", key: "verdict", width: 18 },
    { header: "Causa", key: "cause", width: 24 },
    { header: "Explicación", key: "explanation", width: 70 },
  ];
  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFF" } };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "3d2b1f" } };

  for (const r of report.rows) {
    ws.addRow({
      tn: r.trackingNumber,
      manual: r.manual ? outcomeLabel(r.manual) : "—",
      fedex: outcomeLabel(r.fedexSays),
      system: outcomeLabel(r.systemSays),
      charged: r.charged.map(outcomeLabel).join(" + ") || "—",
      expected: r.expected ? outcomeLabel(r.expected) : "No cobra",
      verdict: VERDICT_LABEL[r.verdict],
      cause: r.cause ? CAUSE_LABEL[r.cause] : "",
      explanation: r.explanation,
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, `Conteo_manual_${report.subsidiaryName ?? report.subsidiaryId}_${report.day}.xlsx`);
}
