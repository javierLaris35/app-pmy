import { axiosConfig } from "@/lib/axios-config";
import { CreateHolidayPayload, Holiday } from "@/lib/types";

const url = "/holidays";

export const getHolidays = async (endpoint: string = url) => {
  const response = await axiosConfig.get<Holiday[]>(endpoint);
  return response.data;
};

export const createHoliday = async (payload: CreateHolidayPayload) => {
  const response = await axiosConfig.post<Holiday>(url, payload);
  return response.data;
};

export const deleteHoliday = async (id: string) => {
  const response = await axiosConfig.delete(`${url}/${id}`);
  return response.data;
};
