export type Subsidiary = {
  id?: string
  name: string
  address?: string
  phone?: string
  officeManager: string
  managerPhone?: string
  fedexCostPackage: number
  dhlCostPackage: number
  chargeCost: number
  active: boolean
  officeEmail?: string
  officeEmailToCopy?: string
}

export type Collection = {
  id?: string
  trackingNumber: string
  subsidiaryId: string
  status?: string | null
  createdAt?: Date
  isPickUp: boolean
}

export type RouteIncome = {
  id: string
  subsidiaryId: string
  date: string
  ok: number
  ba: number
  ne: number
  collections: number
  total: number
  totalIncome: string
}

export type ExpenseCategory = {
  id: string
  name: string
  description?: string
}

export type Expense = {
  id?: string
  subsidiaryId: string
  category: ExpenseCategory
  date: string | Date
  amount: number
  description?: string
  paymentMethod?: string
  responsible?: string
  notes?: string
  receiptUrl?: string
}

export type GroupExpese = {
  date: string
  total: number
  items: Expense[]
}


export type FinancialSummary = {
  incomes: RouteIncome[],
  expenses: GroupExpese[],
  finantial: {
    income: number
    expenses: number
    balance: number
    period: string
  }
}

export type Permission = {
  id: string
  name: string
  description?: string
  code: string
}

export type Role = {
  id: string
  name: string
  description?: string
  isDefault: boolean
  permissions?: Permission[]
}

export type KpiData = {
  total: number;
  entregados: number;
  enRuta: number;
  inventario: number;
  noEntregadosPercent: number;
  promedioEntrega: number;
}

export type NewIncome = {
  date: string
  fedex: {
    pod: number
    dex: number
    total: number
    totalIncome: string
  }
  dhl: {
    ba: number
    ne: number
    total: number
    totalIncome: string
  }
  collections: number
  cargas: number
  total: number
  totalIncome: string
  items: {
    type: string
    trackingNumber: string
    shipmentType: string
    status: string
    date: string
    cost: number
  }[]
}

export type UserRole = 'admin' | 'user' | 'auxiliar' | 'superamin' | 'bodega' | 'subadmin';

export enum UserRoleEnum {
  USER = 'user',
  ADMIN = 'admin',
  AUXILIAR = 'auxiliar',
  BODEGA = 'bodega',
  SUPERADMIN = 'superadmin',
  SUBADMIN = 'subadmin'
}

export type User = {
  id?: string
  email: string
  name?: string
  lastName?: string
  role: UserRole
  subsidiary?: Subsidiary
  subsidiaryId?: string
  subsidiaryName?: string
  avatar?: string
  active: boolean
}

export type AuthState = {
  user: User | null
  isLoading: boolean
}

export type StatusHistory = {
  id?: string
  status: "recoleccion" | "en_ruta" | "entregado" | "no_entregado" | "desconocido"
  exceptionCode: string
  timestamp: string
  notes?: string
}

export type Shipment = {
  id: string
  trackingNumber: string
  recipientName: string
  recipientAddress: string
  recipientCity: string
  recipientZip: string
  commitDateTime: string
  recipientPhone: string
  status: "recoleccion" | "en_ruta" | "entregado" | "no_entregado" | "desconocido"
  payment?: {
    type: string
    amount: number
    status: "paid" | "pending" | "failed"
  } | null
  priority?: "alta" | "media" | "baja"
  statusHistory?: Array<StatusHistory>
  createdAt?: string
  shipmentType?: "fedex" | "dhl"
  subsidiary?: Subsidiary
  charge?: Charge
  isChargePackage?: boolean
  receivedByName?: string,
  daysInRoute?: number;
  isHighValue?: boolean
}

export type AddShipmentDto = {
  trackingNumber: string
  recipientName: string
  recipientAddress: string
  recipientCity: string
  recipientZip: string
  commitDate: string
  commitTime: string
  recipientPhone: string
  status?: "recoleccion" | "en_ruta" | "entregado" | "no_entregado" | "desconocido"
  payment?: string
  priority?: "alta" | "media" | "baja"
  consNumber?: string
  isPartOfCharge?: boolean
  isHighValue?: boolean
  subsidiary?: {
    id: string
  }
}

export type Driver = {
  id: string
  name: string
  licenseNumber: string
  phoneNumber: string
  subsidiary: Subsidiary
  status: StatusEnum
}

export enum PackageDispatchStatus {
  PENDING = 'pendiente',
  IN_PROGRESS = 'en_progreso',
  COMPLETED = 'completada',
  CANCELLED = 'cancelada'
}

export type Route = {
  id: string
  name: string
  code?: string
  status: StatusEnum
  startTime: string
  subsidiary: Subsidiary
  estimatedArrival: string
}

export interface ChargeShipment {
    id: string;
    trackingNumber: string;
    status: string;
    commitDateTime: string;
    recipientName: string;
    chargeId?: string;
    statusHistory?: Array<StatusHistory>
}

export interface Charge {
    id: string;
    chargeDate: string;
    numberOfPackages: number;
    subsidiaryId: string;
    subsidiary: {
        id: string;
        name: string;
    };
    isChargeComplete: boolean;
    createdAt: string;
    shipments: ChargeShipment[];
}

export interface Consolidated {
  id: string;
  date: string;
  type: "Ordinaria" | "Aereo" | "Carga";
  numberOfPackages: number;
  subsidiaryId: string;
  subsidiary: {
      id: string;
      name: string;
  };
  shipmentCounts?: {
    total: number; 
    en_ruta: number;
    entregado: number;
    no_entregado: number;
    other: number;
  }
  isCompleted: boolean;
  consNumber: string;
  efficiency: number;
  shipments: Shipment[];
}

export interface SubsidiaryMetrics {
  subsidiaryId: string;
  subsidiaryName: string;
  totalPackages: number;
  deliveredPackages: number;
  undeliveredPackages: number;
  undeliveredDetails: {
    total: number;
    byExceptionCode: {
      code07: number;
      code08: number;
      code03: number;
      unknown: number;
    };
  };
  inTransitPackages: number;
  totalCharges: number;
  consolidations: {
    ordinary: number;
    air: number;
    total: number;
  };
  averageRevenuePerPackage: number;
  totalRevenue: number;
  totalExpenses: number;
  averageEfficiency: number;
  totalProfit: number;
}

export enum ShipmentType {
  FEDEX = 'fedex',
  DHL = 'dhl'
}

export enum ShipmentStatusType {
  RECOLECCION = 'recoleccion',
  PENDIENTE = 'pendiente',
  EN_RUTA = 'en_ruta',
  ENTREGADO = 'entregado',
  NO_ENTREGADO = 'no_entregado',
  DESCONOCIDO = 'desconocido',
  RECHAZADO = 'rechazado'
}

export enum Priority {
  ALTA = 'alta',
  MEDIA = 'media',
  BAJA = 'baja',
}


export interface TrackingValidationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export interface DuplicateInfo {
  trackingNumber: string
  count: number
  positions: number[]
  source: "finanzas" | "sistema" | "both"
}

export interface ValidationResults {
  onlyInFinanzas: string[]
  onlyInSistema: string[]
  common: string[]
  duplicatesFinanzas: DuplicateInfo[]
  duplicatesSistema: DuplicateInfo[]
  crossDuplicates: DuplicateInfo[]
}

export interface TrackingDetail {
  trackingNumber: string
  recipientName?: string
  recipientAddress?: string
  recipientPhone?: string
  status?: string
  commitDate?: string
  shipmentType?: string
  statusHistory: Array<any>
  error?: string
  source: "finanzas" | "sistema" | "both"
}

export interface ValidationSummary {
  totalFinanzas: number
  totalSistema: number
  uniqueFinanzas: number
  uniqueSistema: number
  duplicatesInFinanzas: number
  duplicatesInSistema: number
  crossDuplicates: number
  onlyInFinanzas: number
  onlyInSistema: number
  common: number
  validationIssues: number
}

interface FedexReport {
  pod: number;
  dex07: number;
  dex08: number;
  total: number;
  totalIncome: string;
}

export interface Devolution {
  id: string
  trackingNumber: string
  createdAt: string
  status: string
  reason: string
  sucursalId: string
}

export type ReturnValidaton = {
  id: string;
  trackingNumber: string;
  status: string;
  subsidiaryId: string;    // Nuevo campo
  subsidiaryName: string;  // Existente
  hasIncome: boolean;
  isCharge: boolean;
  lastStatus: {
    type: string | null;
    exceptionCode: string | null;
    notes: string | null;
  } | null;
}


/************** CAMBIARAN son para Rutas a Salidas */
export interface Repartidor {
  id: string
  name: string
  employeeId: string
  isActive: boolean
}

export interface Ruta {
  id: string
  name: string
  description: string
  zone: string
  isActive: boolean
}

export interface Unidad {
  id: string
  name: string
  plateNumber: string
  type: "VAN" | "TRUCK" | "MOTORCYCLE"
  capacity: number
  isActive: boolean
  isAvailable: boolean
}

export interface PackageDispatch {
  id: string
  trackingNumber: string
  status: PackageDispatchStatus
  routes: Route[]
  drivers: Driver[]
  vehicle: Vehicles
  shipments: Shipment[]
  chargeShipments: ChargeShipment[]
  estimatedArrival: string
  startTime: string
  subsidiary: Subsidiary
  createdAt?: string
  kms: string
}

export interface DispatchFormData {
  drivers: Driver[]
  routes: Route[]
  vehicle: Vehicles
  shipments: string[]
  subsidiary: Subsidiary
  kms?: string
}

/*** Administration */
export enum VehicleStatus {
  ACTIVE = 'activo',
  INACTIVE = 'inactivo',
  MAINTENANCE = 'mantenimiento',
  OUT_OF_SERVICE = 'fuera de servicio',
}

export enum StatusEnum {
  ACTIVE = 'activo',
  INACTIVE = 'inactivo',
}

export enum VehicleTypeEnum {
  VAN = 'van',
  CAMIONETA = 'camioneta',
  RABON = 'rabon',
  "3/4" = '3/4',
  URBAN = 'urban',
  CAJA_LARGA = 'caja larga'
}

export interface Vehicles {
  id?: string
  plateNumber: string
  plateNumber2: string
  model: string
  brand: string
  policyNumber: string
  policyExpirationDate: string
  code: string
  capacity: number;
  type: VehicleTypeEnum;
  name: string;
  status: VehicleStatus
  subsidiary?: Subsidiary
  kms?: number;
  lastMaintenance?: string
  nextMaintenance?: string
}

export enum PaymentTypeEnum {
  FTC = "FTC",
  COD = "COD",
  ROD = "ROD"
}

export interface PackageInfoForUnloading {
  id?: string,
  trackingNumber: string,
  commitDateTime?: string,
  consNumber?: string,
  consolidated?: Consolidated,
  isHighValue?: boolean,
  priority: Priority,
  recipientAddress?: string,
  recipientCity?: string,
  recipientName?: string,
  recipientPhone?: string,
  recipientZip?: string,
  shipmentType?: string,
  subsidiary?: Subsidiary,
  isCharge?: boolean,
  charge?: Charge,
  isValid: boolean,
  reason?: string,
  isPendingValidation?: boolean,
  payment?: {
    amount: string
    type: PaymentTypeEnum
  }
}


export interface PackageInfo {
  id?: string,
  trackingNumber: string,
  commitDateTime?: string,
  consNumber?: string,
  consolidated?: Consolidated,
  isHighValue?: boolean,
  priority: Priority,
  recipientAddress?: string,
  recipientCity?: string,
  recipientName?: string,
  recipientPhone?: string,
  recipientZip?: string,
  shipmentType?: string,
  subsidiary?: Subsidiary,
  isCharge?: boolean,
  charge?: Charge,
  isValid: boolean,
  reason?: string,
  isPendingValidation?: boolean,
  payment?: {
    amount: string
    type: PaymentTypeEnum
  }
  lastHistory?: StatusHistory
  status?: ShipmentStatusType
}

export interface SearchShipmentDto {
  trackingNumber: string
  commitDateTime: string
  payment: {
    type: string
    amount: number
  }
  recipient: {
        name: string;
        address: string;
        phoneNumber: string;
        zipCode: string
  }
  prority: Priority
  status: string
  subsidiary: string
  unloading: {
    id: string
    trackingNumber: string
  }
  route?:
    | {
        id: string
        trackingNumber: string
        driver: {
          name: string
        }
      }
    | null
}

export interface Unloading {
  id: string;
  trackingNumber: string;
  vehicle?: Vehicles;
  subsidiary?: Subsidiary;
  shipments?: Shipment[];
  chargeShipments?: ChargeShipment[];
  missingTrackings: string[];
  unScannedTrackings: string[];
  date: string;
  createdAt: string;
}

export interface UnloadingFormData {
  id?: string;
  vehicle?: Vehicles;
  subsidiary?: Subsidiary;
  shipments?: string[];
  missingTrackings: string[];
  unScannedTrackings: string[];
  date: string;
}

export interface ShortShipment {
  id?: string;
  trackingNumber: string;
  recipientName?: string;
  recipientAddress?: string;
  recipientPhone?: string;
}

export interface ConsolidatedDetails {
  id: string;
  type: string;
  typeCode: string;
  numberOfPackages: number;
  added: ShortShipment[];
  notFound: ShortShipment[];
  icon: any;
  color: string;
}

export interface Consolidateds {
  airConsolidated: ConsolidatedDetails[],
  groundConsolidated: ConsolidatedDetails[],
  f2Consolidated: ConsolidatedDetails[]
}

export interface ValidTrackingAndConsolidateds {
  validatedShipments: PackageInfo[],
  consolidateds: Consolidateds
}

export interface RouteClosure {
  id?: string;
  closeDate: string;
  returnedPackages: Shipment[];
  podPackages: Shipment[];
  subsidiary: Subsidiary;
  createdBy: User;
  packageDipatch: PackageDispatch;
  actualKms: string;
  collections: string[];
}

export interface ValidatedPackagesForClousere {
  validatedPackages: PackageInfo[],
  podPackages: PackageInfo[]
}

export interface PackageInfoForInventory {
  trackingNumber: string;
  isValid: boolean;
  reason?: string; // en caso de inválido
  priority?: "alta" | "media" | "baja";
  recipientName?: string;
  recipientPhone?: string;
  recipientAddress?: string;
  // Si quieres seguir manejando símbolos igual que desembarque:
  isCharge?: boolean; // Carga/F2/31.5
  isHighValue?: boolean; // Alto valor
  payment?: {
    type: string;
    amount: number;
  };
}
export interface InventoryRequest {
  id?: string;
  trackingNumber?: string;
  inventoryDate?: string;
  subsidiary?: {
    id: string;
    name: string;
  };

  shipments: string[],
  chargeShipments: string[],
  // Listas especiales
  missingTrackings: string[];   // deberían estar pero no se escanearon
  unScannedTrackings: string[]; // aparecieron extra, no registrados en sistema
}

export interface Inventory {
  id: string;
  trackingNumber: string;
  inventoryDate: string;
  subsidiary?: {
    id: string;
    name: string;
  };

  shipments: Shipment[];
  chargeShipments: ChargeShipment[];
  // Listas especiales
  missingTrackings: string[];   // deberían estar pero no se escanearon
  unScannedTrackings: string[]; // aparecieron extra, no registrados en sistema
}


export type InventoryReport = {
  id: string; // id o tracking del reporte (ej. unloadingTrackingNumber)
  createdAt: string; // fecha/hora del reporte en UTC

  subsidiary: {
    id: string;
    name: string;
  };
  packages: InventoryPackage[];

  missingTrackings: string[];
  unScannedTrackings: string[];
};

export type InventoryPackage = {
  trackingNumber: string;
  recipientName: string;
  recipientAddress: string;
  recipientPhone?: string;

  commitDateTime: string; // fecha/hora de compromiso
  isCharge: boolean;      // [C]
  isHighValue: boolean;   // [H]
  payment?: {
    type: string;
    amount: number;
  };
};