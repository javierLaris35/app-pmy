/** Tipos del módulo de Mantenimiento de Vehículos (espejo de las entidades de pmy-api). */

export type MaintenanceLight = "vencido" | "proximo" | "al_dia" | "sin_datos";
export type ServiceUnit = "servicio" | "pieza" | "litro" | "juego";
export type ContactChannel = "email" | "whatsapp";
export type RequestStatus = "abierta" | "en_cotizacion" | "orden_generada" | "completada" | "cancelada";
export type RequestPriority = "baja" | "media" | "alta";
export type QuoteStatus = "capturada" | "ganadora" | "descartada";
export type PoStatus = "borrador" | "pendiente" | "autorizada" | "rechazada" | "enviada" | "completada" | "cancelada";
export type ExpedienteStage = "cotizando" | "por_autorizar" | "en_taller" | "terminado" | "cancelado";
export type ExpedienteStep = "solicitud" | "cotizaciones" | "autorizacion" | "envio" | "cierre" | "terminado";
export type WaitingOn = "captura" | "autorizador" | "proveedor" | null;

/** Etapa + paso activo + qué sigue (calculado en el backend por `expedienteStage`). */
export interface ExpedienteProgress {
  stage: ExpedienteStage;
  step: ExpedienteStep;
  nextStep: string;
  waitingOn: WaitingOn;
  rejected: boolean;
}

/** Tarjeta del tablero: un mantenimiento. */
export interface BoardCard extends ExpedienteProgress {
  id: string;
  folio: string;
  vehicle: MaintenanceVehicle;
  description: string;
  priority: RequestPriority;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  createdByName: string | null;
  quotesCount: number;
  bestTotal: number | null;
  purchaseOrder: { id: string; folio: string; status: PoStatus; total: number; supplierName: string | null } | null;
}

export interface ServiceCategory {
  id: string;
  name: string;
  sortOrder: number;
  active: boolean;
}

export interface MaintenanceServiceItem {
  id: string;
  name: string;
  categoryId: string;
  category?: ServiceCategory;
  unit: ServiceUnit;
  referencePrice: number;
  vehicleType: string | null;
  active: boolean;
}

export interface SupplierContact {
  id?: string;
  name: string;
  position?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  preferredChannel: ContactChannel;
  isDefault?: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  rfc?: string | null;
  address?: string | null;
  notes?: string | null;
  active: boolean;
  contacts: SupplierContact[];
}

export interface MaintenanceVehicle {
  id: string;
  code?: string | null;
  name?: string | null;
  plateNumber: string;
  brand?: string;
  model?: string;
  type?: string;
  status?: string;
  kms?: number | null;
  lastMaintenanceDate?: string | null;
  lastMaintenanceKms?: number | null;
  maintenanceIntervalKms?: number | null;
  nextMaintenanceDate?: string | null;
}

export interface MaintenanceStatusResult {
  light: MaintenanceLight;
  nextKms: number | null;
  kmsRemaining: number | null;
  daysRemaining: number | null;
}

export interface ScheduleRow {
  vehicle: MaintenanceVehicle;
  status: MaintenanceStatusResult;
  openRequest: { id: string; folio: string; status: RequestStatus } | null;
}

export interface QuoteItem {
  id?: string;
  serviceId?: string | null;
  service?: MaintenanceServiceItem | null;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  amount?: number;
  referencePrice?: number | null;
  deviationPct?: number | null;
}

export interface MaintenanceQuote {
  id: string;
  requestId: string;
  supplierId: string;
  supplier?: Supplier;
  quoteDate: string;
  validUntil?: string | null;
  notes?: string | null;
  attachmentName?: string | null;
  subtotal: number;
  tax: number;
  total: number;
  status: QuoteStatus;
  items: QuoteItem[];
}

export interface PurchaseOrderSummary {
  id: string;
  folio: string;
  status: PoStatus;
  rejectionReason?: string | null;
}

export interface MaintenanceRequest extends Partial<ExpedienteProgress> {
  id: string;
  folio: string;
  vehicleId: string;
  vehicle?: MaintenanceVehicle;
  subsidiaryId: string;
  kmsAtRequest?: number | null;
  description: string;
  priority: RequestPriority;
  status: RequestStatus;
  createdAt: string;
  createdBy?: { id: string; name?: string; lastName?: string } | null;
  quotes?: MaintenanceQuote[];
  quotesCount?: number;
  minTotal?: number | null;
  purchaseOrder?: PurchaseOrderSummary | null;
}

export interface PurchaseOrderItem {
  id?: string;
  serviceId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  amount?: number;
  approved: boolean;
}

export interface PurchaseOrderDispatch {
  id: string;
  channel: ContactChannel;
  destination: string;
  status: "enviado" | "error";
  kind: string;
  error?: string | null;
  sentByName?: string | null;
  sentAt: string;
}

export interface PurchaseOrder {
  id: string;
  folio: string;
  requestId: string;
  request?: MaintenanceRequest;
  quoteId: string;
  supplierId: string;
  supplier?: Supplier;
  contactId?: string | null;
  contact?: SupplierContact | null;
  vehicleId: string;
  vehicle?: MaintenanceVehicle;
  subsidiaryId: string;
  subsidiary?: { id: string; name: string };
  status: PoStatus;
  notes?: string | null;
  rejectionReason?: string | null;
  authorizedBy?: { id: string; name?: string; lastName?: string } | null;
  authorizedAt?: string | null;
  subtotal: number;
  tax: number;
  total: number;
  completedAt?: string | null;
  completedKms?: number | null;
  finalAmount?: number | null;
  expenseId?: string | null;
  cancelReason?: string | null;
  createdAt: string;
  createdBy?: { id: string; name?: string; lastName?: string } | null;
  items: PurchaseOrderItem[];
  dispatches?: PurchaseOrderDispatch[];
}

export interface HistoryRow {
  poId: string;
  requestId: string;
  folio: string;
  completedAt: string;
  completedKms: number | null;
  vehicle: MaintenanceVehicle;
  supplierName: string;
  services: string[];
  amount: number;
}

export interface HistoryByVehicle {
  vehicle: MaintenanceVehicle;
  count: number;
  total: number;
  lastMaintenanceDate: string | null;
  lastMaintenanceKms: number | null;
}

export interface HistoryResponse {
  rows: HistoryRow[];
  byVehicle: HistoryByVehicle[];
  legacy: Array<{ vehicle: MaintenanceVehicle; lastMaintenanceDate: string | null }>;
}

export const STAGE_LABEL: Record<ExpedienteStage, string> = {
  cotizando: "Cotizando",
  por_autorizar: "Por autorizar",
  en_taller: "En taller",
  terminado: "Terminado",
  cancelado: "Cancelado",
};

export const STEPS: Array<{ key: Exclude<ExpedienteStep, "terminado">; label: string }> = [
  { key: "solicitud", label: "Solicitud" },
  { key: "cotizaciones", label: "Cotizaciones" },
  { key: "autorizacion", label: "Autorización" },
  { key: "envio", label: "Envío al proveedor" },
  { key: "cierre", label: "Cierre" },
];

export const LIGHT_LABEL: Record<MaintenanceLight, string> = {
  vencido: "Vencido",
  proximo: "Próximo",
  al_dia: "Al día",
  sin_datos: "Sin datos",
};

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  abierta: "Abierta",
  en_cotizacion: "En cotización",
  orden_generada: "Con orden de compra",
  completada: "Completada",
  cancelada: "Cancelada",
};

export const PRIORITY_LABEL: Record<RequestPriority, string> = { baja: "Baja", media: "Media", alta: "Alta" };

export const PO_STATUS_LABEL: Record<PoStatus, string> = {
  borrador: "Borrador",
  pendiente: "Por autorizar",
  autorizada: "Autorizada",
  rechazada: "Rechazada",
  enviada: "Enviada al proveedor",
  completada: "Completada",
  cancelada: "Cancelada",
};

export const UNIT_LABEL: Record<ServiceUnit, string> = { servicio: "Servicio", pieza: "Pieza", litro: "Litro", juego: "Juego" };

export const vehicleLabel = (v?: MaintenanceVehicle | null) =>
  v ? [v.code || v.name, v.plateNumber].filter(Boolean).join(" · ") : "—";

export const formatMoney = (n?: number | null) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(n ?? 0));

export const formatKms = (n?: number | null) => (n === null || n === undefined ? "—" : `${Number(n).toLocaleString("es-MX")} km`);
