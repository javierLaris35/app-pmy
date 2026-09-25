import { axiosConfig } from "../axios-config";
import type {
  BoardCard,
  Comparison,
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
  RequestDispatch,
  RequestPriority,
  RfqResult,
  RequestType,
  ScheduleRow,
  ServiceCategory,
  Supplier,
  SupplierContact,
} from "../types/maintenance";
import type { Product, ProductCategory, ProductKind, ProductOffer, UnitOfMeasure, VehicleSpecItem } from "../types/compras";

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
  bankName?: string | null;
  clabe?: string | null;
  accountNumber?: string | null;
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
export interface RequestItemPayload {
  id?: string;
  productId?: string | null;
  categoryId?: string | null;
  description: string;
  quantity: number;
  unitId?: string | null;
  notes?: string | null;
}
export interface RequestPayload {
  type: RequestType;
  subsidiaryId: string;
  vehicleId?: string | null;
  kmsAtRequest?: number | null;
  description: string;
  priority: RequestPriority;
  items: RequestItemPayload[];
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
export interface GeneratedOrder { id: string; folio: string; supplierId: string; total: number }
/** "Generar orden con esta cotización": todo lo que cubre ese proveedor en una orden, a autorización. */
export const convertQuote = async (quoteId: string) =>
  (await axiosConfig.post<GeneratedOrder[]>(`${base}/requests/quotes/${quoteId}/convert`)).data;

// ---------------- Comparativo por partida y pedir cotización ----------------

export const getComparison = async (requestId: string) =>
  (await axiosConfig.get<Comparison>(`${base}/requests/${requestId}/comparison`)).data;
export const saveSelection = async (requestId: string, selections: Array<{ requestItemId: string; quoteItemId: string | null }>) =>
  (await axiosConfig.put<Comparison>(`${base}/requests/${requestId}/selection`, { selections })).data;
/** Una orden por proveedor elegido; todas van a autorización. */
export const generateOrders = async (requestId: string) =>
  (await axiosConfig.post<GeneratedOrder[]>(`${base}/requests/${requestId}/generate-orders`)).data;
export const getComparisonPdf = async (requestId: string) =>
  (await axiosConfig.get<Blob>(`${base}/requests/${requestId}/comparison-pdf`, { responseType: "blob" })).data;
export const getRfqPdf = async (requestId: string, supplierId?: string) =>
  (await axiosConfig.get<Blob>(`${base}/requests/${requestId}/rfq-pdf`, { params: { supplierId }, responseType: "blob" })).data;
export const sendRfq = async (
  requestId: string,
  body: { targets: Array<{ supplierId: string; contactId?: string; channel?: ContactChannel }>; notes?: string },
) => (await axiosConfig.post<RfqResult[]>(`${base}/requests/${requestId}/rfq`, body)).data;
export const getRequestDispatches = async (requestId: string) =>
  (await axiosConfig.get<RequestDispatch[]>(`${base}/requests/${requestId}/dispatches`)).data;

export const getBoard = async (params: { subsidiaryId?: string; type?: string } = {}) =>
  (await axiosConfig.get<BoardCard[]>(`${base}/requests/board`, { params })).data;
export const getMyRequests = async (type?: string) =>
  (await axiosConfig.get<BoardCard[]>(`${base}/requests/mine`, { params: { type } })).data;
export const approveRequest = async (id: string) => (await axiosConfig.post<MaintenanceRequest>(`${base}/requests/${id}/approve`)).data;
export const rejectRequest = async (id: string, reason: string) =>
  (await axiosConfig.post<MaintenanceRequest>(`${base}/requests/${id}/reject`, { reason })).data;

export interface VehicleSpecItemPayload {
  categoryId: string;
  productId?: string | null;
  quantity: number;
  unitId?: string | null;
  notes?: string | null;
}
export const getVehicleSpec = async (vehicleId: string) =>
  (await axiosConfig.get<VehicleSpecItem[]>(`${base}/schedule/vehicle/${vehicleId}/spec`)).data;
export const saveVehicleSpec = async (vehicleId: string, items: VehicleSpecItemPayload[]) =>
  (await axiosConfig.put<VehicleSpecItem[]>(`${base}/schedule/vehicle/${vehicleId}/spec`, { items })).data;

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
  body: { completedAt: string; completedKms?: number; finalAmount?: number; nextMaintenanceDate?: string | null },
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

// ---------------- Compras: catálogos v3 ----------------

export const getUnits = async () => (await axiosConfig.get<UnitOfMeasure[]>(`${base}/catalog/units`)).data;
export const saveUnit = async (body: Partial<UnitOfMeasure>, id?: string) =>
  (id ? await axiosConfig.patch<UnitOfMeasure>(`${base}/catalog/units/${id}`, body) : await axiosConfig.post<UnitOfMeasure>(`${base}/catalog/units`, body)).data;

export const getProductCategories = async (kind?: ProductKind) =>
  (await axiosConfig.get<ProductCategory[]>(`${base}/catalog/product-categories`, { params: { kind } })).data;
export const saveProductCategory = async (body: Partial<ProductCategory>, id?: string) =>
  (id
    ? await axiosConfig.patch<ProductCategory>(`${base}/catalog/product-categories/${id}`, body)
    : await axiosConfig.post<ProductCategory>(`${base}/catalog/product-categories`, body)).data;

export interface ProductPayload {
  name: string;
  description?: string | null;
  categoryId?: string | null;
  brand?: string | null;
  partNumber?: string | null;
  unitId?: string | null;
  active?: boolean;
  offers?: Array<Pick<ProductOffer, "id" | "supplierId" | "unitId" | "price" | "quality">>;
}
export const getProducts = async (params: { q?: string; kind?: ProductKind; categoryId?: string; includeInactive?: boolean } = {}) =>
  (await axiosConfig.get<Product[]>(`${base}/catalog/products`, { params })).data;
export const saveProduct = async (body: ProductPayload, id?: string) =>
  (id ? await axiosConfig.patch<Product>(`${base}/catalog/products/${id}`, body) : await axiosConfig.post<Product>(`${base}/catalog/products`, body)).data;
export const deleteProduct = async (id: string) => (await axiosConfig.delete(`${base}/catalog/products/${id}`)).data;
