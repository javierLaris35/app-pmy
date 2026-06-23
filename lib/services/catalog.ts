import { axiosConfig } from "../axios-config";

export interface CatalogItem {
  id: string;
  type: string;
  key: string;
  label: string;
  sortOrder: number;
  active: boolean;
  isSystem: boolean;
}
export interface CatalogGroup { type: string; label: string; items: CatalogItem[] }

export const getCatalogs = async () => {
  const res = await axiosConfig.get<{ groups: CatalogGroup[] }>("catalog");
  return res.data;
};

/** Opciones ACTIVAS de un tipo (para dropdowns). Abierto a cualquier autenticado. */
export const getCatalogOptions = async (type: string) => {
  const res = await axiosConfig.get<CatalogItem[]>(`catalog/options/${type}`);
  return res.data;
};

export const createCatalogItem = async (payload: { type: string; key: string; label: string }) => {
  const res = await axiosConfig.post<CatalogItem>("catalog", payload);
  return res.data;
};

export const updateCatalogItem = async (id: string, payload: { label?: string; sortOrder?: number; active?: boolean }) => {
  const res = await axiosConfig.patch<CatalogItem>(`catalog/${id}`, payload);
  return res.data;
};

export const deleteCatalogItem = async (id: string) => {
  const res = await axiosConfig.delete(`catalog/${id}`);
  return res.data;
};

export const getCatalogUsage = async (id: string) => {
  const res = await axiosConfig.get<{ item: CatalogItem; usedIn: { table: string; column: string; count: number }[] }>(`catalog/${id}/usage`);
  return res.data;
};
