"use client";

import { useEffect, useMemo, useState } from "react";
import { mutate as globalMutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SucursalSelector } from "@/components/sucursal-selector";
import { useInboxMessage } from "@/hooks/services/inbox/use-inbox";
import { confirmInboxMessage, downloadInboxAttachment, ignoreInboxMessage, inboxErrorText } from "@/lib/services/inbox";
import { AttachmentKind } from "@/lib/types/inbox";
import { Subsidiary } from "@/lib/types";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { InboxGuidesStep } from "./inbox-guides-step";
import { ATTACHMENT_LABEL, SIGNAL_LABEL, formatDateTime, knownByPhrase } from "./labels";
import { AlertTriangle, CheckCircle2, ChevronDown, Download, EyeOff, HelpCircle, Loader2, MailOpen, MoreHorizontal } from "lucide-react";

const KIND_OPTIONS: AttachmentKind[] = ["master", "master_aereo", "f2", "high_value", "ccp", "ccp_ignored", "dhl", "pdf", "other"];
const GUIDE_KINDS: AttachmentKind[] = ["master", "master_aereo", "f2", "high_value", "dhl"];

interface Props {
  id: string | null;
  onChanged: () => void;
  /** Dentro del panel lateral: sin borde y con espacio para la ✕ de cerrar. */
  bare?: boolean;
}

/** Correo seleccionado, como dos pasos: ① de qué sucursal es · ② subir sus guías. */
export function InboxDetailPanel({ id, onChanged, bare = false }: Props) {
  const { data, isLoading, mutate } = useInboxMessage(id);
  const [editing, setEditing] = useState(false);
  const [subsidiaryId, setSubsidiaryId] = useState("");
  const [kinds, setKinds] = useState<Record<string, AttachmentKind>>({});
  const [ignoreOpen, setIgnoreOpen] = useState(false);
  const [ignoreReason, setIgnoreReason] = useState("");
  const [busy, setBusy] = useState(false);

  const m = data?.message;
  const d = data?.detection;
  const suggested = m?.subsidiaryId ?? d?.subsidiaryId ?? null;
  const suggestedName = m?.subsidiaryName ?? d?.subsidiaryName ?? null;

  useEffect(() => {
    setEditing(false);
    setKinds({});
    setSubsidiaryId(suggested ?? "");
  }, [m?.id, suggested]);

  const decided = m?.status === "confirmado" || m?.status === "detectado";
  const phrase = useMemo(() => (d ? knownByPhrase(d.signals, suggested) : null), [d, suggested]);

  async function save(subId: string) {
    if (!id || !subId) {
      toast.error("Elige la sucursal");
      return;
    }
    setBusy(true);
    try {
      await confirmInboxMessage(id, subId, Object.keys(kinds).length ? kinds : undefined);
      toast.success("Sucursal confirmada");
      setEditing(false);
      setKinds({});
      await mutate();
      await globalMutate(["/inbox/paste-plan", id]);
      onChanged();
    } catch (e) {
      toast.error(inboxErrorText(e, "No se pudo confirmar la sucursal"));
    } finally {
      setBusy(false);
    }
  }

  async function ignore() {
    if (!id) return;
    setBusy(true);
    try {
      await ignoreInboxMessage(id, ignoreReason.trim() || undefined);
      toast.success("Correo ignorado");
      setIgnoreOpen(false);
      await mutate();
      onChanged();
    } catch (e) {
      toast.error(inboxErrorText(e, "No se pudo ignorar el correo"));
    } finally {
      setBusy(false);
    }
  }

  if (!id) {
    return (
      <div className={cn("flex h-full min-h-[320px] flex-col items-center justify-center gap-2 bg-white text-sm text-slate-400", !bare && "rounded-md border")}>
        <MailOpen className="h-6 w-6" /> Elige un correo de la lista
      </div>
    );
  }
  if (isLoading || !m) {
    return (
      <div className={cn("flex h-full min-h-[320px] items-center justify-center bg-white text-sm text-slate-500", !bare && "rounded-md border")}>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando correo…
      </div>
    );
  }

  const infoFiles = data.attachments.filter((a) => !GUIDE_KINDS.includes(kinds[a.id] ?? a.kind));
  const selector = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="w-60">
        <SucursalSelector value={subsidiaryId} onValueChange={(v) => setSubsidiaryId(typeof v === "string" ? v : (v as Subsidiary)?.id ?? "")} />
      </div>
      <Button size="sm" onClick={() => save(subsidiaryId)} disabled={busy || !subsidiaryId}>
        {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
        Guardar sucursal
      </Button>
      {editing && (
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={busy}>
          Cancelar
        </Button>
      )}
    </div>
  );

  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-white", !bare && "rounded-md border")}>
      {/* Encabezado */}
      <div className={cn("flex items-start gap-2 border-b px-4 py-3", bare && "pr-12 pt-4")}>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-slate-900" title={m.subject}>
            {m.subject || "(sin asunto)"}
          </h2>
          <p className="truncate text-xs text-slate-500">
            {m.fromName ? `${m.fromName} · ` : ""}
            {m.fromAddress} · {formatDateTime(m.receivedAt)}
          </p>
        </div>
        {m.status !== "ignorado" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Más acciones">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setIgnoreOpen(true)}>
                <EyeOff className="mr-2 h-4 w-4" /> Ignorar este correo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
        {m.status === "error" && <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{m.errorMessage}</p>}
        {m.status === "ignorado" && (
          <p className="rounded-md border bg-slate-50 p-2 text-sm text-slate-600">Ignorado{m.ignoreReason ? `: ${m.ignoreReason}` : ""}. No se sube nada de este correo.</p>
        )}

        {m.status !== "error" && m.status !== "ignorado" && (
          <>
            {/* ① Sucursal */}
            <section>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">① ¿De qué sucursal es?</h3>
              {decided && !editing ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span className="text-lg font-semibold text-slate-900">{m.subsidiaryName}</span>
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setEditing(true)}>
                      Cambiar
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500">
                    {m.status === "confirmado"
                      ? `Confirmado${m.confirmedByName ? ` por ${m.confirmedByName}` : ""} · ${formatDateTime(m.confirmedAt)}`
                      : phrase
                        ? `Lo sabemos por ${phrase}.`
                        : "Detectado automáticamente."}
                  </p>
                </div>
              ) : editing ? (
                selector
              ) : suggested ? (
                <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50/60 p-3">
                  <p className="text-sm text-slate-800">
                    Creemos que es <b>{suggestedName}</b>. ¿Es correcto?
                  </p>
                  {d?.reason && (
                    <p className="flex items-start gap-1.5 text-xs text-amber-800">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {d.reason}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => save(suggested)} disabled={busy}>
                      {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
                      Sí, es {suggestedName}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(true)} disabled={busy}>
                      No, es otra
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50/60 p-3">
                  <p className="text-sm text-slate-800">No pudimos saber de qué sucursal es. Elígela:</p>
                  {selector}
                </div>
              )}

              {d && d.signals.length > 0 && (
                <Collapsible className="mt-2">
                  <CollapsibleTrigger className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
                    <HelpCircle className="h-3.5 w-3.5" /> Ver cómo se decidió <ChevronDown className="h-3.5 w-3.5" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ul className="mt-1.5 space-y-1 rounded-md border bg-slate-50 p-2">
                      {[...d.signals].sort((a, b) => b.weight - a.weight).map((s, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs">
                          <span className="w-36 shrink-0 text-slate-500">{SIGNAL_LABEL[s.type] ?? s.type}</span>
                          <span className="w-32 shrink-0 truncate font-medium">{s.subsidiaryName ?? "—"}</span>
                          <span className="truncate text-slate-600">{s.note}</span>
                        </li>
                      ))}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </section>

            {/* ② Guías */}
            <section>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">② Guías que trae el correo</h3>
              <InboxGuidesStep messageId={m.id} subject={m.subject} ready={decided && !editing} onChanged={onChanged} />
              {infoFiles.length > 0 && (
                <p className="mt-2 text-xs text-slate-500">
                  No se suben (son informativos): {infoFiles.map((a) => a.filename).join(", ")}.
                </p>
              )}
            </section>
          </>
        )}

        {/* ③ Correo original */}
        <Collapsible>
          <CollapsibleTrigger className="flex w-full items-center gap-1 border-t pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700">
            Correo original y archivos <ChevronDown className="h-3.5 w-3.5" />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
            {data.attachments.length > 0 && (
              <ul className="divide-y rounded-md border">
                {data.attachments.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 px-2 py-1.5 text-xs">
                    <span className="min-w-0 flex-1 truncate" title={a.filename}>
                      {a.filename}
                    </span>
                    {a.rowCount != null && a.rowCount > 0 && <span className="text-slate-500">{a.rowCount} filas</span>}
                    <Select value={kinds[a.id] ?? a.kind} onValueChange={(v) => setKinds((k) => ({ ...k, [a.id]: v as AttachmentKind }))}>
                      <SelectTrigger className="h-7 w-44 text-xs" aria-label="Tipo de archivo">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {KIND_OPTIONS.map((k) => (
                          <SelectItem key={k} value={k} className="text-xs">
                            {ATTACHMENT_LABEL[k]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={`Descargar ${a.filename}`}
                      onClick={() => downloadInboxAttachment(a.id, a.filename).catch(() => toast.error("No se pudo descargar el archivo"))}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {Object.keys(kinds).length > 0 && (
              <div className="flex items-center gap-2 text-xs text-amber-800">
                Cambiaste el tipo de un archivo.
                <Button size="sm" variant="outline" className="h-7" disabled={busy || !subsidiaryId} onClick={() => save(subsidiaryId)}>
                  Guardar cambios
                </Button>
              </div>
            )}
            {m.htmlSafe ? (
              <iframe title="Contenido del correo" sandbox="" srcDoc={m.htmlSafe} className="h-[380px] w-full rounded-md border bg-white" />
            ) : (
              <pre className="max-h-[380px] overflow-auto whitespace-pre-wrap rounded-md border bg-white p-3 text-xs">{m.textTop || "(sin texto)"}</pre>
            )}
            {m.hasQuotedHistory && <p className="text-xs text-slate-500">Trae mensajes anteriores del hilo; solo se leyó el mensaje nuevo.</p>}
          </CollapsibleContent>
        </Collapsible>
      </div>

      <Dialog open={ignoreOpen} onOpenChange={setIgnoreOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ignorar este correo</DialogTitle>
            <DialogDescription>No se subirá nada de este correo y dejará de aparecer en los pendientes.</DialogDescription>
          </DialogHeader>
          <Input value={ignoreReason} onChange={(e) => setIgnoreReason(e.target.value)} placeholder="Motivo (opcional), p. ej. “correo repetido”" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIgnoreOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={ignore} disabled={busy} className={cn(busy && "opacity-80")}>
              {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Ignorar correo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
