"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Paperclip, Plus, PlusCircle, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { useProducts, useSuppliers } from "@/hooks/services/maintenance/use-maintenance";
import { createQuote, updateQuote, uploadQuoteAttachment } from "@/lib/services/maintenance";
import { getCompanySettings } from "@/lib/services/company-settings";
import { Availability, AVAILABILITY_LABEL, formatMoney, MaintenanceQuote, MaintenanceRequest, QuoteItem } from "@/lib/types/maintenance";
import { bestOffer, Product } from "@/lib/types/compras";
import { deviationPct, IEPS_RATES, lineTaxes, pctLabel, totals } from "@/lib/maintenance-money";
import { ProductPicker } from "./product-picker";
import { SupplierFormDialog } from "../catalog/supplier-form-dialog";
import { StarRating } from "../shared/star-rating";
import { apiError } from "../shared/confirm-action";
import { FieldError, invalidClass } from "../shared/field-error";
import { firstError, hasErrors, validateQuote } from "@/lib/maintenance-validation";

interface Row extends QuoteItem {
  key: string;
  /** Número del renglón de la solicitud (para mostrar "Renglón 2"). */
  rowNumber?: number;
}

const base = (): Omit<Row, "key" | "description"> => ({
  quantity: 1, unitPrice: 0, availability: "si", leadTimeDays: null, ivaEnabled: true, iepsEnabled: false, iepsRate: 0, quality: null, referencePrice: null,
});
const extraRow = (): Row => ({ key: crypto.randomUUID(), description: "", requestItemId: null, productId: null, ...base() });
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Hermosillo" });

/** Renglones de la solicitud como partidas iniciales de la cotización. */
function rowsFromRequest(request: MaintenanceRequest): Row[] {
  const items = request.items ?? [];
  if (!items.length) return [extraRow()];
  return items.map((it, idx) => ({
    key: crypto.randomUUID(), rowNumber: idx + 1, requestItemId: it.id ?? null, productId: it.productId ?? null,
    description: it.description, ...base(), quantity: Number(it.quantity),
  }));
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: MaintenanceRequest;
  quote?: MaintenanceQuote | null;
  onSaved: () => void;
}

export function QuoteFormDialog({ open, onOpenChange, request, quote, onSaved }: Props) {
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
        quantity: Number(i.quantity), unitPrice: Number(i.unitPrice), iepsRate: Number(i.iepsRate ?? 0),
        ivaEnabled: i.ivaEnabled ?? Number(i.taxRate ?? 0.16) > 0, availability: i.availability ?? "si",
      }))
      : rowsFromRequest(request));
    setFile(null);
    setTried(false);
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
        <DialogContent className="sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>{quote ? "Editar cotización" : "Agregar cotización"}</DialogTitle>
            <DialogDescription>
              Solicitud {request.folio} · captura precio, existencia e impuestos de cada concepto tal como lo cotizó el proveedor.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-3">
            <div className="grid gap-4 py-2">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="grid gap-1.5 md:col-span-2">
                  <Label>Proveedor</Label>
                  <div className="flex gap-2">
                    <Select value={supplierId} onValueChange={setSupplierId}>
                      <SelectTrigger className={invalidClass(errors.supplierId)}><SelectValue placeholder="Elige el proveedor" /></SelectTrigger>
                      <SelectContent>
                        {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="icon" onClick={() => setNewSupplierOpen(true)} title="Nuevo proveedor" aria-label="Nuevo proveedor">
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                  </div>
                  <FieldError message={errors.supplierId} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Fecha</Label>
                  <Input type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} className={invalidClass(errors.quoteDate)} />
                  <FieldError message={errors.quoteDate} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Vigente hasta</Label>
                  <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={invalidClass(errors.validUntil)} />
                  <FieldError message={errors.validUntil} />
                </div>
              </div>

              {/* Switches generales: aplican a todas las partidas (luego se puede ajustar una por una). */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Aplicar a todas:</span>
                <label className="flex items-center gap-2">
                  <Switch checked={allIva} onCheckedChange={(v) => setRows((rs) => rs.map((r) => ({ ...r, ivaEnabled: v })))} />
                  IVA 16%
                </label>
                <label className="flex items-center gap-2">
                  <Switch checked={allIeps} onCheckedChange={(v) => setRows((rs) => rs.map((r) => ({ ...r, iepsEnabled: v, iepsRate: v ? Number(r.iepsRate) || commonIepsRate : r.iepsRate })))} />
                  IEPS
                </label>
                {allIeps && (
                  <Select value={String(commonIepsRate)} onValueChange={(v) => setRows((rs) => rs.map((r) => ({ ...r, iepsRate: Number(v) })))}>
                    <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>{IEPS_RATES.map((r) => <SelectItem key={r} value={String(r)}>{pctLabel(r)}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[240px]">Concepto</TableHead>
                      <TableHead className="w-24">Cant.</TableHead>
                      <TableHead className="w-32">P. unitario</TableHead>
                      <TableHead className="w-40">Existencia</TableHead>
                      <TableHead className="w-44">Impuestos</TableHead>
                      <TableHead className="w-28">Calidad</TableHead>
                      <TableHead className="w-32 text-right">Importe</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => {
                      const ref = r.referencePrice ?? refOf(r.productId);
                      const dev = deviationPct(r.unitPrice, ref);
                      const lt = lineTaxes(r);
                      return (
                        <TableRow key={r.key} className="align-top">
                          <TableCell>
                            <div className="flex gap-2">
                              {!r.requestItemId && (
                                <ProductPicker onPick={(p) => patch(r.key, {
                                  productId: p.id, description: p.name,
                                  unitPrice: Number(supplierPrice(p, supplierId)?.price ?? bestOffer(p)?.price ?? 0), referencePrice: null,
                                })} />
                              )}
                              <Input
                                value={r.description}
                                onChange={(e) => patch(r.key, { description: e.target.value })}
                                placeholder="Concepto que cotizó el proveedor"
                                className={invalidClass(errors[`rows.${i}.description`])}
                              />
                            </div>
                            <FieldError message={errors[`rows.${i}.description`]} className="mt-1" />
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              {r.rowNumber ? <Badge variant="outline" className="h-5 text-[10px]">Renglón {r.rowNumber}</Badge>
                                : <Badge variant="outline" className="h-5 border-sky-200 bg-sky-50 text-[10px] text-sky-700">Extra</Badge>}
                              {ref !== null && <span>Referencia: {formatMoney(ref)}</span>}
                              {dev !== null && dev > threshold && (
                                <Badge variant="outline" className="h-5 border-amber-300 bg-amber-50 text-[10px] text-amber-700">+{dev}% sobre la referencia</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input type="number" min={0.01} step="0.01" value={r.quantity} onChange={(e) => patch(r.key, { quantity: Number(e.target.value) })} className={invalidClass(errors[`rows.${i}.quantity`])} />
                            <FieldError message={errors[`rows.${i}.quantity`]} className="mt-1" />
                          </TableCell>
                          <TableCell>
                            <Input type="number" min={0} step="0.01" value={r.unitPrice} onChange={(e) => patch(r.key, { unitPrice: Number(e.target.value) })} className={invalidClass(errors[`rows.${i}.unitPrice`])} />
                            <FieldError message={errors[`rows.${i}.unitPrice`]} className="mt-1" />
                          </TableCell>
                          <TableCell>
                            <Select value={r.availability ?? "si"} onValueChange={(v) => patch(r.key, { availability: v as Availability })}>
                              <SelectTrigger className={r.availability === "no" ? "border-red-300 text-red-700" : undefined}><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {(Object.keys(AVAILABILITY_LABEL) as Availability[]).map((a) => <SelectItem key={a} value={a}>{AVAILABILITY_LABEL[a]}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            {r.availability === "sobre_pedido" && (
                              <div className="mt-1.5 flex items-center gap-1.5">
                                <Input type="number" min={0} max={365} step="1" value={r.leadTimeDays ?? ""} placeholder="Días"
                                  onChange={(e) => patch(r.key, { leadTimeDays: e.target.value === "" ? null : Number(e.target.value) })}
                                  className={`h-8 w-20 ${invalidClass(errors[`rows.${i}.leadTimeDays`])}`} />
                                <span className="text-xs text-muted-foreground">días</span>
                              </div>
                            )}
                            <FieldError message={errors[`rows.${i}.leadTimeDays`]} className="mt-1" />
                          </TableCell>
                          <TableCell>
                            <div className="grid gap-1.5 text-sm">
                              <label className="flex items-center gap-2">
                                <Switch checked={!!r.ivaEnabled} onCheckedChange={(v) => patch(r.key, { ivaEnabled: v })} /> IVA
                              </label>
                              <div className="flex items-center gap-2">
                                <Switch checked={!!r.iepsEnabled} onCheckedChange={(v) => patch(r.key, { iepsEnabled: v, iepsRate: v ? Number(r.iepsRate) || IEPS_RATES[0] : r.iepsRate })} /> IEPS
                                {r.iepsEnabled && (
                                  <Select value={String(r.iepsRate ?? "")} onValueChange={(v) => patch(r.key, { iepsRate: Number(v) })}>
                                    <SelectTrigger className={`h-7 w-20 ${invalidClass(errors[`rows.${i}.iepsRate`])}`}><SelectValue placeholder="Tasa" /></SelectTrigger>
                                    <SelectContent>{IEPS_RATES.map((x) => <SelectItem key={x} value={String(x)}>{pctLabel(x)}</SelectItem>)}</SelectContent>
                                  </Select>
                                )}
                              </div>
                              <FieldError message={errors[`rows.${i}.iepsRate`]} />
                            </div>
                          </TableCell>
                          <TableCell className="pt-4">
                            <StarRating value={r.quality} onChange={(v) => patch(r.key, { quality: v })} />
                          </TableCell>
                          <TableCell className="pt-4 text-right tabular-nums">
                            {formatMoney(lt.amount)}
                            {lt.total !== lt.amount && <span className="block text-xs text-muted-foreground">con imp. {formatMoney(lt.total)}</span>}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button" size="icon" variant="ghost" className="text-destructive"
                              disabled={rows.length === 1}
                              onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                              aria-label="Quitar partida" title={r.requestItemId ? "El proveedor no cotizó este renglón" : "Quitar"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="flex flex-col gap-3 border-t p-3 sm:flex-row sm:items-start sm:justify-between">
                  <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setRows((rs) => [...rs, extraRow()])}>
                    <Plus className="h-4 w-4" /> Agregar concepto extra
                  </Button>
                  <dl className="grid min-w-[220px] grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    <dt className="text-muted-foreground">Subtotal</dt><dd className="text-right tabular-nums">{formatMoney(t.subtotal)}</dd>
                    {t.ieps > 0 && <><dt className="text-muted-foreground">IEPS</dt><dd className="text-right tabular-nums">{formatMoney(t.ieps)}</dd></>}
                    <dt className="text-muted-foreground">IVA</dt><dd className="text-right tabular-nums">{formatMoney(t.tax)}</dd>
                    <dt className="font-semibold">Total</dt><dd className="text-right font-semibold tabular-nums">{formatMoney(t.total)}</dd>
                  </dl>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label>Notas</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Tiempo de entrega, garantía, condiciones…" />
                </div>
                <div className="grid gap-1.5">
                  <Label>Archivo del proveedor (opcional)</Label>
                  <label className="flex h-full min-h-[76px] cursor-pointer items-center gap-3 rounded-md border border-dashed p-3 text-sm text-muted-foreground hover:bg-muted/40">
                    <Paperclip className="h-5 w-5" />
                    <span className="truncate">
                      {file ? file.name : quote?.attachmentName ? `Actual: ${quote.attachmentName} (sube otro para reemplazar)` : "PDF o foto de la cotización (máx. 10 MB)"}
                    </span>
                    <input type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                  </label>
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar cotización
            </Button>
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
