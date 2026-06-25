"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Building2, Warehouse } from "lucide-react";
import { useSubsidiaries } from "@/hooks/services/subsidiaries/use-subsidiaries";
import { updateSubsidiary } from "@/lib/services/subsidiaries";
import type { Subsidiary } from "@/lib/types";
import { toast } from "@/lib/toast";

type FlagKey =
  | "monitorFedexCode67"
  | "monitorFedexCode44"
  | "trackFedexExternalDelivery"
  | "forceFedexStatusOverride"
  | "sortDispatchByPostalCode"
  | "chargeDex03"
  | "chargeDex07"
  | "chargeDex08"
  | "chargeDelivered"
  | "generateDhlIncomeOnDelivery"
  | "countTransfersAsIncome";

const FLAGS: { key: FlagKey; label: string; hint: string }[] = [
  { key: "monitorFedexCode67", label: "Monitorear 67", hint: "Alerta si falta el código 67 (recepción FedEx)" },
  { key: "monitorFedexCode44", label: "Monitorear 44", hint: "Alerta si falta el código 44" },
  { key: "trackFedexExternalDelivery", label: "Rastrear entrega FedEx", hint: "Sigue la entrega que hace FedEx por su cuenta (OD)" },
  { key: "forceFedexStatusOverride", label: "Forzar estatus FedEx", hint: "Prioriza el estatus reportado por FedEx" },
  { key: "sortDispatchByPostalCode", label: "Salidas a ruta por CP", hint: "Ordena los paquetes por código postal (escaneo, PDF y Excel). Si está apagado, se conserva el orden de escaneo." },
];

// Reglas de INGRESO por sucursal (default = comportamiento histórico).
const INCOME_FLAGS: { key: FlagKey; label: string; hint: string }[] = [
  { key: "chargeDelivered", label: "Cobrar entregado", hint: "El paquete entregado genera ingreso." },
  { key: "chargeDex07", label: "Cobrar DEX07", hint: "Rechazado (07) genera ingreso." },
  { key: "chargeDex08", label: "Cobrar DEX08", hint: "Cliente no disponible (08) genera ingreso." },
  { key: "chargeDex03", label: "Cobrar DEX03", hint: "Dirección incorrecta (03). Apagado = no cuenta, pero el registro se conserva para cobrarlo después." },
  { key: "generateDhlIncomeOnDelivery", label: "Ingreso DHL al entregar", hint: "Genera el ingreso DHL al detectar la entrega (17track), no solo en cierre de ruta." },
  { key: "countTransfersAsIncome", label: "Traslados cuentan", hint: "Tyco / aeropuerto / traslado especial cuentan como ingreso en finanzas." },
];

const toBool = (v: any): boolean =>
  v && typeof v === "object" && "data" in v ? v.data?.[0] === 1 : Boolean(v);

export function SubsidiaryConfigPanel() {
  const { subsidiaries, isLoading, mutate } = useSubsidiaries();
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const filtered = (subsidiaries as Subsidiary[]).filter((s) =>
    s.name?.toLowerCase().includes(search.toLowerCase()),
  );

  const toggle = async (sub: Subsidiary, key: FlagKey, value: boolean) => {
    setSavingId(sub.id!);
    try {
      await updateSubsidiary(sub.id!, { [key]: value });
      await mutate();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo guardar la configuración.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración operativa por sucursal</CardTitle>
        <CardDescription>
          Flags de monitoreo y tracking de FedEx por sucursal (antes estaban fijos en el backend). Se guardan al instante.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar sucursal…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando…</div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No hay sucursales que coincidan.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((sub) => (
              <div key={sub.id} className="rounded-lg border p-4">
                <div className="flex items-center gap-2 mb-3">
                  {toBool(sub.isWarehouse) ? <Warehouse className="h-4 w-4 text-primary" /> : <Building2 className="h-4 w-4 text-muted-foreground" />}
                  <span className="font-medium">{sub.name}</span>
                  {toBool(sub.isWarehouse) && <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">Bodega</Badge>}
                  {savingId === sub.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-1" />}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {FLAGS.map((f) => (
                    <div key={f.key} className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2">
                      <div className="min-w-0">
                        <Label className="text-sm">{f.label}</Label>
                        <p className="text-[11px] text-muted-foreground leading-tight">{f.hint}</p>
                      </div>
                      <Switch
                        checked={Boolean(sub[f.key])}
                        disabled={savingId === sub.id}
                        onCheckedChange={(v) => toggle(sub, f.key, v)}
                      />
                    </div>
                  ))}
                </div>

                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mt-4 mb-2">Reglas de ingreso</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {INCOME_FLAGS.map((f) => (
                    <div key={f.key} className="flex items-center justify-between gap-3 rounded-md bg-emerald-50/60 px-3 py-2">
                      <div className="min-w-0">
                        <Label className="text-sm">{f.label}</Label>
                        <p className="text-[11px] text-muted-foreground leading-tight">{f.hint}</p>
                      </div>
                      <Switch
                        checked={Boolean(sub[f.key])}
                        disabled={savingId === sub.id}
                        onCheckedChange={(v) => toggle(sub, f.key, v)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
