/**
 * Alterna un valor dentro de la selección de un FilterChip.
 * - multiple: acumula (toggle add/remove).
 * - single: reemplaza por [value]; si ya estaba seleccionado, lo limpia ([]).
 */
export function toggleSelection(selected: string[], value: string, multiple: boolean): string[] {
  if (multiple) {
    return selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value]
  }
  return selected.includes(value) ? [] : [value]
}

export interface SelectionSummary {
  count: number
  labels: string[]
  overflow: boolean
}

/**
 * Resume la selección para el trigger del chip: cuántos hay, qué labels mostrar
 * (en el orden de `options`), y si hay que colapsar a "N seleccionados".
 */
export function summarizeSelection(
  options: { label: string; value: string }[],
  selected: string[],
  maxLabels = 2,
): SelectionSummary {
  const selectedSet = new Set(selected)
  const count = selected.length
  if (count === 0) return { count: 0, labels: [], overflow: false }
  if (count > maxLabels) return { count, labels: [], overflow: true }
  const labels = options.filter((o) => selectedSet.has(o.value)).map((o) => o.label)
  return { count, labels, overflow: false }
}
