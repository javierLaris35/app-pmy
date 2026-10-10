import type { MappedRow } from "./fedex-header-map";

/** Valores por los que se filtra la tabla del pegado (Cobro, Alto Valor, Revisión). */
export type CobroFacet = "con_cobro" | "sin_tipo" | "sin_cobro";
export type AltoValorFacet = "si" | "no";
export type RevisionFacet = "ok" | "sin_guia" | "cortada" | "duplicada" | "vencimiento";

export const COBRO_OPTIONS: { label: string; value: CobroFacet }[] = [
  { label: "Con cobro", value: "con_cobro" },
  { label: "Cobro sin tipo", value: "sin_tipo" },
  { label: "Sin cobro", value: "sin_cobro" },
];
export const ALTO_VALOR_OPTIONS: { label: string; value: AltoValorFacet }[] = [
  { label: "Alto Valor", value: "si" },
  { label: "Normal", value: "no" },
];
export const REVISION_OPTIONS: { label: string; value: RevisionFacet }[] = [
  { label: "Sin problema", value: "ok" },
  { label: "Sin guía", value: "sin_guia" },
  { label: "Guía cortada", value: "cortada" },
  { label: "Duplicada", value: "duplicada" },
  { label: "Vencimiento por revisar", value: "vencimiento" },
];

export function cobroFacet(r: MappedRow): CobroFacet {
  if (!r.hasPayment) return "sin_cobro";
  return r.paymentNoType ? "sin_tipo" : "con_cobro";
}

export function altoValorFacet(r: MappedRow): AltoValorFacet {
  return r.isHighValue ? "si" : "no";
}

/** Una fila puede tener varios problemas a la vez; sin ninguno → ["ok"]. */
export function revisionFacets(r: MappedRow): RevisionFacet[] {
  const out: RevisionFacet[] = [];
  if (r.missingTracking) out.push("sin_guia");
  if (r.badTracking) out.push("cortada");
  if (r.duplicateTracking) out.push("duplicada");
  if (r.commitIssue || r.commitWarn) out.push("vencimiento");
  return out.length ? out : ["ok"];
}

/**
 * Filtro de columna "cualquiera de los seleccionados" que sirve igual para un valor
 * (Cobro, Alto Valor) que para una lista (Revisión). Firma de `filterFn` de TanStack.
 */
export function matchesAnySelected(cellValue: unknown, selected: unknown): boolean {
  if (!Array.isArray(selected) || selected.length === 0) return true;
  const values = Array.isArray(cellValue) ? cellValue : [cellValue];
  return selected.some((s) => values.includes(s));
}
