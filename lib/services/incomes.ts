import { axiosConfig } from "../axios-config";
import { FinancialSummary, NewIncome, RouteIncome } from "../types";

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
/*const getIncomeByMonthAndSucursal = async (subsidiaryId: string, from: string, to: string) => {
  const response = await axiosConfig.get<NewIncome[]>(`${baseUrl}/bySucursal/${subsidiaryId}?fromDate=${from}&toDate=${to}`);
  return response.data;
};*/

const getIncomeByMonthAndSucursal = async (
  subsidiaryId: string,
  from: string,
  to: string
) => {
  try {
    // Ensure dates are in ISO 8601 format (YYYY-MM-DD)
    const fromISO = new Date(from).toISOString().split('T')[0];
    const toISO = new Date(to).toISOString().split('T')[0];

    const response = await axiosConfig.get<NewIncome[]>(
      `${baseUrl}/bySucursal/${subsidiaryId}?fromDate=${fromISO}&toDate=${toISO}`
    );

    console.log(`Fetched ${response.data.length} income entries for subsidiary ${subsidiaryId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching income for subsidiary ${subsidiaryId}:`, error);
    //throw new Error(`Failed to fetch income: ${error.message}`);
  }
};

// GET: resumen financiero
const getFinantialResume = async (subsidiaryId: string, from: string, to: string) => {
  const response = await axiosConfig.get<FinancialSummary>(`${baseUrl}/finantial/${subsidiaryId}/${from}/${to}`);
  return response.data;
};

export {
  getIncomes,
  getIncomeByMonth,
  getIncomeByMonthAndSucursal,
  getFinantialResume
};