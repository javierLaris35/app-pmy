/**
 * Datos de los PDF de Compras (orden de compra, solicitud de cotización y comparativo), generados en el
 * navegador con @react-pdf/renderer. Espejo de los mapeos que antes hacía pmy-api con Playwright.
 */
import { amountToWordsMXN } from "./amount-to-words";
import { ivaOn, lineTaxes, MoneyItem, pctLabel, round2, totals } from "./maintenance-money";
import {
  AVAILABILITY_LABEL, Availability, Comparison, MaintenanceRequest, NeedView, PurchaseOrder, REQUEST_TYPE_LABEL, SupplierContact,
} from "./types/maintenance";

const money = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(n || 0));
const qty = (n: number) => (Number.isInteger(Number(n)) ? String(Number(n)) : Number(n).toFixed(2));
export const longDate = (d?: Date | string | null) =>
  d ? new Date(d).toLocaleDateString("es-MX", { timeZone: "America/Hermosillo", day: "2-digit", month: "long", year: "numeric" }) : "";
const person = (p?: { name?: string; lastName?: string } | null) => [p?.name, p?.lastName].filter(Boolean).join(" ");
/** En PDF la fuente estándar no trae "★": la calidad va como "4/5". */
const stars = (n?: number | null) => (n ? `${n}/5` : "");

/** "IVA", "IVA + IEPS 8%", "Sin impuestos". */
export const taxLabel = (i: MoneyItem) =>
  [ivaOn(i) && "IVA", i.iepsEnabled && `IEPS ${pctLabel(Number(i.iepsRate ?? 0))}`].filter(Boolean).join(" + ") || "Sin impuestos";

const vehicleOf = (v?: { code?: string | null; name?: string | null; plateNumber?: string; brand?: string; model?: string; kms?: number | null } | null) => ({
  label: v ? [v.code, v.name].filter(Boolean).join(" · ") || v.plateNumber || "" : "",
  plates: v?.plateNumber ?? "",
  brandModel: [v?.brand, v?.model].filter(Boolean).join(" "),
  kms: v?.kms ? `${Number(v.kms).toLocaleString("es-MX")} km` : "",
});

// ---------------- Orden de compra ----------------

export interface PoPdfData {
  folio: string;
  date: string;
  isDraft: boolean;
  subsidiaryName: string;
  requestFolio: string;
  requestType: string;
  supplier: { name: string; rfc: string; address: string };
  contact: { name: string; email: string; phone: string };
  vehicle: ReturnType<typeof vehicleOf>;
  rows: Array<{ index: number; quantity: string; description: string; unitPrice: string; taxLabel: string; amount: string }>;
  subtotal: string;
  ieps: string;
  hasIeps: boolean;
  tax: string;
  total: string;
  totalInWords: string;
  notes: string;
  authorizedBy: string;
  authorizedAt: string;
}

/** Solo las partidas APROBADAS (lo que se le manda al proveedor). */
export function mapPurchaseOrderPdf(po: PurchaseOrder): PoPdfData {
  const approved = (po.items ?? []).filter((i) => i.approved !== false);
  const m: MoneyItem[] = approved.map((i) => ({
    quantity: Number(i.quantity), unitPrice: Number(i.unitPrice), taxRate: Number(i.taxRate ?? 0.16),
    ivaEnabled: i.ivaEnabled ?? null, iepsEnabled: i.iepsEnabled ?? null, iepsRate: Number(i.iepsRate ?? 0),
  }));
  const t = totals(m);
  return {
    folio: po.folio,
    date: longDate(po.authorizedAt ?? po.createdAt),
    isDraft: !["autorizada", "enviada", "completada"].includes(po.status),
    subsidiaryName: po.subsidiary?.name ?? "",
    requestFolio: po.request?.folio ?? "",
    requestType: po.request?.type ? REQUEST_TYPE_LABEL[po.request.type] : "",
    supplier: { name: po.supplier?.name ?? "", rfc: po.supplier?.rfc ?? "", address: po.supplier?.address ?? "" },
    contact: { name: po.contact?.name ?? "", email: po.contact?.email ?? "", phone: po.contact?.whatsapp || po.contact?.phone || "" },
    vehicle: vehicleOf(po.vehicle),
    rows: approved.map((i, idx) => ({
      index: idx + 1,
      quantity: qty(Number(i.quantity)),
      description: i.description,
      unitPrice: money(Number(i.unitPrice)),
      taxLabel: taxLabel(m[idx]),
      amount: money(lineTaxes(m[idx]).amount),
    })),
    subtotal: money(t.subtotal),
    ieps: money(t.ieps),
    hasIeps: t.ieps > 0,
    tax: money(t.tax),
    total: money(t.total),
    totalInWords: amountToWordsMXN(t.total),
    notes: po.notes?.trim() ?? "",
    authorizedBy: person(po.authorizedBy),
    authorizedAt: po.authorizedAt ? longDate(po.authorizedAt) : "",
  };
}

// ---------------- Solicitud de cotización ----------------

export interface RfqPdfData {
  folio: string;
  date: string;
  subsidiaryName: string;
  supplierName: string;
  contact: { name: string; email: string; phone: string };
  vehicle: ReturnType<typeof vehicleOf>;
  requestType: string;
  description: string;
  services: string[];
  rows: Array<{ index: number; quantity: string; unit: string; description: string; detail: string }>;
  requestedBy: string;
  replyTo: string;
  notes: string;
}

/**
 * Lo que se le pide cotizar a un proveedor (sin precios): renglones de la solicitud + "Lo que se necesita".
 * Sin proveedor (vista previa general) va sin destinatario.
 */
export function mapRfqPdf(
  r: MaintenanceRequest,
  needs: NeedView[],
  supplier: { name: string } | null,
  contact: SupplierContact | null,
  sender: { name: string; email?: string | null },
  notes?: string | null,
): RfqPdfData {
  const items = (r.items ?? []).map((i) => ({
    quantity: qty(Number(i.quantity)),
    unit: i.unit?.abbreviation || i.unit?.name || "",
    description: i.description,
    detail: [i.product?.brand, i.product?.partNumber ? `No. parte ${i.product.partNumber}` : null, i.notes].filter(Boolean).join(" · "),
  }));
  const fromNeeds = needs.map((n) => ({
    quantity: qty(n.quantity),
    unit: n.unit?.abbreviation || n.unit?.name || "",
    description: n.category.name,
    detail: n.product ? `Preferido: ${[n.product.name, n.product.brand].filter(Boolean).join(" · ")}` : "",
  }));
  return {
    folio: r.folio,
    date: longDate(new Date()),
    subsidiaryName: r.subsidiary?.name ?? "",
    supplierName: supplier?.name ?? "",
    contact: { name: contact?.name ?? "", email: contact?.email ?? "", phone: contact?.whatsapp || contact?.phone || "" },
    vehicle: vehicleOf(r.vehicle),
    requestType: REQUEST_TYPE_LABEL[r.type] ?? "",
    description: r.description ?? "",
    services: (r.services ?? []).map((s) => s.name),
    rows: [...items, ...fromNeeds].map((x, idx) => ({ index: idx + 1, ...x })),
    requestedBy: sender.name,
    replyTo: sender.email ?? "",
    notes: notes?.trim() ?? "",
  };
}

// ---------------- Comparativo ----------------

export interface ComparisonPdfData {
  folio: string;
  date: string;
  subsidiaryName: string;
  requestType: string;
  vehicleLabel: string;
  description: string;
  suppliers: Array<{ name: string; total: string; covered: string }>;
  rows: Array<{
    index: number;
    description: string;
    quantity: string;
    unit: string;
    cells: Array<{ has: boolean; unitPrice?: string; total?: string; availability?: string; noStock?: boolean; quality?: string; best?: boolean; selected?: boolean }>;
  }>;
  selection: Array<{ name: string; count: number; total: string }>;
  selectionCount: number;
  selectionTotal: string;
  preparedBy: string;
}

export function mapComparisonPdf(r: MaintenanceRequest, c: Comparison, preparedBy: string): ComparisonPdfData {
  const selection = new Map<string, { name: string; count: number; total: number }>();
  const rows = c.rows.map((row, idx) => ({
    index: idx + 1,
    description: row.description,
    quantity: qty(row.quantity),
    unit: c.units?.[row.requestItemId] ?? "",
    cells: c.quotes.map((q) => {
      const cell = row.cells[q.id];
      if (!cell) return { has: false };
      const selected = row.selectedQuoteItemId === cell.quoteItemId;
      if (selected) {
        const s = selection.get(q.id) ?? { name: q.supplierName, count: 0, total: 0 };
        s.count += 1;
        s.total = round2(s.total + cell.total);
        selection.set(q.id, s);
      }
      const avail = AVAILABILITY_LABEL[cell.availability as Availability] ?? "";
      return {
        has: true,
        unitPrice: money(cell.unitPrice),
        total: money(cell.total),
        availability: cell.availability === "sobre_pedido" && cell.leadTimeDays ? `${avail} (${cell.leadTimeDays} d)` : avail,
        noStock: cell.availability === "no",
        quality: stars(cell.quality),
        best: row.bestQuoteItemId === cell.quoteItemId,
        selected,
      };
    }),
  }));
  const sel = [...selection.values()];
  return {
    folio: r.folio,
    date: longDate(new Date()),
    subsidiaryName: r.subsidiary?.name ?? "",
    requestType: REQUEST_TYPE_LABEL[r.type] ?? "",
    vehicleLabel: vehicleOf(r.vehicle).label,
    description: r.description ?? "",
    suppliers: c.quotes.map((q) => ({ name: q.supplierName, total: money(q.total), covered: `${q.covered} de ${c.rows.length}` })),
    rows,
    selection: sel.map((s) => ({ name: s.name, count: s.count, total: money(s.total) })),
    selectionCount: sel.reduce((a, s) => a + s.count, 0),
    selectionTotal: money(round2(sel.reduce((a, s) => a + s.total, 0))),
    preparedBy,
  };
}
