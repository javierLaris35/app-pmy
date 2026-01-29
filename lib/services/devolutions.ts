import { axiosConfig } from "../axios-config"
import { Devolution } from "../types"

const url = '/devolutions'

const getDevolutions = async (subsidiaryId: string) => {
    console.log("🚀 ~ getDevolutions ~ subsidiaryId:", subsidiaryId)
    const response = await axiosConfig.get<Devolution[]>(`${url}/${subsidiaryId}`);
    return response.data;
}

const saveDevolutions = async (devolutions: Devolution[]) => {
    const response = await axiosConfig.post<Devolution[]>(url, devolutions);
    return response.data;
}

const validateDevolution = async(trackingNumber: string) => {
    const response = await axiosConfig.get(`${url}/validate/${trackingNumber}`);
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
        const response = await axiosConfig.post('devolutions/upload', formData, {
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

export const getUndeliveredShipments = async (subsidiaryId: string, date: string) => {
  const response = await axiosConfig.get(`/shipments/undelivered/${subsidiaryId}?date=${date}`);
  return response.data;
}


export {
    getDevolutions,
    validateDevolution,
    saveDevolutions
}