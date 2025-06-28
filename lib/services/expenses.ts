import { axiosConfig } from "../axios-config"
import { Expense } from "../types"

const url = 'expenses'

const getExpenses = async (subsidiaryId: string) => {
    const response = await axiosConfig.get<Expense[]>(`${subsidiaryId}`);
    return response.data;
}


const saveExpense = async (expense: Expense) => {
    const response = await axiosConfig.post(url, expense);
    return response.data;
}


export {
    getExpenses,
    saveExpense
}