import { axiosConfig } from "../axios-config"
import { Inventory, InventoryRequest } from "../types"

const url = '/inventories'

const getInventories = async (subsidiaryId: string) => {
    const response = await axiosConfig.get<Inventory[]>(`${url}/${subsidiaryId}`);
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

const validateTrackingNumbers = async(trackingNumbers: string[], subsidiaryId: string) => {
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
    onProgress?: (progress: number) => void
): Promise<any> { 
    const formData = new FormData();
    formData.append('files', pdfFile);
    formData.append('files', excelFile);
    formData.append('subsidiaryName', subsidiaryName);

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