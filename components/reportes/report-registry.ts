import { PackageX, PackageCheck, Boxes, EyeOff, type LucideIcon } from "lucide-react";
import { fmtDate, fmtDateTime } from "@/lib/audit-format";
import {
  fetchPendientesJson, fetchPendientesExcel,
  fetchPendientesFedexStatus, updatePendingOne,
  fetchReceived67Json, fetchReceived67Excel,
  fetchInventario67Json, fetchInventario67Excel,
  fetchSin67Json, fetchSin67Excel,
  fetchVisibility67FedexCheck,
} from "@/lib/services/reportes/reportes";
import { buildVisibility67Excel } from "@/lib/services/reportes/visibilidad67-excel";

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
  /**
   * Capacidad opcional: confirmar con FedEx la VISIBILIDAD 67 (días con/sin 67 y
   * días faltantes por guía). Habilita el botón "Confirmar 67 con FedEx" + el
   * switch "Incluir domingos" en el runner; el resultado se inyecta por fila.
   */
  fedex67Check?: {
    fetch: (
      rows: any[],
      includeSundays: boolean,
    ) => Promise<Record<string, {
      daysWith67: number; daysWithout67: number; missingDates: string[]; windowStart: string | null; windowEnd: string | null; delivered: boolean;
      events: { date: string; description: string; exceptionCode?: string }[];
      lastMovement: { date: string; description: string } | null;
      fedexStatus: string; fedexRaw?: string; derivedCode?: string; exceptionCode?: string;
    }>>;
  };
  /**
   * Exportación a Excel en el CLIENTE a partir de las filas actuales (incluye las
   * columnas inyectadas bajo demanda, p.ej. la confirmación de FedEx). Si se define,
   * el runner la usa en vez del Excel del backend.
   */
  exportClient?: (rows: any[]) => Promise<Blob>;
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
    id: "visibilidad67",
    title: "Visibilidad 67 (sin 67 de hoy)",
    description: "Paquetes activos (en bodega / pendientes) y sus días sin código 67. Regla FedEx: cada paquete debe tener un 67 cada día. Ordena por 'Días sin 67' para priorizar.",
    icon: EyeOff,
    accent: "bg-orange-100 text-orange-600",
    columns: [
      { id: "trackingNumber", label: "Guía", accessor: (r) => r.trackingNumber, mono: true },
      { id: "tipo", label: "Tipo", accessor: (r) => tipoLabel(r.shipmentType) },
      { id: "status", label: "Estatus", accessor: (r) => r.status, cell: (v) => prettyStatus(v) },
      { id: "createdAt", label: "Alta en sistema", accessor: (r) => r.createdAt, cell: (v) => fmtDate(v) },
      {
        id: "diasSin67",
        label: "Días sin 67",
        accessor: (r) => (r.daysSinceLast67 == null ? Number.MAX_SAFE_INTEGER : Number(r.daysSinceLast67)),
        cell: (_v, r) => (r.daysSinceLast67 == null ? "Nunca" : r.daysSinceLast67 === 0 ? "Hoy (0)" : String(r.daysSinceLast67)),
      },
      { id: "last67Date", label: "Último 67", accessor: (r) => r.last67Date, cell: (v) => fmtDate(v) },
      {
        id: "categoria",
        label: "Visibilidad",
        accessor: (r) => (r.category === "hoy" ? "Con 67 hoy" : r.category === "nunca" ? "Nunca" : "Sin 67 hoy"),
      },
      { id: "recipientName", label: "Destinatario", accessor: (r) => r.recipientName },
      { id: "recipientZip", label: "CP", accessor: (r) => r.recipientZip },
    ],
    filters: [
      { columnId: "categoria", title: "Visibilidad" },
      { columnId: "tipo", title: "Tipo" },
      { columnId: "status", title: "Estatus" },
    ],
    fedex67Check: {
      // Solo guías FedEx (el 67 vive en el historial de escaneos de FedEx).
      fetch: (rows, includeSundays) =>
        fetchVisibility67FedexCheck(
          rows.filter(isFedexRow).map((r) => ({ trackingNumber: r.trackingNumber, fedexUniqueId: r.fedexUniqueId })),
          includeSundays,
        ),
    },
    // Mismo "Actualizar" que en Pendientes: aplica el estatus de FedEx (con ingresos).
    updateRow: (subsidiaryId, row) => updatePendingOne(subsidiaryId, row.trackingNumber, !!row.isCharge),
    run: async (subsidiaryId) => {
      const { summary, details } = await fetchSin67Json(subsidiaryId);
      return {
        rows: details || [],
        summary: {
          Activos: summary?.totalActivos ?? (details?.length || 0),
          "Con 67 hoy": summary?.con67Hoy ?? 0,
          "Sin 67 hoy": summary?.sin67 ?? 0,
          Nunca: summary?.nunca ?? 0,
        },
      };
    },
    exportExcel: (subsidiaryId) => fetchSin67Excel(subsidiaryId),
    // Excel desde las filas en pantalla → incluye la confirmación FedEx, alta y movimientos.
    exportClient: (rows) => buildVisibility67Excel(rows),
    fileName: (s) => `visibilidad_67_${s}_${ts()}.xlsx`,
    emptyHint: "No hay paquetes activos para esta sucursal.",
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
