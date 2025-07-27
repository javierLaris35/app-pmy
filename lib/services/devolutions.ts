import { axiosConfig } from "../axios-config"
import { Devolution } from "../types"

const url = '/devolutions'

const getDevolutions = async (subsidiaryId: string) => {
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


export {
    getDevolutions,
    validateDevolution,
    saveDevolutions
}