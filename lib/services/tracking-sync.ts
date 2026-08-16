import { axiosConfig } from "../axios-config";
import { toDayRange, buildRouteOption, buildConsolidatedOption, type PickerOption } from "../tracking/picker-options";

export type { PickerOption };

export interface NormalizedEventDto {
  occurredAt: string;
  status: string;
  derivedCode: string | null;
  exceptionCode: string | null;
  description: string | null;
  location: string | null;
}

export interface CompareResult {
  shipmentId: string;
  trackingNumber: string;
  ourStatus: string;
  ourLastEventAt: string | null;
  fedexStatus: string | null;
  fedexLastEventAt: string | null;
  diverges: boolean;
  isStale: boolean;
  missingEvents: NormalizedEventDto[];
  fedexEvents: NormalizedEventDto[];
  issues: string[];
  error?: string;
}

export interface ApplyOutcome {
  shipmentId: string;
  trackingNumber: string;
  applied: boolean;
  fromStatus: string;
  toStatus: string | null;
  insertedEvents: number;
  skippedReason?: string;
  error?: string;
}

export const compareByTracking = async (trackingNumber: string) => {
  const res = await axiosConfig.get<CompareResult>(`tracking-sync/compare/tracking/${encodeURIComponent(trackingNumber)}`);
  return res.data;
};

export const compareByRoute = async (routeId: string) => {
  const res = await axiosConfig.get<CompareResult[]>(`tracking-sync/compare/route/${routeId}`);
  return res.data;
};

export const compareByConsolidated = async (consolidatedId: string) => {
  const res = await axiosConfig.get<CompareResult[]>(`tracking-sync/compare/consolidated/${consolidatedId}`);
  return res.data;
};

export const applyCorrections = async (shipmentIds: string[]) => {
  const res = await axiosConfig.post<ApplyOutcome[]>(`tracking-sync/apply`, { shipmentIds });
  return res.data;
};

/** Rutas (salidas a ruta) de una sucursal en un día, como opciones para el desplegable. */
export const listRoutesBySubsidiaryDay = async (subsidiaryId: string, day: string): Promise<PickerOption[]> => {
  const { from, to } = toDayRange(day);
  const res = await axiosConfig.get<any>(`package-dispatch/subsidiary/${subsidiaryId}`, { params: { from, to, limit: 200 } });
  const items: any[] = Array.isArray(res.data) ? res.data : res.data?.data ?? res.data?.items ?? [];
  return items.map(buildRouteOption);
};

/** Consolidados de una sucursal en un día, como opciones para el desplegable. */
export const listConsolidatedsBySubsidiaryDay = async (subsidiaryId: string, day: string): Promise<PickerOption[]> => {
  const { from, to } = toDayRange(day);
  const res = await axiosConfig.get<any>(`consolidated`, { params: { subsidiaryId, fromDate: from, toDate: to } });
  const items: any[] = Array.isArray(res.data) ? res.data : res.data?.data ?? res.data?.items ?? [];
  return items.map(buildConsolidatedOption);
};
