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


export {
    getPackageDispatchs,
    savePackageDispatch,
    getPackageDispatchById,
    validateTrackingNumber
}