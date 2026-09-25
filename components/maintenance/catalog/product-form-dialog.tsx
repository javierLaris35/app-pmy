"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { saveProduct } from "@/lib/services/maintenance";
import { useProductCategories, useSuppliers, useUnits } from "@/hooks/services/maintenance/use-maintenance";
import { KIND_PLURAL, Product, ProductKind, ProductOffer } from "@/lib/types/compras";
import { apiError } from "../shared/confirm-action";
import { FieldError, invalidClass } from "../shared/field-error";
import { StarRating } from "../shared/star-rating";

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
    setOffers((product?.offers ?? []).map((o) => ({ ...o, key: o.id ?? crypto.randomUUID(), price: Number(o.price) })));
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
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{product ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          <DialogDescription>Los precios por proveedor se actualizan solos cuando capturas cotizaciones.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-3">
          <div className="grid gap-4 py-2">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-1.5 md:col-span-2">
                <Label>Nombre</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. ACDELCO 10W-30" className={invalidClass(errors.name)} />
                <FieldError message={errors.name} />
              </div>
              <div className="grid gap-1.5">
                <Label>Categoría</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Pieza o insumo" /></SelectTrigger>
                  <SelectContent className="max-h-80">
                    <SelectItem value={NONE}>Sin categoría</SelectItem>
                    {grouped.map((g) => (
                      <SelectGroup key={g.kind}>
                        <SelectLabel>{KIND_PLURAL[g.kind]}</SelectLabel>
                        {g.items.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-1.5">
                <Label>Marca</Label>
                <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Opcional" />
              </div>
              <div className="grid gap-1.5">
                <Label>Número de parte</Label>
                <Input value={partNumber} onChange={(e) => setPartNumber(e.target.value)} placeholder="Opcional" />
              </div>
              <div className="grid gap-1.5">
                <Label>Unidad de medida</Label>
                <Select value={unitId} onValueChange={setUnitId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sin unidad</SelectItem>
                    {units.filter((u) => u.active || u.id === unitId).map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Descripción</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Especificaciones, compatibilidad, notas…" />
            </div>

            <div className="rounded-lg border">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Precios por proveedor</p>
                  <p className="text-xs text-muted-foreground">Un mismo producto puede tener varios proveedores con distinta calidad y precio.</p>
                </div>
                <Button type="button" size="sm" variant="outline"
                  onClick={() => setOffers((os) => [...os, { key: crypto.randomUUID(), supplierId: "", unitId: unitId === NONE ? null : unitId, price: 0, quality: null }])}>
                  <Plus className="mr-1.5 h-4 w-4" /> Agregar proveedor
                </Button>
              </div>
              {offers.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">Sin precios todavía.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Proveedor</TableHead>
                      <TableHead className="w-40">Presentación</TableHead>
                      <TableHead className="w-36">Precio (sin IVA)</TableHead>
                      <TableHead className="w-36">Calidad</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {offers.map((o, i) => (
                      <TableRow key={o.key} className="align-top">
                        <TableCell>
                          <Select value={o.supplierId} onValueChange={(v) => patch(o.key, { supplierId: v })}>
                            <SelectTrigger className={invalidClass(errors[`offers.${i}.supplierId`])}><SelectValue placeholder="Elige proveedor" /></SelectTrigger>
                            <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                          </Select>
                          <FieldError message={errors[`offers.${i}.supplierId`]} className="mt-1" />
                        </TableCell>
                        <TableCell>
                          <Select value={o.unitId ?? NONE} onValueChange={(v) => patch(o.key, { unitId: v === NONE ? null : v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE}>—</SelectItem>
                              {units.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input type="number" min={0} step="0.01" value={o.price} onChange={(e) => patch(o.key, { price: Number(e.target.value) })}
                            className={invalidClass(errors[`offers.${i}.price`])} />
                          <FieldError message={errors[`offers.${i}.price`]} className="mt-1" />
                        </TableCell>
                        <TableCell className="pt-4"><StarRating value={o.quality} onChange={(v) => patch(o.key, { quality: v })} /></TableCell>
                        <TableCell>
                          <Button type="button" size="icon" variant="ghost" className="text-destructive" aria-label="Quitar proveedor"
                            onClick={() => setOffers((os) => os.filter((x) => x.key !== o.key))}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Activo</p>
                <p className="text-xs text-muted-foreground">Los inactivos no aparecen al hacer solicitudes.</p>
              </div>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
