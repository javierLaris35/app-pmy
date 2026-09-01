"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollText, RefreshCw, Loader2, AlertTriangle, Info } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { AppLayout } from "@/components/app-layout";
import { OperationHeader } from "@/components/shared/operation-header";
import { withAuth } from "@/hoc/withAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/data-table/data-table";
import {
  getCobrosReconciliation,
  getCobrosReconciliationHistory,
  runCobrosReconciliation,
  type CobrosReconcileReport,
  type CobrosReportHistoryRow,
  type CobrosReconRow,
} from "@/lib/services/tracking-sync";
import { toast } from "@/lib/toast";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const money = (n: number | null) => (n == null ? "—" : n.toLocaleString("es-MX", { style: "currency", currency: "MXN" }));
const dateTime = (iso: string | null) => (iso ? new Date(iso).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—");

const columns: ColumnDef<CobrosReconRow>[] = [
  { accessorKey: "trackingNumber", header: "Guía", cell: ({ row }) => <span className="font-mono text-xs">{row.original.trackingNumber}</span> },
  { accessorKey: "type", header: "Tipo", cell: ({ row }) => row.original.type === "f2"
    ? <Badge variant="outline" className="text-[10px]">F2</Badge>
    : <span className="text-xs text-muted-foreground">Envío</span> },
  { accessorKey: "consNumber", header: "Consolidado", cell: ({ row }) => <span className="text-xs">{row.original.consNumber ?? "—"}</span> },
  { accessorKey: "subsidiary", header: "Sucursal", cell: ({ row }) => <span className="text-xs">{row.original.subsidiary ?? "—"}</span> },
  { accessorKey: "recipientName", header: "Destinatario", cell: ({ row }) => <span className="block max-w-[200px] truncate text-xs" title={row.original.recipientName ?? ""}>{row.original.recipientName ?? "—"}</span> },
  { accessorKey: "deliveredAt", header: "Entregado", cell: ({ row }) => <span className="whitespace-nowrap text-xs">{dateTime(row.original.deliveredAt)}</span> },
  { accessorKey: "cost", header: () => <div className="text-right">Costo</div>, cell: ({ row }) => <div className="text-right text-xs tabular-nums">{money(row.original.cost)}</div> },
];

function StatTile({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{label}</div>
        {hint && <div className="mt-0.5 text-[11px] text-muted-foreground/70">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function CobrosReconciliationContent() {
  const [windowDays, setWindowDays] = useState(14);
  const [hideF2, setHideF2] = useState(true);
  const [report, setReport] = useState<CobrosReconcileReport | null>(null);
  const [history, setHistory] = useState<CobrosReportHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (days: number) => {
    setLoading(true); setError(null);
    try {
      const [rep, hist] = await Promise.all([getCobrosReconciliation(days), getCobrosReconciliationHistory(30)]);
      setReport(rep); setHistory(hist);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "No se pudo cargar la reconciliación.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(windowDays); }, [windowDays, load]);

  const recalc = async () => {
    setRunning(true);
    try { await runCobrosReconciliation(windowDays); toast.success("Reconciliación recalculada."); await load(windowDays); }
    catch (e: any) { toast.error(e?.response?.data?.message || "No se pudo recalcular."); }
    finally { setRunning(false); }
  };

  const filt = useCallback((rows: CobrosReconRow[]) => (hideF2 ? rows.filter((r) => r.type !== "f2") : rows), [hideF2]);
  const missing = useMemo(() => filt(report?.missingIncome ?? []), [report, filt]);
  const orphan = useMemo(() => filt(report?.orphanIncome ?? []), [report, filt]);
  const f2Count = useMemo(() => (report?.missingIncome ?? []).filter((r) => r.type === "f2").length + (report?.orphanIncome ?? []).filter((r) => r.type === "f2").length, [report]);
  const total = missing.length + orphan.length;

  const trend = useMemo(() => [...history].reverse().map((h) => ({
    fecha: new Date(h.runAt).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit" }),
    perdidos: h.missingCount, huerfanos: h.orphanCount,
  })), [history]);

  return (
    <AppLayout>
      <OperationHeader
        icon={ScrollText}
        title="Reconciliación de cobros"
        description="¿Todo lo entregado tiene su cobro, y todo cobro corresponde a algo entregado? Solo lectura."
      />

      <div className="space-y-4 p-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs sm:text-sm">
            Compara por guía lo entregado vs lo cobrado. <strong>Sin cobro</strong> = entregado sin ingreso (dinero que faltó). <strong>Sin entrega</strong> = ingreso "entregado" cuyo paquete ya no lo está. Las <strong>F2</strong> se cobran en grupo, por eso se ocultan por defecto.
          </AlertDescription>
        </Alert>

        {/* Controles */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={String(windowDays)} onValueChange={(v) => setWindowDays(Number(v))}>
              <SelectTrigger className="h-9 w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 días</SelectItem>
                <SelectItem value="14">14 días</SelectItem>
                <SelectItem value="30">30 días</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Switch id="hideF2" checked={hideF2} onCheckedChange={setHideF2} />
              <Label htmlFor="hideF2" className="cursor-pointer text-sm text-muted-foreground">Ocultar F2{f2Count ? ` (${f2Count})` : ""}</Label>
            </div>
          </div>
          <Button onClick={recalc} disabled={running || loading} size="sm" variant="outline" className="h-9 gap-2 sm:w-auto">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Recalcular
          </Button>
        </div>

        {error && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[84px] w-full" />)}</div>
            <Skeleton className="h-[220px] w-full" />
          </div>
        ) : report ? (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile label={`Entregados (${report.windowDays}d)`} value={report.deliveredShipments} hint="Guías distintas entregadas" />
              <StatTile label="Sin cobro" value={missing.length} hint="Entregados sin ingreso" />
              <StatTile label="Sin entrega" value={orphan.length} hint="Ingreso sin entrega actual" />
              <StatTile label="Total descuadres" value={total} />
            </div>

            <Card>
              <div className="border-b px-4 py-3 text-sm font-medium">Tendencia (últimas corridas)</div>
              <CardContent className="p-4">
                {trend.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aún no hay corridas guardadas. Usa "Recalcular" o espera al chequeo diario (05:00).</p>
                ) : (
                  <div className="h-[200px] w-full sm:h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                        <Tooltip />
                        <Line type="monotone" dataKey="perdidos" name="Sin cobro" stroke="#e11d48" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="huerfanos" name="Sin entrega" stroke="#d97706" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Tabs defaultValue="missing">
              <TabsList>
                <TabsTrigger value="missing">Sin cobro ({missing.length})</TabsTrigger>
                <TabsTrigger value="orphan">Sin entrega ({orphan.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="missing" className="mt-3">
                {missing.length === 0
                  ? <p className="text-sm text-muted-foreground">Ninguno — todo lo entregado tiene su cobro.</p>
                  : <DataTable columns={columns} data={missing} searchKey="trackingNumber" />}
              </TabsContent>
              <TabsContent value="orphan" className="mt-3">
                {orphan.length === 0
                  ? <p className="text-sm text-muted-foreground">Ninguno — no hay ingresos sin entrega.</p>
                  : <DataTable columns={columns} data={orphan} searchKey="trackingNumber" />}
              </TabsContent>
            </Tabs>
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}

export default withAuth(CobrosReconciliationContent, ["superamin"]);
