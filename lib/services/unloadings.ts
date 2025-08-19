import { axiosConfig } from "../axios-config"
import { PackageInfo, Unloading, UnloadingFormData } from "@/lib/types"

const url = '/unloadings'

const getUnloadings = async (subsidiaryId: string) => {
    const response = await axiosConfig.get<Unloading[]>(`${url}/${subsidiaryId}`);
    return response.data;
}

const getUnloadingById = async (id: string) => {
    const response = await axiosConfig.get<Unloading>(`${url}/${id}`);
    return response.data;
}

const saveUnloading = async (unloading: UnloadingFormData) => {
    const response = await axiosConfig.post<Unloading>(url, unloading);
    return response.data;
}

const validateTrackingNumber = async (trackingNumber: string, subsidiaryId: string) => {
    const response = await axiosConfig.get<PackageInfo>(`${url}/validate-tracking-number/${trackingNumber}/${subsidiaryId}`);
    return response.data;
}   


export async function uploadPDFile(
    file: File,
    excelFile: File,
    subsidiaryName: string,
    unloadingId: string,
    onProgress?: (progress: number) => void
): Promise<any> { 
    const formData = new FormData();
    formData.append('files', file);
    formData.append('files', excelFile)
    formData.append('subsidiaryName', subsidiaryName);
    formData.append('unloadingId', unloadingId);

    try {
        const response = await axiosConfig.post(`${url}/upload`, formData, {
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
    getUnloadings,
    saveUnloading,
    getUnloadingById,
    validateTrackingNumber
}