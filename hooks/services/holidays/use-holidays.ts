import useSWR from "swr";
import { Holiday } from "@/lib/types";
import { getHolidays } from "@/lib/services/holidays/holidays";

export function useHolidays() {
  const { data, error, isLoading, mutate } = useSWR<Holiday[]>("/holidays", () => getHolidays());

  return {
    holidays: data,
    isLoading,
    isError: error,
    mutate,
  };
}
