"use client";
import { useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { OperationHeader } from "@/components/shared/operation-header";
import { withAuth } from "@/hoc/withAuth";
import { SucursalSelector } from "@/components/sucursal-selector";
import { CompareTable } from "@/components/tracking-sync/compare-table";
import { LegacyRulesModal } from "@/components/tracking-sync/legacy-rules-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  compareByTracking,
  compareByRoute,
  compareByConsolidated,
  applyCorrections,
  listRoutesBySubsidiaryDay,
  listConsolidatedsBySubsidiaryDay,
  type CompareResult,
  type PickerOption,
} from "@/lib/services/tracking-sync";

type Mode = "tracking" | "route" | "consolidated";
const today = () => new Date().toISOString().slice(0, 10);

function TrackingSyncContent() {
  const [mode, setMode] = useState<Mode>("tracking");
  const [rows, setRows] = useState<CompareResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Por guía
  const [tracking, setTracking] = useState("");

  // Por ruta / consolidado
  const [subsidiaryId, setSubsidiaryId] = useState("");
  const [day, setDay] = useState(today());
  const [options, setOptions] = useState<PickerOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [searching, setSearching] = useState(false);

  const runTracking = async () => {
    if (!tracking.trim()) return;
    setLoading(true);
    setError(null);
    setRows([]);
    try {
      setRows([await compareByTracking(tracking.trim())]);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Error");
      setRows([]);
    } finally {
      setAttempted(true);
      setLoading(false);
    }
  };

  const search = async () => {
    if (!subsidiaryId) {
      setError("Elige una sucursal");
      return;
    }
    setSearching(true);
    setError(null);
    setOptions([]);
    setSelectedId("");
    setRows([]);
    setAttempted(false);
    try {
      const opts =
        mode === "route"
          ? await listRoutesBySubsidiaryDay(subsidiaryId, day)
          : await listConsolidatedsBySubsidiaryDay(subsidiaryId, day);
      setOptions(opts);
      if (opts.length === 0) setError("Sin resultados para esa sucursal y día");
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Error listando");
    } finally {
      setSearching(false);
    }
  };

  const pick = async (id: string) => {
    setSelectedId(id);
    if (!id) {
      setRows([]);
      return;
    }
    setLoading(true);
    setError(null);
    setRows([]);
    try {
      setRows(mode === "route" ? await compareByRoute(id) : await compareByConsolidated(id));
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Error");
      setRows([]);
    } finally {
      setAttempted(true);
      setLoading(false);
    }
  };

  const onApply = async (shipmentIds: string[]) => {
    if (shipmentIds.length === 0) return;
    await applyCorrections(shipmentIds);
    if (mode === "tracking") await runTracking();
    else if (selectedId) await pick(selectedId);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setRows([]);
    setOptions([]);
    setSelectedId("");
    setError(null);
    setAttempted(false);
  };

  return (
    <AppLayout>
      <OperationHeader
        icon={RefreshCw}
        title="Sincronización FedEx"
        description="Compara nuestro estatus contra FedEx en vivo y corrige (solo estatus, no genera cobros)."
      />

      <div className="p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Tabs value={mode} onValueChange={(v) => switchMode(v as Mode)}>
            <TabsList>
              <TabsTrigger value="tracking">Por guía</TabsTrigger>
              <TabsTrigger value="route">Por salida a ruta</TabsTrigger>
              <TabsTrigger value="consolidated">Por consolidado</TabsTrigger>
            </TabsList>
          </Tabs>
          <LegacyRulesModal />
        </div>

        <Card>
          <CardContent className="pt-4">
            {mode === "tracking" ? (
              <div className="flex flex-wrap items-end gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="tn">Número de guía</Label>
                  <Input
                    id="tn"
                    className="w-72"
                    placeholder="1234 5678 9012"
                    value={tracking}
                    onChange={(e) => setTracking(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && runTracking()}
                  />
                </div>
                <Button onClick={runTracking} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? "Consultando…" : "Consultar FedEx ahora"}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="grid gap-1.5">
                    <Label>Sucursal</Label>
                    <div className="w-56">
                      <SucursalSelector value={subsidiaryId} onValueChange={(v) => setSubsidiaryId(v as string)} />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="day">Día</Label>
                    <Input id="day" type="date" className="w-44" value={day} onChange={(e) => setDay(e.target.value)} />
                  </div>
                  <Button onClick={search} disabled={searching}>
                    {searching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {searching ? "Buscando…" : "Buscar"}
                  </Button>
                </div>

                {options.length > 0 && (
                  <div className="grid gap-1.5">
                    <Label>{mode === "route" ? "Salida a ruta" : "Consolidado"}</Label>
                    <Select value={selectedId} onValueChange={pick}>
                      <SelectTrigger className="w-full max-w-xl">
                        <SelectValue placeholder={mode === "route" ? "Elige una salida a ruta…" : "Elige un consolidado…"} />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {loading && (
          <div className="space-y-2" aria-busy="true">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Consultando FedEx…
            </div>
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-2/3" />
          </div>
        )}
        {!loading && rows.length > 0 && <CompareTable rows={rows} onApply={onApply} />}
        {!loading && !error && attempted && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">Sin guías FedEx para comparar en esta selección.</p>
        )}
      </div>
    </AppLayout>
  );
}

export default withAuth(TrackingSyncContent, ["superamin"]);
