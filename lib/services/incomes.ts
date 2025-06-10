import { axiosConfig } from "../axios-config";
import { FinancialSummary, RouteIncome } from "../types";

const baseUrl = "/incomes";

// GET: ingresos por subsidiaria y rango de fechas
const getIncomes = async (subsidiaryId: string, from: string, to: string) => {
  const response = await axiosConfig.get<RouteIncome[]>(`${baseUrl}/${subsidiaryId}/${from}/${to}`);
  return response.data;
};

// GET: ingresos por mes (sin subsidiaria)
const getIncomeByMonth = async (from: string, to: string) => {
  const response = await axiosConfig.get<RouteIncome[]>(`${baseUrl}/month/${from}/${to}`);
  return response.data;
};

// GET: ingresos por mes con subsidiaria
const getIncomeByMonthAndSucursal = async (subsidiaryId: string, from: string, to: string) => {
  const response = await axiosConfig.get<RouteIncome[]>(`${baseUrl}/bySucursal/${subsidiaryId}?fromDate=${from}&toDate=${to}`);
  return response.data;
};

// GET: resumen financiero
const getFinantialResume = async (subsidiaryId: string) => {
  const response = await axiosConfig.get<FinancialSummary>(`${baseUrl}/finantial/${subsidiaryId}`);
  return response.data;
};

export {
  getIncomes,
  getIncomeByMonth,
  getIncomeByMonthAndSucursal,
  getFinantialResume
};