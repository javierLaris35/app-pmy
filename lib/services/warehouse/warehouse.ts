import { axiosConfig } from "@/lib/axios-config"
import { ScannedShipment } from "@/lib/types";

const url = '/warehouse'

/**
 * Define la respuesta de error para que el frontend pueda manejarla
 */
export type ValidationError = {
  isValid: false;
  trackingNumber: string;
  reason: string;
};

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


export {
    validateShipment
}