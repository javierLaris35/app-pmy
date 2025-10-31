import { axiosConfig } from "../axios-config";
import { Subsidiary } from "../types";

const url = 'subsidiaries';

const getSubsidiaries = async () => {
    const response = await axiosConfig.get<Subsidiary[]>(url);
    return response.data;
}

const getSubsidiaryById = async (id: string) => {
    const response = await axiosConfig.get<Subsidiary>(`${url}/${id}`);
    return response.data;
}

const saveSubsidiary = async (subsidiary: Subsidiary) => {
    const response = await axiosConfig.post<Subsidiary>(url, subsidiary);
    return response.data;
}

const deleteSubsidiary = async (id: string) => {
    const response = await axiosConfig.delete(`${url}/${id}`);
    return response.data;
}

export {
    getSubsidiaries,
    getSubsidiaryById,
    saveSubsidiary,
    deleteSubsidiary
};