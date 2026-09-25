"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AddItemButton, ComboField, DateField, FormSection, ItemCard, MoneyField, SelectField, SwitchField, TextareaField, TextField,
} from "@/components/ui/field";
import { Boxes, Clock, Hash, Loader2, Package, Paperclip, PlusCircle, Store } from "lucide-react";
import { toast } from "@/lib/toast";
import { useProducts, useSuppliers } from "@/hooks/services/maintenance/use-maintenance";
import { createQuote, updateQuote, uploadQuoteAttachment } from "@/lib/services/maintenance";
import { getCompanySettings } from "@/lib/services/company-settings";
import { Availability, AVAILABILITY_LABEL, formatMoney, MaintenanceQuote, MaintenanceRequest, NeedView, QuoteItem } from "@/lib/types/maintenance";
import { bestOffer, Product } from "@/lib/types/compras";
import { deviationPct, IEPS_RATES, lineTaxes, pctLabel, totals } from "@/lib/maintenance-money";
import { ProductPicker } from "./product-picker";
import { SupplierFormDialog } from "../catalog/supplier-form-dialog";
import { StarRating } from "../shared/star-rating";
import { apiError } from "../shared/confirm-action";
import { firstError, hasErrors, validateQuote } from "@/lib/maintenance-validation";

interface Row extends QuoteItem {
  key: string;
  /** Número del renglón de la solicitud (para mostrar "Renglón 2"). */
  rowNumber?: number;
  /** Nombre de la necesidad ("Lo que se necesita") que cotiza. */
  needName?: string;
}

const base = (): Omit<Row, "key" | "description"> => ({
  quantity: 1, unitPrice: 0, availability: "si", leadTimeDays: null, ivaEnabled: true, iepsEnabled: false, iepsRate: 0, quality: null, referencePrice: null,
});
const extraRow = (): Row => ({ key: crypto.randomUUID(), description: "", requestItemId: null, productId: null, ...base() });
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Hermosillo" });

/** Renglones de la solicitud + "Lo que se necesita" como partidas iniciales de la cotización. */
function rowsFromRequest(request: MaintenanceRequest, needs: NeedView[]): Row[] {
  const items: Row[] = (request.items ?? []).map((it, idx) => ({
    key: crypto.randomUUID(), rowNumber: idx + 1, requestItemId: it.id ?? null, productId: it.productId ?? null,
    description: it.description, ...base(), quantity: Number(it.quantity),
  }));
  const fromNeeds: Row[] = needs.map((n) => ({
    key: crypto.randomUUID(), requestItemId: null, requestNeedId: n.id, needName: n.category.name, productId: n.product?.id ?? null,
    description: n.product ? [n.product.name, n.product.brand].filter(Boolean).join(" · ") : n.category.name, ...base(), quantity: Number(n.quantity),
  }));
  const all = [...items, ...fromNeeds];
  return all.length ? all : [extraRow()];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: MaintenanceRequest;
  quote?: MaintenanceQuote | null;
  /** "Lo que se necesita" (para precargar una cotización nueva). */
  needs?: NeedView[];
  onSaved: () => void;
}

export function QuoteFormDialog({ open, onOpenChange, request, quote, needs = [], onSaved }: Props) {
  const { suppliers, mutate: mutateSuppliers } = useSuppliers();
  const { products } = useProducts();
  const { data: company } = useSWR("company-settings", getCompanySettings);
  const threshold = Number((company as any)?.maintenanceDeviationPct ?? 15);

  const [supplierId, setSupplierId] = useState("");
  const [quoteDate, setQuoteDate] = useState(today());
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [newSupplierOpen, setNewSupplierOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const rowNumberOf = useMemo(() => new Map((request.items ?? []).map((it, i) => [it.id, i + 1])), [request.items]);

  useEffect(() => {
    if (!open) return;
    setSupplierId(quote?.supplierId ?? "");
    setQuoteDate(quote?.quoteDate?.slice(0, 10) ?? today());
    setValidUntil(quote?.validUntil?.slice(0, 10) ?? "");
    setNotes(quote?.notes ?? "");
    setRows(quote?.items?.length
      ? quote.items.map((i) => ({
        ...i, key: crypto.randomUUID(), rowNumber: i.requestItemId ? rowNumberOf.get(i.requestItemId) : undefined,
        needName: i.requestNeedId ? needs.find((n) => n.id === i.requestNeedId)?.category.name ?? "Pieza/insumo" : undefined,
        quantity: Number(i.quantity), unitPrice: Number(i.unitPrice), iepsRate: Number(i.iepsRate ?? 0),
        ivaEnabled: i.ivaEnabled ?? Number(i.taxRate ?? 0.16) > 0, availability: i.availability ?? "si",
      }))
      : rowsFromRequest(request, needs));
    setFile(null);
    setTried(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, quote, request, rowNumberOf]);

  // Referencia del catálogo (mejor precio conocido) y, al elegir proveedor, su último precio como punto de partida.
  const refOf = (productId?: string | null) => {
    const p = productId ? productById.get(productId) : undefined;
    const b = p ? bestOffer(p) : undefined;
    return b ? Number(b.price) : null;
  };
  const supplierPrice = (p: Product | undefined, sId: string) => p?.offers?.find((o) => o.supplierId === sId);
  useEffect(() => {
    if (!open || quote || !supplierId) return;
    setRows((rs) => rs.map((r) => {
      const offer = supplierPrice(r.productId ? productById.get(r.productId) : undefined, supplierId);
      return offer && !r.unitPrice ? { ...r, unitPrice: Number(offer.price), quality: r.quality ?? offer.quality ?? null } : r;
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId, open, quote, productById]);

  const patch = (key: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const t = useMemo(() => totals(rows), [rows]);
  const allIva = rows.length > 0 && rows.every((r) => r.ivaEnabled);
  const allIeps = rows.length > 0 && rows.every((r) => r.iepsEnabled);
  const commonIepsRate = rows.find((r) => r.iepsEnabled)?.iepsRate || IEPS_RATES[0];

  const allErrors = useMemo(() => validateQuote({ supplierId, quoteDate, validUntil, rows }), [supplierId, quoteDate, validUntil, rows]);
  const errors = tried ? allErrors : {};

  const save = async () => {
    setTried(true);
    if (hasErrors(allErrors)) {
      toast.error(`Revisa los campos marcados: ${firstError(allErrors)}`);
      return;
    }
    setSaving(true);
    try {
      const body = {
        supplierId,
        quoteDate,
        validUntil: validUntil || null,
        notes: notes.trim() || null,
        items: rows.map((r) => ({
          requestItemId: r.requestItemId || null,
          requestNeedId: r.requestNeedId || null,
          productId: r.productId || null,
          description: r.description.trim(),
          quantity: Number(r.quantity),
          unitPrice: Number(r.unitPrice),
          availability: r.availability ?? "si",
          leadTimeDays: r.availability === "sobre_pedido" && r.leadTimeDays !== null && r.leadTimeDays !== undefined && String(r.leadTimeDays) !== "" ? Number(r.leadTimeDays) : null,
          ivaEnabled: !!r.ivaEnabled,
          iepsEnabled: !!r.iepsEnabled,
          iepsRate: r.iepsEnabled ? Number(r.iepsRate) : 0,
          quality: r.quality ?? null,
        })),
      };
      const saved = quote ? await updateQuote(quote.id, body) : await createQuote(request.id, body);
      if (file) {
        try {
          await uploadQuoteAttachment(saved.id, file);
        } catch (e) {
          toast.error(apiError(e, "La cotización se guardó, pero no se pudo subir el archivo"));
        }
      }
      toast.success(quote ? "Cotización actualizada" : "Cotización agregada");
      // El precio capturado se guarda en el catálogo: se avisa cuando cambió respecto a lo que había.
      const supplierName = suppliers.find((s) => s.id === supplierId)?.name ?? "el proveedor";
      const changed = rows.flatMap((r) => {
        const p = r.productId ? productById.get(r.productId) : undefined;
        const before = supplierPrice(p, supplierId);
        return p && before && Number(before.price) !== Number(r.unitPrice) ? [`${p.name} con ${supplierName} a ${formatMoney(r.unitPrice)}`] : [];
      });
      if (changed.length) toast.info(`Se actualizó el precio de ${changed.slice(0, 3).join("; ")}${changed.length > 3 ? ` y ${changed.length - 3} más` : ""}.`);
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(apiError(e, "No se pudo guardar la cotización"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="gap-0 p-0 sm:max-w-4xl">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle className="text-lg">{quote ? "Editar cotización" : "Agregar cotización"}</DialogTitle>
            <DialogDescription>
              Solicitud {request.folio} · captura precio, existencia e impuestos de cada concepto tal como lo cotizó el proveedor.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[68vh]">
            <div className="grid gap-5 px-6 py-5">
              <FormSection title="Proveedor" columns={3}>
                <div className="flex items-start gap-2 md:col-span-3">
                  <ComboField
                    className="flex-1"
                    label="Proveedor"
                    required
                    icon={Store}
                    value={supplierId || null}
                    onChange={(v) => setSupplierId(v ?? "")}
                    options={suppliers.map((s) => ({ value: s.id, label: s.name, hint: s.rfc ?? undefined }))}
                    placeholder="Elige el proveedor"
                    searchPlaceholder="Buscar proveedor…"
                    emptyText="No está. Agrégalo con el botón de la derecha."
                    error={errors.supplierId}
                  />
                  <Button type="button" variant="outline" className="h-12 rounded-xl" onClick={() => setNewSupplierOpen(true)}>
                    <PlusCircle className="mr-1.5 h-4 w-4" /> Nuevo
                  </Button>
                </div>
                <DateField label="Fecha de la cotización" required value={quoteDate} onChange={setQuoteDate} error={errors.quoteDate} />
                <DateField label="Vigente hasta" value={validUntil} onChange={setValidUntil} clearable placeholder="Sin vigencia" error={errors.validUntil} />
              </FormSection>

              <FormSection title="Impuestos" description="Aplica a todos los conceptos; después puedes ajustar uno por uno." columns={2}>
                <SwitchField label="IVA 16%" checked={allIva} onCheckedChange={(v) => setRows((rs) => rs.map((r) => ({ ...r, ivaEnabled: v })))} />
                <SwitchField label="IEPS" description={allIeps ? undefined : "Combustibles, lubricantes, etc."} checked={allIeps}
                  onCheckedChange={(v) => setRows((rs) => rs.map((r) => ({ ...r, iepsEnabled: v, iepsRate: v ? Number(r.iepsRate) || commonIepsRate : r.iepsRate })))}>
                  {allIeps && (
                    <Select value={String(commonIepsRate)} onValueChange={(v) => setRows((rs) => rs.map((r) => ({ ...r, iepsRate: Number(v) })))}>
                      <SelectTrigger className="h-8 w-24 rounded-lg"><SelectValue /></SelectTrigger>
                      <SelectContent>{IEPS_RATES.map((r) => <SelectItem key={r} value={String(r)}>{pctLabel(r)}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                </SwitchField>
              </FormSection>

              <FormSection title="Conceptos" description={`${rows.length} ${rows.length === 1 ? "concepto" : "conceptos"} · los precios del catálogo son solo de referencia`}>
                <div className="grid gap-2">
                  {rows.map((r, i) => {
                    const ref = r.referencePrice ?? refOf(r.productId);
                    const dev = deviationPct(r.unitPrice, ref);
                    const lt = lineTaxes(r);
                    const origin = r.rowNumber
                      ? <Badge variant="outline" className="h-5 text-[10px] font-normal">Renglón {r.rowNumber}</Badge>
                      : r.requestNeedId
                        ? <Badge variant="outline" className="h-5 border-violet-200 bg-violet-50 text-[10px] font-normal text-violet-700">Necesidad: {r.needName ?? "pieza/insumo"}</Badge>
                        : <Badge variant="outline" className="h-5 border-sky-200 bg-sky-50 text-[10px] font-normal text-sky-700">Extra</Badge>;
                    return (
                      <ItemCard
                        key={r.key}
                        title={<span className="flex items-center gap-2"><span className="truncate">{r.description.trim() || `Concepto ${i + 1}`}</span>{origin}</span>}
                        subtitle={[
                          `${r.quantity || 0} × ${formatMoney(r.unitPrice)}`,
                          AVAILABILITY_LABEL[(r.availability ?? "si") as Availability],
                        ].join(" · ")}
                        aside={
                          <span className="text-right">
                            <span className="block font-semibold">{formatMoney(lt.total)}</span>
                            {lt.total !== lt.amount && <span className="block text-[11px] text-muted-foreground">sin imp. {formatMoney(lt.amount)}</span>}
                          </span>
                        }
                        onRemove={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                        removeDisabled={rows.length === 1}
                        removeLabel={r.requestItemId || r.requestNeedId ? "El proveedor no cotizó este concepto" : "Quitar"}
                      >
                        <div className="flex items-start gap-2">
                          {!r.requestItemId && !r.requestNeedId && (
                            <div className="pt-1.5">
                              <ProductPicker onPick={(p) => patch(r.key, {
                                productId: p.id, description: p.name,
                                unitPrice: Number(supplierPrice(p, supplierId)?.price ?? bestOffer(p)?.price ?? 0), referencePrice: null,
                              })} />
                            </div>
                          )}
                          <TextField className="flex-1" label="Concepto" required icon={Package} value={r.description}
                            onChange={(e) => patch(r.key, { description: e.target.value })} placeholder="Concepto que cotizó el proveedor"
                            error={errors[`rows.${i}.description`]}
                            hint={ref !== null ? (
                              <span className="flex flex-wrap items-center gap-2">
                                Referencia del catálogo: {formatMoney(ref)}
                                {dev !== null && dev > threshold && (
                                  <Badge variant="outline" className="h-5 border-amber-300 bg-amber-50 text-[10px] text-amber-700">+{dev}% sobre la referencia</Badge>
                                )}
                              </span>
                            ) : undefined} />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <TextField label="Cantidad" required icon={Hash} type="number" min={0.01} step="0.01" value={r.quantity}
                            onChange={(e) => patch(r.key, { quantity: Number(e.target.value) })} error={errors[`rows.${i}.quantity`]} />
                          <MoneyField label="Precio unitario" required value={r.unitPrice}
                            onValueChange={(v) => patch(r.key, { unitPrice: v === "" ? 0 : v })} error={errors[`rows.${i}.unitPrice`]} />
                          <SelectField label="Existencia" icon={Boxes} value={r.availability ?? "si"}
                            onValueChange={(v) => patch(r.key, { availability: v as Availability })}
                            options={(Object.keys(AVAILABILITY_LABEL) as Availability[]).map((a) => ({ value: a, label: AVAILABILITY_LABEL[a] }))} />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          {r.availability === "sobre_pedido" ? (
                            <TextField label="Días de entrega" icon={Clock} type="number" min={0} max={365} step="1" value={r.leadTimeDays ?? ""}
                              onChange={(e) => patch(r.key, { leadTimeDays: e.target.value === "" ? null : Number(e.target.value) })}
                              placeholder="Ej. 3" error={errors[`rows.${i}.leadTimeDays`]} />
                          ) : <div className="hidden sm:block" />}
                          <SwitchField label="IVA" checked={!!r.ivaEnabled} onCheckedChange={(v) => patch(r.key, { ivaEnabled: v })} className="self-end" />
                          <SwitchField label="IEPS" checked={!!r.iepsEnabled} className="self-end"
                            onCheckedChange={(v) => patch(r.key, { iepsEnabled: v, iepsRate: v ? Number(r.iepsRate) || IEPS_RATES[0] : r.iepsRate })}>
                            {r.iepsEnabled && (
                              <Select value={String(r.iepsRate ?? "")} onValueChange={(v) => patch(r.key, { iepsRate: Number(v) })}>
                                <SelectTrigger className="h-8 w-20 rounded-lg"><SelectValue placeholder="Tasa" /></SelectTrigger>
                                <SelectContent>{IEPS_RATES.map((x) => <SelectItem key={x} value={String(x)}>{pctLabel(x)}</SelectItem>)}</SelectContent>
                              </Select>
                            )}
                          </SwitchField>
                        </div>
                        {errors[`rows.${i}.iepsRate`] && <p className="px-1 text-xs text-destructive">{errors[`rows.${i}.iepsRate`]}</p>}
                        <div className="flex min-h-12 items-center gap-3 rounded-xl border border-[hsl(var(--field-border))] px-3.5 py-2">
                          <span className="text-sm font-medium">Calidad</span>
                          <StarRating value={r.quality} onChange={(v) => patch(r.key, { quality: v })} size="md" />
                          <span className="text-xs text-muted-foreground">{r.quality ? `${r.quality} de 5` : "Sin calificar"}</span>
                        </div>
                      </ItemCard>
                    );
                  })}
                  <AddItemButton onClick={() => setRows((rs) => [...rs, extraRow()])}>Agregar concepto extra</AddItemButton>
                </div>
              </FormSection>

              <FormSection title="Notas y archivo" columns={2}>
                <TextareaField label="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tiempo de entrega, garantía, condiciones…" />
                <label className="flex min-h-[88px] cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[hsl(var(--field-border))] p-3.5 text-sm text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5">
                  <Paperclip className="h-5 w-5 shrink-0" />
                  <span className="min-w-0">
                    <span className="block font-medium text-foreground">Archivo del proveedor</span>
                    <span className="block truncate text-xs">
                      {file ? file.name : quote?.attachmentName ? `Actual: ${quote.attachmentName} (sube otro para reemplazar)` : "PDF o foto de la cotización (máx. 10 MB)"}
                    </span>
                  </span>
                  <input type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                </label>
              </FormSection>
            </div>
          </ScrollArea>
          <DialogFooter className="flex-col gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <dl className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
              <span className="text-muted-foreground">Subtotal <span className="tabular-nums text-foreground">{formatMoney(t.subtotal)}</span></span>
              {t.ieps > 0 && <span className="text-muted-foreground">IEPS <span className="tabular-nums text-foreground">{formatMoney(t.ieps)}</span></span>}
              <span className="text-muted-foreground">IVA <span className="tabular-nums text-foreground">{formatMoney(t.tax)}</span></span>
              <span className="text-base font-semibold">Total <span className="tabular-nums">{formatMoney(t.total)}</span></span>
            </dl>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar cotización
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <SupplierFormDialog
        open={newSupplierOpen}
        onOpenChange={setNewSupplierOpen}
        onSaved={(s) => {
          mutateSuppliers();
          setSupplierId(s.id);
        }}
      />
    </>
  );
}
