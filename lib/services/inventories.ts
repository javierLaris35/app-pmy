import { axiosConfig } from "../axios-config"
import { Inventory, InventoryRequest } from "../types"
import { Paginated, ListParams } from "./pagination"

const url = '/inventories'

const getInventories = async (subsidiaryId: string, params: ListParams = {}) => {
    const response = await axiosConfig.get<Paginated<Inventory>>(`${url}/${subsidiaryId}`, { params });
    return response.data;
}

/** Inventario completo (con paquetes) para detalle / Excel. */
export const getInventoryDetail = async (id: string) => {
    const response = await axiosConfig.get<Inventory>(`${url}/detail/${id}`);
    return response.data;
}

const saveInventory = async (inventory: InventoryRequest) => {
    const response = await axiosConfig.post<Inventory>(url, inventory);
    return response.data;
}

const validateInventory = async(trackingNumber: string) => {
    const response = await axiosConfig.get(`${url}/validate/${trackingNumber}`);
    return response.data;
}

export interface InventoryValidationPayload {
    trackingNumber: string;
    /** true = ya validado antes; el backend NO re-consulta la BD y reusa estos datos. */
    isAlreadyValidated: boolean;
    isValid?: boolean;
    isCharge?: boolean;
    [key: string]: any;
}

const validateTrackingNumbers = async(
    trackingNumbers: InventoryValidationPayload[],
    subsidiaryId: string
) => {
    const response = await axiosConfig.post(
        `${url}/validate-tracking-numbers`,
        { trackingNumbers, subsidiaryId }
    );
    return response.data;
}


export async function uploadFiles(
    pdfFile: File,
    excelFile: File,
    subsidiaryName: string,
    inventoryId: string,
    onProgress?: (progress: number) => void
): Promise<any> {
    if (!inventoryId) {
        throw new Error('uploadFiles: falta el inventoryId; no se puede enviar el correo al destinatario correcto.');
    }

    const formData = new FormData();
    formData.append('files', pdfFile);
    formData.append('files', excelFile);
    formData.append('subsidiaryName', subsidiaryName);
    // El backend resuelve el destinatario del correo a partir de la sucursal
    // guardada en ESTE inventario. Sin el id, cargaría un inventario al azar.
    formData.append('inventoryId', inventoryId);

    try {
        const response = await axiosConfig.post('inventories/upload', formData, {
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
    getInventories,
    validateInventory,
    validateTrackingNumbers,
    saveInventory
}