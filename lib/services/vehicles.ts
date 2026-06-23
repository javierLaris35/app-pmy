import { axiosConfig } from "../axios-config";
import { Vehicles } from "../types";

const url = 'vehicles';

const getVehicles = async () => {
    const response = await axiosConfig.get<Vehicles[]>(url);
    return response.data;
}

const getVehiclesById = async (id: string) => {
    const response = await axiosConfig.get<Vehicles>(`${url}/${id}`);
    return response.data;
}

const getVehiclesBySucursalId = async (sucursalId: string) => {
    const response = await axiosConfig.get<Vehicles[]>(`${url}/subsidiary/${sucursalId}`);
    return response.data;
}

const saveVehicle = async (vehicle: Vehicles) => {
    const response = await axiosConfig.post<Vehicles>(url, vehicle);
    return response.data;
}

const updateVehicle = async (id: string, vehicle: Partial<Vehicles>) => {
    const response = await axiosConfig.patch<Vehicles>(`${url}/${id}`, vehicle);
    return response.data;
}

const deleteVehicle = async (id: string) => {
    const response = await axiosConfig.delete(`${url}/${id}`);
    return response.data;
}

export {
    getVehicles,
    getVehiclesById,
    getVehiclesBySucursalId,
    saveVehicle,
    updateVehicle,
    deleteVehicle
}