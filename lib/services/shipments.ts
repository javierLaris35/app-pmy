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

  export async function uploadShipmentFile(
    file: File,
    onProgress?: (progress: number) => void
  ) {
    const formData = new FormData()
    formData.append("file", file)

    const response = await axiosConfig.post("/shipments/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          console.log("Progreso:", percent)
          onProgress(percent)
        }
      }
    })

    return response.data
  }

  export const uploadShipmentFileDhl = async (
    text: string, file: File,
    onProgress?: (progress: number) => void
  ): Promise<Shipment[]> => {
    const blob = new Blob([text], { type: 'text/plain' })
    const fileParsed = new File([blob], 'shipment.txt', { type: 'text/plain' })
    const formData = new FormData()
    formData.append('excelFile', file); // archivo .xlsx
    formData.append('txtFile', fileParsed); 
    

    const response = await axiosConfig.post<Shipment[]>('/shipments/upload-dhl', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (event) => {
        if (event.total) {
          const percent = Math.round((event.loaded * 100) / event.total)
          onProgress?.(percent)
        }
      },
    })

    return response.data
  }

export {
    getShipments,
    getShipmentById,
    saveShipments
}