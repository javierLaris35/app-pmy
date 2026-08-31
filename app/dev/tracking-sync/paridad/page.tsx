"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GitCompare, Loader2, AlertTriangle, Info, ArrowRight } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { OperationHeader } from "@/components/shared/operation-header";
import { withAuth } from "@/hoc/withAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getParityRuns,
  getParityDivergences,
  type ParityRunRow,
  type ParityDivergenceRow,
} from "@/lib/services/tracking-sync";

const dt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—");

function KpiCard({ label, value, tone = "neutral" }: { label: string; value: number | string; tone?: "neutral" | "green" | "amber" }) {
  const tones: Record<string, string> = {
    neutral: "text-foreground",
    green: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`text-2xl font-bold leading-none ${tones[tone]}`}>{value}</div>
        <div className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function ParityContent() {
  const [runs, setRuns] = useState<ParityRunRow[]>([]);
  const [selectedRun, setSelectedRun] = useState<string>("");
  const [rows, setRows] = useState<ParityDivergenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRuns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await getParityRuns(20);
      setRuns(r);
      setSelectedRun(r[0]?.id ?? "");
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "No se pudieron cargar las corridas.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRows = useCallback(async (runId: string) => {
    setLoadingRows(true);
    try {
      const out = await getParityDivergences(runId || undefined, 200);
      setRows(out.rows);
    } catch {
      setRows([]);
    } finally {
      setLoadingRows(false);
    }
  }, []);

  useEffect(() => { loadRuns(); }, [loadRuns]);
  useEffect(() => { if (selectedRun) loadRows(selectedRun); }, [selectedRun, loadRows]);

  const current = useMemo(() => runs.find((r) => r.id === selectedRun) ?? runs[0], [runs, selectedRun]);
  const pctTone = (current?.matchPct ?? 100) >= 98 ? "green" : "amber";

  return (
    <AppLayout>
      <OperationHeader
        icon={GitCompare}
        title="Paridad FedEx (nuevo vs legacy)"
        description="Qué decidiría el motor nuevo (shadow) comparado con el sistema actual. Solo lectura: no cambia estatus."
      />

      <div className="space-y-4 p-4">
        <Alert className="border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/40">
          <Info className="h-4 w-4 text-sky-600" />
          <AlertDescription className="text-sm text-sky-900 dark:text-sky-200">
            <strong>¿Qué es esto?</strong> Cada hora el motor nuevo <em>observa</em> (sin escribir) y anota qué estatus pondría. Aquí ves el <strong>% de coincidencia</strong> con el sistema actual y, abajo, las guías donde <strong>difiere</strong> (nuestro estatus → estatus que propone el motor). Sirve para validar el motor antes de encenderlo.
          </AlertDescription>
        </Alert>

        {error && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-busy="true">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[76px] w-full" />)}</div>
        ) : runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay corridas shadow guardadas. El motor observa cada hora al minuto :15.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Corrida</span>
              <Select value={selectedRun} onValueChange={setSelectedRun}>
                <SelectTrigger className="h-9 w-[240px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {runs.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{dt(r.startedAt)} · {r.matchPct}% coincide</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KpiCard label="% coincidencia" value={`${current?.matchPct ?? 100}%`} tone={pctTone} />
              <KpiCard label="Coinciden" value={current?.matchesLegacy ?? 0} tone="green" />
              <KpiCard label="Difieren" value={current?.divergesLegacy ?? 0} tone={(current?.divergesLegacy ?? 0) ? "amber" : "green"} />
              <KpiCard label="Guías observadas" value={current?.ok ?? 0} />
            </div>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-semibold">Guías donde el motor difiere <span className="text-muted-foreground">({rows.length})</span></CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loadingRows ? (
                  <div className="p-4"><Skeleton className="h-40 w-full" /></div>
                ) : rows.length === 0 ? (
                  <p className="px-4 pb-4 text-sm text-emerald-600 dark:text-emerald-400">Ninguna diferencia en esta corrida — el motor coincide 100% con el sistema actual. 🎉</p>
                ) : (
                  <div className="max-h-[520px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Guía</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Consolidado</TableHead>
                          <TableHead>Sucursal</TableHead>
                          <TableHead>Destinatario</TableHead>
                          <TableHead>Nuestro estatus → Motor</TableHead>
                          <TableHead className="text-right">Eventos</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((r) => (
                          <TableRow key={r.trackingNumber}>
                            <TableCell className="font-mono text-xs">{r.trackingNumber}</TableCell>
                            <TableCell className="text-xs">{r.kind === "charge" ? "Carga" : "Envío"}</TableCell>
                            <TableCell className="text-xs">{r.consNumber ?? "—"}</TableCell>
                            <TableCell className="text-xs">{r.subsidiary ?? "—"}</TableCell>
                            <TableCell className="max-w-[160px] truncate text-xs" title={r.recipientName ?? ""}>{r.recipientName ?? "—"}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5 text-xs">
                                <Badge variant="outline" className="text-[10px]">{r.legacyCurrentStatus ?? "—"}</Badge>
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                <Badge className="bg-sky-100 text-sky-700 text-[10px] dark:bg-sky-950 dark:text-sky-300">{r.proposedStatus ?? "—"}</Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-xs">{r.wouldInsertEvents}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}

export default withAuth(ParityContent, ["superamin"]);
