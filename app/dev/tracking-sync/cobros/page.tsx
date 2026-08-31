"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollText, RefreshCw, Loader2, AlertTriangle, CheckCircle2, PackageCheck, Copy, HelpCircle, Info, PackageX, ReceiptText } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { OperationHeader } from "@/components/shared/operation-header";
import { withAuth } from "@/hoc/withAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
type SortKey = "subsidiary" | "deliveredAt" | "type";

const money = (n: number | null) => (n == null ? "—" : n.toLocaleString("es-MX", { style: "currency", currency: "MXN" }));
const shortDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—");
const dateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

function sortRows(rows: CobrosReconRow[], key: SortKey): CobrosReconRow[] {
  const val = (r: CobrosReconRow) =>
    key === "subsidiary" ? (r.subsidiary ?? "").toLowerCase()
    : key === "type" ? r.type
    : (r.deliveredAt ?? "");
  return [...rows].sort((a, b) => {
    const x = val(a), y = val(b);
    // deliveredAt: más reciente primero; el resto: alfabético asc.
    return key === "deliveredAt" ? String(y).localeCompare(String(x)) : String(x).localeCompare(String(y));
  });
}

function TypeBadge({ type }: { type: "envio" | "f2" }) {
  return type === "f2" ? (
    <Badge className="border-0 bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">F2</Badge>
  ) : (
    <Badge variant="secondary" className="text-[10px]">Envío</Badge>
  );
}

/** Lista de descuadres: tabla en escritorio, tarjetas en móvil (responsive real). */
function DiscrepancyList({ title, hint, rows, accent }: { title: string; hint: string; rows: CobrosReconRow[]; accent: "rose" | "amber" }) {
  const copyAll = async () => {
    try { await navigator.clipboard.writeText(rows.map((r) => r.trackingNumber).join("\n")); toast.success(`${rows.length} guía(s) copiada(s).`); }
    catch { toast.error("No se pudo copiar."); }
  };
  const ring = accent === "rose" ? "before:bg-rose-500" : "before:bg-amber-500";
  const Icon = accent === "rose" ? PackageX : ReceiptText;
  const iconColor = accent === "rose" ? "text-rose-500" : "text-amber-500";

  return (
    <Card className="overflow-hidden">
      <div className={`relative flex flex-wrap items-center justify-between gap-2 border-b p-4 before:absolute before:left-0 before:top-0 before:h-full before:w-1 ${ring}`}>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Icon className={`h-4 w-4 ${iconColor}`} /> {title}
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{rows.length}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        {rows.length > 0 && (
          <Button variant="outline" size="sm" onClick={copyAll} className="h-8 gap-1.5"><Copy className="h-3.5 w-3.5" /> Copiar guías</Button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="flex items-center gap-2 p-4 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" /> Todo cuadra aquí.
        </div>
      ) : (
        <>
          {/* Escritorio: tabla */}
          <div className="hidden max-h-[420px] overflow-auto md:block">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>Guía</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Consolidado</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Destinatario</TableHead>
                  <TableHead>Entregado</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.trackingNumber} className={r.type === "f2" ? "bg-violet-50/40 dark:bg-violet-950/20" : ""}>
                    <TableCell className="font-mono text-xs">{r.trackingNumber}</TableCell>
                    <TableCell><TypeBadge type={r.type} /></TableCell>
                    <TableCell className="text-xs">{r.consNumber ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.subsidiary ?? "—"}</TableCell>
                    <TableCell className="max-w-[180px] truncate text-xs" title={r.recipientName ?? ""}>{r.recipientName ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{dateTime(r.deliveredAt)}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{money(r.cost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Móvil: tarjetas */}
          <ul className="divide-y md:hidden">
            {rows.map((r) => (
              <li key={r.trackingNumber} className={`p-4 ${r.type === "f2" ? "bg-violet-50/40 dark:bg-violet-950/20" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-semibold">{r.trackingNumber}</span>
                  <TypeBadge type={r.type} />
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <div><dt className="text-muted-foreground">Sucursal</dt><dd>{r.subsidiary ?? "—"}</dd></div>
                  <div><dt className="text-muted-foreground">Consolidado</dt><dd>{r.consNumber ?? "—"}</dd></div>
                  <div className="col-span-2"><dt className="text-muted-foreground">Destinatario</dt><dd className="truncate">{r.recipientName ?? "—"}</dd></div>
                  <div><dt className="text-muted-foreground">Entregado</dt><dd>{dateTime(r.deliveredAt)}</dd></div>
                  <div><dt className="text-muted-foreground">Costo</dt><dd className="tabular-nums">{money(r.cost)}</dd></div>
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

function Kpi({ icon: Icon, label, value, tone = "neutral", help, emphasize = false }: { icon: any; label: string; value: number | string; tone?: "neutral" | "green" | "red" | "amber"; help?: string; emphasize?: boolean }) {
  const tones: Record<string, string> = {
    neutral: "text-foreground",
    green: "text-emerald-600 dark:text-emerald-400",
    red: "text-rose-600 dark:text-rose-400",
    amber: "text-amber-600 dark:text-amber-400",
  };
  return (
    <Card className={emphasize ? "ring-1 ring-rose-200 dark:ring-rose-900" : ""}>
      <CardContent className="flex items-center gap-3 p-3 sm:p-4">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted sm:h-10 sm:w-10">
          <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${tones[tone]}`} />
        </div>
        <div className="min-w-0">
          <div className={`text-xl font-bold leading-none sm:text-2xl ${tones[tone]}`}>{value}</div>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <span className="truncate">{label}</span>
            {help && (
              <HoverCard openDelay={100}>
                <HoverCardTrigger asChild><HelpCircle className="h-3 w-3 shrink-0 cursor-help opacity-60" /></HoverCardTrigger>
                <HoverCardContent className="w-64 text-xs font-normal normal-case">{help}</HoverCardContent>
              </HoverCard>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CobrosReconciliationContent() {
  const [windowDays, setWindowDays] = useState(14);
  const [sortKey, setSortKey] = useState<SortKey>("subsidiary");
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

  // Filtro F2 + orden, aplicado a cada lista.
  const process = useCallback((rows: CobrosReconRow[]) => sortRows(hideF2 ? rows.filter((r) => r.type !== "f2") : rows, sortKey), [hideF2, sortKey]);
  const missing = useMemo(() => process(report?.missingIncome ?? []), [report, process]);
  const orphan = useMemo(() => process(report?.orphanIncome ?? []), [report, process]);
  const f2Count = useMemo(() => (report?.missingIncome ?? []).filter((r) => r.type === "f2").length + (report?.orphanIncome ?? []).filter((r) => r.type === "f2").length, [report]);

  const total = missing.length + orphan.length;
  const sla = total === 0 ? { tone: "green" as const, label: "Todo cuadrado" } : total < SLA_THRESHOLD ? { tone: "amber" as const, label: `${total} por revisar` } : { tone: "red" as const, label: `SLA excedido (${total})` };
  const slaVariant = { green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300", amber: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300", red: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" }[sla.tone];

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

      <div className="mx-auto max-w-6xl space-y-4 p-3 sm:p-4">
        <Alert className="border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/40">
          <Info className="h-4 w-4 text-sky-600" />
          <AlertDescription className="text-xs text-sky-900 dark:text-sky-200 sm:text-sm">
            Compara <strong>por guía</strong> lo entregado vs lo cobrado. 🔴 <strong>Sin cobro</strong> = entregado pero sin ingreso (dinero que faltó). 🟠 <strong>Sin entrega</strong> = ingreso "entregado" cuyo paquete ya no lo está.
            {" "}Las <strong>F2</strong> se cobran en grupo, así que se ocultan por defecto (no son cobros perdidos reales).
          </AlertDescription>
        </Alert>

        {/* Controles */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={String(windowDays)} onValueChange={(v) => setWindowDays(Number(v))}>
              <SelectTrigger className="h-9 w-[110px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 días</SelectItem>
                <SelectItem value="14">14 días</SelectItem>
                <SelectItem value="30">30 días</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Ordenar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="subsidiary">Ordenar: Sucursal</SelectItem>
                <SelectItem value="deliveredAt">Ordenar: Entrega</SelectItem>
                <SelectItem value="type">Ordenar: Tipo</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Switch id="hideF2" checked={hideF2} onCheckedChange={setHideF2} />
              <Label htmlFor="hideF2" className="cursor-pointer text-sm text-muted-foreground">
                Ocultar F2{f2Count > 0 ? ` (${f2Count})` : ""}
              </Label>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${slaVariant} border-0`}>{sla.label}</Badge>
            <Button onClick={recalc} disabled={running || loading} size="sm" className="h-9 gap-2">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Recalcular
            </Button>
          </div>
        </div>

        {error && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}

        {loading ? (
          <div className="space-y-4" aria-busy="true">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[68px] w-full" />)}</div>
            <Skeleton className="h-[220px] w-full" />
          </div>
        ) : report ? (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi icon={PackageCheck} label={`Entregados (${report.windowDays}d)`} value={report.deliveredShipments} help="Guías FedEx distintas entregadas en la ventana (referencia)." />
              <Kpi icon={PackageX} label="Sin cobro" value={missing.length} tone={missing.length ? "red" : "green"} emphasize={missing.length > 0} help="Entregados sin ingreso. Es dinero que faltó cobrar. (F2 excluidos si el toggle está activo.)" />
              <Kpi icon={ReceiptText} label="Sin entrega" value={orphan.length} tone={orphan.length ? "amber" : "green"} help="Ingreso 'entregado' cuyo paquete ya no aparece entregado. Cobro a revisar." />
              <Kpi icon={CheckCircle2} label="Total descuadres" value={total} tone={total ? (total >= SLA_THRESHOLD ? "red" : "amber") : "green"} help="Suma de los dos. Verde = todo cuadrado." />
            </div>

            <Card>
              <div className="border-b px-4 py-3 text-sm font-semibold">Tendencia (últimas corridas)</div>
              <CardContent className="p-3 sm:p-4">
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

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <DiscrepancyList title="Entregados sin cobro" hint="Se entregó pero no hay ingreso → dinero que faltó cobrar." rows={missing} accent="rose" />
              <DiscrepancyList title="Cobros sin entrega" hint="Ingreso 'entregado' cuyo paquete ya no lo está → revisar." rows={orphan} accent="amber" />
            </div>
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}

export default withAuth(CobrosReconciliationContent, ["superamin"]);
