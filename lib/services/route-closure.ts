import { axiosConfig } from "../axios-config";
import { PackageInfo, RouteClosure, ValidatedPackagesForClousere } from "../types";

const url = "/route-closure";


const save = async (routeClosure: RouteClosure) => {
    const response = await axiosConfig.post<RouteClosure>(url, routeClosure);
    return response.data;
}

const validateTrackingNumbers = async (trackingNumbers: string[], packageDispatchId: string) => {
    const response = await axiosConfig.post<ValidatedPackagesForClousere>(`${url}/validateTrackingsForClosure`, {
        trackingNumbers,
        packageDispatchId
    });
    
    return response.data;
}

export async function uploadFiles(
    pdfFile: File,
    excelFile: File,
    routeClosureId: string,
    onProgress?: (progress: number) => void
): Promise<any> { 
    const formData = new FormData();
    formData.append('files', pdfFile);
    formData.append('files', excelFile);
    formData.append('routeClosureId', routeClosureId);

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
    save,
    validateTrackingNumbers
}