"use client";

import { PmySpinner } from "@/components/ui/pmy-loader";
import { useEffect, useState } from "react";
import { AlertTriangle, Barcode, CalendarDays, CircleCheck, CircleDollarSign, Eye, MessageSquareText } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { manualIncomeErrors, ManualIncomeErrors } from "@/lib/consolidador/validation";
import { describeManualIncome } from "@/lib/consolidador/manual-income-preview";
import { ManualKind } from "@/lib/types/consolidador";
import { ManualIncomePreview, previewManualIncome } from "@/lib/services/consolidador";
import { formatCurrency } from "@/lib/utils";

const KIND_LABEL: { value: ManualKind; label: string }[] = [
  { value: "recoleccion", label: "Recolección" },
  { value: "pod", label: "POD" },
  { value: "dex07", label: "DEX07" },
  { value: "dex", label: "DEX08 / 3ª visita" },
  { value: "manual", label: "Otro" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  week: { from: string; to: string };
  /** Sucursal donde se registra el ingreso (para la vista previa). */
  subsidiaryId: string;
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

export function AddIncomeDialog({ open, onOpenChange, week, subsidiaryId, defaultTracking, defaultKind, onSubmit }: Props) {
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

  const draft = { kind, cost: cost === "" ? NaN : Number(cost), date, reason, trackingNumber };
  const errors: ManualIncomeErrors = manualIncomeErrors(draft, week);
  const shown: ManualIncomeErrors = submitted ? errors : {};
  const summary = preview && kind ? describeManualIncome(kind, preview, { cost: draft.cost, date, hasTracking: !!tracking }) : null;

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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar ingreso</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              className="grid w-full grid-cols-5"
              value={kind}
              onValueChange={(v) => v && setKind(v as ManualKind)}
            >
              {KIND_LABEL.map((k) => (
                <ToggleGroupItem key={k.value} value={k.value} className="text-xs">
                  {k.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <FieldError message={shown.kind} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="add-tracking" className="flex items-center gap-1.5">
              <Barcode className="h-3.5 w-3.5 text-muted-foreground" />
              Guía {kind === "recoleccion" || kind === "manual" ? "(opcional)" : ""}
            </Label>
            <Input
              id="add-tracking"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Número de guía"
            />
            {tracking && kind && kind !== "recoleccion" && !previewLoading && preview && (
              preview.shipment ? (
                <p className="flex items-center gap-1 text-xs text-emerald-700">
                  <CircleCheck className="h-3.5 w-3.5" />
                  Encontrada · {preview.shipment.carrier.toUpperCase()}
                  {preview.shipment.subsidiaryName ? ` · ${preview.shipment.subsidiaryName}` : ""} · {preview.shipment.status}
                </p>
              ) : (
                <p className="flex items-center gap-1 text-xs text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Esta guía no existe en el sistema
                </p>
              )
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="add-cost" className="flex items-center gap-1.5">
                <CircleDollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                Monto
              </Label>
              <Input
                id="add-cost"
                type="number"
                min={0}
                step="0.01"
                value={cost}
                onChange={(e) => {
                  setCostTouched(true);
                  setCost(e.target.value);
                }}
              />
              {!costTouched && preview?.suggestedCost != null && !shown.cost && (
                <p className="text-xs text-muted-foreground">Tarifa de la sucursal</p>
              )}
              <FieldError message={shown.cost} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-date" className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                Día
              </Label>
              <Input id="add-date" type="date" min={week.from} max={week.to} value={date} onChange={(e) => setDate(e.target.value)} />
              <FieldError message={shown.date} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="add-reason" className="flex items-center gap-1.5">
              <MessageSquareText className="h-3.5 w-3.5 text-muted-foreground" />
              Motivo
            </Label>
            <Textarea id="add-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej. no se generó en el cierre de ruta" />
            <FieldError message={shown.reason} />
          </div>

          {summary && (
            <Alert className={summary.countable ? "border-emerald-300" : "border-amber-300"}>
              {summary.countable ? <Eye className="h-4 w-4 text-emerald-700" /> : <AlertTriangle className="h-4 w-4 text-amber-700" />}
              <AlertTitle>Así quedará</AlertTitle>
              <AlertDescription className="space-y-1">
                <p>{summary.text}</p>
                <p className={summary.countable ? "text-emerald-700" : "text-amber-700"}>{summary.where}</p>
              </AlertDescription>
            </Alert>
          )}

          {preview?.sameDayIncome && (
            <Alert className="border-amber-300">
              <AlertTriangle className="h-4 w-4 text-amber-700" />
              <AlertTitle>Ya hay un ingreso de esta guía ese día</AlertTitle>
              <AlertDescription>
                {formatCurrency(preview.sameDayIncome.cost)} · {preview.sameDayIncome.sourceType === "shipment" ? "del paquete" : preview.sameDayIncome.sourceType}. Revísalo antes de agregar otro.
              </AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <PmySpinner className="mr-2 h-4 w-4" />} Agregar ingreso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
