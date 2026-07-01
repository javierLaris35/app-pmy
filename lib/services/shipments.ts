import { format, toZonedTime } from 'date-fns-tz';
import { axiosConfig } from "../axios-config";
import { AddShipmentDto, SearchShipmentDto, Shipment } from "../types";
import { ParsedDhlShipment } from '@/components/import-components/import-dhl-text-modal';

const url = '/shipments'

/**
 * Extrae el mensaje REAL del backend de un error de axios (BusinessException,
 * filtro global, validaciones de Nest). Así cualquier error de la carga llega
 * legible al frontend para atenderlo rápido.
 */
export function extractUploadError(error: any, fallback = "Error al procesar el archivo."): string {
  const d = error?.response?.data;
  const raw =
    d?.response?.message ?? // Nest a veces anida en data.response.message
    d?.apiMessage ??
    d?.message ??
    error?.message;
  if (Array.isArray(raw)) return raw.join("\n");
  return (typeof raw === "string" && raw.trim()) ? raw : fallback;
}

//GET
  const getShipments = async (url: string) => { 
      const response = await axiosConfig.get<Shipment[]>(url);
      return response.data;
  }

  const getShipmentById = async (id: string) => {
      const response = await axiosConfig.get(`/shipments/${id}`); 
      return response.data;
  }

  const getShipmentByTrackingNumber = async (trackingNumber: string) => {
    const response = await axiosConfig.get(`/shipments/${trackingNumber}`);
    return response.data;
  }

  const getShipmentByTrackingNumberShowHistory = async (trackingNumber: string) => {
    const response = await axiosConfig.get(`/shipments/${trackingNumber}/history`);
    return response.data;
  }

  const getCharges = async (url: string) => {
    const response = await axiosConfig.get(url);
    return response.data;
  }

  const saveShipments = async (shipments: Shipment[]) => {
      const response = await axiosConfig.post<Shipment[]>('/shipments', shipments);
      return response.data;
  }

  const createShipmentInDesembarcos = async (shipmentData: AddShipmentDto) => {
    const response = await axiosConfig.post<{
      ok: boolean
      message: string
      shipment?: Shipment
    }>('/shipments/add-shipment', shipmentData);
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
    consNumber: string = '',
    consDate?: string,
    isAereo: boolean = false,
    onProgress?: (progress: number) => void
  ) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('subsidiaryId', subsidiaryId);
    formData.append('consNumber', consNumber);
    formData.append('isAereo', String(isAereo));

    if (consDate) {
      try {
        const parsedDate = new Date(consDate);
        const utcDate = toZonedTime(parsedDate, 'UTC');
        const formattedDate = format(utcDate, "yyyy-MM-dd'T'HH:mm:ss'Z'", { timeZone: 'UTC' });
        formData.append('consDate', formattedDate);
      } catch (error) {
        console.error('Error formatting date:', error);
      }
    }

    try {
      const response = await axiosConfig.post('/shipments/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percent);
          }
        },
      });
      return response.data;
    } catch (error: any) {
      const data = error.response?.data;
      
      // Lógica para extraer el mensaje real oculto tras el "apiMessage: E"
      // Buscamos en: data.response.message (que es donde NestJS puso el error real)
      const serverMessage = data?.response?.message || data?.message || error.message;
      
      // Si el mensaje es un array (común en validaciones de NestJS), lo unimos con saltos de línea
      const finalMessage = Array.isArray(serverMessage) 
        ? serverMessage.join('\n') 
        : serverMessage;

      throw new Error(finalMessage);
    }
  }
  
  export interface UploadPreview {
    fileName: string
    parseError: string | null
    totalRows: number
    withTracking: number
    emptyTracking: number
    duplicatesInFile: number
    alreadyImportedCount: number
    alreadyImported: { trackingNumber: string; consNumber: string | null; date: string | null }[]
    newCount: number
    consNumberExists: { id: string; consNumber: string; type: string; date: string | null; numberOfPackages: number; subsidiary: string | null } | null
  }

  /** Pre-valida un archivo SIN guardar: duplicados de guías + consNumber existente. */
  export async function previewShipmentFile(
    file: File,
    subsidiaryId: string,
    consNumber: string = "",
    carrier: string = "fedex",
  ): Promise<UploadPreview> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('subsidiaryId', subsidiaryId)
    formData.append('consNumber', consNumber)
    formData.append('carrier', carrier)
    try {
      const response = await axiosConfig.post<UploadPreview>('/shipments/upload/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return response.data
    } catch (error) {
      throw new Error(extractUploadError(error, "Error al validar el archivo."))
    }
  }

  export async function uploadHighValueShipments(file: File,
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

    try {
      const response = await axiosConfig.post("/shipments/upload-hv", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total))
        },
      })
      return response.data
    } catch (error) {
      throw new Error(extractUploadError(error, "Error al subir High Value."))
    }
  }

  export async function uploadF2ChargeShipments(
    file: File,
    subsidiaryId: string,
    consNumber: string = "",
    consDate?: string,
    notRemoveCharge: boolean = false,
    onProgress?: (progress: number) => void
  ) {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("subsidiaryId", subsidiaryId)
    formData.append("consNumber", consNumber || "")
    formData.append("notRemoveCharge", notRemoveCharge ? "true" : "false")

    // Solo agrega consDate si existe
    if (consDate) {
      formData.append("consDate", consDate)
    }

    try {
      const response = await axiosConfig.post("/shipments/upload-charge", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total))
        },
      })
      return response.data
    } catch (error) {
      throw new Error(extractUploadError(error, "Error al subir F2 / cargos."))
    }
  }

  export async function uploadShipmentPayments(
    file?: File,
    onProgress?: (progress: number) => void
  ) {
    const formData = new FormData()
    if (file) formData.append("file", file)

    try {
      const response = await axiosConfig.post("/shipments/upload-payment", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total))
        },
      })
      return response.data
    } catch (error) {
      throw new Error(extractUploadError(error, "Error al aplicar cobros."))
    }
  }

  export const uploadShipmentFileDhl = async (
    text: string, 
    onProgress?: (progress: number) => void
  ): Promise<ParsedDhlShipment[]> => {
    const blob = new Blob([text], { type: 'text/plain' })
    const fileParsed = new File([blob], 'shipment.txt', { type: 'text/plain' })
    const formData = new FormData()
    
    // El backend tiene @UseInterceptors(FileInterceptor('file')), 
    // por lo que la llave aquí debe ser estrictamente 'file'
    formData.append('file', fileParsed); 
    
    const response = await axiosConfig.post<ParsedDhlShipment[]>('/shipments/process-dhl-txt-file', formData, {
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

  export const searchPackageInfo = async (trackingNumber: string): Promise<SearchShipmentDto> => {
    const response = await axiosConfig.get<SearchShipmentDto>(`${url}/search-by-trackingnumber/${trackingNumber}`);
    return response.data;
  }

  export const getHistoryById = async (id: string, isCharge: boolean) => {
    const response = await axiosConfig.get(`${url}/history/${id}?isCharge=${isCharge}`);
    return response.data;
  }

  export const getFedexTrackingInfo = async (trackingNumbers: string[]) => {
    const response = await axiosConfig.post(
      `${url}/fedex-direct`,  // Asegúrate que la ruta coincida con tu controller
      { trackingNumbers }  // Esto va como body en POST
    );
    return response.data;
  };

  const updateFromDHL = async (
    formData: FormData,
    onProgress?: (progress: number) => void
  ) => {
    try {
      const response = await axiosConfig.post('/shipments/upload-dhl', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percent);
          }
        },
      });
      return response.data;
    } catch (error: any) {
      const data = error.response?.data;
      
      // Lógica para extraer el mensaje real oculto tras el "apiMessage: E" de NestJS
      const serverMessage = data?.response?.message || data?.message || error.message;
      
      const finalMessage = Array.isArray(serverMessage) 
        ? serverMessage.join('\n') 
        : serverMessage;

      throw new Error(finalMessage);
    }
  }

  /** DEV: dispara el tracking de FedEx on-demand (solo superadmin). */
  const runDevTracking = async (params: { limit?: number; phase?: "master" | "charge" | "both" }) => {
    const response = await axiosConfig.get(`${url}/dev/run-tracking`, { params });
    return response.data as {
      phase: string;
      limit: number | string;
      durationSec: number;
      master?: { requested: number; summary: any };
      charge?: { requested: number; summary: any };
    };
  };

export {
    getShipments,
    getShipmentById,
    saveShipments,
    createShipmentInDesembarcos,
    generateKpis,
    generateDashboardKpis,
    getCharges,
    getShipmentByTrackingNumberShowHistory,
    getShipmentByTrackingNumber,
    updateFromDHL,
    runDevTracking
}