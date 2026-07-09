import { format, toZonedTime } from 'date-fns-tz';
import { axiosConfig } from "../axios-config";
import { AddShipmentDto, SearchShipmentDto, Shipment } from "../types";
import { ParsedDhlShipment } from '@/components/import-components/import-dhl-text-modal';

const url = '/shipments'

/**
 * Timeout generoso para las subidas: el backend consulta FedEx POR GUÍA, así que
 * un consolidado grande tarda minutos. Sin un timeout explícito, axios espera
 * "para siempre" y quien corta es un intermediario (proxy) devolviendo un
 * "Network Error" sin contexto. Con esto el corte es determinista y lo podemos
 * etiquetar claramente como timeout.
 */
export const UPLOAD_TIMEOUT_MS = 8 * 60_000; // 8 min

/**
 * Traduce CUALQUIER error de una subida a un mensaje CLARO y compartible.
 * Distingue tres casos para que el usuario sepa qué pasó y me lo pueda reportar:
 *  1) El servidor respondió con error → se muestra el mensaje real del backend.
 *  2) Timeout (no llegó respuesta a tiempo) → probablemente SÍ se procesó; avisa
 *     verificar antes de reintentar (para no duplicar) + código técnico.
 *  3) Se perdió la conexión (sin respuesta) → mismo aviso de verificar + código.
 * Siempre incluye un "Detalle para soporte" con método/URL/código para copiar.
 */
export function extractUploadError(error: any, fallback = "Error al procesar el archivo."): string {
  const method = String(error?.config?.method || "").toUpperCase();
  const reqUrl = error?.config?.url || "";
  const code = error?.code || "";

  // 1) El servidor SÍ respondió → mensaje real del backend.
  if (error?.response) {
    const d = error.response.data;
    const raw = d?.response?.message ?? d?.apiMessage ?? d?.message ?? null;
    const msg = Array.isArray(raw) ? raw.join("\n") : raw;
    if (typeof msg === "string" && msg.trim()) return msg;
    return `El servidor respondió con un error (HTTP ${error.response.status}). ${fallback}\n\nDetalle para soporte: [HTTP_${error.response.status}] ${method} ${reqUrl}`;
  }

  const tech = `Detalle para soporte: [${code || "SIN_RESPUESTA"}] ${method} ${reqUrl}`;

  // 2) Timeout: el request superó el tiempo de espera.
  if (code === "ECONNABORTED" || /timeout/i.test(String(error?.message || ""))) {
    return `La subida superó el tiempo de espera (${Math.round(UPLOAD_TIMEOUT_MS / 60000)} min) y no llegó respuesta del servidor.\n\nEs MUY probable que el archivo SÍ se haya procesado en el servidor. Revisa la lista de consolidados ANTES de reintentar para no duplicar.\n\n${tech}`;
  }

  // 3) Sin respuesta (red caída / conexión cortada por un intermediario).
  if (code === "ERR_NETWORK" || !error?.response) {
    return `Se perdió la conexión con el servidor durante la subida y no llegó respuesta.\n\nEl proceso pudo haberse completado de todas formas — verifica la lista de consolidados ANTES de reintentar para no duplicar.\n\n${tech}`;
  }

  return `${error?.message || fallback}\n\n${tech}`;
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
        timeout: UPLOAD_TIMEOUT_MS,
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percent);
          }
        },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(extractUploadError(error, "Error al subir el Cons Master / Aéreos."));
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
        timeout: UPLOAD_TIMEOUT_MS,
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
        timeout: UPLOAD_TIMEOUT_MS,
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
        timeout: UPLOAD_TIMEOUT_MS,
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

    try {
      const response = await axiosConfig.post<ParsedDhlShipment[]>('/shipments/process-dhl-txt-file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: UPLOAD_TIMEOUT_MS,
        onUploadProgress: (event) => {
          if (event.total) {
            const percent = Math.round((event.loaded * 100) / event.total)
            onProgress?.(percent)
          }
        },
      })
      return response.data
    } catch (error) {
      throw new Error(extractUploadError(error, "Error al procesar el archivo DHL."))
    }
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

  export interface LdCheckResult {
    trackingNumber: string;
    found: boolean;
    isCharge?: boolean;
    status?: string;
    commitDateTime?: string | null;
    recipientName?: string;
    shipmentType?: string;
    ldState: 'active' | 'ld' | 'delivered' | 'closed' | null;
  }

  export const checkLdStatus = async (trackingNumbers: string[]): Promise<LdCheckResult[]> => {
    const response = await axiosConfig.post<LdCheckResult[]>(`${url}/ld-check`, { trackingNumbers });
    return response.data;
  };

  const updateFromDHL = async (
    formData: FormData,
    onProgress?: (progress: number) => void
  ) => {
    try {
      const response = await axiosConfig.post('/shipments/upload-dhl', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: UPLOAD_TIMEOUT_MS,
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percent);
          }
        },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(extractUploadError(error, "Error al subir el archivo DHL."));
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