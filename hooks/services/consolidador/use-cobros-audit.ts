import useSWR from "swr";
import { getCobrosAudit } from "@/lib/services/consolidador";
import { CobrosAuditReport } from "@/lib/types/consolidador";

/** Auditoría de cobros (FedEx envío) por sucursal + semana. Se carga solo cuando `enabled`. */
export function useCobrosAudit(subsidiaryId: string, from: string, to: string, enabled = true) {
  const isValid = Boolean(enabled && subsidiaryId && from && to);
  const key = isValid ? ["/consolidador/cobros-audit", subsidiaryId, from, to] : null;

  const { data, error, isLoading, mutate } = useSWR<CobrosAuditReport>(
    key,
    ([, sub, f, t]: string[]) => getCobrosAudit(sub, f, t),
  );

  return { data, isLoading, isError: !!error, mutate };
}
