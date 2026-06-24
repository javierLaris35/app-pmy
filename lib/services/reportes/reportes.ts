import { axiosConfig } from "@/lib/axios-config";

/**
 * Servicio de la sección "Reportes". Cada reporte expone:
 *  - un fetch JSON (para la tabla en pantalla)
 *  - un fetch Excel (blob, para exportar)
 * Reusa los endpoints ya existentes/corregidos del backend.
 */

// ----- Pendientes -----
export const fetchPendientesJson = async (subsidiaryId: string) => {
  const res = await axiosConfig.get(`shipments/pendings`, { params: { subsidiaryId } });
  // { count, shipments }
  return res.data as { count: number; shipments: any[] };
};

export const fetchPendientesExcel = async (subsidiaryId: string) => {
  const res = await axiosConfig.get(`shipments/pendings/excel`, {
    params: { subsidiaryId },
    responseType: "blob",
  });
  return res.data as Blob;
};

// Estatus ACTUAL en FedEx (mapeado a local) por guía — para comparar contra el
// estatus guardado. Read-only (no persiste). Botón "Consultar FedEx" en lote.
export const fetchPendientesFedexStatus = async (
  items: { trackingNumber: string; fedexUniqueId?: string }[],
) => {
  const res = await axiosConfig.post(`shipments/pendings/fedex-status`, { items });
  return res.data as Record<
    string,
    { fedexStatus: string; fedexRaw?: string; derivedCode?: string; exceptionCode?: string }
  >;
};

// Actualiza UNA guía (envío o carga) con el mismo negocio de ingresos del backend.
export const updatePendingOne = async (
  subsidiaryId: string,
  trackingNumber: string,
  isCharge: boolean,
) => {
  const res = await axiosConfig.post(`shipments/pendings/update-one`, {
    subsidiaryId,
    trackingNumber,
    isCharge,
  });
  return res.data as { trackingNumber: string; isCharge: boolean; status: string | null };
};

// ----- Recibidas de FedEx (con 67) -----
export const fetchReceived67Json = async (subsidiaryId: string, start?: string, end?: string) => {
  const res = await axiosConfig.get(`shipments/received-67/${subsidiaryId}/json`, { params: { start, end } });
  // { summary, details: [{ trackingNumber, status, recipientName, ..., fecha67, diasDesde67, isCharge }] }
  return res.data as { summary?: Record<string, any>; details: any[] };
};

export const fetchReceived67Excel = async (subsidiaryId: string, start?: string, end?: string) => {
  const res = await axiosConfig.get(`shipments/received-67/${subsidiaryId}/excel`, {
    params: { start, end },
    responseType: "blob",
  });
  return res.data as Blob;
};

// ----- Visibilidad 67 (activos sin 67 de hoy, por sucursal) -----
export const fetchSin67Json = async (subsidiaryId: string, threshold?: number) => {
  const res = await axiosConfig.get(`shipments/report-no67/${subsidiaryId}/json`, {
    params: threshold ? { threshold } : undefined,
  });
  // { summary, details: [{ trackingNumber, status, last67Date, daysSinceLast67, category, ... }] }
  return res.data as { summary?: Record<string, any>; details: any[] };
};

// Confirmación con FedEx de la visibilidad 67: días con/sin 67 y días faltantes
// por guía. includeSundays controla si los domingos exigen 67. Read-only.
export const fetchVisibility67FedexCheck = async (
  items: { trackingNumber: string; fedexUniqueId?: string }[],
  includeSundays: boolean,
) => {
  const res = await axiosConfig.post(`shipments/visibility-67/fedex-check`, { items, includeSundays });
  return res.data as Record<
    string,
    {
      windowStart: string | null; windowEnd: string | null; delivered: boolean;
      daysWith67: number; daysWithout67: number; missingDates: string[]; last67: string | null;
      events: { date: string; description: string; exceptionCode?: string }[];
      lastMovement: { date: string; description: string } | null;
      fedexStatus: string; fedexRaw?: string; derivedCode?: string; exceptionCode?: string;
    }
  >;
};

export const fetchSin67Excel = async (subsidiaryId: string) => {
  const res = await axiosConfig.get(`shipments/report-no67/${subsidiaryId}`, {
    responseType: "blob",
  });
  return res.data as Blob;
};

// ----- Reporte Inventarios (estilo Visibilidad 67, por sucursal + rango) -----
export const fetchInventoryReportJson = async (subsidiaryId: string, from?: string, to?: string) => {
  const res = await axiosConfig.get(`inventories/visibility-report/${subsidiaryId}`, { params: { from, to } });
  // { summary, details: [{ trackingNumber, status, last67Date, daysSinceLast67, category, inventories[], inventoryTypes, ... }] }
  return res.data as { summary?: Record<string, any>; details: any[] };
};

// ----- Último inventario sin 67 -----
export const fetchInventario67Json = async (subsidiaryId: string) => {
  const res = await axiosConfig.get(`monitoring/inventory/67/${subsidiaryId}`);
  // { summary, details }
  return res.data as { summary?: Record<string, any>; details: any[] };
};

export const fetchInventario67Excel = async (subsidiaryId: string, nombre?: string) => {
  const res = await axiosConfig.get(`monitoring/inventory-67/${subsidiaryId}/excel`, {
    params: nombre ? { nombre } : undefined,
    responseType: "blob",
  });
  return res.data as Blob;
};
