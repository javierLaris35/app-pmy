"use client";

import { PmySpinner } from "@/components/ui/pmy-loader";
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddItemButton, ComboField, FormSection, MoneyField, TextareaField, TextField } from "@/components/ui/field";
import { Barcode, Boxes, Package, ScrollText, Store, Tag, Tags, X } from "lucide-react";
import { toast } from "@/lib/toast";
import { saveProduct } from "@/lib/services/maintenance";
import { useProductCategories, useSuppliers, useUnits } from "@/hooks/services/maintenance/use-maintenance";
import { KIND_PLURAL, Product, ProductKind, ProductOffer } from "@/lib/types/compras";
import { apiError } from "../shared/confirm-action";
import { StarRating } from "../shared/star-rating";

import { newId } from "@/lib/uuid";
const NONE = "__none__";
const KIND_ORDER: ProductKind[] = ["pieza", "insumo", "servicio", "equipo"];

interface OfferRow extends ProductOffer { key: string }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSaved: (p: Product) => void;
}

export function ProductFormDialog({ open, onOpenChange, product, onSaved }: Props) {
  const { categories } = useProductCategories();
  const { units } = useUnits();
  const { suppliers } = useSuppliers();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>(NONE);
  const [brand, setBrand] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [unitId, setUnitId] = useState<string>(NONE);
  const [active, setActive] = useState(true);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(product?.name ?? "");
    setDescription(product?.description ?? "");
    setCategoryId(product?.categoryId ?? NONE);
    setBrand(product?.brand ?? "");
    setPartNumber(product?.partNumber ?? "");
    setUnitId(product?.unitId ?? NONE);
    setActive(product?.active ?? true);
    setOffers((product?.offers ?? []).map((o) => ({ ...o, key: o.id ?? newId(), price: Number(o.price) })));
    setTried(false);
  }, [open, product]);

  const grouped = useMemo(
    () => KIND_ORDER.map((k) => ({ kind: k, items: categories.filter((c) => c.kind === k && (c.active || c.id === categoryId)) })).filter((g) => g.items.length),
    [categories, categoryId],
  );

  const allErrors = useMemo(() => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = "Escribe el nombre del producto.";
    const seen = new Set<string>();
    offers.forEach((o, i) => {
      if (!o.supplierId) e[`offers.${i}.supplierId`] = "Elige el proveedor.";
      if (!(Number(o.price) >= 0) || Number.isNaN(Number(o.price))) e[`offers.${i}.price`] = "Precio no válido.";
      const k = `${o.supplierId}|${o.unitId ?? ""}`;
      if (o.supplierId && seen.has(k)) e[`offers.${i}.supplierId`] = "Este proveedor ya tiene precio en esa presentación.";
      seen.add(k);
    });
    return e;
  }, [name, offers]);
  const errors = tried ? allErrors : {};

  const patch = (key: string, p: Partial<OfferRow>) => setOffers((os) => os.map((o) => (o.key === key ? { ...o, ...p } : o)));

  const save = async () => {
    setTried(true);
    if (Object.keys(allErrors).length) {
      toast.error(`Revisa los campos marcados: ${Object.values(allErrors)[0]}`);
      return;
    }
    setSaving(true);
    try {
      const saved = await saveProduct({
        name: name.trim(),
        description: description.trim() || null,
        categoryId: categoryId === NONE ? null : categoryId,
        brand: brand.trim() || null,
        partNumber: partNumber.trim() || null,
        unitId: unitId === NONE ? null : unitId,
        active,
        offers: offers.map((o) => ({ ...(o.id ? { id: o.id } : {}), supplierId: o.supplierId, unitId: o.unitId ?? null, price: Number(o.price), quality: o.quality ?? null })),
      }, product?.id);
      toast.success(product ? "Producto actualizado" : "Producto agregado");
      onSaved(saved);
      onOpenChange(false);
    } catch (e) {
      toast.error(apiError(e, "No se pudo guardar el producto"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{product ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          <DialogDescription>Los precios por proveedor se actualizan solos cuando capturas cotizaciones.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-3">
          <div className="grid gap-6 px-0.5 pb-1 pt-3">
            <FormSection title="Producto" columns={3}>
              <TextField label="Nombre" required icon={Tag} className="md:col-span-2" placeholder="Ej. ACDELCO 10W-30"
                value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
              <ComboField label="Categoría" icon={Package} value={categoryId} onChange={(v) => setCategoryId(v ?? NONE)}
                options={[{ value: NONE, label: "Sin categoría" }, ...grouped.flatMap((g) => g.items.map((c) => ({ value: c.id, label: c.name, group: KIND_PLURAL[g.kind] })))]}
                placeholder="Pieza o insumo" searchPlaceholder="Buscar categoría…" />
              <TextField label="Marca" icon={Tags} placeholder="Opcional" value={brand} onChange={(e) => setBrand(e.target.value)} />
              <TextField label="Número de parte" icon={Barcode} placeholder="Opcional" value={partNumber} onChange={(e) => setPartNumber(e.target.value)} />
              <ComboField label="Unidad de medida" icon={Boxes} value={unitId} onChange={(v) => setUnitId(v ?? NONE)}
                options={[{ value: NONE, label: "Sin unidad" }, ...units.filter((u) => u.active || u.id === unitId).map((u) => ({ value: u.id, label: u.name }))]}
                searchPlaceholder="Buscar unidad…" />
              <TextareaField label="Descripción" icon={ScrollText} className="md:col-span-3" rows={2} placeholder="Especificaciones, compatibilidad, notas…"
                value={description} onChange={(e) => setDescription(e.target.value)} />
            </FormSection>

            <FormSection title="Precios por proveedor" description="Un mismo producto puede tener varios proveedores con distinta calidad y precio.">
              {offers.length === 0 ? (
                <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">Sin precios todavía.</p>
              ) : (
                <div className="grid gap-3">
                  {offers.map((o, i) => (
                    <div key={o.key} className="grid items-end gap-3 md:grid-cols-[minmax(0,1fr)_170px_150px_auto_auto]">
                      <ComboField label="Proveedor" required icon={Store} value={o.supplierId || null} onChange={(v) => patch(o.key, { supplierId: v ?? "" })}
                        options={suppliers.map((sp) => ({ value: sp.id, label: sp.name }))} placeholder="Elige proveedor" searchPlaceholder="Buscar proveedor…"
                        error={errors[`offers.${i}.supplierId`]} />
                      <ComboField label="Presentación" icon={Boxes} value={o.unitId ?? null} onChange={(v) => patch(o.key, { unitId: v })}
                        options={units.map((u) => ({ value: u.id, label: u.name }))} allowClear clearLabel="Sin presentación" placeholder="Opcional"
                        searchPlaceholder="Buscar presentación…" />
                      <MoneyField label="Precio sin IVA" required value={o.price} onValueChange={(v) => patch(o.key, { price: v === "" ? 0 : v })}
                        error={errors[`offers.${i}.price`]} />
                      <div className="flex h-10 items-center px-1" title="Calidad">
                        <StarRating value={o.quality} onChange={(v) => patch(o.key, { quality: v })} />
                      </div>
                      <Button type="button" size="icon" variant="ghost" className="h-10 w-10 text-muted-foreground hover:text-destructive" aria-label="Quitar proveedor"
                        onClick={() => setOffers((os) => os.filter((x) => x.key !== o.key))}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <AddItemButton onClick={() => setOffers((os) => [...os, { key: newId(), supplierId: "", unitId: unitId === NONE ? null : unitId, price: 0, quality: null }])}>
                Agregar proveedor
              </AddItemButton>
            </FormSection>
          </div>
        </ScrollArea>
        <DialogFooter className="items-center border-t pt-4">
          <label className="mr-auto flex cursor-pointer items-center gap-2 text-sm" title="Los inactivos no aparecen al hacer solicitudes.">
            <Switch checked={active} onCheckedChange={setActive} /> {active ? "Activo" : "Inactivo (no aparece al pedir)"}
          </label>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <PmySpinner className="mr-2 h-4 w-4" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
