"use client";

/**
 * Compatibilidad: los buscadores del módulo ahora son los campos del sistema nuevo
 * (`@/components/ui/field`). Misma API que antes; se ven con el marco redondeado y, si se pasa
 * `label`, con la etiqueta sobre el borde.
 */
export { ComboField as SearchableSelect, MultiComboField as SearchableMultiSelect } from "@/components/ui/field";
export type { SearchOption } from "@/components/ui/field";
