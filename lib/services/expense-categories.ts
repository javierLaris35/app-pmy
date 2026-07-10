import { axiosConfig } from "../axios-config";

export type ExpenseCategoryOption = {
  id: string; name: string; sortOrder: number; isSystem: boolean; active: boolean;
};
export type ExpenseCategoryGroupBlock = {
  group: { id: string | null; name: string; icon: string | null; sortOrder: number; isSystem: boolean; active: boolean };
  categories: ExpenseCategoryOption[];
};

export const getExpenseCategories = async (): Promise<ExpenseCategoryGroupBlock[]> => {
  const res = await axiosConfig.get<ExpenseCategoryGroupBlock[]>("expense-categories");
  return res.data;
};
