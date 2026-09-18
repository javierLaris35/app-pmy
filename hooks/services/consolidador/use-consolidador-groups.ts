import useSWR from "swr";
import { getGroupsByRoute, getGroupsByConsolidado } from "@/lib/services/consolidador";
import { ConsolidadorGroupsResult } from "@/lib/types/consolidador";

export type GroupsMode = "route" | "consolidado";

/**
 * Grupos del Consolidador por ruta o por consolidado (sucursal + semana).
 * Se carga solo cuando `active` y hay sucursal.
 */
export function useConsolidadorGroups(
  mode: GroupsMode,
  subsidiaryId: string,
  from: string,
  to: string,
  active = true,
) {
  const isValid = Boolean(active && subsidiaryId && from && to);
  const key = isValid ? ["consolidador-groups", mode, subsidiaryId, from, to] : null;

  const { data, error, isLoading, mutate } = useSWR<ConsolidadorGroupsResult>(
    key,
    ([, m, sub, f, t]: [string, GroupsMode, string, string, string]) =>
      m === "route" ? getGroupsByRoute(sub, f, t) : getGroupsByConsolidado(sub, f, t),
  );

  return { data, isLoading, isError: !!error, mutate };
}
