import { axiosConfig } from "@/lib/axios-config";

const url = "monitoring/routes";

export interface ActiveRoute {
  id: string;
  trackingNumber: string;
  createdAt: string;
  startTime: string | null;
  kms: string | null;
  driverNames: string | null;
  vehiclePlate: string | null;
  routeNames: string | null;
  totalStops: number;
  delivered: number;
  pending: number;
}

export interface StopPayment {
  amount: number;
  type: string;
  status: string;
}

export interface StopPackage {
  trackingNumber: string;
  status: string;
  carrier: string | null;
  /** true = es una carga F2 (charge_shipment), no una guía normal. */
  isCharge: boolean;
  fedexStatus: string | null;
  fedexRaw: string | null;
  commitDateTime: string | null;
  recipientPhone: string | null;
  /** ¿Tuvo el escaneo de la sucursal (67 o 44, según su config) HOY, hora Hermosillo? Solo aplica a FedEx. */
  hasScanToday: boolean;
  lastScanAt: string | null;
  payment: StopPayment | null;
}

/** Una parada FÍSICA (destinatario + dirección + CP) — puede traer varias guías (remesa). */
export interface RouteStop {
  stopKey: string;
  recipientName: string | null;
  recipientAddress: string | null;
  recipientCity: string | null;
  recipientZip: string | null;
  packages: StopPackage[];
  packageCount: number;
  deliveredCount: number;
  headlineStatus: string;
  lastScanAt: string | null;
  /** Orden real en que el chofer la visitó (por último escaneo); null = aún no visitada. */
  sequence: number | null;
}

export interface RouteGap {
  minutes: number;
  fromStopKey: string;
  toStopKey: string;
  fromLabel: string;
  toLabel: string;
}

export interface RouteAlert {
  severity: "critical" | "warning" | "info";
  code: string;
  message: string;
}

export interface RouteAnalysis {
  totalStops: number;
  visitedStops: number;
  pendingStops: number;
  avgGapMinutes: number | null;
  longestGap: RouteGap | null;
  paceCompletedPerHour: number | null;
  gaps: RouteGap[];
  alerts: RouteAlert[];
  /** Guías normales (shipments) en la ruta — distinto de las cargas F2. */
  normalPackageCount: number;
  /** Cargas F2 (charge_shipments) en la ruta. */
  chargePackageCount: number;
  /** Cuántos paquetes de la ruta traen cobro (COD), entregados o no. */
  paymentsCount: number;
  /** Suma de TODOS los cobros de la ruta (entregados o no). */
  paymentsTotal: number;
  /** Cuántos paquetes YA entregados traían cobro — ese dinero debe estar con el chofer ahora. */
  paymentsCollectedCount: number;
  /** Dinero que el chofer debería traer consigo en este momento (entregado + con cobro). */
  paymentsCollectedTotal: number;
  /** Cobros de paquetes aún no entregados (paymentsTotal - paymentsCollectedTotal). */
  paymentsPendingTotal: number;
}

export interface LiveRouteStatus {
  id: string;
  trackingNumber: string;
  createdAt: string;
  startTime: string | null;
  kms: string | null;
  status: string;
  driverNames: string | null;
  vehiclePlate: string | null;
  routeNames: string | null;
  /** Cierre de ruta REAL (route_closure.closeDate) — null si aún no se cierra. */
  routeClosedAt: string | null;
  /** Código de escaneo que monitorea la sucursal de esta ruta ('67' o '44'), según su configuración. */
  scanCode: "67" | "44";
  stops: RouteStop[];
  analysis: RouteAnalysis;
  lastFedexCheckAt: string;
  fromCache: boolean;
}

export interface RouteStopCoord {
  stopKey: string;
  lat: number | null;
  lng: number | null;
}

/** Resumen de una ruta para el tablero general (sucursal + fecha → cuadros de rutas). */
export interface RouteBoardItem {
  id: string;
  trackingNumber: string;
  status: string;
  createdAt: string;
  startTime: string | null;
  /** Cierre de ruta REAL (route_closure.closeDate) — null si aún no se cierra. */
  routeClosedAt: string | null;
  driverNames: string | null;
  vehiclePlate: string | null;
  routeNames: string | null;
  scanCode: "67" | "44";
  totalStops: number;
  visitedStops: number;
  pendingStops: number;
  criticalAlerts: number;
  warningAlerts: number;
  topAlert: RouteAlert | null;
  lastActivityAt: string | null;
  /** Minutos promedio entre paradas consecutivas ya visitadas — null si aún no hay suficientes datos. */
  avgGapMinutes: number | null;
  /** Paradas completadas por hora desde que salió la ruta — null si aún no hay salida registrada. */
  paceCompletedPerHour: number | null;
  normalPackageCount: number;
  chargePackageCount: number;
  paymentsCount: number;
  paymentsTotal: number;
  paymentsCollectedCount: number;
  /** Dinero que el chofer debería traer consigo ahora mismo (entregado + con cobro). */
  paymentsCollectedTotal: number;
  paymentsPendingTotal: number;
}

/** Rutas activas (EN_PROGRESO) de una sucursal, para elegir cuál monitorear. */
export const fetchActiveRoutes = async (subsidiaryId: string): Promise<ActiveRoute[]> => {
  const res = await axiosConfig.get(`${url}/active/${subsidiaryId}`);
  return res.data;
};

/**
 * Estatus en vivo de una ruta. El backend coalesce internamente (máx. 1 refresh
 * real a FedEx cada ~75s sin importar qué tan seguido se llame esto) — es seguro
 * pollear este endpoint cada 15-20s desde el cliente.
 */
export const fetchLiveRouteStatus = async (dispatchId: string, force = false): Promise<LiveRouteStatus | null> => {
  const res = await axiosConfig.get(`${url}/${dispatchId}/live`, { params: force ? { force: "true" } : undefined });
  return res.data;
};

/**
 * Coordenadas para el mapa — SEPARADO de `/live` a propósito: geocodificar es
 * lento (Nominatim throttlea ~1.1s por dirección no vista antes), así que se
 * pide DESPUÉS de pintar el tablero, no bloquea la carga inicial. El backend lo
 * cachea 10 min por ruta (las direcciones no cambian).
 */
export const fetchRouteStopCoordinates = async (dispatchId: string): Promise<RouteStopCoord[]> => {
  const res = await axiosConfig.get(`${url}/${dispatchId}/coords`);
  return res.data;
};

/**
 * Tablero general: todas las rutas de una sucursal en un día (YYYY-MM-DD, hora
 * Hermosillo). El backend reutiliza el mismo caché coalescido de 75s de
 * `/live` por cada ruta, así que es seguro pollear esto cada ~30s.
 */
export const fetchRoutesBoard = async (subsidiaryId: string, date: string): Promise<RouteBoardItem[]> => {
  const res = await axiosConfig.get(`${url}/board`, { params: { subsidiaryId, date } });
  return res.data;
};
