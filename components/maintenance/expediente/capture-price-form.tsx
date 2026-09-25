"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ComboField, MoneyField, TextField } from "@/components/ui/field";
import { Loader2, Package, Plus, Store, Tag } from "lucide-react";
import { toast } from "@/lib/toast";
import { useSuppliers } from "@/hooks/services/maintenance/use-maintenance";
import { captureNeedPrice } from "@/lib/services/maintenance";
import { NeedView } from "@/lib/types/maintenance";
import { StarRating } from "../shared/star-rating";
import { apiError } from "../shared/confirm-action";
import { SupplierFormDialog } from "../catalog/supplier-form-dialog";

/**
 * Capturar ahí mismo el precio que dio un proveedor para una pieza/insumo, aunque no esté en el catálogo.
 * Si el proveedor no existe se da de alta en un modal (no se pierde lo capturado). Al generar órdenes se
 * pregunta si se guarda en el catálogo.
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
  const shown = tried ? errors : ({} as typeof errors);

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
    <div className="grid gap-4 rounded-xl border border-dashed border-primary/30 bg-primary/[0.03] p-3">
      <p className="text-xs text-muted-foreground">Precio que te dio el proveedor para <b className="text-foreground">{need.category.name}</b> × {need.quantity}.</p>
      <div className="grid gap-x-3 gap-y-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="flex items-start gap-2">
          <ComboField className="flex-1" label="Proveedor" required icon={Store} value={supplierId} onChange={setSupplierId} modal={false}
            options={suppliers.map((s) => ({ value: s.id, label: s.name, hint: s.rfc ?? undefined }))}
            placeholder="Elige el proveedor" searchPlaceholder="Buscar proveedor…" emptyText="No está. Agrégalo con &quot;Nuevo&quot;." error={shown.supplierId} />
          <Button type="button" variant="outline" className="h-12 shrink-0 rounded-xl" onClick={() => setNewSupplier(true)}>
            <Plus className="mr-1 h-4 w-4" /> Nuevo
          </Button>
        </div>
        <TextField label="Producto" required icon={Package} value={description} onChange={(e) => setDescription(e.target.value)} error={shown.description} />
        <TextField label="Marca" icon={Tag} value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Opcional" />
        <MoneyField label="Precio unitario" required value={price} onValueChange={setPrice} error={shown.price} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm">Calidad</span>
        <StarRating value={quality} onChange={setQuality} size="md" />
        <div className="ml-auto flex gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={saving}>Cancelar</Button>
          <Button type="button" size="sm" onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Agregar a la cotización
          </Button>
        </div>
      </div>
      <SupplierFormDialog
        open={newSupplier}
        onOpenChange={setNewSupplier}
        onSaved={(s) => { mutateSuppliers(); setSupplierId(s.id); }}
      />
    </div>
  );
}
