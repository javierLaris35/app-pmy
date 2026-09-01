"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GitCompare, Loader2, AlertTriangle, Info, Search } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { AppLayout } from "@/components/app-layout";
import { OperationHeader } from "@/components/shared/operation-header";
import { withAuth } from "@/hoc/withAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/data-table/data-table";
import { SucursalSelector } from "@/components/sucursal-selector";
import {
  getParityRuns,
  getParityDivergences,
  compareByTracking,
  compareByRoute,
  compareByConsolidated,
  listRoutesBySubsidiaryDay,
  listConsolidatedsBySubsidiaryDay,
  type ParityRunRow,
  type ParityDivergenceRow,
  type CompareResult,
  type PickerOption,
} from "@/lib/services/tracking-sync";

const dt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—");
const today = () => new Date().toISOString().slice(0, 10);
const kindLabel = (k: string | null) => (k === "charge" ? "Carga" : "Envío");

function StatusPair({ actual, motor }: { actual: string | null; motor: string | null }) {
  const same = (actual ?? "") === (motor ?? "");
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
      <span className="flex items-center gap-1">
        <span className="text-[10px] uppercase text-muted-foreground">Actual</span>
        <Badge variant="outline" className="text-[10px]">{actual ?? "—"}</Badge>
      </span>
      <span className="flex items-center gap-1">
        <span className="text-[10px] uppercase text-muted-foreground">Motor</span>
        <Badge className={`text-[10px] ${same ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"}`}>{motor ?? "—"}</Badge>
      </span>
    </div>
  );
}

function Kpi({ label, value, tone = "neutral" }: { label: string; value: number | string; tone?: "neutral" | "green" | "amber" }) {
  const tones: Record<string, string> = { neutral: "text-foreground", green: "text-emerald-600 dark:text-emerald-400", amber: "text-amber-600 dark:text-amber-400" };
  return (
    <Card><CardContent className="p-3 sm:p-4">
      <div className={`text-xl font-bold leading-none sm:text-2xl ${tones[tone]}`}>{value}</div>
      <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
    </CardContent></Card>
  );
}

/** Columnas de las divergencias del shadow (nuevo vs actual). */
const divergenceColumns: ColumnDef<ParityDivergenceRow>[] = [
  { accessorKey: "trackingNumber", header: "Guía", cell: ({ row }) => <span className="font-mono text-xs">{row.original.trackingNumber}</span> },
  { accessorKey: "kind", header: "Tipo", cell: ({ row }) => <span className="text-xs">{kindLabel(row.original.kind)}</span> },
  { accessorKey: "consNumber", header: "Consolidado", cell: ({ row }) => <span className="text-xs">{row.original.consNumber ?? "—"}</span> },
  { accessorKey: "subsidiary", header: "Sucursal", cell: ({ row }) => <span className="text-xs">{row.original.subsidiary ?? "—"}</span> },
  { accessorKey: "recipientName", header: "Destinatario", cell: ({ row }) => <span className="block max-w-[160px] truncate text-xs" title={row.original.recipientName ?? ""}>{row.original.recipientName ?? "—"}</span> },
  { id: "estatus", header: "Estatus actual vs nuevo motor", cell: ({ row }) => <StatusPair actual={row.original.legacyCurrentStatus} motor={row.original.proposedStatus} /> },
  { accessorKey: "wouldInsertEvents", header: "Eventos", cell: ({ row }) => <span className="text-xs tabular-nums">{row.original.wouldInsertEvents}</span> },
];

/** Columnas de la comparación EN VIVO (mismo jalón de FedEx). */
const compareColumns: ColumnDef<CompareResult>[] = [
  { accessorKey: "trackingNumber", header: "Guía", cell: ({ row }) => <span className="font-mono text-xs">{row.original.trackingNumber}</span> },
  { accessorKey: "kind", header: "Tipo", cell: ({ row }) => <span className="text-xs">{kindLabel(row.original.kind)}</span> },
  { id: "estatus", header: "Estatus actual vs FedEx (motor)", cell: ({ row }) => <StatusPair actual={row.original.ourStatus} motor={row.original.fedexStatus} /> },
  { id: "diverge", header: "¿Difiere?", cell: ({ row }) => row.original.diverges
    ? <Badge className="bg-amber-100 text-amber-700 text-[10px] dark:bg-amber-950 dark:text-amber-300">Sí</Badge>
    : <Badge variant="secondary" className="text-[10px]">No</Badge> },
  { id: "faltan", header: "Eventos que faltan", cell: ({ row }) => <span className="text-xs tabular-nums">{row.original.missingEvents?.length ?? 0}</span> },
];

function ParityContent() {
  // ── Pestaña 1: resultados del shadow ──
  const [runs, setRuns] = useState<ParityRunRow[]>([]);
  const [selectedRun, setSelectedRun] = useState<string>("");
  const [divergences, setDivergences] = useState<ParityDivergenceRow[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [loadingDiv, setLoadingDiv] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRuns = useCallback(async () => {
    setLoadingRuns(true); setError(null);
    try { const r = await getParityRuns(20); setRuns(r); setSelectedRun(r[0]?.id ?? ""); }
    catch (e: any) { setError(e?.response?.data?.message || e?.message || "No se pudieron cargar las corridas."); }
    finally { setLoadingRuns(false); }
  }, []);
  useEffect(() => { loadRuns(); }, [loadRuns]);
  useEffect(() => {
    if (!selectedRun) return;
    setLoadingDiv(true);
    getParityDivergences(selectedRun, 200).then((o) => setDivergences(o.rows)).catch(() => setDivergences([])).finally(() => setLoadingDiv(false));
  }, [selectedRun]);
  const currentRun = useMemo(() => runs.find((r) => r.id === selectedRun) ?? runs[0], [runs, selectedRun]);

  // ── Pestaña 2: comparar en vivo ──
  const [mode, setMode] = useState<"tracking" | "route" | "consolidated">("tracking");
  const [tracking, setTracking] = useState("");
  const [subsidiaryId, setSubsidiaryId] = useState("");
  const [day, setDay] = useState(today());
  const [options, setOptions] = useState<PickerOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [rows, setRows] = useState<CompareResult[]>([]);
  const [comparing, setComparing] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "tracking" || !subsidiaryId) { setOptions([]); return; }
    const fn = mode === "route" ? listRoutesBySubsidiaryDay : listConsolidatedsBySubsidiaryDay;
    fn(subsidiaryId, day).then(setOptions).catch(() => setOptions([]));
  }, [mode, subsidiaryId, day]);

  const runCompare = async () => {
    setComparing(true); setLiveError(null); setRows([]);
    try {
      if (mode === "tracking") {
        if (!tracking.trim()) return;
        const r = await compareByTracking(tracking.trim());
        setRows(Array.isArray(r) ? r : [r]);
      } else if (selectedId) {
        setRows(mode === "route" ? await compareByRoute(selectedId) : await compareByConsolidated(selectedId));
      }
    } catch (e: any) { setLiveError(e?.response?.data?.message || e?.message || "No se pudo comparar."); }
    finally { setComparing(false); }
  };

  return (
    <AppLayout>
      <OperationHeader
        icon={GitCompare}
        title="Paridad FedEx (nuevo vs actual)"
        description="Compara el estatus que pondría el nuevo motor contra el que tienes hoy. Solo lectura, no cambia nada."
      />

      <div className="mx-auto max-w-6xl space-y-4 p-3 sm:p-4">
        <Alert className="border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/40">
          <Info className="h-4 w-4 text-sky-600" />
          <AlertDescription className="text-xs text-sky-900 dark:text-sky-200 sm:text-sm">
            <strong>Estatus actual</strong> = el que hay hoy en el sistema. <strong>Nuevo motor</strong> = el que pondría el motor nuevo (aún sin escribir). Si coinciden, el motor decide igual que hoy.
            <span className="mt-1 block"><strong>Resultados (shadow):</strong> lo que el motor observó en su última corrida automática. <strong>Comparar en vivo:</strong> jala FedEx ahora mismo para una guía/ruta/consolidado (mismo dato, comparación exacta).</span>
          </AlertDescription>
        </Alert>

        {error && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}

        <Tabs defaultValue="shadow">
          <TabsList>
            <TabsTrigger value="shadow">Resultados (shadow)</TabsTrigger>
            <TabsTrigger value="live">Comparar en vivo</TabsTrigger>
          </TabsList>

          {/* ── Resultados del shadow ── */}
          <TabsContent value="shadow" className="space-y-4">
            {loadingRuns ? (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[68px] w-full" />)}</div>
            ) : runs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no hay corridas del motor. Observa cada 15 min en horario hábil (7–22h).</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">Corrida</span>
                  <Select value={selectedRun} onValueChange={setSelectedRun}>
                    <SelectTrigger className="h-9 w-[260px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {runs.map((r) => <SelectItem key={r.id} value={r.id}>{dt(r.startedAt)} · {r.matchPct}% coincide</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <Kpi label="% coincidencia" value={`${currentRun?.matchPct ?? 100}%`} tone={(currentRun?.matchPct ?? 100) >= 98 ? "green" : "amber"} />
                  <Kpi label="Coinciden" value={currentRun?.matchesLegacy ?? 0} tone="green" />
                  <Kpi label="Difieren" value={currentRun?.divergesLegacy ?? 0} tone={(currentRun?.divergesLegacy ?? 0) ? "amber" : "green"} />
                  <Kpi label="Guías observadas" value={currentRun?.ok ?? 0} />
                </div>
                {loadingDiv ? (
                  <Skeleton className="h-64 w-full" />
                ) : divergences.length === 0 ? (
                  <p className="rounded-lg border bg-emerald-50 px-4 py-6 text-center text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">Sin diferencias en esta corrida — el motor coincide con el sistema. 🎉</p>
                ) : (
                  <DataTable columns={divergenceColumns} data={divergences} searchKey="trackingNumber" />
                )}
              </>
            )}
          </TabsContent>

          {/* ── Comparar en vivo ── */}
          <TabsContent value="live" className="space-y-4">
            <Card><CardContent className="space-y-3 p-3 sm:p-4">
              <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
                <TabsList>
                  <TabsTrigger value="tracking">Por guía</TabsTrigger>
                  <TabsTrigger value="route">Por ruta</TabsTrigger>
                  <TabsTrigger value="consolidated">Por consolidado</TabsTrigger>
                </TabsList>
              </Tabs>
              {mode === "tracking" ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="grid flex-1 gap-1.5">
                    <Label className="text-xs">Número de guía</Label>
                    <Input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Ej. 383012036065" onKeyDown={(e) => e.key === "Enter" && runCompare()} />
                  </div>
                  <Button onClick={runCompare} disabled={comparing || !tracking.trim()} className="gap-2">
                    {comparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Comparar
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-end">
                  <div className="grid gap-1.5"><Label className="text-xs">Sucursal</Label>
                    <SucursalSelector value={subsidiaryId} onValueChange={(v) => setSubsidiaryId(typeof v === "string" ? v : (v as any)?.id ?? "")} />
                  </div>
                  <div className="grid gap-1.5"><Label className="text-xs">Día</Label><Input type="date" value={day} onChange={(e) => setDay(e.target.value)} /></div>
                  <div className="grid gap-1.5"><Label className="text-xs">{mode === "route" ? "Ruta" : "Consolidado"}</Label>
                    <Select value={selectedId} onValueChange={setSelectedId}>
                      <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
                      <SelectContent>{options.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Button onClick={runCompare} disabled={comparing || !selectedId} className="gap-2">
                    {comparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Comparar
                  </Button>
                </div>
              )}
            </CardContent></Card>

            {liveError && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{liveError}</AlertDescription></Alert>}
            {comparing ? (
              <Skeleton className="h-48 w-full" />
            ) : rows.length > 0 ? (
              <DataTable columns={compareColumns} data={rows} searchKey="trackingNumber" />
            ) : (
              <p className="text-sm text-muted-foreground">Elige una guía, ruta o consolidado y presiona Comparar para ver el estatus actual vs el que pondría el motor (con datos frescos de FedEx).</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

export default withAuth(ParityContent, ["superamin"]);
