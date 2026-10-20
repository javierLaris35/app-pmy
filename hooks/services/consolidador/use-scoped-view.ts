import useSWR from "swr";
import { getScopedView } from "@/lib/services/consolidador";
import { scopeReady, scopedUrl, type ConsolidadorScope } from "@/lib/consolidador/scope";
import type { ZonePart, ZoneView } from "@/lib/types/consolidador-zone";

/**
 * Una vista del Consolidador para el alcance elegido, SIEMPRE como partes por sucursal: en zona
 * llega así del API; en sucursal se envuelve la respuesta única. Solo carga cuando `active`.
 */
export function useScopedView<T>(
  scope: ConsolidadorScope,
  from: string,
  to: string,
  view: ZoneView,
  active: boolean,
  subsidiaryName = "",
) {
  const url = active && scopeReady(scope) && from && to ? scopedUrl(scope, from, to, view) : null;
  const { data, error, isLoading, mutate } = useSWR<ZonePart<T>[]>(url, async (u: string) => {
    if (scope.mode === "zone") return getScopedView<ZonePart<T>[]>(u);
    const one = await getScopedView<T>(u);
    return [{ subsidiaryId: scope.subsidiaryId, subsidiaryName, data: one, error: null }];
  });
  return { parts: data ?? [], error, isLoading, mutate };
}
