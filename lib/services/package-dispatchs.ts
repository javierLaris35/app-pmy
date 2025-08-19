import { axiosConfig } from "../axios-config"
import { ChargeShipment, DispatchFormData, PackageDispatch, PackageInfo, Shipment } from "../types"

const url = '/package-dispatchs'

const getPackageDispatchs = async (subsidiaryId: string) => {
    const response = await axiosConfig.get<PackageDispatch[]>(`${url}/${subsidiaryId}`);
    return response.data;
}

const getPackageDispatchById = async (id: string) => {
    const response = await axiosConfig.get<PackageDispatch>(`${url}/${id}`);
    return response.data;
}


const savePackageDispatch = async (packageDispatch: DispatchFormData) => {
    const response = await axiosConfig.post<PackageDispatch>(url, packageDispatch);
    return response.data;
}

const validateTrackingNumber = async (trackingNumber: string, subsidiaryId: string) => {
    const response = await axiosConfig.get<PackageInfo>(`${url}/validate-tracking-number/${trackingNumber}/${subsidiaryId}`);
    return response.data;
}   


export async function uploadPDFile(
    pdfFile: File,
    excelFile: File,
    subsidiaryName: string,
    packageDispatchId: string,
    onProgress?: (progress: number) => void
): Promise<any> { 
    const formData = new FormData();
    formData.append('files', pdfFile);
    formData.append('files', excelFile);
    formData.append('subsidiaryName', subsidiaryName);
    formData.append('packageDispatchId', packageDispatchId);

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
    validateTrackingNumber
}