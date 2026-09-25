"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { saveVehicleSpec } from "@/lib/services/maintenance";
import { useProductCategories, useProducts, useUnits, useVehicleSpec } from "@/hooks/services/maintenance/use-maintenance";
import { MaintenanceVehicle, vehicleLabel } from "@/lib/types/maintenance";
import { apiError } from "../shared/confirm-action";
import { FieldError, invalidClass } from "../shared/field-error";
import { SearchableSelect, SearchOption } from "../shared/searchable-select";

interface Row { key: string; categoryId: string; productId: string | null; quantity: number; unitId: string | null; notes: string }

/** Ficha técnica de la unidad: piezas e insumos que lleva. Se sugieren al levantar una solicitud para esta unidad. */
export function VehicleSpecDialog({ vehicle, onOpenChange }: { vehicle: MaintenanceVehicle | null; onOpenChange: (o: boolean) => void }) {
  const { spec, mutate } = useVehicleSpec(vehicle?.id);
  const { categories } = useProductCategories();
  const { products } = useProducts();
  const { units } = useUnits();
  const [rows, setRows] = useState<Row[]>([]);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!vehicle) return;
    setRows(spec.map((s) => ({ key: s.id, categoryId: s.categoryId, productId: s.productId ?? null, quantity: Number(s.quantity), unitId: s.unitId ?? null, notes: s.notes ?? "" })));
    setTried(false);
  }, [vehicle, spec]);

  const categoryOptions = useMemo<SearchOption[]>(() => categories
    .filter((c) => c.active && (c.kind === "pieza" || c.kind === "insumo"))
    .map((c) => ({ value: c.id, label: c.name, group: c.kind === "pieza" ? "Piezas" : "Insumos", hint: c.keywords ?? undefined })), [categories]);
  const patch = (key: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const errs = useMemo(() => {
    const e: Record<string, string> = {};
    rows.forEach((r, i) => {
      if (!r.categoryId) e[`${i}.categoryId`] = "Elige la pieza o el insumo.";
      if (!(Number(r.quantity) > 0)) e[`${i}.quantity`] = "Cantidad mayor a 0.";
    });
    return e;
  }, [rows]);
  const errors = tried ? errs : {};

  const save = async () => {
    if (!vehicle) return;
    setTried(true);
    if (Object.keys(errs).length) { toast.error(`Revisa los campos marcados: ${Object.values(errs)[0]}`); return; }
    setSaving(true);
    try {
      await saveVehicleSpec(vehicle.id, rows.map((r) => ({ categoryId: r.categoryId, productId: r.productId, quantity: Number(r.quantity), unitId: r.unitId, notes: r.notes.trim() || null })));
      toast.success("Ficha guardada");
      mutate();
      onOpenChange(false);
    } catch (e) {
      toast.error(apiError(e, "No se pudo guardar la ficha"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!vehicle} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Piezas e insumos de la unidad</DialogTitle>
          <DialogDescription>{vehicleLabel(vehicle)} · se sugieren al pedir algo para esta unidad.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-3">
          {rows.length === 0 ? (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Aún no hay piezas ni insumos. Agrega lo que lleva la unidad (ej. Aceite 10W-30 · 5 litros, Llanta carga ×4).
            </p>
          ) : (
            <div className="grid gap-3">
              {rows.map((r, i) => (
                <div key={r.key} className="rounded-lg border p-3">
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_110px_160px_auto] md:items-start">
                    <div className="grid gap-1.5">
                      <Label className="text-xs text-muted-foreground">Pieza o insumo</Label>
                      <SearchableSelect
                        value={r.categoryId || null}
                        onChange={(v) => patch(r.key, { categoryId: v ?? "", productId: null })}
                        options={categoryOptions}
                        placeholder="Buscar pieza o insumo"
                        searchPlaceholder="Escribe para buscar…"
                        emptyText="No está en el catálogo. Agrégala en Catálogos."
                        invalid={!!errors[`${i}.categoryId`]}
                      />
                      <FieldError message={errors[`${i}.categoryId`]} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs text-muted-foreground">Producto preferido</Label>
                      <SearchableSelect
                        value={r.productId}
                        onChange={(v) => {
                          const p = products.find((x) => x.id === v);
                          patch(r.key, { productId: v, ...(p?.unitId && !r.unitId ? { unitId: p.unitId } : {}) });
                        }}
                        options={products.filter((p) => p.categoryId === r.categoryId).map((p) => ({
                          value: p.id, label: p.name, hint: [p.brand, p.partNumber && `No. ${p.partNumber}`].filter(Boolean).join(" · ") || undefined,
                        }))}
                        allowClear clearLabel="Cualquiera"
                        searchPlaceholder="Buscar producto, marca o número de parte…"
                        emptyText="No hay productos de esta pieza en el catálogo."
                        disabled={!r.categoryId}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs text-muted-foreground">Cantidad</Label>
                      <Input type="number" min={0.01} step="0.01" value={r.quantity} onChange={(e) => patch(r.key, { quantity: Number(e.target.value) })}
                        className={invalidClass(errors[`${i}.quantity`])} />
                      <FieldError message={errors[`${i}.quantity`]} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs text-muted-foreground">Presentación</Label>
                      <SearchableSelect
                        value={r.unitId}
                        onChange={(v) => patch(r.key, { unitId: v })}
                        options={units.filter((u) => u.active).map((u) => ({ value: u.id, label: u.name, hint: u.abbreviation ?? undefined }))}
                        allowClear clearLabel="—"
                        searchPlaceholder="Buscar presentación…"
                      />
                    </div>
                    <Button type="button" size="icon" variant="ghost" className="text-destructive md:mt-6" aria-label="Quitar"
                      onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-3 grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">Notas</Label>
                    <Textarea value={r.notes} onChange={(e) => patch(r.key, { notes: e.target.value })} rows={2}
                      placeholder="Medida, posición, especificación… (ej. 245/75 R16 carga E, delantera izquierda)" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="outline" onClick={() => setRows((rs) => [...rs, { key: crypto.randomUUID(), categoryId: "", productId: null, quantity: 1, unitId: null, notes: "" }])}>
            <Plus className="mr-1.5 h-4 w-4" /> Agregar pieza o insumo
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar ficha</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
