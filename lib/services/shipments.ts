import { axiosConfig } from "../axios-config";
import { Shipment } from "../types";

//GET
const getShipments = async (url: string) => { 
    const response = await axiosConfig.get<Shipment[]>(url);
    return response.data;
}

const getShipmentById = async (id: string) => {
    const response = await axiosConfig.get(`/shipments/${id}`); 
    return response.data;
}

const saveShipments = async (shipments: Shipment[]) => {
    const response = await axiosConfig.post<Shipment[]>('/shipments', shipments);  
    return response.data;
}


export const uploadShipmentFile = async (file: File): Promise<Shipment[]> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axiosConfig.post<Shipment[]>('/shipments/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

export {
    getShipments,
    getShipmentById,
    saveShipments
}