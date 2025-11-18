/**
 * Utilidades para el manejo de estados de envíos (shipments)
 *
 * Este módulo centraliza la lógica para obtener información de presentación
 * de badges según el estado de un envío.
 */

import { Package, Truck, Warehouse, XCircle } from "lucide-react"

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
export const getStatusBadge = (status: string): StatusBadgeInfo => {
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