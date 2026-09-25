"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { AppLayout } from "@/components/app-layout";
import { OperationHeader } from "@/components/shared/operation-header";
import { DataTable } from "@/components/data-table/data-table";
import { withAuth } from "@/hoc/withAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { useServiceTemplates } from "@/hooks/services/maintenance/use-maintenance";
import { deleteServiceTemplate } from "@/lib/services/maintenance";
import { ServiceTemplate } from "@/lib/types/compras";
import { splitKeywords } from "@/lib/compras-keywords";
import { apiError, ConfirmAction } from "@/components/maintenance/shared/confirm-action";
import { ServiceTemplateDialog } from "@/components/maintenance/catalog/service-template-dialog";

/**
 * Servicios predefinidos de mantenimiento. Quien pide elige el servicio (sin saber de piezas); si el
 * servicio tiene receta, en la cotización se sugieren esas piezas e insumos con sus mejores ofertas.
 */
function ServiciosPage() {
  const [showInactive, setShowInactive] = useState(false);
  const { services, mutate } = useServiceTemplates(showInactive);
  const [editing, setEditing] = useState<ServiceTemplate | null>(null);
  const [open, setOpen] = useState(false);

  const columns = useMemo<ColumnDef<ServiceTemplate>[]>(() => [
    {
      accessorKey: "name",
      header: "Servicio",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="font-medium">{row.original.name}</p>
          {row.original.description && <p className="line-clamp-1 text-xs text-muted-foreground">{row.original.description}</p>}
        </div>
      ),
    },
    {
      id: "recipe",
      header: "Receta",
      cell: ({ row }) => {
        const items = row.original.items ?? [];
        if (!items.length) return <span className="text-xs text-muted-foreground">Sin receta</span>;
        return (
          <div className="flex max-w-md flex-wrap gap-1">
            {items.map((i) => (
              <Badge key={i.id ?? i.categoryId} variant="outline" className="font-normal">
                {i.category?.name ?? "Pieza"} × {Number(i.quantity)}{i.unit?.abbreviation ? ` ${i.unit.abbreviation}` : ""}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      id: "keywords",
      header: "Sinónimos",
      cell: ({ row }) => <span className="line-clamp-2 max-w-xs text-xs text-muted-foreground">{splitKeywords(row.original.keywords).join(", ") || "—"}</span>,
    },
    {
      accessorKey: "active",
      header: "Estado",
      cell: ({ row }) => row.original.active
        ? <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">Activo</Badge>
        : <Badge variant="outline" className="text-muted-foreground">Inactivo</Badge>,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => { setEditing(row.original); setOpen(true); }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <ConfirmAction
            destructive
            title={`¿Eliminar "${row.original.name}"?`}
            description="Si ya se usó en alguna solicitud solo se desactiva, para no perder el historial."
            confirmLabel="Eliminar"
            onConfirm={async () => {
              try {
                const r = await deleteServiceTemplate(row.original.id);
                toast.success(r.deactivated ? "Ya se había usado: quedó desactivado" : "Servicio eliminado");
                mutate();
              } catch (e) { toast.error(apiError(e, "No se pudo eliminar")); }
            }}
            trigger={<Button size="icon" variant="ghost" className="text-destructive" aria-label="Eliminar"><Trash2 className="h-4 w-4" /></Button>}
          />
        </div>
      ),
    },
  ], [mutate]);

  return (
    <AppLayout>
      <div className="flex min-h-screen flex-col gap-4 p-4 md:p-5">
        <OperationHeader
          icon={ListChecks}
          title="Servicios de mantenimiento"
          description="Servicios que se pueden pedir para las unidades, con su receta de piezas e insumos"
          actions={
            <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="mr-1.5 h-4 w-4" /> Nuevo servicio
            </Button>
          }
        />
        <div className="flex items-center gap-2">
          <Switch id="inactivos" checked={showInactive} onCheckedChange={setShowInactive} />
          <Label htmlFor="inactivos" className="text-sm text-muted-foreground">Ver inactivos</Label>
        </div>
        <DataTable columns={columns} data={services} searchKey="name" />
        <ServiceTemplateDialog open={open} onOpenChange={setOpen} service={editing} onSaved={() => mutate()} />
      </div>
    </AppLayout>
  );
}

export default withAuth(ServiciosPage, "mttoVehiculos.catalogos");
