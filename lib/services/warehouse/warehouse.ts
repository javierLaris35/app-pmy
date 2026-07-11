import { axiosConfig } from "@/lib/axios-config"
import { OutboundTypeEnum, ScannedShipment } from "@/lib/types";
import { ListParams, Paginated } from "@/lib/services/pagination";

const url = '/warehouse'

/**
 * Define la respuesta de error para que el frontend pueda manejarla
 */
export type ValidationError = {
  isValid: false;
  trackingNumber: string;
  reason: string;
};

export interface ShipmentWarehouseDto {
  id: string;
  trackingNumber: string;
  shipmentType: string;
  isCharge: boolean;
  remittances: {
    pieceTrackingNumber: string;
    shipmentId: string;
  }[];
}

export interface CreateWarehouseDto {
  warehouse: string;
  shipments: ShipmentWarehouseDto[];
  vehicle: string;
  drivers: string[];
}

export interface OutboundWarehouseDto {
  warehouse: string;
  shipments: ShipmentWarehouseDto[];
  vehicle: string;
  drivers: string[];
  type: OutboundTypeEnum;
  destinationId?: string; // Solo para transferencias
  kms?: number; // Solo para salidas a ruta
  routes?: string[]; // Solo para salidas a ruta
}

/**
 * Valida un paquete mediante su número de tracking.
 * @param trackingNumber El código escaneado.
 * @param subsidiaryId Opcional: ID de la sucursal actual.
 */
const validateShipment = async (
  trackingNumber: string,
  subsidiaryId?: string,
  context?: "inbound" | "outbound"
): Promise<ScannedShipment | ValidationError> => {

  const response = await axiosConfig.get(`${url}/validate-package`, {
    params: {
      trackingNumber,
      subsidiaryId,
      context,
    }
  });

  return response.data;
};

/** Historial paginado de entradas a bodega (semana + paginado). */
const getInboundHistory = async (subsidiaryId: string, params: ListParams = {}) => {
  const response = await axiosConfig.get<Paginated<any>>(`${url}/inbound/subsidiary/${subsidiaryId}`, { params });
  return response.data;
};

/** Historial paginado de salidas de bodega (semana + paginado). */
const getOutboundHistory = async (subsidiaryId: string, params: ListParams = {}) => {
  const response = await axiosConfig.get<Paginated<any>>(`${url}/outbound/subsidiary/${subsidiaryId}`, { params });
  return response.data;
};

/**
 * Guarda una entrada de almacén.
 * @param data 
 * @returns 
 */
const saveWarehouseInbound = async (data: CreateWarehouseDto) => {
  const response = await axiosConfig.post(`${url}`, data);
  return response.data;
}

/**
 * Guarda una salida de almacén.
 * @param data 
 * @returns 
 */
const saveWarehouseOutbound = async (data: OutboundWarehouseDto) => {
  const response = await axiosConfig.post(`${url}/outbound`, data);
  return response.data;
}

export {
    validateShipment,
    saveWarehouseInbound,
    saveWarehouseOutbound,
    getInboundHistory,
    getOutboundHistory
}