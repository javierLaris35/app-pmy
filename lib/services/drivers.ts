import { axiosConfig } from "../axios-config";
import { Driver } from "../types";

const url = 'drivers';

const getDrivers = async () => {
    const response = await axiosConfig.get<Driver[]>(url);
    return response.data;
}

const getDriversById = async (id: string) => {
    const response = await axiosConfig.get<Driver>(`${url}/${id}`);
    return response.data;
}

const getDriversBySucursalId = async (sucursalId: string) => {
    const response = await axiosConfig.get<Driver>(`${url}/subsidiary/${sucursalId}`);
    return response.data;
}

const saveDriver = async (subsidiary: Driver) => {
    const response = await axiosConfig.post<Driver>(url, subsidiary);
    return response.data;
}

const deleteDriver = async (id: string) => {
    const response = await axiosConfig.delete(`${url}/${id}`);
    return response.data;
}

export {
    getDrivers,
    getDriversById,
    getDriversBySucursalId,
    saveDriver,
    deleteDriver
}