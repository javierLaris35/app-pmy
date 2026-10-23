"use client";

import { PmySpinner } from "@/components/ui/pmy-loader";
import { useEffect, useState } from "react";
import { AlertTriangle, Barcode, Check, CircleCheck, Eye, PencilLine } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { manualIncomeErrors, ManualIncomeErrors } from "@/lib/consolidador/validation";
import { describeManualIncome, statusInWords } from "@/lib/consolidador/manual-income-preview";
import { ManualKind } from "@/lib/types/consolidador";
import { ManualIncomePreview, previewManualIncome } from "@/lib/services/consolidador";
import { cn, formatCurrency } from "@/lib/utils";
import { formatWeekLabel } from "@/lib/week";

const KINDS: { value: ManualKind; label: string; hint: string }[] = [
  { value: "pod", label: "POD", hint: "Entregado" },
  { value: "dex07", label: "DEX07", hint: "Rechazo" },
  { value: "dex", label: "DEX08", hint: "3ª visita" },
  { value: "recoleccion", label: "Recolección", hint: "Sin guía" },
  { value: "manual", label: "Otro", hint: "Cualquier otro" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  week: { from: string; to: string };
  /** Sucursal donde se registra el ingreso (para la vista previa). */
  subsidiaryId: string;
  /** Nombre de la sucursal, para el encabezado. */
  subsidiaryName?: string;
  /** Precarga la guía (p. ej. desde Buscar paquete cuando no existe en el sistema). */
  defaultTracking?: string;
  /** Precarga el tipo de ingreso manual. */
  defaultKind?: ManualKind;
  onSubmit: (payload: {
    kind: ManualKind;
    trackingNumber?: string;
    cost: number;
    date: string;
    reason: string;
  }) => Promise<void>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs leading-5">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export function AddIncomeDialog({ open, onOpenChange, week, subsidiaryId, subsidiaryName, defaultTracking, defaultKind, onSubmit }: Props) {
  const [kind, setKind] = useState<ManualKind | "">(defaultKind ?? "");
  const [trackingNumber, setTrackingNumber] = useState(defaultTracking ?? "");
  const [cost, setCost] = useState("");
  const [costTouched, setCostTouched] = useState(false);
  const [date, setDate] = useState(week.to);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [preview, setPreview] = useState<ManualIncomePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Al abrir, precarga con los defaults (guía/tipo) que llegan desde Buscar paquete.
  useEffect(() => {
    if (open) {
      setKind(defaultKind ?? "");
      setTrackingNumber(defaultTracking ?? "");
    }
  }, [open, defaultKind, defaultTracking]);

  // Vista previa "Así quedará": se pide al cambiar tipo/guía/día (con pausa al teclear la guía).
  const tracking = trackingNumber.trim();
  useEffect(() => {
    if (!open || !kind || !subsidiaryId) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    const t = setTimeout(async () => {
      try {
        const p = await previewManualIncome({ subsidiaryId, kind, trackingNumber: tracking || undefined, date });
        if (!cancelled) setPreview(p);
      } catch {
        if (!cancelled) setPreview(null);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, tracking ? 400 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, kind, tracking, date, subsidiaryId]);

  // Monto: se llena con la tarifa de la sucursal mientras el usuario no lo haya escrito.
  useEffect(() => {
    if (!costTouched && preview?.suggestedCost != null) setCost(String(preview.suggestedCost));
  }, [preview?.suggestedCost, costTouched]);

  const amount = cost === "" ? NaN : Number(cost);
  const draft = { kind, cost: amount, date, reason, trackingNumber };
  const errors: ManualIncomeErrors = manualIncomeErrors(draft, week);
  const shown: ManualIncomeErrors = submitted ? errors : {};
  const summary = preview && kind ? describeManualIncome(kind, preview, { cost: amount, date, hasTracking: !!tracking }) : null;
  const needsTracking = kind !== "recoleccion" && kind !== "manual";

  const reset = () => {
    setKind("");
    setTrackingNumber("");
    setCost("");
    setCostTouched(false);
    setDate(week.to);
    setReason("");
    setSubmitted(false);
    setPreview(null);
  };

  const submit = async () => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0 || !kind) return;
    setSaving(true);
    try {
      await onSubmit({
        kind,
        trackingNumber: tracking || undefined,
        cost: Number(cost),
        date,
        reason: reason.trim(),
      });
      reset();
      onOpenChange(false);
    } catch {
      // El padre ya avisó el error; el diálogo se queda abierto.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-14 text-left">
          <DialogTitle>Agregar ingreso</DialogTitle>
          <DialogDescription>
            {[subsidiaryName, `semana ${formatWeekLabel(week)}`].filter(Boolean).join(" · ")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[1.4fr_1fr]">
          {/* FORMULARIO */}
          <div className="space-y-4 px-6 py-4">
            <div className="space-y-1.5">
              <Label>¿Qué vas a registrar?</Label>
              <ToggleGroup
                type="single"
                className="grid w-full grid-cols-3 gap-1.5"
                value={kind}
                onValueChange={(v) => v && setKind(v as ManualKind)}
              >
                {KINDS.map((k) => (
                  <ToggleGroupItem
                    key={k.value}
                    value={k.value}
                    className="h-auto flex-col items-start gap-0 rounded-md border px-2.5 py-1.5 text-left data-[state=on]:border-primary data-[state=on]:bg-primary/5"
                  >
                    <span className="text-sm font-semibold">{k.label}</span>
                    <span className="text-[11px] font-normal text-muted-foreground">{k.hint}</span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <FieldError message={shown.kind} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-tracking">Guía {needsTracking ? "" : "(opcional)"}</Label>
              <div className="relative">
                <Barcode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="add-tracking"
                  className="pl-9"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Número de guía"
                />
              </div>
              {tracking && kind && kind !== "recoleccion" && (
                previewLoading ? (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <PmySpinner className="h-3 w-3" /> Buscando la guía…
                  </p>
                ) : preview?.shipment ? (
                  <p className="flex items-center gap-1 text-xs text-emerald-700">
                    <CircleCheck className="h-3.5 w-3.5" />
                    {[
                      preview.shipment.carrier === "dhl" ? "DHL" : "FedEx",
                      preview.shipment.subsidiaryName,
                      statusInWords(preview.shipment.status),
                    ].filter(Boolean).join(" · ")}
                  </p>
                ) : preview ? (
                  <p className="flex items-center gap-1 text-xs text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Esta guía no existe en el sistema
                  </p>
                ) : null
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="add-cost">Monto</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input
                    id="add-cost"
                    type="number"
                    min={0}
                    step="0.01"
                    className="pl-7"
                    value={cost}
                    onChange={(e) => {
                      setCostTouched(true);
                      setCost(e.target.value);
                    }}
                  />
                </div>
                {!costTouched && preview?.suggestedCost != null && !shown.cost && (
                  <p className="text-xs text-muted-foreground">Tarifa de la sucursal</p>
                )}
                <FieldError message={shown.cost} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-date">Día</Label>
                <Input id="add-date" type="date" min={week.from} max={week.to} value={date} onChange={(e) => setDate(e.target.value)} />
                <FieldError message={shown.date} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-reason">Motivo</Label>
              <Textarea
                id="add-reason"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ej. no se generó en el cierre de ruta"
              />
              <FieldError message={shown.reason} />
            </div>
          </div>

          {/* ASÍ QUEDARÁ */}
          <aside className="flex flex-col gap-3 border-t px-6 py-4 md:border-l md:border-t-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold">
              <Eye className="h-3.5 w-3.5" /> Así quedará
            </p>
            {summary ? (
              <>
                <p className="text-2xl font-bold tabular-nums">{Number.isFinite(amount) ? formatCurrency(amount) : "—"}</p>
                <div>
                  <SummaryRow label="Tipo" value={summary.type} />
                  <SummaryRow label="Día" value={summary.day || "—"} />
                  <SummaryRow label="Columna" value={summary.column} />
                  <SummaryRow label="Ligado a" value={preview?.shipment && tracking ? `Guía ${tracking}` : "Sin guía"} />
                </div>
                <div className="space-y-1 border-t pt-2 text-xs">
                  {summary.countable ? (
                    ["Ingresos", "Dashboard", "Estado de Resultados"].map((r) => (
                      <p key={r} className="flex items-center gap-1.5 text-emerald-700">
                        <Check className="h-3.5 w-3.5" /> {r}
                      </p>
                    ))
                  ) : (
                    <p className="flex items-start gap-1.5 text-amber-700">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      Se registra, pero la regla de cobro de esta sucursal no lo cobra: no sumará al total.
                    </p>
                  )}
                </div>
                {preview?.sameDayIncome && (
                  <p className="flex items-start gap-1.5 rounded-md border border-amber-300 px-2 py-1.5 text-xs text-amber-700">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Ya hay un ingreso de esta guía ese día ({formatCurrency(preview.sameDayIncome.cost)}). Revísalo antes de agregar otro.
                  </p>
                )}
                <p className="mt-auto flex items-start gap-1.5 text-[11px] text-muted-foreground">
                  <PencilLine className="mt-0.5 h-3 w-3 shrink-0" />
                  Quedará marcado como corrección con tu nombre y el motivo.
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                {previewLoading ? "Calculando…" : "Elige qué vas a registrar para ver cómo quedará."}
              </p>
            )}
          </aside>
        </div>

        <DialogFooter className="shrink-0 border-t px-6 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving} className={cn("min-w-36")}>
            {saving && <PmySpinner className="mr-2 h-4 w-4" />}
            {Number.isFinite(amount) && kind ? `Agregar ${formatCurrency(amount)}` : "Agregar ingreso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
