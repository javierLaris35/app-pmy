"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RowActions } from "@/components/consolidador/row-actions";
import { HistoryDialog } from "@/components/consolidador/history-dialog";
import { StatusTimelineDialog } from "@/components/consolidador/status-timeline-dialog";
import {
  getWeekAnomalies,
  patchIncomeCost,
  patchSecondAbord,
  editIncomeDate,
  deleteIncome,
} from "@/lib/services/consolidador";
import { AnomalyRow } from "@/lib/types/consolidador";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/lib/toast";
import {
  AlertTriangle,
  AlertOctagon,
  Loader2,
  History,
  ShieldCheck,
  ListOrdered,
  CalendarClock,
  Truck,
  FileWarning,
  PackageX,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subsidiaryId: string;
  week: { from: string; to: string };
  /** Refresca la tabla principal de la semana tras una corrección. */
  onChanged: () => void;
}

type Severity = "danger" | "warn";

// Cada anomalía: título corto, ícono y severidad (danger = el cobro probablemente está mal).
const ANOMALY: Record<string, { short: string; icon: typeof AlertTriangle; severity: Severity }> = {
  delivered_by_fedex: { short: "Lo entregó FedEx", icon: PackageX, severity: "danger" },
  income_without_support: { short: "Cobro sin entrega", icon: FileWarning, severity: "danger" },
  status_regressed: { short: "Volvió a tránsito", icon: Truck, severity: "warn" },
  date_mismatch: { short: "Fecha no coincide", icon: CalendarClock, severity: "warn" },
};

const SEV: Record<Severity, { card: string; strip: string; iconBg: string; iconText: string; chip: string; chipText: string }> = {
  danger: {
    card: "border-red-200 bg-red-50/40",
    strip: "bg-red-500",
    iconBg: "bg-red-100",
    iconText: "text-red-600",
    chip: "bg-red-100/70",
    chipText: "text-red-700",
  },
  warn: {
    card: "border-amber-200 bg-amber-50/40",
    strip: "bg-amber-400",
    iconBg: "bg-amber-100",
    iconText: "text-amber-600",
    chip: "bg-amber-100/70",
    chipText: "text-amber-700",
  },
};

const fmtDateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

const rowSeverity = (r: AnomalyRow): Severity =>
  r.anomalies.some((a) => ANOMALY[a.code]?.severity === "danger") ? "danger" : "warn";

export function AnomaliesDialog({ open, onOpenChange, subsidiaryId, week, onChanged }: Props) {
  const [rows, setRows] = useState<AnomalyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [timelineRow, setTimelineRow] = useState<AnomalyRow | null>(null);

  const reload = useCallback(async () => {
    if (!subsidiaryId) return;
    setLoading(true);
    try {
      const { rows } = await getWeekAnomalies(subsidiaryId, week.from, week.to);
      // Críticas primero.
      rows.sort((a, b) => (rowSeverity(a) === rowSeverity(b) ? 0 : rowSeverity(a) === "danger" ? -1 : 1));
      setRows(rows);
    } catch {
      toast.error("No se pudieron cargar las anomalías");
    } finally {
      setLoading(false);
    }
  }, [subsidiaryId, week.from, week.to]);

  useEffect(() => {
    if (open) reload();
  }, [open, reload]);

  const after = async (p: Promise<unknown>, ok: string) => {
    try {
      await p;
      toast.success(ok);
      onChanged();
      await reload();
    } catch {
      toast.error("No se pudo aplicar el cambio");
    }
  };

  const { danger, warn } = useMemo(() => {
    let d = 0;
    let w = 0;
    rows.forEach((r) => (rowSeverity(r) === "danger" ? d++ : w++));
    return { danger: d, warn: w };
  }, [rows]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[95vw] max-w-[95vw] gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b border-slate-100 px-5 py-4">
          <DialogTitle className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <span className="flex flex-col">
              <span className="text-base font-semibold text-slate-900">Anomalías por revisar</span>
              <span className="text-xs font-normal text-slate-400">Ingresos con problemas de esta sucursal y semana</span>
            </span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-20 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
              <ShieldCheck className="h-9 w-9 text-emerald-500" />
            </span>
            <p className="text-base font-semibold text-slate-800">Todo en orden</p>
            <p className="text-sm text-slate-400">No se detectaron anomalías esta semana.</p>
          </div>
        ) : (
          <>
            {/* Resumen de severidad — se lee de un vistazo. */}
            <div className="flex items-center gap-5 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
              <div className="flex items-center gap-2">
                <AlertOctagon className="h-4 w-4 text-red-500" />
                <span className="text-sm text-slate-600">
                  <span className="font-bold text-red-600 tabular-nums">{danger}</span> crítica{danger === 1 ? "" : "s"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-slate-600">
                  <span className="font-bold text-amber-600 tabular-nums">{warn}</span> por revisar
                </span>
              </div>
              <span className="ml-auto text-xs text-slate-400">{rows.length} en total</span>
            </div>

            <ScrollArea className="max-h-[62vh]">
              <div className="space-y-3 p-5">
                {rows.map((r) => {
                  const sev = rowSeverity(r);
                  const S = SEV[sev];
                  return (
                    <div key={r.id} className={`relative overflow-hidden rounded-xl border ${S.card} pl-4 pr-3 py-3`}>
                      <span className={`absolute left-0 top-0 h-full w-1 ${S.strip}`} />

                      {/* Cabecera de la tarjeta: identidad + acciones */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="font-semibold tabular-nums text-slate-900">{r.trackingNumber || r.consNumber || "—"}</span>
                          {r.shipmentStatus && (
                            <Badge variant="outline" className="whitespace-nowrap border-slate-200 bg-white/70 font-normal text-slate-600">
                              {r.shipmentStatus.replace(/_/g, " ")}
                            </Badge>
                          )}
                          <span className="font-semibold tabular-nums text-slate-700">{formatCurrency(r.cost)}</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Trazabilidad" onClick={() => setTimelineRow(r)}>
                            <ListOrdered className="h-4 w-4 text-slate-500" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Historial de cambios" onClick={() => setHistoryId(r.id)}>
                            <History className="h-4 w-4 text-slate-500" />
                          </Button>
                          <RowActions
                            row={r}
                            onEditCost={(id, cost, reason) => after(patchIncomeCost(id, cost, reason), "Costo actualizado")}
                            onToggleSecondAbord={(id, enabled, reason) => after(patchSecondAbord(id, enabled, reason), "2º a bordo ajustado")}
                            onEditDate={(id, date, reason) => after(editIncomeDate(id, date, reason), "Fecha actualizada")}
                            onDelete={(id, reason) => after(deleteIncome(id, reason), "Ingreso eliminado")}
                          />
                        </div>
                      </div>

                      {/* Alertas de la tarjeta */}
                      <div className="mt-2.5 space-y-1.5">
                        {r.anomalies.map((a) => {
                          const meta = ANOMALY[a.code] ?? { short: a.code, icon: AlertTriangle, severity: "warn" as Severity };
                          const AS = SEV[meta.severity];
                          const AIcon = meta.icon;
                          return (
                            <div key={a.code} className={`flex items-start gap-2 rounded-lg ${AS.chip} px-2.5 py-1.5`}>
                              <AIcon className={`mt-0.5 h-4 w-4 shrink-0 ${AS.chipText}`} />
                              <div className="min-w-0">
                                <div className={`text-xs font-semibold ${AS.chipText}`}>{meta.short}</div>
                                <div className="text-[11px] leading-snug text-slate-600">{a.label}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Fechas */}
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] tabular-nums text-slate-500">
                        <span>
                          <span className="text-slate-400">Estatus</span> {fmtDateTime(r.statusDate)}
                        </span>
                        <span>
                          <span className="text-slate-400">Ingreso</span>{" "}
                          <span className="font-medium text-amber-600">{fmtDateTime(r.date)}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        )}

        <HistoryDialog incomeId={historyId} open={!!historyId} onOpenChange={(o) => !o && setHistoryId(null)} />
        <StatusTimelineDialog open={!!timelineRow} onOpenChange={(o) => !o && setTimelineRow(null)} tracking={timelineRow?.trackingNumber ?? null} />
      </DialogContent>
    </Dialog>
  );
}
