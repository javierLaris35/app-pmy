import { axiosConfig } from "../axios-config";
import { RouteIncome } from "../types";

//GET
const getIncomes = async (url: string) => { 
    const response = await axiosConfig.get<RouteIncome[]>(url);
    return response.data;
}

export {
    getIncomes,
}