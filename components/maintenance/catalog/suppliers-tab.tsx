"use client";

import { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { useSuppliers } from "@/hooks/services/maintenance/use-maintenance";
import { deleteSupplier } from "@/lib/services/maintenance";
import { Supplier } from "@/lib/types/maintenance";
import { SupplierFormDialog } from "./supplier-form-dialog";
import { apiError, ConfirmAction } from "../shared/confirm-action";

/** `createSignal` lo incrementa el header de la pantalla ("Nuevo …") para abrir el alta. */
export function SuppliersTab({ createSignal = 0 }: { createSignal?: number }) {
  const { suppliers, mutate } = useSuppliers(true);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (createSignal > 0) { setEditing(null); setOpen(true); }
  }, [createSignal]);

  const columns = useMemo<ColumnDef<Supplier>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Proveedor",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            {row.original.rfc && <p className="text-xs text-muted-foreground">{row.original.rfc}</p>}
          </div>
        ),
      },
      {
        id: "contact",
        header: "Contacto predeterminado",
        cell: ({ row }) => {
          const c = row.original.contacts?.find((x) => x.isDefault) ?? row.original.contacts?.[0];
          if (!c) return <span className="text-muted-foreground">—</span>;
          const Icon = c.preferredChannel === "whatsapp" ? MessageCircle : Mail;
          return (
            <div className="flex items-center gap-2">
              <Icon className={c.preferredChannel === "whatsapp" ? "h-4 w-4 text-emerald-600" : "h-4 w-4 text-sky-600"} />
              <div>
                <p className="text-sm">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.preferredChannel === "whatsapp" ? c.whatsapp || c.phone : c.email}
                </p>
              </div>
            </div>
          );
        },
      },
      { id: "contacts", header: "Contactos", cell: ({ row }) => <span className="tabular-nums">{row.original.contacts?.length ?? 0}</span> },
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
              title="¿Eliminar proveedor?"
              description={`"${row.original.name}" ya no aparecerá para nuevas cotizaciones. Las órdenes existentes se conservan.`}
              confirmLabel="Eliminar"
              onConfirm={async () => {
                try {
                  await deleteSupplier(row.original.id);
                  toast.success("Proveedor eliminado");
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

  return (
    <div className="space-y-3">
      <DataTable columns={columns} data={suppliers} searchKey="name" />
      <SupplierFormDialog open={open} onOpenChange={setOpen} supplier={editing} onSaved={() => mutate()} />
    </div>
  );
}
