import { axiosConfig } from "../axios-config";
import { Zone } from "../types";

const url = "/zone";

export interface ZonePayload {
  name: string;
  description?: string;
}

const getZones = async () => {
  const response = await axiosConfig.get<Zone[]>(url);
  return response.data;
};

const createZone = async (payload: ZonePayload) => {
  const response = await axiosConfig.post<Zone>(url, payload);
  return response.data;
};

const updateZone = async (id: string, payload: ZonePayload) => {
  const response = await axiosConfig.patch<Zone>(`${url}/${id}`, payload);
  return response.data;
};

const deleteZone = async (id: string) => {
  const response = await axiosConfig.delete(`${url}/${id}`);
  return response.data;
};

export { getZones, createZone, updateZone, deleteZone };
