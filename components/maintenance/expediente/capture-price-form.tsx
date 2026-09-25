"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ComboField, MoneyField, TextField } from "@/components/ui/field";
import { Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { useSuppliers } from "@/hooks/services/maintenance/use-maintenance";
import { captureNeedPrice } from "@/lib/services/maintenance";
import { NeedView } from "@/lib/types/maintenance";
import { StarRating } from "../shared/star-rating";
import { apiError } from "../shared/confirm-action";
import { SupplierFormDialog } from "../catalog/supplier-form-dialog";

/**
 * "Capturar precio" en UNA línea (campos compactos): proveedor (+ Nuevo en modal), producto, marca,
 * precio y calidad. Entra a la cotización del proveedor sin pasar por Catálogos.
 */
export function CapturePriceForm({ need, onSaved, onCancel }: { need: NeedView; onSaved: () => Promise<unknown> | void; onCancel: () => void }) {
  const { suppliers, mutate: mutateSuppliers } = useSuppliers();
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [description, setDescription] = useState(need.product?.name ?? need.category.name);
  const [brand, setBrand] = useState(need.product?.brand ?? "");
  const [price, setPrice] = useState<number | "">("");
  const [quality, setQuality] = useState<number | null>(null);
  const [newSupplier, setNewSupplier] = useState(false);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);

  const errors = {
    supplierId: !supplierId ? "Elige el proveedor (o agrégalo con \"Nuevo\")." : undefined,
    description: description.trim().length < 2 ? "Escribe qué producto te cotizó." : undefined,
    price: price === "" ? "Escribe el precio unitario." : undefined,
  };
  const first = tried ? errors.supplierId ?? errors.description ?? errors.price : undefined;

  const save = async () => {
    setTried(true);
    if (errors.supplierId || errors.description || errors.price) return;
    setSaving(true);
    try {
      await captureNeedPrice(need.id, { supplierId: supplierId!, description: description.trim(), brand: brand.trim() || null, unitPrice: Number(price), quality });
      toast.success(`${need.category.name}: se agregó a la cotización de ${suppliers.find((s) => s.id === supplierId)?.name ?? "el proveedor"}.`);
      await onSaved();
    } catch (e) {
      toast.error(apiError(e, "No se pudo guardar el precio"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-1 bg-primary/[0.03] px-3 py-2">
      <div className="grid items-center gap-1.5 lg:grid-cols-[minmax(0,1.4fr)_auto_minmax(0,1.3fr)_minmax(0,.8fr)_minmax(0,.7fr)_auto_auto]">
        <ComboField size="sm" label="Proveedor" value={supplierId} onChange={setSupplierId} modal={false}
          options={suppliers.map((s) => ({ value: s.id, label: s.name, hint: s.rfc ?? undefined }))}
          placeholder="Proveedor…" searchPlaceholder="Buscar proveedor…" emptyText="No está. Agrégalo con &quot;Nuevo&quot;."
          invalid={tried && !!errors.supplierId} />
        <Button type="button" size="sm" variant="outline" className="h-9 rounded-lg" onClick={() => setNewSupplier(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Nuevo
        </Button>
        <TextField size="sm" label="Producto" value={description} onChange={(e) => setDescription(e.target.value)}
          className={cn(tried && errors.description && "[&>div]:border-destructive")} />
        <TextField size="sm" label="Marca" value={brand} onChange={(e) => setBrand(e.target.value)} />
        <MoneyField size="sm" label="Precio" value={price} onValueChange={setPrice}
          className={cn(tried && errors.price && "[&>div]:border-destructive")} />
        <StarRating value={quality} onChange={setQuality} />
        <div className="flex gap-1.5">
          <Button type="button" size="sm" variant="ghost" className="h-9" onClick={onCancel} disabled={saving}>Cancelar</Button>
          <Button type="button" size="sm" className="h-9" onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />} Agregar
          </Button>
        </div>
      </div>
      {first && <p className="text-xs text-destructive">{first}</p>}
      <SupplierFormDialog open={newSupplier} onOpenChange={setNewSupplier} onSaved={(s) => { mutateSuppliers(); setSupplierId(s.id); }} />
    </div>
  );
}
