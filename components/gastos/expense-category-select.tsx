// components/gastos/expense-category-select.tsx
"use client";

import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useExpenseCategories } from "@/hooks/services/expense-categories/use-expense-categories";

interface ExpenseCategorySelectProps {
  value?: string; // categoryId
  onValueChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function ExpenseCategorySelect({
  value, onValueChange, placeholder = "Selecciona una categoría", disabled, id, className,
}: ExpenseCategorySelectProps) {
  const { groups, isLoading } = useExpenseCategories();

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || isLoading}>
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder={isLoading ? "Cargando…" : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {groups.map((block) => (
          <SelectGroup key={block.group.id ?? "sin-grupo"}>
            <SelectLabel>
              {block.group.icon ? `${block.group.icon} ` : ""}{block.group.name}
            </SelectLabel>
            {block.categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
