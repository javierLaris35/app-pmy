import { axiosConfig } from "../axios-config"
import { DispatchFormData, EmailLog, PackageDispatch, PackageDispatchResponse, PackageInfo } from "../types"
import { Paginated, ListParams } from "./pagination"

const url = '/package-dispatchs'

/** Resultado de un (re)envío de correo, para informar en el toast. */
export interface ResendEmailResult {
    status: 'sent' | 'error'
    error?: string
    to?: string
}

// Historial completo de envíos de correo de una salida a ruta.
const getDispatchEmailHistory = async (id: string): Promise<EmailLog[]> => {
    const response = await axiosConfig.get<EmailLog[]>(`${url}/${id}/email-history`)
    return response.data
}

/** Filtros de la tabla de salidas (se aplican en el backend; listas separadas por coma). */
export interface DispatchListParams extends ListParams {
    status?: string;
    driverId?: string;
    day?: string;
    is315?: string;
}

/** Opciones de los filtros calculadas sobre TODA la semana (no solo la página). */
export interface DispatchListFacets {
    drivers: { id: string; name: string }[];
    days: string[];
}

const getPackageDispatchs = async (subsidiaryId: string, params: DispatchListParams = {}) => {
    const response = await axiosConfig.get<Paginated<PackageDispatchResponse> & { facets?: DispatchListFacets }>(
        `${url}/subsidiary/${subsidiaryId}`,
        { params },
    );
    return response.data;
}

const getPackageDispatchById = async (id: string) => {
    const response = await axiosConfig.get<PackageDispatch>(`${url}/${id}`);
    return response.data;
}

/** Cambio registrado al editar una salida (agregar/quitar guía). */
export interface PackageDispatchChange {
    id: string
    action: "add" | "remove"
    trackingNumber: string
    previousStatus: string | null
    newStatus: string | null
    reason: string
    createdAt: string
    userName: string
}

/** Agrega guías a una salida abierta (permiso operaciones.salidas.editar). */
export const addDispatchPackages = async (id: string, trackingNumbers: string[], reason: string) => {
    const response = await axiosConfig.post<{ dispatchId: string; trackingNumbers: string[] }>(`${url}/${id}/packages`, { trackingNumbers, reason })
    return response.data
}

/** Quita paquetes (ids de shipment o carga) de una salida abierta. */
export const removeDispatchPackages = async (id: string, ids: string[], reason: string) => {
    const response = await axiosConfig.post<{ dispatchId: string; trackingNumbers: string[] }>(`${url}/${id}/packages/remove`, { ids, reason })
    return response.data
}

export const getDispatchChanges = async (id: string) => {
    const response = await axiosConfig.get<PackageDispatchChange[]>(`${url}/${id}/changes`)
    return response.data
}

const savePackageDispatch = async (packageDispatch: DispatchFormData) => {
    const response = await axiosConfig.post<PackageDispatch>(url, packageDispatch);
    return response.data;
}

const validateTrackingNumber = async (trackingNumber: string, subsidiaryId: string) => {
    const response = await axiosConfig.get<PackageInfo>(`${url}/validate-tracking-number/${trackingNumber}/${subsidiaryId}`);
    return response.data;
}

// Valida toda la lista escaneada en UN solo request (modo batch por sucursal).
// El backend devuelve los paquetes ya ordenados según la config de la sucursal.
const validateTrackingsList = async (trackingNumbers: string[], subsidiaryId: string) => {
    const response = await axiosConfig.post<PackageInfo[]>(`${url}/validate-trackings`, { trackingNumbers, subsidiaryId });
    return response.data;
}

const getShipmensByDispatchId = async (dispatchId: string) => {
    const response = await axiosConfig.get<PackageDispatch>(`${url}/info/${dispatchId}`);
    return response.data;
}

export async function uploadPDFile(
    pdfFile: File,
    excelFile: File,
    subsidiaryName: string,
    packageDispatchId: string,
    onProgress?: (progress: number) => void,
    opts?: { isResend?: boolean }
): Promise<any> {
    const formData = new FormData();
    formData.append('files', pdfFile);
    formData.append('files', excelFile);
    formData.append('subsidiaryName', subsidiaryName);
    formData.append('packageDispatchId', packageDispatchId);
    if (opts?.isResend) formData.append('isResend', 'true');

    try {
        const response = await axiosConfig.post('/package-dispatchs/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log('Upload Progress:', percent);
            onProgress(percent);
            }
        },
        });

        return response.data;
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error; // Rethrow to let the caller handle it
    }
}

export {
    getPackageDispatchs,
    savePackageDispatch,
    getPackageDispatchById,
    validateTrackingNumber,
    validateTrackingsList,
    getShipmensByDispatchId,
    getDispatchEmailHistory
}