import { axiosConfig } from "../axios-config"


const getSubsidiaryKpis = async (url: string) => {
  const response = await axiosConfig.get(url);
  return response.data;
};

export {
    getSubsidiaryKpis
}