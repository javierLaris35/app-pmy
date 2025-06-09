import { axiosConfig } from "../axios-config"
import { Expense } from "../types"


const getExpenses = async (subsidiaryId: string) => {
    const response = await axiosConfig.get<Expense[]>(`${subsidiaryId}`);
    return response.data;
}


export {
    getExpenses
}