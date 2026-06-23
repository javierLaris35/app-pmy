import useSWR from "swr";
import { getCatalogOptions, type CatalogItem } from "@/lib/services/catalog";

/**
 * Opciones ACTIVAS de un catálogo (enum) para dropdowns. Cachea por tipo con SWR
 * (los catálogos cambian poco). `dedupingInterval` alto para no refetchear seguido.
 */
export function useCatalog(type?: string) {
  const { data, error, isLoading } = useSWR<CatalogItem[]>(
    type ? ["catalog-options", type] : null,
    () => getCatalogOptions(type!),
    { revalidateOnFocus: false, dedupingInterval: 5 * 60 * 1000 },
  );

  return {
    options: (data || []).map((i) => ({ value: i.key, label: i.label })),
    isLoading,
    isError: !!error,
  };
}
