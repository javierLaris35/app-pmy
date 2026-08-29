"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollText, RefreshCw, Loader2, AlertTriangle, CheckCircle2, PackageCheck, Copy } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { OperationHeader } from "@/components/shared/operation-header";
import { withAuth } from "@/hoc/withAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getCobrosReconciliation,
  getCobrosReconciliationHistory,
  runCobrosReconciliation,
  type CobrosReconcileReport,
  type CobrosReportHistoryRow,
} from "@/lib/services/tracking-sync";
import { toast } from "@/lib/toast";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Umbral SLA (espejo del backend): discrepancias que disparan alerta.
const SLA_THRESHOLD = 25;

type Sla = { tone: "green" | "amber" | "red"; label: string };
function slaOf(total: number): Sla {
  if (total === 0) return { tone: "green", label: "Sin discrepancias" };
  if (total < SLA_THRESHOLD) return { tone: "amber", label: `${total} por revisar` };
  return { tone: "red", label: `SLA excedido (${total})` };
}

function KpiCard({ icon: Icon, label, value, tone = "neutral" }: { icon: any; label: string; value: number | string; tone?: "neutral" | "green" | "red" | "amber" }) {
  const tones: Record<string, string> = {
    neutral: "text-foreground",
    green: "text-emerald-600 dark:text-emerald-400",
    red: "text-rose-600 dark:text-rose-400",
    amber: "text-amber-600 dark:text-amber-400",
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-muted">
          <Icon className={`h-5 w-5 ${tones[tone]}`} />
        </div>
        <div className="min-w-0">
          <div className={`text-2xl font-bold leading-none ${tones[tone]}`}>{value}</div>
          <div className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function TrackingsTable({ title, rows, empty }: { title: string; rows: string[]; empty: string }) {
  const copyAll = async () => {
    try { await navigator.clipboard.writeText(rows.join("\n")); toast.success(`${rows.length} guía(s) copiada(s).`); }
    catch { toast.error("No se pudo copiar."); }
  };
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 py-3">
        <CardTitle className="text-sm font-semibold">{title} <span className="text-muted-foreground">({rows.length})</span></CardTitle>
        {rows.length > 0 && (
          <Button variant="ghost" size="sm" onClick={copyAll} className="gap-1.5 text-muted-foreground">
            <Copy className="h-3.5 w-3.5" /> Copiar
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-muted-foreground">{empty}</p>
        ) : (
          <div className="max-h-[320px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Guía</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((tn, i) => (
                  <TableRow key={tn + i}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-mono">{tn}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CobrosReconciliationContent() {
  const [windowDays, setWindowDays] = useState(14);
  const [report, setReport] = useState<CobrosReconcileReport | null>(null);
  const [history, setHistory] = useState<CobrosReportHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (days: number) => {
    setLoading(true);
    setError(null);
    try {
      const [rep, hist] = await Promise.all([
        getCobrosReconciliation(days),
        getCobrosReconciliationHistory(30),
      ]);
      setReport(rep);
      setHistory(hist);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "No se pudo cargar la reconciliación.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(windowDays); }, [windowDays, load]);

  const recalc = async () => {
    setRunning(true);
    try {
      await runCobrosReconciliation(windowDays);
      toast.success("Reconciliación recalculada y guardada.");
      await load(windowDays);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo recalcular.");
    } finally {
      setRunning(false);
    }
  };

  const total = (report?.missingCount ?? 0) + (report?.orphanCount ?? 0);
  const sla = slaOf(total);
  const slaVariant: Record<Sla["tone"], string> = {
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    red: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  };

  // Tendencia: de más antiguo a más reciente para el eje X.
  const trend = useMemo(
    () => [...history].reverse().map((h) => ({
      fecha: new Date(h.runAt).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit" }),
      perdidos: h.missingCount,
      huerfanos: h.orphanCount,
    })),
    [history],
  );

  return (
    <AppLayout>
      <OperationHeader
        icon={ScrollText}
        title="Reconciliación de cobros"
        description="Guardia de cobros (solo lectura): envíos entregados sin ingreso y cobros huérfanos. No modifica cobros."
      />

      <div className="space-y-4 p-4">
        {/* Controles */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Ventana</span>
            <Select value={String(windowDays)} onValueChange={(v) => setWindowDays(Number(v))}>
              <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 días</SelectItem>
                <SelectItem value="14">14 días</SelectItem>
                <SelectItem value="30">30 días</SelectItem>
              </SelectContent>
            </Select>
            <Badge className={`${slaVariant[sla.tone]} border-0`}>{sla.label}</Badge>
          </div>
          <Button onClick={recalc} disabled={running || loading} className="gap-2">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Recalcular ahora
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="space-y-4" aria-busy="true">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[76px] w-full" />)}
            </div>
            <Skeleton className="h-[220px] w-full" />
          </div>
        ) : report ? (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KpiCard icon={PackageCheck} label={`Entregados (${report.windowDays}d)`} value={report.deliveredShipments} />
              <KpiCard icon={AlertTriangle} label="Cobros perdidos" value={report.missingCount} tone={report.missingCount ? "red" : "green"} />
              <KpiCard icon={AlertTriangle} label="Cobros huérfanos" value={report.orphanCount} tone={report.orphanCount ? "amber" : "green"} />
              <KpiCard icon={CheckCircle2} label="Total discrepancias" value={total} tone={total ? (total >= SLA_THRESHOLD ? "red" : "amber") : "green"} />
            </div>

            {/* Tendencia */}
            <Card>
              <CardHeader className="py-3"><CardTitle className="text-sm font-semibold">Tendencia (últimas corridas)</CardTitle></CardHeader>
              <CardContent>
                {trend.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aún no hay corridas guardadas. Usa “Recalcular ahora” o espera al cron diario (07:00).</p>
                ) : (
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trend} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="fecha" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="perdidos" name="Cobros perdidos" stroke="#e11d48" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="huerfanos" name="Huérfanos" stroke="#d97706" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Detalle */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <TrackingsTable title="Entregados sin ingreso" rows={report.missingIncome} empty="Ninguno — todos los entregados tienen su ingreso. 🎉" />
              <TrackingsTable title="Cobros huérfanos" rows={report.orphanIncome} empty="Ninguno — no hay ingresos sin entrega." />
            </div>
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}

export default withAuth(CobrosReconciliationContent, ["superamin"]);
