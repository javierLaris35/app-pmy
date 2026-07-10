import React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Expense } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import {
  createDeleteColumn,
  createSelectColumn,
  createSortableColumn,
  createViewColumn,
} from "@/components/data-table/columns";

// Es buena idea mover la función de colores aquí para encapsular la lógica de la tabla
export const getCategoryColor = (categoryName: string): string => {
  const colorMap: Record<string, string> = {
    Nómina: "bg-green-500",
    Renta: "bg-blue-500",
    Recarga: "bg-purple-500",
    Peajes: "bg-orange-500",
    Servicios: "bg-cyan-500",
    Combustible: "bg-red-500",
    "Otros gastos": "bg-gray-500",
    Mantenimiento: "bg-yellow-500",
    Impuestos: "bg-amber-500",
    Seguros: "bg-violet-500",
  };
  return colorMap[categoryName] || "bg-gray-500";
};

// Interfaz para las acciones que pasaremos desde el componente principal
interface GastosColumnsProps {
  onEdit: (gasto: Expense) => void;
  onDelete: (id: string) => void;
}

export const getGastosColumns = ({ onEdit, onDelete }: GastosColumnsProps) => [
  createSelectColumn<Expense>(),
  createSortableColumn<Expense>(
    "fecha",
    "Fecha",
    (row) => row.date,
    (value) => format(new Date(String(value).slice(0, 10) + "T00:00:00"), "dd/MM/yyyy", { locale: es })
  ),
  createSortableColumn<Expense>(
    "category",
    "Categoría",
    (row) => row.category?.name ?? "",
    (value) => (
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${getCategoryColor(value)}`} />
        <span>{value || "Sin categoría"}</span>
      </div>
    )
  ),
  createSortableColumn<Expense>(
    "descripcion",
    "Descripción",
    (row) => row.description || "-"
  ),
  createSortableColumn<Expense>(
    "monto",
    "Monto",
    (row) => row.amount,
    (value) => <span className="font-medium">{formatCurrency(value)}</span>
  ),
  createSortableColumn<Expense>(
    "metodoPago",
    "Método de Pago",
    (row) => row.paymentMethod || "No especificado"
  ),
  createSortableColumn<Expense>(
    "frequency",
    "Frecuencia",
    (row) => row.frequency || "Único"
  ),
  createSortableColumn<Expense>(
    "responsable",
    "Responsable",
    (row) => row.responsible || "No especificado"
  ),
  // Conectamos las acciones aquí
  createViewColumn<Expense>((data) => onEdit(data)),
  createDeleteColumn<Expense>((data) => onDelete(data.id)),
];