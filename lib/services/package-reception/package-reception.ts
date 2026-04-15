import { axiosConfig } from "@/lib/axios-config";
import { useAuthStore } from "@/store/auth.store";

const url = 'pick-up'

const getScannedPackages = async (subsidiaryId: string) => {
    const token = useAuthStore.getState().token;
    const response = await axiosConfig.get(`${url}/${subsidiaryId}/scanned-packages`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return response.data;
};

const getTrackingNumberInfo = async (trackingNumber: string) => {
    const token = useAuthStore.getState().token;
    const response = await axiosConfig.get(`${url}/tracking-info/${trackingNumber}`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return response.data;
};

const savePackageReception = async (packageData: any) => {
    const token = useAuthStore.getState().token;
    const response = await axiosConfig.post(`${url}/save`, packageData, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return response.data;
};

export {
    getScannedPackages,
    getTrackingNumberInfo,
    savePackageReception
};
