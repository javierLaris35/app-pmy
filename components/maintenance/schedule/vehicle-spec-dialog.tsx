"use client";

import { PmySpinner } from "@/components/ui/pmy-loader";
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddItemButton, ComboField, ItemCard, TextareaField, TextField } from "@/components/ui/field";
import { Boxes, Hash, Package, Star, StickyNote } from "lucide-react";
import { toast } from "@/lib/toast";
import { saveVehicleSpec } from "@/lib/services/maintenance";
import { useProductCategories, useProducts, useUnits, useVehicleSpec } from "@/hooks/services/maintenance/use-maintenance";
import { MaintenanceVehicle, vehicleLabel } from "@/lib/types/maintenance";
import { apiError } from "../shared/confirm-action";
import { SearchOption } from "../shared/searchable-select";

import { newId } from "@/lib/uuid";
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
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Piezas e insumos de la unidad</DialogTitle>
          <DialogDescription>{vehicleLabel(vehicle)} · se sugieren al pedir algo para esta unidad.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-3">
          <div className="grid gap-3 px-0.5 pb-1 pt-1">
          {rows.length === 0 ? (
            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Aún no hay piezas ni insumos. Agrega lo que lleva la unidad (ej. Aceite 10W-30 · 5 litros, Llanta carga ×4).
            </p>
          ) : (
            rows.map((r, i) => {
              const cat = categoryOptions.find((o) => o.value === r.categoryId);
              const hasError = !!errors[`${i}.categoryId`] || !!errors[`${i}.quantity`];
              return (
                <ItemCard
                  key={r.key}
                  defaultOpen={!r.categoryId || hasError}
                  className={hasError ? "border-destructive" : undefined}
                  title={cat?.label ?? "Pieza o insumo nuevo"}
                  subtitle={[`× ${r.quantity || 0}`, units.find((u) => u.id === r.unitId)?.name, r.notes].filter(Boolean).join(" · ")}
                  onRemove={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                >
                  <div className="grid gap-x-4 gap-y-5 md:grid-cols-2">
                    <ComboField
                      label="Pieza o insumo" required icon={Package}
                      value={r.categoryId || null}
                      onChange={(v) => patch(r.key, { categoryId: v ?? "", productId: null })}
                      options={categoryOptions}
                      placeholder="Buscar pieza o insumo"
                      searchPlaceholder="Escribe para buscar…"
                      emptyText="No está en el catálogo. Agrégala en Catálogos."
                      error={errors[`${i}.categoryId`]}
                    />
                    <ComboField
                      label="Producto preferido" icon={Star}
                      value={r.productId}
                      onChange={(v) => {
                        const p = products.find((x) => x.id === v);
                        patch(r.key, { productId: v, ...(p?.unitId && !r.unitId ? { unitId: p.unitId } : {}) });
                      }}
                      options={products.filter((p) => p.categoryId === r.categoryId).map((p) => ({
                        value: p.id, label: p.name, hint: [p.brand, p.partNumber && `No. ${p.partNumber}`].filter(Boolean).join(" · ") || undefined,
                      }))}
                      allowClear clearLabel="Cualquiera" placeholder="Cualquiera"
                      searchPlaceholder="Buscar producto, marca o número de parte…"
                      emptyText="No hay productos de esta pieza en el catálogo."
                      disabled={!r.categoryId}
                    />
                    <TextField label="Cantidad" required icon={Hash} type="number" min={0.01} step="0.01" value={r.quantity}
                      onChange={(e) => patch(r.key, { quantity: Number(e.target.value) })} error={errors[`${i}.quantity`]} />
                    <ComboField
                      label="Presentación" icon={Boxes}
                      value={r.unitId}
                      onChange={(v) => patch(r.key, { unitId: v })}
                      options={units.filter((u) => u.active).map((u) => ({ value: u.id, label: u.name, hint: u.abbreviation ?? undefined }))}
                      allowClear clearLabel="Sin presentación" placeholder="Opcional"
                      searchPlaceholder="Buscar presentación…"
                    />
                    <TextareaField label="Notas" icon={StickyNote} className="md:col-span-2" rows={2} value={r.notes}
                      onChange={(e) => patch(r.key, { notes: e.target.value })}
                      placeholder="Medida, posición, especificación… (ej. 245/75 R16 carga E, delantera izquierda)" />
                  </div>
                </ItemCard>
              );
            })
          )}
          <AddItemButton onClick={() => setRows((rs) => [...rs, { key: newId(), categoryId: "", productId: null, quantity: 1, unitId: null, notes: "" }])}>
            Agregar pieza o insumo
          </AddItemButton>
          </div>
        </ScrollArea>
        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving && <PmySpinner className="mr-2 h-4 w-4" />}Guardar ficha</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
