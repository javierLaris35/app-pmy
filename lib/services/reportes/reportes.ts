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
