"use client";

import { useState } from "react";
import { Minus, Plus, ScanLine, Undo2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PmySpinner } from "@/components/ui/pmy-loader";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { PackageInfo } from "@/lib/types";
import { normalizeScannedCode } from "@/lib/tracking/normalize-scan";
import { addDispatchPackages, removeDispatchPackages } from "@/lib/services/package-dispatchs";
import { regenerateAndSendDispatchEmail } from "@/lib/services/package-dispatch/regenerate-and-send";
import { apiError } from "@/components/maintenance/shared/confirm-action";

interface Props {
  dispatchId: string;
  /** Paquetes actuales de la salida, en el orden de la salida. */
  packages: PackageInfo[];
  onCancel: () => void;
  /** Se llama tras guardar (para recargar el detalle y el historial). */
  onSaved: () => void;
}

/** Separa lo pegado/escaneado en guías normalizadas (FedEx/DHL). */
function parseCodes(raw: string): string[] {
  return raw
    .split(/[\s,;]+/)
    .map((t) => normalizeScannedCode(t)?.code ?? t.trim().toUpperCase())
    .filter(Boolean);
}

/**
 * Modo edición de una salida en ruta: agregar guías (escaneo o pegado) y marcar
 * paquetes para quitar, con motivo obligatorio. Al guardar se regenera y reenvía
 * el correo de la salida con el orden con que se armó.
 */
export function DispatchEditPanel({ dispatchId, packages, onCancel, onSaved }: Props) {
  const { toast } = useToast();
  const [scan, setScan] = useState("");
  const [toAdd, setToAdd] = useState<string[]>([]);
  const [toRemove, setToRemove] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);

  const inRoute = new Set(packages.flatMap((p) => [p.trackingNumber, p.dhlUniqueId].filter(Boolean) as string[]));
  const reasonError = showErrors && !reason.trim() ? "Escribe el motivo del cambio." : "";
  const nothingError = showErrors && toAdd.length === 0 && toRemove.size === 0 ? "Agrega o quita al menos un paquete." : "";

  const pushCodes = (raw: string) => {
    const codes = parseCodes(raw);
    if (!codes.length) return;
    const repeated = codes.filter((c) => inRoute.has(c));
    if (repeated.length) {
      toast({ title: "Ya está en la salida", description: repeated.join(", "), variant: "destructive" });
    }
    setToAdd((prev) => Array.from(new Set([...prev, ...codes.filter((c) => !inRoute.has(c))])));
    setScan("");
  };

  const toggleRemove = (id?: string) => {
    if (!id) return;
    setToRemove((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const save = async () => {
    setShowErrors(true);
    if (!reason.trim() || (toAdd.length === 0 && toRemove.size === 0)) return;
    setSaving(true);
    try {
      const why = reason.trim();
      if (toAdd.length) await addDispatchPackages(dispatchId, toAdd, why);
      if (toRemove.size) await removeDispatchPackages(dispatchId, Array.from(toRemove), why);
      toast({
        title: "Salida actualizada",
        description: `${toAdd.length} agregada(s), ${toRemove.size} quitada(s). Reenviando el correo…`,
      });
      try {
        await regenerateAndSendDispatchEmail(dispatchId, { isResend: true });
      } catch (e) {
        toast({ title: "La salida se guardó, pero no se reenvió el correo", description: "Reenvíalo desde Salidas a ruta.", variant: "destructive" });
      }
      onSaved();
    } catch (error) {
      toast({ title: "No se guardaron los cambios", description: apiError(error, "No se pudo editar la salida"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-sm font-semibold">Modo edición</span>
          <span className="text-xs text-muted-foreground">Agrega guías o marca las que se quitan. Todo queda en el historial con tu nombre y el motivo.</span>
        </div>
        <Badge variant="outline" className="shrink-0 tabular-nums">
          +{toAdd.length} · −{toRemove.size}
        </Badge>
      </div>

      {/* Agregar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <ScanLine className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="h-9 pl-8"
            placeholder="Escanea o pega guías para agregar y presiona Enter"
            value={scan}
            disabled={saving}
            onChange={(e) => setScan(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); pushCodes(scan); } }}
            onPaste={(e) => { e.preventDefault(); pushCodes(e.clipboardData.getData("text")); }}
          />
        </div>
        <Button type="button" size="sm" variant="outline" className="h-9" disabled={saving || !scan.trim()} onClick={() => pushCodes(scan)}>
          <Plus className="mr-1 h-4 w-4" /> Agregar
        </Button>
      </div>
      {toAdd.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {toAdd.map((c) => (
            <Badge key={c} variant="secondary" className="gap-1 bg-emerald-100 font-mono text-emerald-800">
              + {c}
              <button type="button" aria-label={`No agregar ${c}`} onClick={() => setToAdd((p) => p.filter((x) => x !== c))}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Quitar */}
      <ScrollArea className="h-[260px] rounded-md border bg-background">
        <div className="divide-y">
          {packages.map((p, i) => {
            const marked = !!p.id && toRemove.has(p.id);
            return (
              <div key={p.id ?? p.trackingNumber} className={cn("flex items-center gap-2 px-2 py-1 text-xs", marked && "bg-red-50 text-red-700 line-through")}>
                <span className="w-7 shrink-0 text-right tabular-nums text-muted-foreground">{i + 1}</span>
                <span className="w-32 shrink-0 font-mono">{p.dhlUniqueId || p.trackingNumber}</span>
                <span className="min-w-0 flex-1 truncate" title={p.recipientAddress ?? ""}>{p.recipientAddress || "Sin dirección"}</span>
                <span className="w-12 shrink-0 tabular-nums">{p.recipientZip || ""}</span>
                <Button
                  type="button"
                  size="sm"
                  variant={marked ? "outline" : "ghost"}
                  className={cn("h-6 px-2 text-xs no-underline", !marked && "text-red-600 hover:text-red-700")}
                  disabled={saving || !p.id}
                  onClick={() => toggleRemove(p.id)}
                >
                  {marked ? <><Undo2 className="mr-1 h-3 w-3" /> Deshacer</> : <><Minus className="mr-1 h-3 w-3" /> Quitar</>}
                </Button>
              </div>
            );
          })}
        </div>
      </ScrollArea>
      {nothingError && <p className="text-xs text-red-600">{nothingError}</p>}

      <div className="flex flex-col gap-1">
        <Label htmlFor="dispatch-edit-reason" className="text-xs">Motivo del cambio</Label>
        <Textarea
          id="dispatch-edit-reason"
          rows={2}
          maxLength={500}
          placeholder="Ej. llegó tarde a bodega / se fue en otra ruta"
          value={reason}
          disabled={saving}
          onChange={(e) => setReason(e.target.value)}
          className={cn(reasonError && "border-red-500")}
        />
        {reasonError && <p className="text-xs text-red-600">{reasonError}</p>}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={onCancel}>Cancelar</Button>
        <Button type="button" size="sm" disabled={saving} onClick={save}>
          {saving && <PmySpinner className="mr-2 h-4 w-4" />}
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}
