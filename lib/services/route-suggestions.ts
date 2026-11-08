import { axiosConfig } from "../axios-config";

export type CommitBucket = "vencido" | "hoy" | "manana" | "despues" | "sin_fecha";

export interface SuggestedPackage {
  id: string;
  kind: "shipment" | "charge";
  trackingNumber: string;
  pieceKey: string;
  /** Lo que se valida en la salida: dhlUniqueId (pieza DHL) o el número de guía. */
  scanCode: string;
  zip: string | null;
  recipientName: string | null;
  recipientAddress: string | null;
  commitDateTime: string | null;
  status: string;
  carrier: "fedex" | "dhl";
  bucket: CommitBucket;
  daysInWarehouse: number;
  sharedWith: string[];
  sharedRouteIds: string[];
}

export interface RouteSuggestion {
  routeId: string;
  routeName: string;
  overdue: number;
  today: number;
  tomorrow: number;
  total: number;
  topZips: { zip: string; count: number; shared: boolean }[];
  lastDispatchAt: string | null;
  openDispatchesToday: number;
  packages: SuggestedPackage[];
}

export interface SuggestionBucket {
  overdue: number;
  today: number;
  tomorrow: number;
  total: number;
  topZips: { zip: string; count: number }[];
  packages: SuggestedPackage[];
}

export interface SuggestionsResult {
  generatedAt: string;
  totals: { total: number; overdue: number; today: number; tomorrow: number; routes: number };
  routes: RouteSuggestion[];
  unassigned: SuggestionBucket;
  noZip: SuggestionBucket;
}

export const getRouteSuggestions = async (subsidiaryId: string): Promise<SuggestionsResult> =>
  (await axiosConfig.get<SuggestionsResult>("/route-suggestions", { params: { subsidiaryId } })).data;
