"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCatalog } from "@/hooks/services/catalog/use-catalog";

interface CatalogSelectProps {
  /** Tipo del catálogo (ej. 'vehicle_type', 'expense_category'). */
  type: string;
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  /**
   * Si el value actual no está en las opciones activas (p.ej. un registro viejo con
   * un valor desactivado), lo muestra igual para no perderlo. Default true.
   */
  keepUnknownValue?: boolean;
}

/**
 * Select estándar que lee sus opciones del CATÁLOGO (DB) en vez de un enum
 * hardcodeado. value = la `key` estable; muestra el `label`.
 */
export function CatalogSelect({
  type, value, onValueChange, placeholder = "Selecciona…", disabled, id, className, keepUnknownValue = true,
}: CatalogSelectProps) {
  const { options, isLoading } = useCatalog(type);

  const known = options.some((o) => o.value === value);
  const merged = !known && value && keepUnknownValue ? [{ value, label: value }, ...options] : options;

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || isLoading}>
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder={isLoading ? "Cargando…" : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {merged.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
