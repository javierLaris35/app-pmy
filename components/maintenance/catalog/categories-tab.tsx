"use client";

import { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "@/lib/toast";
import { useServiceCategories } from "@/hooks/services/maintenance/use-maintenance";
import { createServiceCategory, updateServiceCategory } from "@/lib/services/maintenance";
import { ServiceCategory } from "@/lib/types/maintenance";
import { apiError } from "../shared/confirm-action";

function CategoryFormDialog({ open, onOpenChange, category, onSaved }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  category: ServiceCategory | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? "");
    setSortOrder(category ? String(category.sortOrder) : "");
    setActive(category?.active ?? true);
  }, [open, category]);

  const save = async () => {
    setSaving(true);
    const body = { name: name.trim(), active, ...(sortOrder !== "" ? { sortOrder: Number(sortOrder) } : {}) };
    try {
      if (category) await updateServiceCategory(category.id, body);
      else await createServiceCategory(body);
      toast.success(category ? "Categoría actualizada" : "Categoría agregada");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(apiError(e, "No se pudo guardar la categoría"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Frenos" />
          </div>
          <div className="grid gap-1.5">
            <Label>Orden en la lista</Label>
            <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} placeholder="Al final" />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <p className="text-sm font-medium">Activa</p>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={name.trim().length < 2 || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** `createSignal` lo incrementa el header de la pantalla ("Nuevo …") para abrir el alta. */
export function CategoriesTab({ createSignal = 0 }: { createSignal?: number }) {
  const { categories, mutate } = useServiceCategories();
  const [editing, setEditing] = useState<ServiceCategory | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (createSignal > 0) { setEditing(null); setOpen(true); }
  }, [createSignal]);

  const columns = useMemo<ColumnDef<ServiceCategory>[]>(
    () => [
      { accessorKey: "sortOrder", header: "Orden", cell: ({ row }) => <span className="tabular-nums text-muted-foreground">{row.original.sortOrder}</span> },
      { accessorKey: "name", header: "Categoría", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
      {
        accessorKey: "active",
        header: "Estado",
        cell: ({ row }) =>
          row.original.active ? (
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">Activa</Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">Inactiva</Badge>
          ),
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button size="icon" variant="ghost" onClick={() => { setEditing(row.original); setOpen(true); }} aria-label="Editar">
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-3">
      <DataTable columns={columns} data={categories} searchKey="name" />
      <CategoryFormDialog open={open} onOpenChange={setOpen} category={editing} onSaved={() => mutate()} />
    </div>
  );
}
