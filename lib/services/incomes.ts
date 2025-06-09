import { axiosConfig } from "../axios-config";
import { FinancialSummary, RouteIncome } from "../types";


const url = "/incomes"

//GET
const getIncomes = async (subsidiaryId: string, from: Date, to: Date) => { 
    const response = await axiosConfig.get<RouteIncome[]>(`${url}/${subsidiaryId}/${from}/${to}`);
    return response.data;
}

const getIncomeByMonth = async(firstDay: Date, lastDay: Date) => {
    const response = await axiosConfig.get<RouteIncome[]>(`${url}/${firstDay}/${lastDay}`);
    return response.data;
}

const getFinantialResume = async(subsidiaryId: string, firstDay: string, lastDay: string) => {
    const response = await axiosConfig.get<FinancialSummary>(`${url}/${subsidiaryId}/${firstDay}/${lastDay}`);
    return response.data;
}


export {
    getIncomes,
    getIncomeByMonth,
    getFinantialResume
}