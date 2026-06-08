import { axiosConfig } from "@/lib/axios-config"
import { OutboundTypeEnum, ScannedShipment } from "@/lib/types";

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
  subsidiaryId?: string
): Promise<ScannedShipment | ValidationError> => {
  
  const response = await axiosConfig.get(`${url}/validate-package`, {
    params: {
      trackingNumber,
      subsidiaryId
    }
  });

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

const sendNotificationEmail = async (
  pdfFile: File,
  excelFile: File,
  warehouseName: string,
  type: "inbound" | "outbound",
  id: string
) => {
  try {
    const formData = new FormData();
    formData.append('files', pdfFile);
    formData.append('files', excelFile);
    formData.append('warehouseName', warehouseName);
    formData.append('type', type);
    formData.append('id', id);

    const response = await axiosConfig.post(`${url}/notification`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error sending notification email:", error);
  }
};


export {
    validateShipment,
    saveWarehouseInbound,
    saveWarehouseOutbound,
    sendNotificationEmail
}