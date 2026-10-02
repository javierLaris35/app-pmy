"use client";

import { useState } from "react";
import { Panel, PanelContent, PanelDescription, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useInboxStatus } from "@/hooks/services/inbox/use-inbox";
import { inboxErrorText, redetectInbox, setInboxEnabled, syncInbox } from "@/lib/services/inbox";
import { toast } from "@/lib/toast";
import { formatDateTime } from "@/components/correos-fedex/labels";
import { Loader2, RefreshCw, Wand2 } from "lucide-react";

const HEALTH: Record<string, { label: string; cls: string }> = {
  ok: { label: "Leyendo bien", cls: "bg-emerald-100 text-emerald-800" },
  atrasado: { label: "Atrasado (más de 30 min sin leer)", cls: "bg-red-100 text-red-700" },
  pausado: { label: "Pausado", cls: "bg-slate-100 text-slate-700" },
  sin_configurar: { label: "Falta configurar el acceso", cls: "bg-amber-100 text-amber-800" },
};

/** Configuración → Servidor → Correo FedEx (solo superadmin). */
export function InboxPanel() {
  const { data, mutate, isLoading } = useInboxStatus();
  const [busy, setBusy] = useState<"toggle" | "sync" | "redetect" | null>(null);

  async function run(kind: "toggle" | "sync" | "redetect", fn: () => Promise<unknown>, ok: (r: any) => string, fail: string) {
    setBusy(kind);
    try {
      const r = await fn();
      toast.success(ok(r));
      await mutate();
    } catch (e) {
      toast.error(inboxErrorText(e, fail));
    } finally {
      setBusy(null);
    }
  }

  if (isLoading || !data) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando…
      </div>
    );
  }
  const h = HEALTH[data.health] ?? HEALTH.pausado;

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Correo FedEx</PanelTitle>
        <PanelDescription>Lectura del buzón {data.mailbox} de sistemas@ (solo lectura: nunca se borra ni se marca nada).</PanelDescription>
      </PanelHeader>
      <PanelContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className={`${h.cls} hover:${h.cls}`}>{h.label}</Badge>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={data.enabled}
              disabled={busy !== null || !data.configured}
              onCheckedChange={(v) =>
                run("toggle", () => setInboxEnabled(v), () => (v ? "Lectura automática activada" : "Lectura automática pausada"), "No se pudo cambiar")
              }
            />
            Leer automáticamente cada 2 minutos
          </label>
          {!data.serverEnabled && <span className="text-xs text-amber-700">El servidor tiene la lectura apagada (INBOX_ENABLED); solo funciona "Leer ahora".</span>}
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm md:grid-cols-4">
          <dt className="text-slate-500">Última lectura</dt>
          <dd>{formatDateTime(data.lastRunAt)}</dd>
          <dt className="text-slate-500">Última lectura sin errores</dt>
          <dd>{formatDateTime(data.lastOkAt)}</dd>
          <dt className="text-slate-500">Remitentes permitidos</dt>
          <dd>{data.allowedDomains.join(", ")}</dd>
          <dt className="text-slate-500">Leídos hoy</dt>
          <dd>
            {Object.entries(data.today).length
              ? Object.entries(data.today).map(([k, n]) => `${k}: ${n}`).join(" · ")
              : "0"}
          </dd>
        </dl>
        {data.lastError && <p className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">{data.lastError}</p>}

        <div className="flex gap-2">
          <Button
            size="sm"
            className="gap-2"
            disabled={busy !== null || !data.configured}
            onClick={() => run("sync", syncInbox, (r) => r.skipped ?? `Se leyeron ${r.read} correos`, "No se pudo leer el correo")}
          >
            {busy === "sync" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Leer ahora
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            disabled={busy !== null}
            onClick={() => run("redetect", redetectInbox, (r) => `Se volvieron a evaluar ${r.updated} correos`, "No se pudo volver a evaluar")}
          >
            {busy === "redetect" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Volver a detectar pendientes
          </Button>
        </div>
      </PanelContent>
    </Panel>
  );
}
