import { axiosConfig } from "../axios-config"
import { Expense } from "../types"
import { useAuthStore } from "@/store/auth.store";

const url = 'expenses'

const getExpenses = async (subsidiaryId: string) => {
    const token = useAuthStore.getState().token;
    const response = await axiosConfig.get<Expense[]>(`${subsidiaryId}`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return response.data;
}


const saveExpense = async (expense: Expense) => {
    const token = useAuthStore.getState().token;
    const response = await axiosConfig.post(url, expense, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return response.data;
}


export {
    getExpenses,
    saveExpense
}