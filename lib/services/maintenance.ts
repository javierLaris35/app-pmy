import { axiosConfig } from "../axios-config";
import type {
  ContactChannel,
  HistoryResponse,
  MaintenanceQuote,
  MaintenanceRequest,
  MaintenanceServiceItem,
  PoStatus,
  PurchaseOrder,
  PurchaseOrderDispatch,
  PurchaseOrderItem,
  QuoteItem,
  RequestPriority,
  ScheduleRow,
  ServiceCategory,
  Supplier,
  SupplierContact,
} from "../types/maintenance";

const base = "maintenance";

// ---------------- Catálogo ----------------
export const getServiceCategories = async () => (await axiosConfig.get<ServiceCategory[]>(`${base}/catalog/categories`)).data;
export const createServiceCategory = async (body: Partial<ServiceCategory>) =>
  (await axiosConfig.post<ServiceCategory>(`${base}/catalog/categories`, body)).data;
export const updateServiceCategory = async (id: string, body: Partial<ServiceCategory>) =>
  (await axiosConfig.patch<ServiceCategory>(`${base}/catalog/categories/${id}`, body)).data;

export const getMaintenanceServices = async (params: { categoryId?: string; vehicleType?: string; q?: string; includeInactive?: boolean } = {}) =>
  (await axiosConfig.get<MaintenanceServiceItem[]>(`${base}/catalog/services`, { params })).data;
export const createMaintenanceService = async (body: Partial<MaintenanceServiceItem>) =>
  (await axiosConfig.post<MaintenanceServiceItem>(`${base}/catalog/services`, body)).data;
export const updateMaintenanceService = async (id: string, body: Partial<MaintenanceServiceItem>) =>
  (await axiosConfig.patch<MaintenanceServiceItem>(`${base}/catalog/services/${id}`, body)).data;
export const deleteMaintenanceService = async (id: string) => (await axiosConfig.delete(`${base}/catalog/services/${id}`)).data;

// ---------------- Proveedores ----------------
export interface SupplierPayload {
  name: string;
  rfc?: string | null;
  address?: string | null;
  notes?: string | null;
  active?: boolean;
  contacts: SupplierContact[];
}
export const getSuppliers = async (params: { q?: string; includeInactive?: boolean } = {}) =>
  (await axiosConfig.get<Supplier[]>(`${base}/suppliers`, { params })).data;
export const getSupplier = async (id: string) => (await axiosConfig.get<Supplier>(`${base}/suppliers/${id}`)).data;
export const createSupplier = async (body: SupplierPayload) => (await axiosConfig.post<Supplier>(`${base}/suppliers`, body)).data;
export const updateSupplier = async (id: string, body: SupplierPayload) =>
  (await axiosConfig.patch<Supplier>(`${base}/suppliers/${id}`, body)).data;
export const deleteSupplier = async (id: string) => (await axiosConfig.delete(`${base}/suppliers/${id}`)).data;

// ---------------- Programación ----------------
export interface SchedulePayload {
  kms?: number;
  maintenanceIntervalKms?: number;
  lastMaintenanceKms?: number | null;
  lastMaintenanceDate?: string | null;
  nextMaintenanceDate?: string | null;
}
export const getSchedule = async (subsidiaryId: string) =>
  (await axiosConfig.get<ScheduleRow[]>(`${base}/schedule/subsidiary/${subsidiaryId}`)).data;
export const updateVehicleSchedule = async (vehicleId: string, body: SchedulePayload) =>
  (await axiosConfig.patch(`${base}/schedule/vehicle/${vehicleId}`, body)).data;

// ---------------- Solicitudes y cotizaciones ----------------
export interface RequestPayload {
  vehicleId: string;
  kmsAtRequest?: number | null;
  description: string;
  priority: RequestPriority;
}
export interface QuotePayload {
  supplierId: string;
  quoteDate: string;
  validUntil?: string | null;
  notes?: string | null;
  items: QuoteItem[];
}
export const getRequests = async (subsidiaryId: string, status?: string) =>
  (await axiosConfig.get<MaintenanceRequest[]>(`${base}/requests/subsidiary/${subsidiaryId}`, { params: { status } })).data;
export const getQuoteInbox = async (subsidiaryId: string) =>
  (await axiosConfig.get<MaintenanceRequest[]>(`${base}/requests/inbox/${subsidiaryId}`)).data;
export const getRequest = async (id: string) => (await axiosConfig.get<MaintenanceRequest>(`${base}/requests/${id}`)).data;
export const createRequest = async (body: RequestPayload) => (await axiosConfig.post<MaintenanceRequest>(`${base}/requests`, body)).data;
export const updateRequest = async (id: string, body: Partial<RequestPayload>) =>
  (await axiosConfig.patch<MaintenanceRequest>(`${base}/requests/${id}`, body)).data;
export const deleteRequest = async (id: string) => (await axiosConfig.delete(`${base}/requests/${id}`)).data;
export const cancelRequest = async (id: string) => (await axiosConfig.post(`${base}/requests/${id}/cancel`)).data;

export const createQuote = async (requestId: string, body: QuotePayload) =>
  (await axiosConfig.post<MaintenanceQuote>(`${base}/requests/${requestId}/quotes`, body)).data;
export const updateQuote = async (quoteId: string, body: QuotePayload) =>
  (await axiosConfig.patch<MaintenanceQuote>(`${base}/requests/quotes/${quoteId}`, body)).data;
export const deleteQuote = async (quoteId: string) => (await axiosConfig.delete(`${base}/requests/quotes/${quoteId}`)).data;
export const uploadQuoteAttachment = async (quoteId: string, file: File) => {
  const fd = new FormData();
  fd.append("file", file);
  return (await axiosConfig.post(`${base}/requests/quotes/${quoteId}/attachment`, fd, { headers: { "Content-Type": "multipart/form-data" } })).data;
};
export const getQuoteAttachmentBlob = async (quoteId: string) =>
  (await axiosConfig.get<Blob>(`${base}/requests/quotes/${quoteId}/attachment`, { responseType: "blob" })).data;
export const convertQuote = async (quoteId: string) =>
  (await axiosConfig.post<PurchaseOrder>(`${base}/requests/quotes/${quoteId}/convert`)).data;

// ---------------- Órdenes de compra ----------------
export interface PurchaseOrderPatch {
  notes?: string | null;
  contactId?: string | null;
  supplierId?: string;
  items?: PurchaseOrderItem[];
}
export const getPurchaseOrders = async (subsidiaryId: string, status?: PoStatus) =>
  (await axiosConfig.get<PurchaseOrder[]>(`${base}/purchase-orders/subsidiary/${subsidiaryId}`, { params: { status } })).data;
export const getPendingAuthorizations = async () => (await axiosConfig.get<PurchaseOrder[]>(`${base}/purchase-orders/pending`)).data;
export const getPurchaseOrder = async (id: string) => (await axiosConfig.get<PurchaseOrder>(`${base}/purchase-orders/${id}`)).data;
export const updatePurchaseOrder = async (id: string, body: PurchaseOrderPatch) =>
  (await axiosConfig.patch<PurchaseOrder>(`${base}/purchase-orders/${id}`, body)).data;
export const submitPurchaseOrder = async (id: string) => (await axiosConfig.post<PurchaseOrder>(`${base}/purchase-orders/${id}/submit`)).data;
export const authorizePurchaseOrder = async (id: string, items?: Array<Pick<PurchaseOrderItem, "id" | "approved" | "quantity" | "unitPrice">>) =>
  (await axiosConfig.post<PurchaseOrder>(`${base}/purchase-orders/${id}/authorize`, { items })).data;
export const rejectPurchaseOrder = async (id: string, reason: string) =>
  (await axiosConfig.post<PurchaseOrder>(`${base}/purchase-orders/${id}/reject`, { reason })).data;
export const cancelPurchaseOrder = async (id: string, reason: string, notifySupplier: boolean) =>
  (await axiosConfig.post<PurchaseOrder>(`${base}/purchase-orders/${id}/cancel`, { reason, notifySupplier })).data;
export const deletePurchaseOrder = async (id: string) => (await axiosConfig.delete(`${base}/purchase-orders/${id}`)).data;
export const getPurchaseOrderPdf = async (id: string) =>
  (await axiosConfig.get<Blob>(`${base}/purchase-orders/${id}/pdf`, { responseType: "blob" })).data;
export const sendPurchaseOrder = async (id: string, body: { channel?: ContactChannel; contactId?: string }) =>
  (await axiosConfig.post<PurchaseOrder>(`${base}/purchase-orders/${id}/send`, body)).data;
export const getPurchaseOrderDispatches = async (id: string) =>
  (await axiosConfig.get<PurchaseOrderDispatch[]>(`${base}/purchase-orders/${id}/dispatches`)).data;
export const completePurchaseOrder = async (
  id: string,
  body: { completedAt: string; completedKms: number; finalAmount?: number; nextMaintenanceDate?: string | null },
) => (await axiosConfig.post<PurchaseOrder>(`${base}/purchase-orders/${id}/complete`, body)).data;

// ---------------- Historial ----------------
export const getMaintenanceHistory = async (subsidiaryId: string, params: { from?: string; to?: string; vehicleId?: string } = {}) =>
  (await axiosConfig.get<HistoryResponse>(`${base}/history/subsidiary/${subsidiaryId}`, { params })).data;

/** Abre un Blob (PDF/imagen) en una pestaña nueva. */
export function openBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
