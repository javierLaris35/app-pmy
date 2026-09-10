"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, PackageSearch } from "lucide-react";
import { toast } from "@/lib/toast";
import { runDhlSyncCron } from "@/lib/services/dhl-tracking";
import { useAuthStore } from "@/store/auth.store";

const SUPER_ROLES = ["superadmin", "superamin"];

/**
 * Tarjeta de rastreo DHL (API oficial). El estatus se actualiza automáticamente
 * cada hora en el cron (igual que FedEx); aquí solo se ofrece disparar una
 * sincronización on-demand (superadmin).
 */
export function DhlTrackingCard() {
  const role = (useAuthStore((s) => s.user?.role) || "").toString().toLowerCase();
  const isSuper = SUPER_ROLES.includes(role);

  const [syncing, setSyncing] = useState(false);

  const sync = async () => {
    setSyncing(true);
    try {
      await runDhlSyncCron();
      toast.success("Sincronización DHL iniciada en segundo plano. El avance sale en los logs.");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo ejecutar el ciclo de DHL.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><PackageSearch className="h-5 w-5" /> Rastreo DHL</CardTitle>
        <CardDescription>
          Las guías DHL se actualizan automáticamente cada hora con la API oficial de DHL, igual que FedEx.
        </CardDescription>
      </CardHeader>
      {isSuper && (
        <CardContent>
          <div className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-medium">Sincronizar ahora</p>
              <p className="text-[11px] text-muted-foreground leading-tight">
                Rastrea de inmediato las guías DHL activas (no esperes al cron horario). Corre en segundo plano.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={sync} disabled={syncing}>
              {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              Sincronizar
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
