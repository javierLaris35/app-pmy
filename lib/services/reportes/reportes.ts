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

// ----- Sin código 67 (por sucursal) -----
export const fetchSin67Json = async (subsidiaryId: string) => {
  const res = await axiosConfig.get(`shipments/report-no67/${subsidiaryId}/json`);
  // { summary, details }
  return res.data as { summary?: Record<string, any>; details: any[] };
};

export const fetchSin67Excel = async (subsidiaryId: string) => {
  const res = await axiosConfig.get(`shipments/report-no67/${subsidiaryId}`, {
    responseType: "blob",
  });
  return res.data as Blob;
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
