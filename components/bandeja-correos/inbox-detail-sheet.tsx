"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SucursalSelector } from "@/components/sucursal-selector";
import { useInboxMessage } from "@/hooks/services/inbox/use-inbox";
import { confirmInboxMessage, downloadInboxAttachment, ignoreInboxMessage, inboxErrorText } from "@/lib/services/inbox";
import { AttachmentKind } from "@/lib/types/inbox";
import { Subsidiary } from "@/lib/types";
import { toast } from "@/lib/toast";
import { InboxPasteSection } from "./inbox-paste-section";
import { ATTACHMENT_LABEL, CONS_KIND_LABEL, SIGNAL_LABEL, STATUS_LABEL, certaintyPill, formatDateTime, formatMinutes } from "./labels";
import { Check, ChevronDown, Download, EyeOff, Loader2 } from "lucide-react";

const KIND_OPTIONS: AttachmentKind[] = ["master", "master_aereo", "f2", "high_value", "ccp", "ccp_ignored", "dhl", "pdf", "other"];

interface Props {
  id: string | null;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

export function InboxDetailSheet({ id, onOpenChange, onChanged }: Props) {
  const { data, isLoading, mutate } = useInboxMessage(id);
  const [subsidiaryId, setSubsidiaryId] = useState("");
  const [kinds, setKinds] = useState<Record<string, AttachmentKind>>({});
  const [ignoreReason, setIgnoreReason] = useState("");
  const [busy, setBusy] = useState<"confirm" | "ignore" | null>(null);

  useEffect(() => {
    setSubsidiaryId(data?.message.subsidiaryId ?? data?.detection?.subsidiaryId ?? "");
    setKinds({});
    setIgnoreReason("");
  }, [data?.message.id, data?.message.subsidiaryId, data?.detection?.subsidiaryId]);

  const topZips = useMemo(() => {
    const all: Record<string, number> = {};
    for (const a of data?.attachments ?? []) for (const [z, n] of Object.entries(a.zipSummary ?? {})) all[z] = (all[z] ?? 0) + n;
    return Object.entries(all).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [data?.attachments]);

  const cobros = useMemo(() => (data?.consolidations ?? []).flatMap((c) => c.cobros ?? []), [data?.consolidations]);

  const m = data?.message;
  const d = data?.detection;
  const isConfirmed = m?.status === "confirmado";

  /** Confirma la sucursal elegida (y tipos cambiados). Devuelve si se pudo. */
  async function confirmSelected(): Promise<boolean> {
    if (!id) return false;
    if (!subsidiaryId) {
      toast.error("Elige la sucursal antes de confirmar");
      return false;
    }
    setBusy("confirm");
    try {
      await confirmInboxMessage(id, subsidiaryId, Object.keys(kinds).length ? kinds : undefined);
      toast.success("Sucursal confirmada; el sistema aprendió de este correo");
      await mutate();
      onChanged();
      return true;
    } catch (e) {
      toast.error(inboxErrorText(e, "No se pudo confirmar el correo"));
      return false;
    } finally {
      setBusy(null);
    }
  }
  const handleConfirm = () => void confirmSelected();
  // Mandar al pegado sin pedir otra confirmación solo si ya está confirmado o detectado seguro,
  // con la misma sucursal y sin tipos de archivo cambiados.
  const needsConfirm =
    !(m?.status === "confirmado" || m?.status === "detectado") || subsidiaryId !== (m?.subsidiaryId ?? "") || Object.keys(kinds).length > 0;

  async function handleIgnore() {
    if (!id) return;
    setBusy("ignore");
    try {
      await ignoreInboxMessage(id, ignoreReason.trim() || undefined);
      toast.success("Correo marcado como ignorado");
      await mutate();
      onChanged();
    } catch (e) {
      toast.error(inboxErrorText(e, "No se pudo ignorar el correo"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Sheet open={!!id} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
        {isLoading || !m ? (
          <>
            {/* Radix exige título en el diálogo también mientras carga (lectores de pantalla). */}
            <SheetHeader className="sr-only">
              <SheetTitle>Cargando correo</SheetTitle>
              <SheetDescription>Detalle del correo de FedEx</SheetDescription>
            </SheetHeader>
            <div className="flex h-40 items-center justify-center text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando correo…
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-4">
            <SheetHeader className="space-y-1 text-left">
              <SheetTitle className="pr-8 text-base">{m.subject || "(sin asunto)"}</SheetTitle>
              <SheetDescription className="text-xs">
                {m.fromName ? `${m.fromName} · ` : ""}
                {m.fromAddress} · {formatDateTime(m.receivedAt)}
              </SheetDescription>
            </SheetHeader>

            {/* Barra de acciones */}
            {m.status !== "error" && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border bg-slate-50 p-2">
                <Badge variant="outline" className={certaintyPill(m.status, d?.autoSafe ?? false)}>
                  {STATUS_LABEL[m.status]}
                </Badge>
                <div className="w-56">
                  <SucursalSelector
                    value={subsidiaryId}
                    insideAModal
                    onValueChange={(v) => setSubsidiaryId(typeof v === "string" ? v : (v as Subsidiary)?.id ?? "")}
                  />
                </div>
                <Button size="sm" className="gap-1.5" onClick={handleConfirm} disabled={busy !== null}>
                  {busy === "confirm" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {isConfirmed ? "Guardar corrección" : "Confirmar"}
                </Button>
                {m.status !== "ignorado" && (
                  <div className="ml-auto flex items-center gap-1.5">
                    <Input
                      value={ignoreReason}
                      onChange={(e) => setIgnoreReason(e.target.value)}
                      placeholder="Motivo (opcional)"
                      className="h-8 w-44 text-xs"
                    />
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={handleIgnore} disabled={busy !== null}>
                      {busy === "ignore" ? <Loader2 className="h-4 w-4 animate-spin" /> : <EyeOff className="h-4 w-4" />}
                      Ignorar
                    </Button>
                  </div>
                )}
              </div>
            )}
            {m.status !== "error" && m.status !== "ignorado" && (
              <InboxPasteSection
                messageId={m.id}
                subject={m.subject}
                selectedSubsidiaryId={subsidiaryId}
                needsConfirm={needsConfirm}
                ensureConfirmed={confirmSelected}
                onChanged={onChanged}
              />
            )}
            {m.status === "error" && <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{m.errorMessage}</p>}
            {m.status === "ignorado" && m.ignoreReason && <p className="text-xs text-slate-500">Ignorado: {m.ignoreReason}</p>}
            {isConfirmed && (
              <p className="text-xs text-slate-500">
                Confirmado como <b>{m.subsidiaryName}</b>
                {m.confirmedByName ? ` por ${m.confirmedByName}` : ""} · {formatDateTime(m.confirmedAt)}
              </p>
            )}

            {/* Por qué */}
            {d && (
              <section className="rounded-md border p-3">
                <h3 className="mb-1 text-sm font-semibold">¿Por qué esta sucursal?</h3>
                <p className="mb-2 text-sm text-slate-700">
                  {d.subsidiaryName ? <b>{d.subsidiaryName}</b> : "Sin sucursal"} — {d.reason}
                  {d.runnerUpName && <span className="text-slate-500"> (segunda opción: {d.runnerUpName})</span>}
                </p>
                {d.signals.length > 0 ? (
                  <ul className="space-y-1">
                    {[...d.signals].sort((a, b) => b.weight - a.weight).map((s, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs">
                        <Badge variant="secondary" className="w-36 justify-center px-1.5 py-0 text-[11px]">
                          {SIGNAL_LABEL[s.type] ?? s.type}
                        </Badge>
                        <span className="w-28 truncate font-medium">{s.subsidiaryName ?? "—"}</span>
                        <span className="h-1.5 w-16 overflow-hidden rounded bg-slate-100">
                          <span className="block h-full bg-sky-500" style={{ width: `${Math.min(100, s.weight * 100)}%` }} />
                        </span>
                        <span className="truncate text-slate-600">{s.note}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500">Ninguna pista apuntó a una sucursal.</p>
                )}
                {topZips.length > 0 && (
                  <p className="mt-2 text-xs text-slate-500">
                    CP más frecuentes del archivo: {topZips.map(([z, n]) => `${z} (${n})`).join(" · ")}
                  </p>
                )}
              </section>
            )}

            {/* Consolidados */}
            {data.consolidations.length > 0 && (
              <section>
                <h3 className="mb-1 text-sm font-semibold">Consolidados</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-8 px-2">Tipo</TableHead>
                      <TableHead className="h-8 px-2">Número</TableHead>
                      <TableHead className="h-8 px-2">Guías</TableHead>
                      <TableHead className="h-8 px-2">Subido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.consolidations.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="px-2 py-1.5 text-xs">{CONS_KIND_LABEL[c.kind]}</TableCell>
                        <TableCell className="px-2 py-1.5 font-mono text-xs">{c.consNumber}</TableCell>
                        <TableCell className="px-2 py-1.5 text-xs">{c.announcedCount ?? "—"}</TableCell>
                        <TableCell className="px-2 py-1.5 text-xs">
                          {c.linkStatus === "subido"
                            ? `${formatDateTime(c.uploadedAt)}${c.uploadedByName ? ` · ${c.uploadedByName}` : ""} · tardó ${formatMinutes(c.uploadMinutes)}`
                            : c.linkStatus === "no_aplica"
                              ? "No aplica"
                              : "Pendiente"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </section>
            )}

            {/* Cobros */}
            {cobros.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-1 text-sm font-semibold">
                  Cobros del correo ({cobros.length}) <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Table>
                    <TableBody>
                      {cobros.map((c, i) => (
                        <TableRow key={`${c.trackingNumber}-${i}`}>
                          <TableCell className="px-2 py-1 font-mono text-xs">{c.trackingNumber}</TableCell>
                          <TableCell className="px-2 py-1 text-xs">{c.date ?? "—"}</TableCell>
                          <TableCell className="px-2 py-1 text-xs">{c.concept}</TableCell>
                          <TableCell className="px-2 py-1 text-right text-xs tabular-nums">
                            {c.amount != null ? c.amount.toLocaleString("es-MX", { style: "currency", currency: "MXN" }) : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Adjuntos */}
            {data.attachments.length > 0 && (
              <section>
                <h3 className="mb-1 text-sm font-semibold">Archivos</h3>
                <ul className="divide-y rounded-md border">
                  {data.attachments.map((a) => (
                    <li key={a.id} className="flex items-center gap-2 px-2 py-1.5 text-xs">
                      <span className="min-w-0 flex-1 truncate" title={a.filename}>
                        {a.filename}
                      </span>
                      {a.rowCount != null && <span className="text-slate-500">{a.rowCount} filas</span>}
                      {a.parseError && <span className="text-red-600">{a.parseError}</span>}
                      <Select value={kinds[a.id] ?? a.kind} onValueChange={(v) => setKinds((k) => ({ ...k, [a.id]: v as AttachmentKind }))}>
                        <SelectTrigger className="h-7 w-44 text-xs">
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
                        title="Descargar"
                        onClick={() => downloadInboxAttachment(a.id, a.filename).catch(() => toast.error("No se pudo descargar el archivo"))}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
                {Object.keys(kinds).length > 0 && <p className="mt-1 text-xs text-amber-700">Cambiaste el tipo de algún archivo: se guarda al confirmar.</p>}
              </section>
            )}

            {/* Cuerpo */}
            <section>
              <h3 className="mb-1 text-sm font-semibold">Correo</h3>
              {m.htmlSafe ? (
                <iframe title="Contenido del correo" sandbox="" srcDoc={m.htmlSafe} className="h-[420px] w-full rounded-md border bg-white" />
              ) : (
                <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-md border bg-white p-3 text-xs">{m.textTop || "(sin texto)"}</pre>
              )}
              {m.hasQuotedHistory && <p className="mt-1 text-xs text-slate-500">Este correo trae historial de mensajes anteriores; solo se leyó el mensaje nuevo.</p>}
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
