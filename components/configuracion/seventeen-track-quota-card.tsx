"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, PackageSearch } from "lucide-react";
import { toast } from "@/lib/toast";
import { getWhereParcelUsage, runDhlSyncCron, setupDhlWebhooks, type WhereParcelUsage } from "@/lib/services/dhl-tracking";
import { useAuthStore } from "@/store/auth.store";

const SUPER_ROLES = ["superadmin", "superamin"];

export function SeventeenTrackQuotaCard() {
  const role = (useAuthStore((s) => s.user?.role) || "").toString().toLowerCase();
  const isSuper = SUPER_ROLES.includes(role);

  const [quota, setQuota] = useState<WhereParcelUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [registering, setRegistering] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setQuota(await getWhereParcelUsage());
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo consultar el uso de WhereParcel.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sync = async () => {
    setSyncing(true);
    try {
      await runDhlSyncCron();
      toast.success("Sincronización DHL iniciada en segundo plano. El uso se actualizará en unos minutos.");
      // El ciclo corre en background; refrescamos el uso un poco después.
      setTimeout(() => { load(); }, 20000);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo ejecutar el ciclo de DHL.");
    } finally {
      setSyncing(false);
    }
  };

  const registerWebhooks = async () => {
    setRegistering(true);
    try {
      const r = await setupDhlWebhooks();
      if (r.success) {
        toast.success(`Webhooks listos${r.endpointId ? ` (endpoint ${r.endpointId})` : ""}. Registro de guías en segundo plano.`, { duration: 9000 });
      } else {
        toast.error(r.note || "No se pudo preparar el webhook endpoint.", { duration: 10000 });
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo iniciar el registro de webhooks.");
    } finally {
      setRegistering(false);
    }
  };

  const pct = quota && quota.total > 0 ? Math.round((quota.used / quota.total) * 100) : 0;
  const barColor = pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-amber-500" : "bg-primary";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><PackageSearch className="h-5 w-5" /> Uso WhereParcel (DHL)</CardTitle>
            <CardDescription>Rastreo de guías DHL. Cada consulta cuenta una llamada del plan mensual.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !quota ? (
          <div className="flex h-24 items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Consultando…</div>
        ) : quota ? (
          <>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border p-3">
                <div className="text-2xl font-semibold tabular-nums">{quota.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-2xl font-semibold tabular-nums">{quota.used}</div>
                <div className="text-xs text-muted-foreground">En uso</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-2xl font-semibold tabular-nums text-primary">{quota.remaining}</div>
                <div className="text-xs text-muted-foreground">Disponible</div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{pct}% usado</span>
                <span>Llamadas hoy: {quota.todayUsed}</span>
              </div>
            </div>

            {pct >= 90 && (
              <Badge variant="destructive" className="text-[11px]">Uso casi al tope del mes — considera subir el plan.</Badge>
            )}

            {isSuper && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Registrar guías a webhooks</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">Suscribe las guías DHL pendientes para que WhereParcel empuje los cambios de estatus (push). Mecanismo principal.</p>
                  </div>
                  <Button size="sm" onClick={registerWebhooks} disabled={registering}>
                    {registering ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                    Registrar
                  </Button>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Sincronizar (respaldo)</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">Polling manual de respaldo (lento; por si se perdió un webhook). En segundo plano.</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={sync} disabled={syncing}>
                    {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                    Sincronizar
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground py-6 text-center">Sin datos de quota.</p>
        )}
      </CardContent>
    </Card>
  );
}
