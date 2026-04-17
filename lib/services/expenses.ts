import { axiosConfig } from "../axios-config"
import { Expense } from "../types"
import { useAuthStore } from "@/store/auth.store";

const url = 'expenses'

const getExpenses = async (subsidiaryId: string) => {
    const response = await axiosConfig.get<Expense[]>(`${subsidiaryId}`, {});
    return response.data;
}


const saveExpense = async (expense: Expense) => {
    const response = await axiosConfig.post(url, expense, {});
    return response.data;
}

const upload = async (formData: FormData) => {
  const response = await axiosConfig.post(`${url}/upload`, formData, { 
    headers: { 'Content-Type': 'multipart/form-data' },   
  });
  
  return response.data; // Es buena práctica retornar la respuesta por si necesitas leerla en el frontend
}

export {
    getExpenses,
    saveExpense,
    upload
}