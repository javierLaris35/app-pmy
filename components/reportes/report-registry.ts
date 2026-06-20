import { PackageX, AlertTriangle, Boxes, type LucideIcon } from "lucide-react";
import { fmtDate } from "@/lib/audit-format";
import {
  fetchPendientesJson, fetchPendientesExcel,
  fetchSin67Json, fetchSin67Excel,
  fetchInventario67Json, fetchInventario67Excel,
} from "@/lib/services/reportes/reportes";

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
  /** Trae las filas + un resumen opcional (chips). */
  run: (subsidiaryId: string) => Promise<{ rows: any[]; summary?: Record<string, any> }>;
  exportExcel: (subsidiaryId: string) => Promise<Blob>;
  fileName: (subsidiaryId: string) => string;
  emptyHint?: string;
}

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
      { id: "status", label: "Estatus", accessor: (r) => r.status, cell: (v) => prettyStatus(v) },
      { id: "recipientName", label: "Destinatario", accessor: (r) => r.recipientName },
      { id: "recipientAddress", label: "Dirección", accessor: (r) => r.recipientAddress },
      { id: "recipientZip", label: "CP", accessor: (r) => r.recipientZip },
      { id: "commitDateTime", label: "Compromiso", accessor: (r) => r.commitDateTime, cell: (v) => fmtDate(v) },
    ],
    filters: [{ columnId: "status", title: "Estatus" }],
    run: async (subsidiaryId) => {
      const { count, shipments } = await fetchPendientesJson(subsidiaryId);
      return { rows: shipments || [], summary: { Total: count ?? (shipments?.length || 0) } };
    },
    exportExcel: (subsidiaryId) => fetchPendientesExcel(subsidiaryId),
    fileName: (s) => `pendientes_${s}_${ts()}.xlsx`,
    emptyHint: "No hay envíos pendientes para esta sucursal.",
  },
  {
    id: "sin67",
    title: "Sin código 67",
    description: "Guías cuyo historial no tiene el evento 67 (no recibidas).",
    icon: AlertTriangle,
    accent: "bg-rose-100 text-rose-600",
    columns: [
      { id: "trackingNumber", label: "Guía", accessor: (r) => r.trackingNumber, mono: true },
      { id: "status", label: "Estatus", accessor: (r) => r.currentStatus ?? r.status, cell: (v) => prettyStatus(v) },
      { id: "recipientName", label: "Destinatario", accessor: (r) => r.recipientName },
      { id: "recipientCity", label: "Ciudad", accessor: (r) => r.recipientCity },
      { id: "lastStatusDate", label: "Últ. evento", accessor: (r) => r.lastStatusDate, cell: (v) => fmtDate(v) },
      { id: "comment", label: "Comentario", accessor: (r) => r.comment },
    ],
    filters: [{ columnId: "status", title: "Estatus" }],
    run: async (subsidiaryId) => {
      const { summary, details } = await fetchSin67Json(subsidiaryId);
      return { rows: details || [], summary: summary ?? { Total: details?.length || 0 } };
    },
    exportExcel: (subsidiaryId) => fetchSin67Excel(subsidiaryId),
    fileName: (s) => `sin_67_${s}_${ts()}.xlsx`,
    emptyHint: "No hay guías sin 67 para esta sucursal.",
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
