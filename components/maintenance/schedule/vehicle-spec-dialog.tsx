"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { saveVehicleSpec } from "@/lib/services/maintenance";
import { useProductCategories, useProducts, useUnits, useVehicleSpec } from "@/hooks/services/maintenance/use-maintenance";
import { MaintenanceVehicle, vehicleLabel } from "@/lib/types/maintenance";
import { apiError } from "../shared/confirm-action";
import { FieldError, invalidClass } from "../shared/field-error";

const NONE = "__none__";

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

  const piezas = useMemo(() => categories.filter((c) => c.kind === "pieza" && c.active), [categories]);
  const insumos = useMemo(() => categories.filter((c) => c.kind === "insumo" && c.active), [categories]);
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[28%]">Pieza o insumo</TableHead>
                  <TableHead className="w-[26%]">Producto preferido</TableHead>
                  <TableHead className="w-24">Cantidad</TableHead>
                  <TableHead className="w-36">Unidad</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => {
                  const options = products.filter((p) => p.categoryId === r.categoryId);
                  return (
                    <TableRow key={r.key} className="align-top">
                      <TableCell>
                        <Select value={r.categoryId || undefined} onValueChange={(v) => patch(r.key, { categoryId: v, productId: null })}>
                          <SelectTrigger className={invalidClass(errors[`${i}.categoryId`])}><SelectValue placeholder="Elige" /></SelectTrigger>
                          <SelectContent className="max-h-80">
                            <SelectGroup><SelectLabel>Piezas</SelectLabel>{piezas.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectGroup>
                            <SelectGroup><SelectLabel>Insumos</SelectLabel>{insumos.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectGroup>
                          </SelectContent>
                        </Select>
                        <FieldError message={errors[`${i}.categoryId`]} className="mt-1" />
                      </TableCell>
                      <TableCell>
                        <Select value={r.productId ?? NONE} onValueChange={(v) => {
                          const p = products.find((x) => x.id === v);
                          patch(r.key, { productId: v === NONE ? null : v, ...(p?.unitId && !r.unitId ? { unitId: p.unitId } : {}) });
                        }} disabled={!r.categoryId}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>Cualquiera</SelectItem>
                            {options.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}{p.brand ? ` · ${p.brand}` : ""}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input type="number" min={0.01} step="0.01" value={r.quantity} onChange={(e) => patch(r.key, { quantity: Number(e.target.value) })}
                          className={invalidClass(errors[`${i}.quantity`])} />
                        <FieldError message={errors[`${i}.quantity`]} className="mt-1" />
                      </TableCell>
                      <TableCell>
                        <Select value={r.unitId ?? NONE} onValueChange={(v) => patch(r.key, { unitId: v === NONE ? null : v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>—</SelectItem>
                            {units.filter((u) => u.active).map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Input value={r.notes} onChange={(e) => patch(r.key, { notes: e.target.value })} placeholder="Medida, posición…" /></TableCell>
                      <TableCell>
                        <Button type="button" size="icon" variant="ghost" className="text-destructive" aria-label="Quitar"
                          onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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
