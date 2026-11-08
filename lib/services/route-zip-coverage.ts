import { axiosConfig } from "../axios-config";

export type RouteZipStatus = "sugerido" | "confirmado" | "excluido";

export interface RouteZipRow {
  id: string;
  routeId: string;
  zip: string;
  city: string | null;
  shipmentCount: number;
  /** 0–1: de las guías de este CP en la sucursal, cuánto va a esta ruta. */
  share: number;
  source: "historial" | "manual";
  status: RouteZipStatus;
  lastSeenAt: string | null;
  sharedWith: { routeId: string; routeName: string; share: number }[];
}

export interface RouteZipSummary {
  routes: { id: string; name: string; zips: number; shipments: number; pending: number }[];
  rows: RouteZipRow[];
  unassigned: { zip: string; city: string | null; shipmentCount: number }[];
}

const baseUrl = "/route-zip-coverage";

export const getRouteZipCoverage = async (subsidiaryId: string): Promise<RouteZipSummary> =>
  (await axiosConfig.get<RouteZipSummary>(baseUrl, { params: { subsidiaryId } })).data;

export const setRouteZipStatus = async (id: string, status: RouteZipStatus) =>
  (await axiosConfig.put(`${baseUrl}/${id}`, { status })).data;

export const addRouteZip = async (body: { zip: string; routeId: string; city?: string }) =>
  (await axiosConfig.post(baseUrl, body)).data;

export const rebuildRouteZipCoverage = async (subsidiaryId?: string): Promise<{ pairs: number; days: number }> =>
  (await axiosConfig.post(`${baseUrl}/rebuild`, { subsidiaryId })).data;
