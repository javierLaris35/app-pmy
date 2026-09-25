"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, FileDown, Loader2, Send, XCircle } from "lucide-react";
import { toast } from "@/lib/toast";
import { useProducts, useSuppliers } from "@/hooks/services/maintenance/use-maintenance";
import { getRfqPdf, openBlob, sendRfq } from "@/lib/services/maintenance";
import { ContactChannel, MaintenanceRequest, RfqResult, Supplier } from "@/lib/types/maintenance";
import { channelsOf } from "@/lib/supplier-channels";
import { apiError } from "../shared/confirm-action";

interface Target {
  selected: boolean;
  contactId: string;
  channel: ContactChannel;
}

const defaultContact = (s: Supplier) => s.contacts.find((c) => c.isDefault) ?? s.contacts[0];
const CHANNEL_LABEL: Record<ContactChannel, string> = { email: "Correo", whatsapp: "WhatsApp" };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: MaintenanceRequest;
  onSent: () => void;
}

/** "Pedir cotización": manda el PDF con la lista de conceptos a los proveedores elegidos. */
export function RfqDialog({ open, onOpenChange, request, onSent }: Props) {
  const { suppliers } = useSuppliers();
  const { products } = useProducts();
  const [targets, setTargets] = useState<Record<string, Target>>({});
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<RfqResult[] | null>(null);

  // Proveedores que ya tienen precio en catálogo para algún producto de la solicitud: se sugieren primero.
  const suggested = useMemo(() => {
    const ids = new Set((request.items ?? []).map((i) => i.productId).filter(Boolean));
    const set = new Set<string>();
    for (const p of products) if (ids.has(p.id)) for (const o of p.offers ?? []) set.add(o.supplierId);
    return set;
  }, [products, request.items]);
  const sorted = useMemo(
    () => [...suppliers].filter((s) => s.active !== false).sort((a, b) => Number(suggested.has(b.id)) - Number(suggested.has(a.id)) || a.name.localeCompare(b.name)),
    [suppliers, suggested],
  );

  useEffect(() => {
    if (!open) return;
    const t: Record<string, Target> = {};
    for (const s of suppliers) {
      const c = defaultContact(s);
      const chs = channelsOf(c);
      t[s.id] = {
        selected: suggested.has(s.id) && chs.length > 0,
        contactId: c?.id ?? "",
        channel: c && chs.includes(c.preferredChannel) ? c.preferredChannel : chs[0] ?? "email",
      };
    }
    setTargets(t);
    setNotes("");
    setResults(null);
  }, [open, suppliers, suggested]);

  const patch = (id: string, p: Partial<Target>) => setTargets((t) => ({ ...t, [id]: { ...t[id], ...p } }));
  const chosen = sorted.filter((s) => targets[s.id]?.selected);

  const preview = async () => {
    try { openBlob(await getRfqPdf(request.id, chosen[0]?.id)); } catch (e) { toast.error(apiError(e, "No se pudo generar el PDF")); }
  };

  const send = async () => {
    if (!chosen.length) { toast.error("Elige al menos un proveedor."); return; }
    setBusy(true);
    try {
      const out = await sendRfq(request.id, {
        targets: chosen.map((s) => ({ supplierId: s.id, contactId: targets[s.id].contactId || undefined, channel: targets[s.id].channel })),
        notes: notes.trim() || undefined,
      });
      setResults(out);
      const ok = out.filter((r) => r.ok).length;
      if (ok === out.length) toast.success(ok === 1 ? "Se pidió la cotización" : `Se pidió cotización a ${ok} proveedores`);
      else toast.error(`${out.length - ok} de ${out.length} no se pudieron enviar. Revisa el detalle.`);
      onSent();
    } catch (e) {
      toast.error(apiError(e, "No se pudo pedir la cotización"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pedir cotización</DialogTitle>
          <DialogDescription>
            A cada proveedor le llega un PDF con los conceptos de la solicitud {request.folio} para que te responda precio y existencia.
          </DialogDescription>
        </DialogHeader>

        {results ? (
          <ul className="divide-y rounded-lg border text-sm">
            {results.map((r) => (
              <li key={r.supplierId} className="flex items-start gap-3 px-4 py-3">
                {r.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" /> : <XCircle className="mt-0.5 h-4 w-4 text-destructive" />}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{r.supplierName}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.ok ? `Enviada por ${CHANNEL_LABEL[r.channel!]} a ${r.destination}` : r.error}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <ScrollArea className="max-h-[60vh] pr-3">
            <div className="grid gap-4 py-1">
              <ul className="divide-y rounded-lg border">
                {sorted.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No hay proveedores. Agrégalos en Catálogos → Proveedores.</li>}
                {sorted.map((s) => {
                  const t = targets[s.id];
                  if (!t) return null;
                  const contact = s.contacts.find((c) => c.id === t.contactId);
                  const chs = channelsOf(contact);
                  const disabled = chs.length === 0;
                  return (
                    <li key={s.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                      <Checkbox checked={t.selected} disabled={disabled} onCheckedChange={(v) => patch(s.id, { selected: v === true })} aria-label={`Pedir a ${s.name}`} />
                      <div className="min-w-[140px] flex-1">
                        <p className="flex items-center gap-2 text-sm font-medium">
                          {s.name}
                          {suggested.has(s.id) && <Badge variant="outline" className="h-5 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700">Ya le compramos</Badge>}
                        </p>
                        {disabled && (
                          <p className="text-xs text-muted-foreground">
                            {s.contacts.length === 0 ? "Sin contactos: agrégale uno en Catálogos → Proveedores." : "El contacto no tiene correo ni WhatsApp."}
                          </p>
                        )}
                      </div>
                      {s.contacts.length > 1 && (
                        <Select value={t.contactId} onValueChange={(v) => {
                          const c = s.contacts.find((x) => x.id === v);
                          const next = channelsOf(c);
                          patch(s.id, { contactId: v, channel: next.includes(t.channel) ? t.channel : next[0] ?? "email", selected: t.selected && next.length > 0 });
                        }}>
                          <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Contacto" /></SelectTrigger>
                          <SelectContent>{s.contacts.map((c) => <SelectItem key={c.id} value={c.id!}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                      {s.contacts.length === 1 && contact && <span className="text-xs text-muted-foreground">{contact.name}</span>}
                      <Select value={t.channel} onValueChange={(v) => patch(s.id, { channel: v as ContactChannel })} disabled={chs.length < 2}>
                        <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(chs.length ? chs : (["email"] as ContactChannel[])).map((c) => <SelectItem key={c} value={c}>{CHANNEL_LABEL[c]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </li>
                  );
                })}
              </ul>
              <div className="grid gap-1.5">
                <Label>Notas para el proveedor (opcional)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={1000}
                  placeholder="Ej. la necesitamos antes del viernes, entregar en sucursal Hermosillo…" />
              </div>
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          {results ? (
            <>
              <span />
              <Button onClick={() => onOpenChange(false)}>Listo</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={preview} disabled={busy}><FileDown className="mr-1.5 h-4 w-4" /> Ver PDF</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
                <Button onClick={send} disabled={busy || chosen.length === 0}>
                  {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
                  Enviar a {chosen.length || ""} {chosen.length === 1 ? "proveedor" : "proveedores"}
                </Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
