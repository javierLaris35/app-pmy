import { PackageX, PackageCheck, Boxes, type LucideIcon } from "lucide-react";
import { fmtDate, fmtDateTime } from "@/lib/audit-format";
import {
  fetchPendientesJson, fetchPendientesExcel,
  fetchPendientesFedexStatus, updatePendingOne,
  fetchReceived67Json, fetchReceived67Excel,
  fetchInventario67Json, fetchInventario67Excel,
} from "@/lib/services/reportes/reportes";

export interface ReportRange { start?: string; end?: string }

/**
 * Columna de reporte (se convierte a ColumnDef de TanStack en el runner).
 * `id` se usa para orden/filtro/búsqueda; si coincide con un campo "buscable"
 * (trackingNumber, recipientName, recipientAddress, recipientCity, recipientZip)
 * entra en la búsqueda global del DataTable.
 */
export interface ReportColumn {
  id: string;
  label: string;
  accessor: (row: any) => any;
  cell?: (value: any, row: any) => React.ReactNode;
  mono?: boolean;
}

export interface ReportFilter {
  columnId: string;
  title: string;
}

export interface ReportDef {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  columns: ReportColumn[];
  /** Filtros facetados (las opciones se calculan de los datos cargados). */
  filters?: ReportFilter[];
  /** Si true, el runner muestra controles de rango de fechas (start/end). */
  dateRange?: boolean;
  /**
   * Capacidad opcional: comparar el estatus guardado contra el estatus actual de
   * FedEx. Habilita el botón "Consultar FedEx" (lote) en el runner; el resultado
   * se inyecta por fila como `__fedexStatus`/`__fedexRaw`.
   */
  compareFedex?: {
    fetch: (rows: any[]) => Promise<
      Record<string, { fedexStatus: string; fedexRaw?: string; derivedCode?: string; exceptionCode?: string }>
    >;
  };
  /**
   * Capacidad opcional: actualizar UNA fila (aparece un botón cuando el estatus
   * de FedEx difiere del guardado). Devuelve el nuevo estatus.
   */
  updateRow?: (subsidiaryId: string, row: any) => Promise<{ status: string | null }>;
  /** Trae las filas + un resumen opcional (chips). */
  run: (subsidiaryId: string, range?: ReportRange) => Promise<{ rows: any[]; summary?: Record<string, any> }>;
  exportExcel: (subsidiaryId: string, range?: ReportRange) => Promise<Blob>;
  fileName: (subsidiaryId: string) => string;
  emptyHint?: string;
}

/** Etiqueta de tipo de paquete a partir de shipmentType. */
const tipoLabel = (t?: string) => {
  const v = String(t || "").toLowerCase();
  if (v === "fedex") return "FedEx";
  if (v === "dhl") return "DHL";
  return v ? v.toUpperCase() : "Otro";
};
const isFedexRow = (r: any) => String(r?.shipmentType || "").toLowerCase() === "fedex";

const prettyStatus = (s?: string) =>
  !s ? "—" : s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

const ts = () => new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

export const REPORTS: ReportDef[] = [
  {
    id: "pendientes",
    title: "Pendientes",
    description: "Envíos sin entregar (la copia más reciente por guía).",
    icon: PackageX,
    accent: "bg-amber-100 text-amber-600",
    columns: [
      { id: "trackingNumber", label: "Guía", accessor: (r) => r.trackingNumber, mono: true },
      { id: "tipo", label: "Tipo", accessor: (r) => tipoLabel(r.shipmentType) },
      { id: "carga", label: "Carga", accessor: (r) => (r.isCharge ? "Carga" : "Normal") },
      { id: "status", label: "Estatus actual", accessor: (r) => r.status, cell: (v) => prettyStatus(v) },
      { id: "recipientName", label: "Destinatario", accessor: (r) => r.recipientName },
      { id: "recipientAddress", label: "Dirección", accessor: (r) => r.recipientAddress },
      { id: "recipientZip", label: "CP", accessor: (r) => r.recipientZip },
      { id: "commitDateTime", label: "Compromiso", accessor: (r) => r.commitDateTime, cell: (v) => fmtDate(v) },
    ],
    filters: [
      { columnId: "status", title: "Estatus" },
      { columnId: "tipo", title: "Tipo" },
      { columnId: "carga", title: "Carga" },
    ],
    compareFedex: {
      // Solo consultamos guías FedEx (DHL/otros no tienen estatus en FedEx).
      fetch: (rows) =>
        fetchPendientesFedexStatus(
          rows.filter(isFedexRow).map((r) => ({ trackingNumber: r.trackingNumber, fedexUniqueId: r.fedexUniqueId })),
        ),
    },
    updateRow: (subsidiaryId, row) => updatePendingOne(subsidiaryId, row.trackingNumber, !!row.isCharge),
    run: async (subsidiaryId) => {
      const { count, shipments } = await fetchPendientesJson(subsidiaryId);
      return { rows: shipments || [], summary: { Total: count ?? (shipments?.length || 0) } };
    },
    exportExcel: (subsidiaryId) => fetchPendientesExcel(subsidiaryId),
    fileName: (s) => `pendientes_${s}_${ts()}.xlsx`,
    emptyHint: "No hay envíos pendientes para esta sucursal.",
  },
  {
    id: "recibidas67",
    title: "Recibidas de FedEx (67)",
    description: "Guías con evento 67 (llegada a estación) en el rango. Ordena por 'Días desde 67' para ver las atoradas.",
    icon: PackageCheck,
    accent: "bg-rose-100 text-rose-600",
    dateRange: true,
    columns: [
      { id: "trackingNumber", label: "Guía", accessor: (r) => r.trackingNumber, mono: true },
      { id: "fecha67", label: "Fecha 67", accessor: (r) => r.fecha67, cell: (v) => fmtDateTime(v) },
      { id: "diasDesde67", label: "Días desde 67", accessor: (r) => Number(r.diasDesde67) },
      { id: "status", label: "Estatus", accessor: (r) => r.status, cell: (v) => prettyStatus(v) },
      { id: "recipientName", label: "Destinatario", accessor: (r) => r.recipientName },
      { id: "recipientCity", label: "Ciudad", accessor: (r) => r.recipientCity },
      { id: "recipientZip", label: "CP", accessor: (r) => r.recipientZip },
    ],
    filters: [{ columnId: "status", title: "Estatus" }],
    run: async (subsidiaryId, range) => {
      const { summary, details } = await fetchReceived67Json(subsidiaryId, range?.start, range?.end);
      return { rows: details || [], summary: summary ?? { Total: details?.length || 0 } };
    },
    exportExcel: (subsidiaryId, range) => fetchReceived67Excel(subsidiaryId, range?.start, range?.end),
    fileName: (s) => `recibidas_67_${s}_${ts()}.xlsx`,
    emptyHint: "No hay guías con 67 en el rango para esta sucursal.",
  },
  {
    id: "inventario67",
    title: "Último inventario sin 67",
    description: "Paquetes del último inventario que aún no tienen el 67.",
    icon: Boxes,
    accent: "bg-indigo-100 text-indigo-600",
    columns: [
      { id: "trackingNumber", label: "Guía", accessor: (r) => r.trackingNumber, mono: true },
      { id: "status", label: "Estatus", accessor: (r) => r.currentStatus ?? r.status, cell: (v) => prettyStatus(v) },
      { id: "recipientName", label: "Destinatario", accessor: (r) => r.recipientName },
      { id: "comment", label: "Comentario", accessor: (r) => r.comment },
    ],
    filters: [{ columnId: "status", title: "Estatus" }],
    run: async (subsidiaryId) => {
      const { summary, details } = await fetchInventario67Json(subsidiaryId);
      return { rows: details || [], summary };
    },
    exportExcel: (subsidiaryId) => fetchInventario67Excel(subsidiaryId),
    fileName: (s) => `ultimo_inventario_sin_67_${s}_${ts()}.xlsx`,
    emptyHint: "No hay inventario reciente o todo tiene 67.",
  },
];
