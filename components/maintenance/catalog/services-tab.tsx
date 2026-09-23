"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, PlusCircle, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { useMaintenanceServices, useServiceCategories } from "@/hooks/services/maintenance/use-maintenance";
import { deleteMaintenanceService } from "@/lib/services/maintenance";
import { formatMoney, MaintenanceServiceItem, UNIT_LABEL } from "@/lib/types/maintenance";
import { ServiceFormDialog } from "./service-form-dialog";
import { apiError, ConfirmAction } from "../shared/confirm-action";

export function ServicesTab() {
  const { services, mutate } = useMaintenanceServices({ includeInactive: true });
  const { categories } = useServiceCategories();
  const [editing, setEditing] = useState<MaintenanceServiceItem | null>(null);
  const [open, setOpen] = useState(false);

  const columns = useMemo<ColumnDef<MaintenanceServiceItem>[]>(
    () => [
      { accessorKey: "name", header: "Servicio", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
      {
        id: "category",
        accessorFn: (r) => r.category?.name ?? "",
        header: "Categoría",
        filterFn: (row, id, value: string[]) => !value?.length || value.includes(String(row.getValue(id))),
      },
      { accessorKey: "unit", header: "Unidad", cell: ({ row }) => UNIT_LABEL[row.original.unit] },
      {
        accessorKey: "referencePrice",
        header: () => <div className="text-right">Precio ref.</div>,
        cell: ({ row }) => <div className="text-right tabular-nums">{formatMoney(row.original.referencePrice)}</div>,
      },
      {
        accessorKey: "vehicleType",
        header: "Tipo de vehículo",
        cell: ({ row }) => <span className="capitalize">{row.original.vehicleType ?? "Todos"}</span>,
      },
      {
        accessorKey: "active",
        header: "Estado",
        cell: ({ row }) =>
          row.original.active ? (
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">Activo</Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">Inactivo</Badge>
          ),
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button size="icon" variant="ghost" onClick={() => { setEditing(row.original); setOpen(true); }} aria-label="Editar">
              <Pencil className="h-4 w-4" />
            </Button>
            <ConfirmAction
              destructive
              title="¿Eliminar servicio?"
              description={`"${row.original.name}" dejará de aparecer en el catálogo. Las cotizaciones que ya lo usan no cambian.`}
              confirmLabel="Eliminar"
              onConfirm={async () => {
                try {
                  await deleteMaintenanceService(row.original.id);
                  toast.success("Servicio eliminado");
                  mutate();
                } catch (e) {
                  toast.error(apiError(e, "No se pudo eliminar"));
                }
              }}
              trigger={
                <Button size="icon" variant="ghost" className="text-destructive" aria-label="Eliminar">
                  <Trash2 className="h-4 w-4" />
                </Button>
              }
            />
          </div>
        ),
      },
    ],
    [mutate],
  );

  const categoryOptions = useMemo(() => categories.map((c) => ({ label: c.name, value: c.name })), [categories]);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-2">
          <PlusCircle className="h-4 w-4" /> Nuevo servicio
        </Button>
      </div>
      <DataTable columns={columns} data={services} searchKey="name" filters={[{ columnId: "category", title: "Categoría", options: categoryOptions }]} />
      <ServiceFormDialog open={open} onOpenChange={setOpen} service={editing} categories={categories} onSaved={() => mutate()} />
    </div>
  );
}
