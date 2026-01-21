/**
 * Utilidades para el manejo de estados de envíos (shipments)
 *
 * Este módulo centraliza la lógica para obtener información de presentación
 * de badges según el estado de un envío.
 */

import { AlertCircle, Package, Truck, Warehouse, XCircle } from "lucide-react"

/**
 * Información de presentación para un badge de estado
 *
 * @interface StatusBadgeInfo
 * @property {string} label - Texto a mostrar en el badge
 * @property {string} color - Clases de Tailwind para el color del badge
 * @property {string} variant - Variante del badge (secondary, default, outline, destructive)
 * @property {any} icon - Componente de icono de lucide-react
 */
export interface StatusBadgeInfo {
  label: string
  color: string
  variant: "secondary" | "default" | "outline" | "destructive"
  icon: any
}

/**
 * Obtiene la información de presentación para un badge de estado de envío
 *
 * Convierte el estado de un envío en información estructurada para renderizar
 * un badge con el estilo, color, icono y texto apropiados.
 *
 * @param {string} status - Estado del envío (ej: "entregado", "en_ruta", etc.)
 * @returns {StatusBadgeInfo} Información de presentación del badge
 *
 * @example
 * ```tsx
 * const statusInfo = getStatusBadge("entregado")
 * const StatusIcon = statusInfo.icon
 *
 * <Badge variant={statusInfo.variant} className={statusInfo.color}>
 *   <StatusIcon className="mr-1 h-3 w-3" />
 *   {statusInfo.label}
 * </Badge>
 * ```
 *
 * Estados soportados:
 * - "entregado": Badge verde con icono de paquete
 * - "no_entregado": Badge rojo con icono de error
 * - "en_ruta": Badge púrpura con icono de camión
 * - "en_bodega": Badge azul con icono de bodega
 * - "desconocido" o cualquier otro: Badge gris con icono de paquete
 *
 * La función normaliza el status a minúsculas, por lo que "ENTREGADO" y "entregado"
 * se tratan de la misma forma.
 */

export enum ShipmentStatus {
  RECOLECCION = 'recoleccion',
  RECIBIDO_EN_BODEGA = 'recibido_en_bodega',
  PENDIENTE = 'pendiente',
  EN_RUTA = 'en_ruta',
  EN_TRANSITO = 'en_transito',
  ENTREGADO = 'entregado',
  NO_ENTREGADO = 'no_entregado',
  DESCONOCIDO = 'desconocido',
  RECHAZADO = 'rechazado',
  DEVUELTO_A_FEDEX = 'devuelto_a_fedex',
  ES_OCURRE = 'es_ocurre',
  EN_BODEGA = 'en_bodega',
  RETENIDO_POR_FEDEX = 'retenido_por_fedex',
  ESTACION_FEDEX = 'estacion_fedex',
  LLEGADO_DESPUES = 'llegado_despues',
  DIRECCION_INCORRECTA = 'direccion_incorrecta',
  CLIENTE_NO_DISPONIBLE = 'cliente_no_disponible',
}


export const getStatusBadgeResp = (status: string): StatusBadgeInfo => {
  const variants: Record<string, StatusBadgeInfo> = {
    "entregado": {
      label: "Entregado",
      color: "bg-green-50 text-green-700 ring-green-600/20",
      variant: "outline",
      icon: Package
    },
    "no_entregado": {
      label: "No Entregado",
      color: "bg-red-50 text-red-700 ring-red-600/20",
      variant: "destructive",
      icon: XCircle
    },
    "en_ruta": {
      label: "En Ruta",
      color: "bg-purple-50 text-purple-700 ring-purple-700/10",
      variant: "default",
      icon: Truck
    },
    "en_bodega": {
      label: "En Bodega",
      color: "bg-blue-50 text-blue-700 ring-blue-700/10",
      variant: "secondary",
      icon: Warehouse
    },
    "desconocido": {
      label: "Desconocido",
      color: "bg-gray-50 text-gray-700 ring-gray-700/10",
      variant: "secondary",
      icon: Package
    }
  }

  // Convertir el status a minúsculas para que coincida con las claves
  const normalizedStatus = status?.toLowerCase() || "desconocido"

  return (
    variants[normalizedStatus] || variants["desconocido"]
  )
}

const BADGES = {
  SUCCESS: {
    label: 'Entregado',
    color: 'bg-green-50 text-green-700 ring-green-600/20',
    variant: 'outline',
    icon: Package,
  },
  ERROR: {
    label: 'No Entregado',
    color: 'bg-red-50 text-red-700 ring-red-600/20',
    variant: 'destructive',
    icon: XCircle,
  },
  WARNING: {
    label: 'Pendiente',
    color: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
    variant: 'secondary',
    icon: AlertCircle,
  },
  INFO: {
    label: 'En Ruta',
    color: 'bg-purple-50 text-purple-700 ring-purple-700/10',
    variant: 'default',
    icon: Truck,
  },
  STORAGE: {
    label: 'En Bodega',
    color: 'bg-blue-50 text-blue-700 ring-blue-700/10',
    variant: 'secondary',
    icon: Warehouse,
  },
  NEUTRAL: {
    label: 'Desconocido',
    color: 'bg-gray-50 text-gray-700 ring-gray-700/10',
    variant: 'secondary',
    icon: Package,
  },
}

const STATUS_BADGE_MAP: Record<ShipmentStatus, StatusBadgeInfo> = {
  [ShipmentStatus.ENTREGADO]: {
    ...BADGES.SUCCESS,
    label: 'Entregado',
  },

  [ShipmentStatus.NO_ENTREGADO]: {
    ...BADGES.ERROR,
    label: 'No Entregado',
  },

  [ShipmentStatus.RECHAZADO]: {
    ...BADGES.ERROR,
    label: 'Rechazado',
  },

  [ShipmentStatus.DEVUELTO_A_FEDEX]: {
    ...BADGES.ERROR,
    label: 'Devuelto a FedEx',
  },

  [ShipmentStatus.DIRECCION_INCORRECTA]: {
    ...BADGES.ERROR,
    label: 'Dirección Incorrecta',
  },

  [ShipmentStatus.CLIENTE_NO_DISPONIBLE]: {
    ...BADGES.ERROR,
    label: 'Cliente No Disponible',
  },

  [ShipmentStatus.RETENIDO_POR_FEDEX]: {
    ...BADGES.WARNING,
    label: 'Retenido por FedEx',
  },

  [ShipmentStatus.LLEGADO_DESPUES]: {
    ...BADGES.WARNING,
    label: 'Llegó Después',
  },

  [ShipmentStatus.PENDIENTE]: {
    ...BADGES.WARNING,
    label: 'Pendiente',
  },

  [ShipmentStatus.EN_RUTA]: {
    ...BADGES.INFO,
    label: 'En Ruta',
  },

  [ShipmentStatus.EN_TRANSITO]: {
    ...BADGES.INFO,
    label: 'En Tránsito',
  },

  [ShipmentStatus.RECOLECCION]: {
    ...BADGES.INFO,
    label: 'Recolección',
  },

  [ShipmentStatus.ESTACION_FEDEX]: {
    ...BADGES.INFO,
    label: 'Estación FedEx',
  },

  [ShipmentStatus.RECIBIDO_EN_BODEGA]: {
    ...BADGES.STORAGE,
    label: 'Recibido en Bodega',
  },

  [ShipmentStatus.EN_BODEGA]: {
    ...BADGES.STORAGE,
    label: 'En Bodega',
  },

  [ShipmentStatus.ES_OCURRE]: {
    ...BADGES.STORAGE,
    label: 'Ocurre',
  },

  [ShipmentStatus.DESCONOCIDO]: BADGES.NEUTRAL,
}

export const getStatusBadge = (status: string): StatusBadgeInfo => {
  const normalizedStatus = status?.toLowerCase() as ShipmentStatus

  return (
    STATUS_BADGE_MAP[normalizedStatus] ??
    BADGES.NEUTRAL
  )
}