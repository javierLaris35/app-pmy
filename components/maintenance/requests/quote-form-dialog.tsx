"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Paperclip, Plus, PlusCircle, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { useMaintenanceServices, useSuppliers } from "@/hooks/services/maintenance/use-maintenance";
import { createQuote, updateQuote, uploadQuoteAttachment } from "@/lib/services/maintenance";
import { getCompanySettings } from "@/lib/services/company-settings";
import { formatMoney, MaintenanceQuote, MaintenanceRequest, QuoteItem } from "@/lib/types/maintenance";
import { deviationPct, itemAmount, totals } from "@/lib/maintenance-money";
import { ServicePicker } from "./service-picker";
import { SupplierFormDialog } from "../catalog/supplier-form-dialog";
import { apiError } from "../shared/confirm-action";

interface Row extends QuoteItem {
  key: string;
}

const newRow = (): Row => ({ key: crypto.randomUUID(), serviceId: null, description: "", quantity: 1, unitPrice: 0, taxRate: 0.16, referencePrice: null });
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Hermosillo" });

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: MaintenanceRequest;
  quote?: MaintenanceQuote | null;
  onSaved: () => void;
}

export function QuoteFormDialog({ open, onOpenChange, request, quote, onSaved }: Props) {
  const { suppliers, mutate: mutateSuppliers } = useSuppliers();
  const { services } = useMaintenanceServices({ vehicleType: request.vehicle?.type });
  const { data: company } = useSWR("company-settings", getCompanySettings);
  const threshold = Number((company as any)?.maintenanceDeviationPct ?? 15);

  const [supplierId, setSupplierId] = useState("");
  const [quoteDate, setQuoteDate] = useState(today());
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [file, setFile] = useState<File | null>(null);
  const [newSupplierOpen, setNewSupplierOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSupplierId(quote?.supplierId ?? "");
    setQuoteDate(quote?.quoteDate?.slice(0, 10) ?? today());
    setValidUntil(quote?.validUntil?.slice(0, 10) ?? "");
    setNotes(quote?.notes ?? "");
    setRows(quote?.items?.length
      ? quote.items.map((i) => ({ ...i, key: crypto.randomUUID(), quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) }))
      : [newRow()]);
    setFile(null);
  }, [open, quote]);

  const patch = (key: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const t = useMemo(() => totals(rows), [rows]);
  const valid = supplierId && quoteDate && rows.length > 0 && rows.every((r) => r.description.trim().length >= 2 && r.quantity > 0 && r.unitPrice >= 0);

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        supplierId,
        quoteDate,
        validUntil: validUntil || null,
        notes: notes.trim() || null,
        items: rows.map((r) => ({
          serviceId: r.serviceId || null,
          description: r.description.trim(),
          quantity: Number(r.quantity),
          unitPrice: Number(r.unitPrice),
          taxRate: Number(r.taxRate ?? 0.16),
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
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{quote ? "Editar cotización" : "Agregar cotización"}</DialogTitle>
            <DialogDescription>
              Solicitud {request.folio} · captura lo que cotizó el proveedor. Los precios del catálogo son solo de referencia.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-3">
            <div className="grid gap-4 py-2">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="grid gap-1.5 md:col-span-2">
                  <Label>Proveedor</Label>
                  <div className="flex gap-2">
                    <Select value={supplierId} onValueChange={setSupplierId}>
                      <SelectTrigger><SelectValue placeholder="Elige el proveedor" /></SelectTrigger>
                      <SelectContent>
                        {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="icon" onClick={() => setNewSupplierOpen(true)} title="Nuevo proveedor" aria-label="Nuevo proveedor">
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label>Fecha</Label>
                  <Input type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Vigente hasta</Label>
                  <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
                </div>
              </div>

              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[42%]">Concepto</TableHead>
                      <TableHead className="w-24">Cant.</TableHead>
                      <TableHead className="w-36">P. unitario</TableHead>
                      <TableHead className="w-24">IVA</TableHead>
                      <TableHead className="text-right">Importe</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => {
                      const dev = deviationPct(r.unitPrice, r.referencePrice);
                      return (
                        <TableRow key={r.key} className="align-top">
                          <TableCell>
                            <div className="flex gap-2">
                              <ServicePicker
                                services={services}
                                onPick={(s) => patch(r.key, { serviceId: s.id, description: s.name, unitPrice: Number(s.referencePrice), referencePrice: Number(s.referencePrice) })}
                              />
                              <Input
                                value={r.description}
                                onChange={(e) => patch(r.key, { description: e.target.value })}
                                placeholder="Descripción del servicio o refacción"
                              />
                            </div>
                            {r.referencePrice !== null && r.referencePrice !== undefined && (
                              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Referencia: {formatMoney(r.referencePrice)}</span>
                                {dev !== null && dev > threshold && (
                                  <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
                                    +{dev}% sobre la referencia
                                  </Badge>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Input type="number" min={0.01} step="0.01" value={r.quantity} onChange={(e) => patch(r.key, { quantity: Number(e.target.value) })} />
                          </TableCell>
                          <TableCell>
                            <Input type="number" min={0} step="0.01" value={r.unitPrice} onChange={(e) => patch(r.key, { unitPrice: Number(e.target.value) })} />
                          </TableCell>
                          <TableCell>
                            <Select value={String(r.taxRate ?? 0.16)} onValueChange={(v) => patch(r.key, { taxRate: Number(v) })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0.16">16%</SelectItem>
                                <SelectItem value="0.08">8%</SelectItem>
                                <SelectItem value="0">0%</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="pt-4 text-right tabular-nums">{formatMoney(itemAmount(r))}</TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="text-destructive"
                              disabled={rows.length === 1}
                              onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                              aria-label="Quitar partida"
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
                  <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setRows((rs) => [...rs, newRow()])}>
                    <Plus className="h-4 w-4" /> Agregar partida
                  </Button>
                  <dl className="grid min-w-[220px] grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    <dt className="text-muted-foreground">Subtotal</dt><dd className="text-right tabular-nums">{formatMoney(t.subtotal)}</dd>
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
            <Button onClick={save} disabled={!valid || saving}>
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
