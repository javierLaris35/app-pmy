import type { ManualIncomePreview } from "@/lib/services/consolidador";
import type { ManualKind } from "@/lib/types/consolidador";
import { formatCurrency } from "@/lib/utils";

const COLUMN_LABEL: Record<ManualIncomePreview["column"], string> = {
  fedex: "Ingreso FedEx",
  dhl: "Ingreso DHL",
  collections: "Recolecciones",
  otros: "Otros",
};

function carrierName(shipmentType: string): string {
  return shipmentType === "dhl" ? "DHL" : "FedEx";
}

function dayLabel(date: string): string {
  if (!date) return "";
  return new Date(`${date}T12:00:00`).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "short" });
}

/**
 * Texto llano de "Así quedará" para el alta manual: qué se guarda y dónde se va a ver.
 * `countable=false` = se registra pero la regla de cobro de la sucursal no lo cobra.
 */
export function describeManualIncome(
  kind: ManualKind,
  preview: ManualIncomePreview,
  opts: { cost: number; date: string; hasTracking: boolean },
): { text: string; where: string; countable: boolean } {
  const carrier = carrierName(preview.shipmentType);
  const amount = Number.isFinite(opts.cost) ? ` de ${formatCurrency(opts.cost)}` : "";
  const day = opts.date ? ` el ${dayLabel(opts.date)}` : "";
  const linked = preview.shipment ? ", ligado a la guía" : "";

  let what: string;
  if (preview.sourceType === "collection") what = `Recolección${amount}${day}`;
  else if (preview.sourceType === "manual") what = `Otro ingreso de la sucursal${amount}${day}`;
  else if (kind === "dex07") what = `Ingreso ${carrier} ${carrier === "DHL" ? "no entregado (NE)" : "DEX07 (rechazo)"}${amount}${day}${linked}`;
  else if (kind === "dex") what = `Ingreso ${carrier} ${carrier === "DHL" ? "no entregado (NE)" : "DEX08 (3ª visita)"}${amount}${day}${linked}`;
  else what = `Ingreso ${carrier} entregado${amount}${day}${linked}`;

  const where = preview.countable
    ? `Suma en Ingresos (columna ${COLUMN_LABEL[preview.column]}), Dashboard y Estado de Resultados.`
    : "Se registra, pero la regla de cobro de esta sucursal no lo cobra: no sumará al total.";

  return { text: `${what}.`, where, countable: preview.countable };
}
