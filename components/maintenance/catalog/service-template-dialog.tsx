"use client";

import { PmySpinner } from "@/components/ui/pmy-loader";
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddItemButton, ComboField, FormSection, TextareaField, TextField } from "@/components/ui/field";
import { Boxes, Hash, Package, ScrollText, Truck, Wrench, X } from "lucide-react";
import { toast } from "@/lib/toast";
import { useProductCategories, useUnits } from "@/hooks/services/maintenance/use-maintenance";
import { saveServiceTemplate } from "@/lib/services/maintenance";
import { ServiceTemplate } from "@/lib/types/compras";
import { validateServiceTemplate } from "@/lib/maintenance-validation";
import { apiError } from "../shared/confirm-action";
import { KeywordsInput } from "../shared/keywords-input";
import { SearchOption } from "../shared/searchable-select";

import { newId } from "@/lib/uuid";
interface RecipeRow { key: string; categoryId: string; quantity: number; unitId: string | null }

/** Alta/edición de un servicio predefinido: nombre, sinónimos y receta opcional de piezas/insumos. */
export function ServiceTemplateDialog({ open, onOpenChange, service, onSaved }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  service: ServiceTemplate | null;
  onSaved: () => void;
}) {
  const { categories } = useProductCategories();
  const { units } = useUnits();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [keywords, setKeywords] = useState("");
  const [active, setActive] = useState(true);
  const [rows, setRows] = useState<RecipeRow[]>([]);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(service?.name ?? "");
    setDescription(service?.description ?? "");
    setVehicleType(service?.vehicleType ?? "");
    setKeywords(service?.keywords ?? "");
    setActive(service?.active ?? true);
    setRows((service?.items ?? []).map((i) => ({ key: newId(), categoryId: i.categoryId, quantity: Number(i.quantity), unitId: i.unitId ?? null })));
    setTried(false);
  }, [open, service]);

  const categoryOptions = useMemo<SearchOption[]>(() => categories
    .filter((c) => c.active && (c.kind === "pieza" || c.kind === "insumo"))
    .map((c) => ({ value: c.id, label: c.name, group: c.kind === "pieza" ? "Piezas" : "Insumos" })), [categories]);
  const unitOptions = useMemo<SearchOption[]>(() => units.filter((u) => u.active).map((u) => ({ value: u.id, label: u.name, hint: u.abbreviation ?? undefined })), [units]);
  const patch = (key: string, p: Partial<RecipeRow>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const allErrors = useMemo(() => validateServiceTemplate({ name, rows }), [name, rows]);
  const errors = tried ? allErrors : {};

  const save = async () => {
    setTried(true);
    if (Object.keys(allErrors).length) { toast.error(`Revisa los campos marcados: ${Object.values(allErrors)[0]}`); return; }
    setSaving(true);
    try {
      await saveServiceTemplate({
        name: name.trim(), description: description.trim() || null, vehicleType: vehicleType.trim() || null,
        keywords: keywords || null, active,
        items: rows.map((r) => ({ categoryId: r.categoryId, quantity: Number(r.quantity), unitId: r.unitId })),
      }, service?.id);
      toast.success(service ? "Servicio actualizado" : "Servicio agregado");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(apiError(e, "No se pudo guardar el servicio"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{service ? "Editar servicio" : "Nuevo servicio"}</DialogTitle>
          <DialogDescription>
            Quien pide solo elige el servicio. Si le pones receta, en la cotización se sugieren exactamente esas piezas e insumos.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[68vh] pr-3">
          <div className="grid gap-6 px-0.5 pb-1 pt-3">
            <FormSection title="Servicio" columns={3}>
              <TextField label="Nombre" required icon={Wrench} className="md:col-span-2" placeholder="Ej. Servicio de 10,000 km"
                value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
              <TextField label="Tipo de unidad" icon={Truck} placeholder="Todas" value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} />
              <TextareaField label="Descripción" icon={ScrollText} className="md:col-span-3" rows={2} placeholder="Qué incluye el servicio (opcional)"
                value={description} onChange={(e) => setDescription(e.target.value)} />
              <KeywordsInput className="md:col-span-3" value={keywords} onChange={setKeywords} placeholder="Ej. frenos, rechina, truena al frenar"
                hint="Si quien pide escribe alguna de estas palabras, el sistema reconoce este servicio." />
            </FormSection>

            <FormSection title="Receta" description="Piezas e insumos que lleva (opcional). Si la pones, en la cotización se sugieren exactamente estas.">
              {rows.length === 0 ? (
                <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
                  Sin receta. El sistema sugerirá piezas por lo que escriba quien pide.
                </p>
              ) : (
                <div className="grid gap-3">
                  {rows.map((r, i) => (
                    <div key={r.key} className="grid items-end gap-3 md:grid-cols-[minmax(0,1fr)_120px_180px_auto]">
                      <ComboField label="Pieza o insumo" required icon={Package} value={r.categoryId || null} onChange={(v) => patch(r.key, { categoryId: v ?? "" })}
                        options={categoryOptions} placeholder="Buscar pieza o insumo" searchPlaceholder="Escribe para buscar…" error={errors[`rows.${i}.categoryId`]} />
                      <TextField label="Cantidad" required icon={Hash} type="number" min={0.01} step="0.01" value={r.quantity}
                        onChange={(e) => patch(r.key, { quantity: Number(e.target.value) })} error={errors[`rows.${i}.quantity`]} />
                      <ComboField label="Presentación" icon={Boxes} value={r.unitId} onChange={(v) => patch(r.key, { unitId: v })} options={unitOptions}
                        allowClear clearLabel="Sin presentación" placeholder="Opcional" searchPlaceholder="Buscar presentación…" />
                      <Button type="button" size="icon" variant="ghost" className="h-10 w-10 text-muted-foreground hover:text-destructive" aria-label="Quitar"
                        onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <AddItemButton onClick={() => setRows((rs) => [...rs, { key: newId(), categoryId: "", quantity: 1, unitId: null }])}>
                Agregar pieza o insumo
              </AddItemButton>
            </FormSection>
          </div>
        </ScrollArea>
        <DialogFooter className="items-center border-t pt-4">
          <label className="mr-auto flex cursor-pointer items-center gap-2 text-sm" title="Los inactivos ya no se ofrecen al pedir.">
            <Switch checked={active} onCheckedChange={setActive} /> {active ? "Activo" : "Inactivo (no se ofrece al pedir)"}
          </label>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving && <PmySpinner className="mr-2 h-4 w-4" />}Guardar servicio</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
