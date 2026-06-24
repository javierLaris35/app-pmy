import { ShipmentType } from "@/lib/types"

export interface MonitoringInfo {
  shipmentData: {
    id: string
    trackingNumber: string
    ubication: string
    warehouse?: string
    unloading?: { trackingNumber: string; date: string }
    consolidated?: { consNumber: string; date: string }
    destination: string
    isCharge: boolean
    shipmentStatus: string
    createdDate: string
    commitDateTime: string
    payment: { type: string; amount: number } | null
    recipientName: string
    recipientAddress: string
    recipientPhone: string
    recipientZip: string
    shipmentType: ShipmentType
    daysInWarehouse: string
    lastEventDate: string
    dexCode: string
  }
  packageDispatch?: {
    id: string
    trackingNumber: string
    createdAt: string
    status: string
    driver: any
    route?: string
    vehicle: { name: string; plateNumber: string }
    subsidiary: { id: string; name: string }
  }
}

export interface PackageStats {
  total: number
  enRuta: number
  enBodega: number
  entregados: number
  noEntregados: number
  porcentajeEntrega: number
  porcentajeNoEntrega: number
  eficiencia: number
  packagesWithPayment: number
  totalPaymentAmount: number
  packagesToSettle: number
  totalAmountToSettle: number
  rendimientoReal: number
  entregasEfectivas: number
  dex: number
  sinIntento: number
  tasaDex: number
}
