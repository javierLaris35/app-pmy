import { axiosConfig } from "../axios-config";

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
