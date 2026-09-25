"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { useProductCategories, useUnits } from "@/hooks/services/maintenance/use-maintenance";
import { saveServiceTemplate } from "@/lib/services/maintenance";
import { ServiceTemplate } from "@/lib/types/compras";
import { validateServiceTemplate } from "@/lib/maintenance-validation";
import { apiError } from "../shared/confirm-action";
import { FieldError, invalidClass } from "../shared/field-error";
import { KeywordsInput } from "../shared/keywords-input";
import { SearchableSelect, SearchOption } from "../shared/searchable-select";

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
    setRows((service?.items ?? []).map((i) => ({ key: crypto.randomUUID(), categoryId: i.categoryId, quantity: Number(i.quantity), unitId: i.unitId ?? null })));
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
          <div className="grid gap-4 py-2">
            <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="grid gap-1.5">
                <Label>Nombre</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Servicio de 10,000 km" className={invalidClass(errors.name)} />
                <FieldError message={errors.name} />
              </div>
              <div className="grid gap-1.5">
                <Label>Tipo de unidad (opcional)</Label>
                <Input value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} placeholder="Todas" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Descripción (opcional)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Qué incluye el servicio" />
            </div>
            <div className="grid gap-1.5">
              <Label>Sinónimos</Label>
              <KeywordsInput value={keywords} onChange={setKeywords} placeholder="Ej. frenos, rechina, truena al frenar" />
              <p className="text-xs text-muted-foreground">Si quien pide escribe alguna de estas palabras, el sistema reconoce este servicio.</p>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Receta: piezas e insumos que lleva (opcional)</Label>
                <Button type="button" size="sm" variant="outline"
                  onClick={() => setRows((rs) => [...rs, { key: crypto.randomUUID(), categoryId: "", quantity: 1, unitId: null }])}>
                  <Plus className="mr-1.5 h-4 w-4" /> Agregar
                </Button>
              </div>
              {rows.length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  Sin receta. El sistema sugerirá piezas por lo que escriba quien pide.
                </p>
              ) : (
                <div className="grid gap-2">
                  {rows.map((r, i) => (
                    <div key={r.key} className="grid gap-2 rounded-lg border p-2.5 md:grid-cols-[minmax(0,1fr)_100px_160px_auto] md:items-start">
                      <div className="grid gap-1">
                        <SearchableSelect value={r.categoryId || null} onChange={(v) => patch(r.key, { categoryId: v ?? "" })} options={categoryOptions}
                          placeholder="Buscar pieza o insumo" searchPlaceholder="Escribe para buscar…" invalid={!!errors[`rows.${i}.categoryId`]} />
                        <FieldError message={errors[`rows.${i}.categoryId`]} />
                      </div>
                      <div className="grid gap-1">
                        <Input type="number" min={0.01} step="0.01" value={r.quantity} onChange={(e) => patch(r.key, { quantity: Number(e.target.value) })}
                          aria-label="Cantidad" className={invalidClass(errors[`rows.${i}.quantity`])} />
                        <FieldError message={errors[`rows.${i}.quantity`]} />
                      </div>
                      <SearchableSelect value={r.unitId} onChange={(v) => patch(r.key, { unitId: v })} options={unitOptions} allowClear clearLabel="Presentación"
                        searchPlaceholder="Buscar presentación…" />
                      <Button type="button" size="icon" variant="ghost" className="text-destructive" aria-label="Quitar"
                        onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Activo</p>
                <p className="text-xs text-muted-foreground">Los inactivos ya no se ofrecen al pedir.</p>
              </div>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar servicio</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
