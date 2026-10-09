"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Loader2, Megaphone, Send } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { FindingCode, getNoticeAnalysis, NoticeRequest, previewNotice, sendNotice } from "@/lib/services/ops-alerts";
import { inboxErrorText } from "@/lib/services/inbox";

const SEVERITY_DOT: Record<string, string> = { alta: "bg-red-500", media: "bg-amber-500", info: "bg-emerald-500" };
const CHANNEL_LABEL: Record<string, string> = { whatsapp: "WhatsApp", campana: "Campana", correo: "Correo", "campana + correo": "Campana y correo" };

/**
 * "Mandar aviso": el sistema analiza el consolidado guía por guía; se eligen los puntos a mandar,
 * a quién y una nota. Se ve el mensaje antes de mandarlo. Todo queda en el historial de avisos.
 */
export function NoticeDialog({
  open,
  onOpenChange,
  consolidations,
  initialId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Consolidados entre los que se puede elegir (del correo o el de la fila de Seguimiento). */
  consolidations: { id: string; consNumber: string; kindLabel?: string }[];
  initialId?: string;
}) {
  const [id, setId] = useState(initialId ?? consolidations[0]?.id ?? "");
  const { data: a, isLoading, error } = useSWR(open && id ? ["/ops-alerts/notice", id] : null, () => getNoticeAnalysis(id));
  const [codes, setCodes] = useState<Set<FindingCode>>(new Set());
  const [targets, setTargets] = useState<NoticeRequest["targets"]>({ groups: true });
  const [note, setNote] = useState("");
  const [withSamples, setWithSamples] = useState(true);
  const [preview, setPreview] = useState<{ text: string; planned: { channel: string; recipientName: string }[] } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Por defecto se marcan los hallazgos que importan (no el "sin pendientes").
  useEffect(() => {
    if (a) setCodes(new Set(a.findings.filter((f) => f.severity !== "info").map((f) => f.code)));
  }, [a]);

  const body: NoticeRequest | null = useMemo(() => {
    if (!codes.size) return null;
    return { findings: [...codes], note: note.trim() || undefined, withSamples, targets };
  }, [codes, note, withSamples, targets]);

  useEffect(() => {
    setPreview(null);
    setPreviewError(null);
    if (!open || !a || !body) return;
    let cancelled = false;
    const t = setTimeout(() => {
      previewNotice(id, body)
        .then((r) => { if (!cancelled) setPreview(r); })
        .catch((e) => { if (!cancelled) setPreviewError(inboxErrorText(e, "No se pudo armar el aviso")); });
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [open, a, id, body]);

  async function send() {
    if (!body) return;
    setSending(true);
    try {
      const r = await sendNotice(id, body);
      const failed = r.results.filter((x) => x.status === "fallido");
      if (failed.length) toast.error(`Se mandó, pero ${failed.length} envío(s) fallaron. Revisa el historial de avisos.`);
      else toast.success(`Aviso mandado (${r.results.length} envío${r.results.length === 1 ? "" : "s"})`);
      onOpenChange(false);
    } catch (e) {
      toast.error(inboxErrorText(e, "No se pudo mandar el aviso"));
    } finally {
      setSending(false);
    }
  }

  const toggleCode = (c: FindingCode, on: boolean) => setCodes((s) => { const n = new Set(s); if (on) n.add(c); else n.delete(c); return n; });
  const r = a?.recipients;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-sky-700" /> Mandar aviso
          </DialogTitle>
          <DialogDescription>El sistema revisa el consolidado guía por guía. Elige qué puntos van en el aviso y a quién se manda.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 text-sm md:grid-cols-[1fr_1fr]">
          <div className="space-y-3">
            {consolidations.length > 1 && (
              <Select value={id} onValueChange={setId}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {consolidations.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.kindLabel ? `${c.kindLabel} · ` : ""}{c.consNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {isLoading ? (
              <p className="flex items-center gap-2 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Revisando el consolidado…</p>
            ) : error ? (
              <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">{inboxErrorText(error, "No se pudo revisar el consolidado")}</p>
            ) : a ? (
              <>
                <div className="rounded-md border bg-slate-50 px-3 py-2">
                  <p className="font-medium">{a.consolidation.kindLabel} {a.consolidation.consNumber}</p>
                  <p className="text-xs text-slate-500">
                    {a.consolidation.subsidiaryName ?? "Sin sucursal"} ·{" "}
                    {a.progress.total
                      ? `${a.progress.total} guías · desembarque ${a.progress.unloaded} · ruta ${a.progress.routed} · cierre ${a.progress.closed}`
                      : "no se ha subido"}
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Qué se encontró</Label>
                  {a.findings.map((f) => (
                    <label key={f.code} className="flex cursor-pointer items-start gap-2 rounded-md px-1.5 py-1 hover:bg-slate-50">
                      <Checkbox className="mt-0.5" checked={codes.has(f.code)} onCheckedChange={(v) => toggleCode(f.code, !!v)} />
                      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", SEVERITY_DOT[f.severity])} />
                      <span className="text-xs leading-snug">{f.text}</span>
                    </label>
                  ))}
                  <label className="flex items-center gap-2 px-1.5 pt-1 text-xs text-slate-600">
                    <Checkbox checked={withSamples} onCheckedChange={(v) => setWithSamples(!!v)} /> Incluir guías de ejemplo (hasta 10 por punto)
                  </label>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">A quién</Label>
                  <Target checked={!!targets.groups} onChange={(v) => setTargets((t) => ({ ...t, groups: v }))} disabled={!r?.groups.length}
                    label="Grupos generales (WhatsApp)" hint={r?.groups.length ? r.groups.map((g) => g.name).join(", ") : "No hay grupos (vincula WhatsApp o elige grupos en Configuración)"} />
                  <Target checked={!!targets.subsidiary} onChange={(v) => setTargets((t) => ({ ...t, subsidiary: v }))} disabled={!r?.subsidiaryUsers}
                    label="Usuarios de la sucursal (campana)" hint={r?.subsidiaryUsers ? `${r.subsidiaryUsers} usuario(s)` : "Sin usuarios en la sucursal"} />
                  <Target checked={!!targets.managers} onChange={(v) => setTargets((t) => ({ ...t, managers: v }))} disabled={!r?.managers.length}
                    label="Encargados (campana y correo)" hint={r?.managers.length ? r.managers.map((m) => m.name).join(", ") : "Sin encargado configurado"} />
                  <Target checked={!!targets.numbers} onChange={(v) => setTargets((t) => ({ ...t, numbers: v }))} disabled={!r?.numbers.length}
                    label="Números de la sucursal (WhatsApp)" hint={r?.numbers.length ? r.numbers.join(", ") : "Sin números configurados"} />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Nota (opcional)</Label>
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. Revisen hoy antes de las 6 pm" className="min-h-[56px] text-xs" />
                </div>
              </>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Así se va a ver</Label>
            {!codes.size && a ? (
              <p className="rounded-md border border-dashed px-3 py-6 text-center text-xs text-slate-500">Marca al menos un punto.</p>
            ) : previewError ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{previewError}</p>
            ) : !preview ? (
              <p className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Armando el aviso…</p>
            ) : (
              <>
                <ScrollArea className="h-64 rounded-md border bg-[#e7f7e2] p-3">
                  <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-800">{preview.text}</pre>
                </ScrollArea>
                <p className="text-[11px] text-slate-500">
                  Se manda a: {preview.planned.map((p) => `${p.recipientName} (${CHANNEL_LABEL[p.channel] ?? p.channel})`).join(" · ")}
                </p>
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>Cancelar</Button>
          <Button onClick={send} disabled={sending || !preview} className="gap-1.5">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Mandar aviso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Target({ checked, onChange, disabled, label, hint }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string; hint: string }) {
  return (
    <label className={cn("flex items-start gap-2 rounded-md px-1.5 py-1", disabled ? "opacity-60" : "cursor-pointer hover:bg-slate-50")}>
      <Checkbox className="mt-0.5" checked={checked && !disabled} disabled={disabled} onCheckedChange={(v) => onChange(!!v)} />
      <span className="min-w-0">
        <span className="block text-xs font-medium">{label}</span>
        <span className="block truncate text-[11px] text-slate-500">{hint}</span>
      </span>
    </label>
  );
}
