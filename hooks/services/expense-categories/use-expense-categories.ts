import useSWR from "swr";
import { getExpenseCategories, type ExpenseCategoryGroupBlock } from "@/lib/services/expense-categories";

export function useExpenseCategories() {
  const { data, error, isLoading } = useSWR<ExpenseCategoryGroupBlock[]>(
    ["expense-categories"],
    () => getExpenseCategories(),
    { revalidateOnFocus: false, dedupingInterval: 5 * 60 * 1000 },
  );

  const groups = data ?? [];
  const byId: Record<string, { id: string; name: string; groupId: string | null }> = {};
  const byName: Record<string, string> = {};
  for (const block of groups) {
    for (const c of block.categories) {
      byId[c.id] = { id: c.id, name: c.name, groupId: block.group.id };
      byName[c.name] = c.id;
    }
  }
  return { groups, byId, byName, isLoading, isError: !!error };
}
