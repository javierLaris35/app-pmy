import { axiosConfig } from "@/lib/axios-config"

const url = 'monitoring'

const getConsolidateds = async(subsidiaryId: string) => {
    const response = await axiosConfig.get(`${url}/consolidated/${subsidiaryId}`);
    return response.data;
}

const getUnloadings = async(subsidiaryId: string) => {
    const response = await axiosConfig.get(`${url}/unloading/${subsidiaryId}`);
    return response.data;
}

const getPackageDispatchs = async(subsidiaryId: string) => {
    const response = await axiosConfig.get(`${url}/package-dispatch/${subsidiaryId}`);
    return response.data;
}

const getInfoFromPackageDispatch = async(packageDispatchId: string) => {
    console.log("🚀 ~ getInfoFromPackageDispatch ~ packageDispatchId:", packageDispatchId)
    const response = await axiosConfig.get(`${url}/package-dispatch-info/${packageDispatchId}`);
    return response.data;
}

const getInfoFromUnloading = async(unloadingId: string) => {
    const response = await axiosConfig.get(`${url}/unloading-info/${unloadingId}`);
    return response.data;
}

const getInfoFromConsolidated = async(consolidatedId: string) => {
    const response = await axiosConfig.get(`${url}/consolidated-info/${consolidatedId}`);
    return response.data;
}

const updateDataFromFedexByConsolidatedId = async(consolidatedId: string) => {
    const response = await axiosConfig.get(`${url}/update-by-consolidated/${consolidatedId}`);
    return response.data;
}

const updateDataFromFedexByUnloadingId = async(unloadingId: string) => {
    const response = await axiosConfig.get(`${url}/update-by-unloading/${unloadingId}`);
    return response.data;
}

const updateDataFromFedexByPackageDispatchId = async(packageDispatchId: string) => {
    const response = await axiosConfig.get(`${url}/update-by-package-dispatch/${packageDispatchId}`);
    return response.data;
}

const getShipmentsNo67ByConsolidated = async(consolidatedId: string) => {
    const response = await axiosConfig.get(`${url}/consolidated/no-67/${consolidatedId}`);
    return response.data;
}

const getShipmentsNo67ByUnloading = async(unloadingId: string) => {
    const response = await axiosConfig.get(`${url}/unloading/no-67/${unloadingId}`);
    return response.data;
}

const getShipmentsNo67ByPackageDispatch = async(packageDispatchId: string) => {
    const response = await axiosConfig.get(`${url}/package-dispatch/no-67/${packageDispatchId}`);
    return response.data;
}



export {
    getConsolidateds,
    getUnloadings,
    getPackageDispatchs,
    getInfoFromPackageDispatch,
    getInfoFromUnloading,
    getInfoFromConsolidated,
    updateDataFromFedexByConsolidatedId,
    updateDataFromFedexByUnloadingId,
    updateDataFromFedexByPackageDispatchId,
    getShipmentsNo67ByConsolidated,
    getShipmentsNo67ByUnloading,
    getShipmentsNo67ByPackageDispatch
}