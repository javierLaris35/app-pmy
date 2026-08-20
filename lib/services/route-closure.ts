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

const validateTrackinNumberNoVan = async (noVanTrackingNumbers: string[]) => {
    const response = await axiosConfig.post<{ validNoVanTrackings: string[] }>(`${url}/validateNoVanTrackings`, {
        noVanTrackingNumbers
    });
    return response.data;
}

/**
 * Se llama AL ABRIR el cierre a ruta: el backend reconcilia y PERSISTE el último estatus
 * FedEx de todas las guías del despacho (shipments + F2), para que los buckets del cierre
 * reflejen la realidad y el `en_ruta` interno no le gane al estatus real del mismo día.
 * En rutas 31.5 (is315) el backend solo toca los F2. Read-heavy: puede tardar un poco.
 */
const reconcile = async (packageDispatchId: string) => {
    const response = await axiosConfig.post<{
        packageDispatchId: string;
        is315: boolean;
        total: number;
        updated: number;
        outcomes: unknown[];
    }>(`${url}/reconcile/${packageDispatchId}`);
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
    validateTrackingNumbers,
    validateTrackinNumberNoVan,
    reconcile
}