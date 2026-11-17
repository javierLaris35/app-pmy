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
  /** Vencen pasado mañana o después. */
  later: number;
  /** Sin fecha de vencimiento. */
  noDate: number;
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
  later: number;
  noDate: number;
  total: number;
  topZips: { zip: string; count: number }[];
  packages: SuggestedPackage[];
}

export interface SuggestionsResult {
  generatedAt: string;
  totals: { total: number; overdue: number; today: number; tomorrow: number; later: number; noDate: number; routes: number };
  routes: RouteSuggestion[];
  unassigned: SuggestionBucket;
  noZip: SuggestionBucket;
}

export const getRouteSuggestions = async (subsidiaryId: string): Promise<SuggestionsResult> =>
  (await axiosConfig.get<SuggestionsResult>("/route-suggestions", { params: { subsidiaryId } })).data;

/**
 * Qué agregar: "hoy" = vencidos + hoy; "manana" = además los de mañana; "todo" = todo lo de bodega;
 * "resto_hoy" / "resto_manana" = lo que NO es urgente con ese alcance (sección Resto en bodega).
 */
export type SuggestionScope = "hoy" | "manana" | "todo" | "resto_hoy" | "resto_manana";

/**
 * Códigos a validar de los paquetes de una ruta que cuenta "Crear salida con N" (urgentes o todo),
 * sin los que ya están en la salida.
 */
export const urgentCodesForRoute = (
  data: SuggestionsResult | undefined,
  routeId: string,
  scope: SuggestionScope,
  inDispatch: Set<string> = new Set(),
): string[] => {
  const route = data?.routes.find((r) => r.routeId === routeId);
  if (!route) return [];
  const buckets = new Set(scope === "manana" ? ["vencido", "hoy", "manana"] : ["vencido", "hoy"]);
  const urgentBuckets = new Set(scope === "resto_manana" ? ["vencido", "hoy", "manana"] : ["vencido", "hoy"]);
  const picked =
    scope === "todo"
      ? route.packages
      : scope === "resto_hoy" || scope === "resto_manana"
        ? route.packages.filter((p) => !urgentBuckets.has(p.bucket))
        : route.packages.filter((p) => buckets.has(p.bucket));
  return [...new Set(picked.map((p) => p.scanCode))].filter((c) => !inDispatch.has(c));
};

const PREFILL_KEY = "dispatch_prefill_codes";

/** Guarda los paquetes elegidos en "Ver" para que la nueva salida los agregue al abrir (?agregar=lista). */
export const savePrefillCodes = (routeId: string, codes: string[]) => {
  try {
    window.sessionStorage.setItem(PREFILL_KEY, JSON.stringify({ routeId, codes }));
  } catch {
    /* sin almacenamiento: la salida abre solo con la ruta */
  }
};

/** Lee (y borra) los paquetes elegidos para esa ruta. */
export const takePrefillCodes = (routeId: string): string[] => {
  try {
    const raw = window.sessionStorage.getItem(PREFILL_KEY);
    window.sessionStorage.removeItem(PREFILL_KEY);
    const v = raw ? (JSON.parse(raw) as { routeId?: string; codes?: string[] }) : null;
    return v?.routeId === routeId && Array.isArray(v.codes) ? v.codes : [];
  } catch {
    return [];
  }
};

/** Códigos que la nueva salida debe agregar al abrir según ?agregar= (lista elegida o por alcance). */
export const prefillCodesFor = (
  data: SuggestionsResult | undefined,
  routeId: string,
  scope: PrefillScope,
  inDispatch: Set<string> = new Set(),
): string[] =>
  scope === "lista" ? [...new Set(takePrefillCodes(routeId))].filter((c) => !inDispatch.has(c)) : urgentCodesForRoute(data, routeId, scope, inDispatch);

/** Valor de ?agregar= en la nueva salida: por alcance o "lista" (los elegidos en "Ver"). */
export type PrefillScope = SuggestionScope | "lista";
