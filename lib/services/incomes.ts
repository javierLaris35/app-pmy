import { axiosConfig } from "../axios-config";
import { FinancialSummary, IncomesResponse } from "../types";

const baseUrl = "/incomes";

// GET: ingresos por sucursal y rango (llena la tabla de ingresos en finanzas)
const getIncomeByMonthAndSucursal = async (subsidiaryId: string, from: string, to: string) => {
  try {
    const response = await axiosConfig.get<IncomesResponse>(
      `${baseUrl}/bySucursal/${subsidiaryId}?fromDate=${from}&toDate=${to}`
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching income:`, error);
    throw error;
  }
};

// GET: resumen financiero (dashboard)
const getFinantialResume = async (subsidiaryId: string, from: string, to: string) => {
  const response = await axiosConfig.get<FinancialSummary>(`${baseUrl}/finantial/${subsidiaryId}/${from}/${to}`);
  return response.data;
};

export {
  getIncomeByMonthAndSucursal,
  getFinantialResume,
};
