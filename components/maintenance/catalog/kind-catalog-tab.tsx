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
import { useProductCategories, useUnits } from "@/hooks/services/maintenance/use-maintenance";
import { saveProductCategory, saveUnit } from "@/lib/services/maintenance";
import { KIND_LABEL, ProductKind } from "@/lib/types/compras";
import { apiError } from "../shared/confirm-action";
import { FieldError, invalidClass } from "../shared/field-error";

interface SimpleRow { id: string; name: string; active: boolean; extra?: string | null }

/** Diálogo simple nombre (+ abreviatura opcional) + activo. */
function SimpleFormDialog({ open, onOpenChange, title, row, withAbbreviation, onSave }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  row: SimpleRow | null;
  withAbbreviation?: boolean;
  onSave: (v: { name: string; abbreviation?: string | null; active: boolean }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [abbr, setAbbr] = useState("");
  const [active, setActive] = useState(true);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    setName(row?.name ?? ""); setAbbr(row?.extra ?? ""); setActive(row?.active ?? true); setTried(false);
  }, [open, row]);
  const nameError = tried && !name.trim() ? "Escribe el nombre." : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className={invalidClass(nameError)} autoFocus />
            <FieldError message={nameError} />
          </div>
          {withAbbreviation && (
            <div className="grid gap-1.5">
              <Label>Abreviatura</Label>
              <Input value={abbr} onChange={(e) => setAbbr(e.target.value)} maxLength={15} placeholder="Ej. L, PZA, GAL" />
            </div>
          )}
          <div className="flex items-center justify-between rounded-md border p-3">
            <p className="text-sm font-medium">Activo</p>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button
            disabled={saving}
            onClick={async () => {
              setTried(true);
              if (!name.trim()) return;
              setSaving(true);
              try { await onSave({ name: name.trim(), abbreviation: withAbbreviation ? abbr.trim() || null : undefined, active }); onOpenChange(false); }
              catch { /* el toast ya se mostró */ }
              finally { setSaving(false); }
            }}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SimpleTable({ rows, onEdit, extraHeader }: { rows: SimpleRow[]; onEdit: (r: SimpleRow) => void; extraHeader?: string }) {
  const columns = useMemo<ColumnDef<SimpleRow>[]>(
    () => [
      { accessorKey: "name", header: "Nombre", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
      ...(extraHeader ? [{ id: "extra", header: extraHeader, cell: ({ row }: any) => row.original.extra ?? "—" } as ColumnDef<SimpleRow>] : []),
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
          <div className="flex justify-end">
            <Button size="icon" variant="ghost" onClick={() => onEdit(row.original)} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
          </div>
        ),
      },
    ],
    [onEdit, extraHeader],
  );
  return <DataTable columns={columns} data={rows} searchKey="name" />;
}

/** Catálogo de piezas, insumos o servicios (cada uno independiente; son las categorías de los productos). */
export function KindCatalogTab({ kind, createSignal = 0 }: { kind: ProductKind; createSignal?: number }) {
  const { categories, mutate } = useProductCategories(kind);
  const [editing, setEditing] = useState<SimpleRow | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { if (createSignal > 0) { setEditing(null); setOpen(true); } }, [createSignal]);
  const label = KIND_LABEL[kind].toLowerCase();

  return (
    <div className="space-y-3">
      <SimpleTable rows={categories} onEdit={(r) => { setEditing(r); setOpen(true); }} />
      <SimpleFormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? `Editar ${label}` : `Nueva ${label === "servicio" ? "categoría de servicio" : label}`}
        row={editing}
        onSave={async (v) => {
          try {
            await saveProductCategory({ name: v.name, kind, active: v.active }, editing?.id);
            toast.success(editing ? "Guardado" : "Agregado");
            mutate();
          } catch (e) { toast.error(apiError(e, "No se pudo guardar")); throw e; }
        }}
      />
    </div>
  );
}

/** Presentaciones / unidades de medida. */
export function UnitsTab({ createSignal = 0 }: { createSignal?: number }) {
  const { units, mutate } = useUnits();
  const [editing, setEditing] = useState<SimpleRow | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { if (createSignal > 0) { setEditing(null); setOpen(true); } }, [createSignal]);
  const rows = units.map((u) => ({ id: u.id, name: u.name, active: u.active, extra: u.abbreviation }));

  return (
    <div className="space-y-3">
      <SimpleTable rows={rows} extraHeader="Abreviatura" onEdit={(r) => { setEditing(r); setOpen(true); }} />
      <SimpleFormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Editar presentación" : "Nueva presentación"}
        row={editing}
        withAbbreviation
        onSave={async (v) => {
          try {
            await saveUnit({ name: v.name, abbreviation: v.abbreviation, active: v.active }, editing?.id);
            toast.success(editing ? "Guardado" : "Agregado");
            mutate();
          } catch (e) { toast.error(apiError(e, "No se pudo guardar")); throw e; }
        }}
      />
    </div>
  );
}
