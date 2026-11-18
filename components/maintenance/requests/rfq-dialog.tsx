"use client";

import { PmySpinner } from "@/components/ui/pmy-loader";
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormSection, SelectField, TextareaField } from "@/components/ui/field";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, FileDown, ListChecks, Mail, MessageCircle, Package, RotateCw, Send, StickyNote, UserPlus, UserX, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { SupplierFormDialog } from "../catalog/supplier-form-dialog";
import { toast } from "@/lib/toast";
import { useProducts, useSuppliers } from "@/hooks/services/maintenance/use-maintenance";
import { openBlob, sendRfq } from "@/lib/services/maintenance";
import { useAuthStore } from "@/store/auth.store";
import { rfqPdfBlob } from "../pdf/render-compras-pdf";
import { ContactChannel, MaintenanceRequest, NeedView, RfqResult, Supplier, vehicleLabel } from "@/lib/types/maintenance";
import { channelsOf } from "@/lib/supplier-channels";
import { apiError } from "../shared/confirm-action";

interface Target {
  selected: boolean;
  contactId: string;
  channel: ContactChannel;
}

const defaultContact = (s: Supplier) => s.contacts.find((c) => c.isDefault) ?? s.contacts[0];
const CHANNEL_LABEL: Record<ContactChannel, string> = { email: "Correo", whatsapp: "WhatsApp" };
const CHANNEL_ICON = { email: Mail, whatsapp: MessageCircle } as const;
const initials = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
const qty = (n: number) => (Number.isInteger(Number(n)) ? String(Number(n)) : Number(n).toFixed(2));
const targetFor = (s: Supplier, selected: boolean): Target => {
  const c = defaultContact(s);
  const chs = channelsOf(c);
  return { selected: selected && chs.length > 0, contactId: c?.id ?? "", channel: c && chs.includes(c.preferredChannel) ? c.preferredChannel : chs[0] ?? "email" };
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: MaintenanceRequest;
  /** "Lo que se necesita": también va en el PDF (las solicitudes de mantenimiento no traen renglones). */
  needs?: NeedView[];
  onSent: () => void;
}

/** "Pedir cotización": manda el PDF con la lista de conceptos a los proveedores elegidos. */
export function RfqDialog({ open, onOpenChange, request, needs = [], onSent }: Props) {
  const user = useAuthStore((st) => st.user);
  const sender = { name: [user?.name, user?.lastName].filter(Boolean).join(" ") || user?.email || "Compras", email: user?.email ?? null };
  const { suppliers, mutate: mutateSuppliers } = useSuppliers();
  const { products } = useProducts();
  const [targets, setTargets] = useState<Record<string, Target>>({});
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<RfqResult[] | null>(null);
  /** Proveedor sin contacto que se está completando en la ventana de alta (sin salir a Catálogos). */
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

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
    setTargets({});
    setNotes("");
    setResults(null);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    setTargets((prev) => {
      const t = { ...prev };
      for (const s of suppliers) {
        const old = t[s.id];
        // Nuevo, o le acaban de poner contacto: se recalcula; si no, se respeta lo que ya marcaron.
        if (!old || (!old.contactId && s.contacts.length > 0)) t[s.id] = targetFor(s, old ? true : suggested.has(s.id));
      }
      return t;
    });
  }, [open, suppliers, suggested]);

  const patch = (id: string, p: Partial<Target>) => setTargets((t) => ({ ...t, [id]: { ...t[id], ...p } }));
  const chosen = sorted.filter((s) => targets[s.id]?.selected);
  const reachable = sorted.filter((s) => channelsOf(defaultContact(s)).length > 0 || s.contacts.some((c) => channelsOf(c).length > 0));
  const unreachable = sorted.filter((s) => !reachable.includes(s));
  const concepts = [
    ...(request.items ?? []).map((i) => ({ key: i.id ?? i.description, icon: Package, label: i.description, qty: Number(i.quantity), unit: i.unit?.abbreviation ?? i.unit?.name ?? "" })),
    ...needs.map((n) => ({ key: n.id, icon: Package, label: n.product?.name ?? n.category.name, qty: Number(n.quantity), unit: n.unit?.abbreviation ?? n.unit?.name ?? "" })),
  ];
  const services = request.services ?? [];

  const preview = async () => {
    const s0 = chosen[0];
    const c0 = s0 ? s0.contacts.find((c) => c.id === targets[s0.id]?.contactId) ?? null : null;
    try { openBlob(await rfqPdfBlob(request, needs, s0 ?? null, c0, sender, notes)); } catch { toast.error("No se pudo generar el PDF. Intenta de nuevo."); }
  };

  const send = async () => {
    if (!chosen.length) { toast.error("Elige al menos un proveedor."); return; }
    setBusy(true);
    try {
      // Un PDF por proveedor (va dirigido a él), generado en el navegador.
      const pdfs: Record<string, Blob> = {};
      for (const s of chosen) {
        const c = s.contacts.find((x) => x.id === targets[s.id].contactId) ?? null;
        pdfs[s.id] = await rfqPdfBlob(request, needs, s, c, sender, notes);
      }
      const out = await sendRfq(request.id, {
        targets: chosen.map((s) => ({ supplierId: s.id, contactId: targets[s.id].contactId || undefined, channel: targets[s.id].channel })),
        notes: notes.trim() || undefined,
      }, pdfs);
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

  const retry = async (supplierId: string) => {
    const sp = sorted.find((x) => x.id === supplierId);
    const t = targets[supplierId];
    if (!sp || !t) return;
    setBusy(true);
    try {
      const c = sp.contacts.find((x) => x.id === t.contactId) ?? null;
      const pdf = await rfqPdfBlob(request, needs, sp, c, sender, notes);
      const out = await sendRfq(request.id, { targets: [{ supplierId, contactId: t.contactId || undefined, channel: t.channel }], notes: notes.trim() || undefined }, { [supplierId]: pdf });
      setResults((rs) => (rs ?? []).map((r) => (r.supplierId === supplierId ? out[0] ?? r : r)));
      if (out[0]?.ok) { toast.success(`Se pidió la cotización a ${sp.name}`); onSent(); } else toast.error(out[0]?.error ?? "No se pudo enviar");
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
            {[request.folio, request.vehicle ? vehicleLabel(request.vehicle) : null].filter(Boolean).join(" · ")} — a cada proveedor le llega un PDF para que responda precio y existencia.
          </DialogDescription>
        </DialogHeader>

        {results ? (
          <ul className="divide-y rounded-xl border text-sm">
            {results.map((r) => (
              <li key={r.supplierId} className="flex items-center gap-3 px-4 py-3">
                {r.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <XCircle className="h-4 w-4 shrink-0 text-destructive" />}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{r.supplierName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.ok ? `Enviada por ${CHANNEL_LABEL[r.channel!]} a ${r.destination}` : r.error}
                  </p>
                </div>
                {!r.ok && (
                  <Button size="sm" variant="ghost" className="h-8 gap-1.5" disabled={busy} onClick={() => retry(r.supplierId)}>
                    <RotateCw className="h-3.5 w-3.5" /> Reintentar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <ScrollArea className="max-h-[62vh] pr-3">
            <div className="grid gap-6 px-0.5 pb-1 pt-1">
              <FormSection
                title="Qué se pide"
                description="Esto va en el PDF."
                actions={<Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={preview} disabled={busy}><FileDown className="h-3.5 w-3.5" /> Ver PDF</Button>}
              >
                {concepts.length + services.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Solo la descripción de la solicitud: {request.description || "—"}</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {concepts.map((c) => (
                      <span key={c.key} className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-xs">
                        <c.icon className="h-3.5 w-3.5 text-muted-foreground" /> {c.label}
                        <span className="font-semibold tabular-nums">× {qty(c.qty)}{c.unit ? ` ${c.unit}` : ""}</span>
                      </span>
                    ))}
                    {services.map((sv) => (
                      <span key={sv.id} className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-xs">
                        <ListChecks className="h-3.5 w-3.5 text-muted-foreground" /> {sv.name}
                      </span>
                    ))}
                  </div>
                )}
              </FormSection>

              <FormSection
                title="A quién se le pide"
                description="Marca uno o varios. Se usa su contacto y su medio preferido."
                actions={<span className="text-xs text-muted-foreground">{chosen.length} {chosen.length === 1 ? "elegido" : "elegidos"}</span>}
              >
                {reachable.length === 0 ? (
                  <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
                    Ningún proveedor tiene contacto todavía. Agrégale uno abajo.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {reachable.map((s) => {
                      const t = targets[s.id];
                      if (!t) return null;
                      const contact = s.contacts.find((c) => c.id === t.contactId);
                      const chs = channelsOf(contact);
                      const on = t.selected;
                      const Icon = CHANNEL_ICON[t.channel];
                      const dest = t.channel === "email" ? contact?.email : contact?.whatsapp || contact?.phone;
                      return (
                        <div
                          key={s.id}
                          role="checkbox"
                          aria-checked={on}
                          tabIndex={0}
                          onClick={() => chs.length && patch(s.id, { selected: !on })}
                          onKeyDown={(e) => { if ((e.key === " " || e.key === "Enter") && chs.length) { e.preventDefault(); patch(s.id, { selected: !on }); } }}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-xl border border-[hsl(var(--field-border))] bg-background p-3 text-left outline-none transition-[border-color,background-color,box-shadow]",
                            "hover:border-foreground/30 focus-visible:ring-4 focus-visible:ring-primary/10",
                            on && "border-primary bg-primary/5 ring-4 ring-primary/10 hover:border-primary",
                          )}
                        >
                          <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground transition-colors", on && "bg-primary text-primary-foreground")}>
                            {initials(s.name)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">{s.name}</span>
                            <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                              <Icon className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{[contact?.name, dest].filter(Boolean).join(" · ")}</span>
                            </span>
                            <span className="mt-2 flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              {suggested.has(s.id) && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">Ya le compramos</span>}
                              {chs.length > 1 && (
                                <span className="inline-flex overflow-hidden rounded-lg border text-[11px]" role="radiogroup" aria-label="Medio">
                                  {chs.map((ch) => {
                                    const ChIcon = CHANNEL_ICON[ch];
                                    return (
                                      <button key={ch} type="button" role="radio" aria-checked={t.channel === ch}
                                        onClick={() => patch(s.id, { channel: ch })}
                                        className={cn("flex items-center gap-1 px-2 py-0.5", t.channel === ch ? "bg-background font-medium text-foreground shadow-sm" : "bg-muted/50 text-muted-foreground")}>
                                        <ChIcon className="h-3 w-3" /> {CHANNEL_LABEL[ch]}
                                      </button>
                                    );
                                  })}
                                </span>
                              )}
                              {s.contacts.length > 1 && (
                                <SelectField size="sm" label="Contacto" className="w-40" value={t.contactId}
                                  onValueChange={(v) => {
                                    const c = s.contacts.find((x) => x.id === v);
                                    const next = channelsOf(c);
                                    patch(s.id, { contactId: v, channel: next.includes(t.channel) ? t.channel : next[0] ?? "email", selected: t.selected && next.length > 0 });
                                  }}
                                  options={s.contacts.map((c) => ({ value: c.id!, label: c.name }))} />
                              )}
                            </span>
                          </span>
                          <Checkbox checked={on} tabIndex={-1} aria-hidden className={cn("mt-0.5 shrink-0", on ? "border-primary data-[state=checked]:bg-primary" : "border-[hsl(var(--field-border))]")} />
                        </div>
                      );
                    })}
                  </div>
                )}
                {unreachable.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed px-3 py-2.5 text-xs text-muted-foreground">
                    <UserX className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium text-foreground">{unreachable.length} sin contacto</span> · {unreachable.map((s) => s.name).join(", ")}
                    </span>
                    {unreachable.length === 1 ? (
                      <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setEditingSupplier(unreachable[0])}>
                        <UserPlus className="h-3.5 w-3.5" /> Agregar contacto
                      </Button>
                    ) : (
                      <SelectField size="sm" label="Agregar contacto a" placeholder="Agregar contacto a…" className="w-48" value=""
                        onValueChange={(v) => setEditingSupplier(unreachable.find((s) => s.id === v) ?? null)}
                        options={unreachable.map((s) => ({ value: s.id, label: s.name }))} />
                    )}
                  </div>
                )}
              </FormSection>

              <TextareaField label="Notas para el proveedor" icon={StickyNote} rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder={`Ej. la necesitamos antes del viernes, entregar en sucursal ${request.subsidiary?.name ?? ""}…`} hint="Opcional; aparecen en el PDF." />
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="border-t pt-4">
          {results ? (
            <Button onClick={() => onOpenChange(false)}>Listo</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
              <Button onClick={send} disabled={busy || chosen.length === 0} title={chosen.length === 0 ? "Marca al menos un proveedor" : undefined}>
                {busy ? <PmySpinner className="mr-1.5 h-4 w-4" /> : <Send className="mr-1.5 h-4 w-4" />}
                {chosen.length === 0 ? "Marca a quién pedir" : `Enviar a ${chosen.length} ${chosen.length === 1 ? "proveedor" : "proveedores"}`}
              </Button>
            </>
          )}
        </DialogFooter>
        <SupplierFormDialog
          open={!!editingSupplier}
          onOpenChange={(o) => !o && setEditingSupplier(null)}
          supplier={editingSupplier}
          onSaved={() => { setEditingSupplier(null); mutateSuppliers(); }}
        />
      </DialogContent>
    </Dialog>
  );
}
