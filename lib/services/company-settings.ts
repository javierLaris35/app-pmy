import { axiosConfig } from "../axios-config";

export interface CompanySettings {
  id?: string;
  name: string;
  taxId: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  updatedAt?: string;
}

export const getCompanySettings = async () => {
  const res = await axiosConfig.get<CompanySettings>("company-settings");
  return res.data;
};

export const updateCompanySettings = async (payload: Partial<CompanySettings>) => {
  const res = await axiosConfig.put<CompanySettings>("company-settings", payload);
  return res.data;
};
