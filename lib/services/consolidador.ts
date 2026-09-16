import { axiosConfig } from "../axios-config";
import {
  AnomalyRow,
  CobrosAuditReport,
  ConsolidadorReadResult,
  ConsolidadorRow,
  IncomeChangeLogEntry,
  ManualKind,
  SearchBatchResult,
  SearchPackageResult,
} from "../types/consolidador";

const baseUrl = "/consolidador";

/** GET: filas de income de la semana (todos los sourceType) + totales por bucket. */
export const getConsolidadorWeek = async (
  subsidiaryId: string,
  from: string,
  to: string,
  filters: { consNumber?: string; routeId?: string } = {},
): Promise<ConsolidadorReadResult> => {
  const params = new URLSearchParams();
  if (filters.consNumber) params.set("consNumber", filters.consNumber);
  if (filters.routeId) params.set("routeId", filters.routeId);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await axiosConfig.get<ConsolidadorReadResult>(`${baseUrl}/${subsidiaryId}/${from}/${to}${qs}`);
  return res.data;
};

export interface TimelineEvent {
  kind: string;
  label: string;
  date: string | null;
  meta?: { cost?: number; subsidiary?: string | null };
}

/** GET: timeline unificado del paquete (recibido, consolidado, salida a ruta, FedEx, ingreso). */
export const getPackageTimeline = async (
  tracking: string,
): Promise<{ tracking?: string; currentStatus?: string; events: TimelineEvent[] }> =>
  (await axiosConfig.get(`${baseUrl}/package/${encodeURIComponent(tracking)}/timeline`)).data;

/** GET: ingresos con anomalías de la semana (panel de revisión). */
export const getWeekAnomalies = async (subsidiaryId: string, from: string, to: string): Promise<{ rows: AnomalyRow[] }> =>
  (await axiosConfig.get<{ rows: AnomalyRow[] }>(`${baseUrl}/${subsidiaryId}/${from}/${to}/anomalies`)).data;

/** GET: auditoría de cobros de la semana (FedEx envío): faltan / sobran por regla. */
export const getCobrosAudit = async (subsidiaryId: string, from: string, to: string): Promise<CobrosAuditReport> =>
  (await axiosConfig.get<CobrosAuditReport>(`${baseUrl}/${subsidiaryId}/${from}/${to}/cobros-audit`)).data;

/** GET: historial de cambios de un ingreso (más reciente primero). */
export const getIncomeHistory = async (id: string): Promise<IncomeChangeLogEntry[]> =>
  (await axiosConfig.get<IncomeChangeLogEntry[]>(`${baseUrl}/income/${id}/history`)).data;

/** PATCH: nuevo costo in-place de un ingreso. */
export const patchIncomeCost = async (id: string, cost: number, reason: string): Promise<ConsolidadorRow> =>
  (await axiosConfig.patch<ConsolidadorRow>(`${baseUrl}/income/${id}/cost`, { cost, reason })).data;

/** PATCH: quita/pone el 2º a bordo (suma/resta subsidiary.secondAbordAmount). */
export const patchSecondAbord = async (id: string, enabled: boolean, reason: string): Promise<ConsolidadorRow> =>
  (await axiosConfig.patch<ConsolidadorRow>(`${baseUrl}/income/${id}/second-abord`, { enabled, reason })).data;

/** DELETE: elimina (soft-delete) un ingreso; deja de contar en los reportes. */
export const deleteIncome = async (id: string, reason: string) =>
  (await axiosConfig.delete(`${baseUrl}/income/${id}`, { data: { reason } })).data;

/** POST: alta manual de ingreso (recolección / POD / DEX / manual). */
export const createManualIncome = async (payload: {
  subsidiaryId: string;
  kind: ManualKind;
  trackingNumber?: string;
  cost: number;
  date: string;
  reason: string;
}): Promise<ConsolidadorRow> => (await axiosConfig.post<ConsolidadorRow>(`${baseUrl}/income`, payload)).data;

/** GET: busca un paquete y devuelve estatus interno vs FedEx + income ligado. */
export const searchPackage = async (tracking: string): Promise<SearchPackageResult> =>
  (await axiosConfig.get<SearchPackageResult>(`${baseUrl}/package/${encodeURIComponent(tracking)}`)).data;

/** POST: búsqueda por lote (hasta 30 guías). */
export const searchPackageBatch = async (trackings: string[]): Promise<SearchBatchResult> =>
  (await axiosConfig.post<SearchBatchResult>(`${baseUrl}/package/batch`, { trackings })).data;

/** PATCH: corrige el estatus del shipment contra FedEx y ajusta el income ligado. */
export const fixPackageStatus = async (shipmentId: string, newStatus: string, reason: string) =>
  (await axiosConfig.patch(`${baseUrl}/package/${shipmentId}/status`, { newStatus, reason })).data;

/** PATCH: repara el ingreso del paquete (crea el income faltante si el estatus es cobrable). */
export const repairPackageIncome = async (shipmentId: string, reason: string): Promise<{ created: boolean; reason?: string }> =>
  (await axiosConfig.patch(`${baseUrl}/package/${shipmentId}/repair-income`, { reason })).data;

/** PATCH: reasigna el ingreso a otra sucursal (ingreso mal asignado). */
export const reassignIncomeSubsidiary = async (incomeId: string, subsidiaryId: string, reason: string) =>
  (await axiosConfig.patch(`${baseUrl}/income/${incomeId}/subsidiary`, { subsidiaryId, reason })).data;

/** PATCH: cambia la fecha del ingreso (YYYY-MM-DD). */
export const editIncomeDate = async (incomeId: string, date: string, reason: string) =>
  (await axiosConfig.patch(`${baseUrl}/income/${incomeId}/date`, { date, reason })).data;
