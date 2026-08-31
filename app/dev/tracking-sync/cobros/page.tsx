"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollText, RefreshCw, Loader2, AlertTriangle, CheckCircle2, PackageCheck, Copy, HelpCircle, Info } from "lucide-react";
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
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
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

const SLA_THRESHOLD = 25;

type Sla = { tone: "green" | "amber" | "red"; label: string };
function slaOf(total: number): Sla {
  if (total === 0) return { tone: "green", label: "Todo cuadrado" };
  if (total < SLA_THRESHOLD) return { tone: "amber", label: `${total} por revisar` };
  return { tone: "red", label: `SLA excedido (${total})` };
}

const money = (n: number | null) => (n == null ? "—" : n.toLocaleString("es-MX", { style: "currency", currency: "MXN" }));
const shortDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—");

function KpiCard({ icon: Icon, label, value, tone = "neutral", help }: { icon: any; label: string; value: number | string; tone?: "neutral" | "green" | "red" | "amber"; help?: string }) {
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
          <div className="mt-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
            {help && (
              <HoverCard openDelay={100}>
                <HoverCardTrigger asChild><HelpCircle className="h-3 w-3 cursor-help opacity-60" /></HoverCardTrigger>
                <HoverCardContent className="w-72 text-xs font-normal normal-case">{help}</HoverCardContent>
              </HoverCard>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RichTable({ title, subtitle, rows, tone }: { title: string; subtitle: string; rows: CobrosReconRow[]; tone: "red" | "amber" }) {
  const copyAll = async () => {
    try { await navigator.clipboard.writeText(rows.map((r) => r.trackingNumber).join("\n")); toast.success(`${rows.length} guía(s) copiada(s).`); }
    catch { toast.error("No se pudo copiar."); }
  };
  const dot = tone === "red" ? "bg-rose-500" : "bg-amber-500";
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 py-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <span className={`h-2 w-2 rounded-full ${dot}`} /> {title} <span className="text-muted-foreground">({rows.length})</span>
          </CardTitle>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        {rows.length > 0 && (
          <Button variant="ghost" size="sm" onClick={copyAll} className="gap-1.5 text-muted-foreground"><Copy className="h-3.5 w-3.5" /> Copiar guías</Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-emerald-600 dark:text-emerald-400">Ninguna — todo cuadra aquí. 🎉</p>
        ) : (
          <div className="max-h-[360px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guía</TableHead>
                  <TableHead>Consolidado</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Destinatario</TableHead>
                  <TableHead>Estatus</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.trackingNumber}>
                    <TableCell className="font-mono text-xs">{r.trackingNumber}</TableCell>
                    <TableCell className="text-xs">{r.consNumber ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.subsidiary ?? "—"}</TableCell>
                    <TableCell className="max-w-[180px] truncate text-xs" title={r.recipientName ?? ""}>{r.recipientName ?? "—"}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px]">{r.status ?? "—"}</Badge></TableCell>
                    <TableCell className="text-xs">{shortDate(r.date)}</TableCell>
                    <TableCell className="text-right text-xs">{money(r.cost)}</TableCell>
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
      const [rep, hist] = await Promise.all([getCobrosReconciliation(days), getCobrosReconciliationHistory(30)]);
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
    try { await runCobrosReconciliation(windowDays); toast.success("Reconciliación recalculada."); await load(windowDays); }
    catch (e: any) { toast.error(e?.response?.data?.message || "No se pudo recalcular."); }
    finally { setRunning(false); }
  };

  const total = (report?.missingCount ?? 0) + (report?.orphanCount ?? 0);
  const sla = slaOf(total);
  const slaVariant: Record<Sla["tone"], string> = {
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    red: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  };

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
        description="Chequeo de salud de cobros (solo lectura): ¿todo lo entregado tiene su cobro, y todo cobro corresponde a algo entregado?"
      />

      <div className="space-y-4 p-4">
        {/* Panel explicativo */}
        <Alert className="border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/40">
          <Info className="h-4 w-4 text-sky-600" />
          <AlertDescription className="text-sm text-sky-900 dark:text-sky-200">
            <strong>¿Qué es esto?</strong> Compara, por guía (no por fila, así los reciclados no ensucian el conteo), lo <strong>entregado</strong> contra lo <strong>cobrado</strong> en la ventana elegida.
            <span className="mt-1 block">
              🔴 <strong>Entregados sin cobro</strong> = se entregó pero no hay ingreso → <em>dinero que faltó cobrar</em>. &nbsp;
              🟠 <strong>Cobros sin entrega</strong> = hay ingreso "entregado" pero el paquete ya no está entregado → <em>cobro a revisar</em>.
              &nbsp;Si ambos van a 0, los cobros están cuadrados.
            </span>
          </AlertDescription>
        </Alert>

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
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Recalcular ahora
          </Button>
        </div>

        {error && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}

        {loading ? (
          <div className="space-y-4" aria-busy="true">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[76px] w-full" />)}</div>
            <Skeleton className="h-[220px] w-full" />
          </div>
        ) : report ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KpiCard icon={PackageCheck} label={`Entregados (${report.windowDays}d)`} value={report.deliveredShipments} help="Guías FedEx distintas marcadas como entregadas en la ventana (referencia)." />
              <KpiCard icon={AlertTriangle} label="Entregados sin cobro" value={report.missingCount} tone={report.missingCount ? "red" : "green"} help="Se entregaron pero no tienen ingreso registrado. Es dinero que faltó cobrar — revísalas en la tabla de abajo." />
              <KpiCard icon={AlertTriangle} label="Cobros sin entrega" value={report.orphanCount} tone={report.orphanCount ? "amber" : "green"} help="Hay un ingreso 'entregado' pero el paquete ya no aparece entregado. Cobro a revisar (¿cambió de estatus? ¿mal cargado?)." />
              <KpiCard icon={CheckCircle2} label="Total descuadres" value={total} tone={total ? (total >= SLA_THRESHOLD ? "red" : "amber") : "green"} help="Suma de los dos anteriores. Verde = todo cuadrado." />
            </div>

            <Card>
              <CardHeader className="py-3"><CardTitle className="text-sm font-semibold">Tendencia (últimas corridas)</CardTitle></CardHeader>
              <CardContent>
                {trend.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aún no hay corridas guardadas. Usa "Recalcular ahora" o espera al chequeo diario (05:00).</p>
                ) : (
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trend} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="fecha" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="perdidos" name="Entregados sin cobro" stroke="#e11d48" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="huerfanos" name="Cobros sin entrega" stroke="#d97706" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <RichTable title="Entregados sin cobro" subtitle="Se entregó pero no hay ingreso → dinero que faltó cobrar." rows={report.missingIncome} tone="red" />
              <RichTable title="Cobros sin entrega" subtitle="Hay ingreso 'entregado' pero el paquete ya no está entregado → revisar." rows={report.orphanIncome} tone="amber" />
            </div>
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}

export default withAuth(CobrosReconciliationContent, ["superamin"]);
