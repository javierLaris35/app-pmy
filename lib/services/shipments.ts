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

  const getCharges = async () => {
    const response = await axiosConfig.get('/shipments/charges');
    return response.data;
  }

  const saveShipments = async (shipments: Shipment[]) => {
      const response = await axiosConfig.post<Shipment[]>('/shipments', shipments);  
      return response.data;
  }

  const generateKpis = async() => {
    const response = await axiosConfig.get('/shipments/kpis');
    return response.data;
  }

  const generateDashboardKpis = async (from?: string, to?: string, subsidiaryId?: string) => {
    const params: Record<string, string> = {}

    if (from) params.from = from
    if (to) params.to = to
    if (subsidiaryId) params.subsidiaryId = subsidiaryId

    const response = await axiosConfig.get('/shipments/dashboard/kpis', { params })

    return response.data
  }

  export async function uploadShipmentFile(
    file: File,
    subsidiaryId: string,
    consNumber: string = "",
    consDate?: string,
    onProgress?: (progress: number) => void
  ) {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("subsidiaryId", subsidiaryId)
    formData.append("consNumber", consNumber || "")

    // Solo agrega consDate si existe
    if (consDate) {
      formData.append("consDate", consDate)
    }

    const response = await axiosConfig.post("/shipments/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          console.log("Progreso:", percent)
          onProgress(percent)
        }
      },
    })

    return response.data
  }

  export async function uploadF2ChargeShipments(
    file: File,
    subsidiaryId: string,
    consNumber: string = "",
    consDate?: string,
    onProgress?: (progress: number) => void
  ) {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("subsidiaryId", subsidiaryId)
    formData.append("consNumber", consNumber || "")

    // Solo agrega consDate si existe
    if (consDate) {
      formData.append("consDate", consDate)
    }

    const response = await axiosConfig.post("/shipments/upload-charge", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          console.log("Progreso:", percent)
          onProgress(percent)
        }
      },
    })

    return response.data
  }

  export async function uploadShipmentPayments(
    file: File,
    onProgress?: (progress: number) => void
  ) {
    const formData = new FormData()
    formData.append("file", file)

    const response = await axiosConfig.post("/shipments/upload-payment", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          console.log("Progreso:", percent)
          onProgress(percent)
        }
      },
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
    saveShipments,
    generateKpis,
    generateDashboardKpis,
    getCharges
}