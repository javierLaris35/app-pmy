"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isValidManualIncome } from "@/lib/consolidador/validation";
import { ManualKind } from "@/lib/types/consolidador";
import { Loader2 } from "lucide-react";

const KIND_LABEL: { value: ManualKind; label: string }[] = [
  { value: "recoleccion", label: "Recolección" },
  { value: "pod", label: "POD / Entregado" },
  { value: "dex", label: "DEX / 3ª visita" },
  { value: "manual", label: "Manual (otro)" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  week: { from: string; to: string };
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

export function AddIncomeDialog({ open, onOpenChange, week, defaultTracking, defaultKind, onSubmit }: Props) {
  const [kind, setKind] = useState<ManualKind | "">(defaultKind ?? "");
  const [trackingNumber, setTrackingNumber] = useState(defaultTracking ?? "");
  const [cost, setCost] = useState("");
  const [date, setDate] = useState(week.to);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  // Al abrir, precarga con los defaults (guía/tipo) que llegan desde Buscar paquete.
  useEffect(() => {
    if (open) {
      setKind(defaultKind ?? "");
      setTrackingNumber(defaultTracking ?? "");
    }
  }, [open, defaultKind, defaultTracking]);

  const draft = { kind, cost: Number(cost), date, reason, trackingNumber };
  const valid = isValidManualIncome(draft, week);

  const reset = () => {
    setKind("");
    setTrackingNumber("");
    setCost("");
    setDate(week.to);
    setReason("");
  };

  const submit = async () => {
    if (!valid || !kind) return;
    setSaving(true);
    try {
      await onSubmit({
        kind,
        trackingNumber: trackingNumber.trim() || undefined,
        cost: Number(cost),
        date,
        reason: reason.trim(),
      });
      reset();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar ingreso</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as ManualKind)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo" />
              </SelectTrigger>
              <SelectContent>
                {KIND_LABEL.map((k) => (
                  <SelectItem key={k.value} value={k.value}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="add-cost">Monto</Label>
              <Input id="add-cost" type="number" min={0} step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-date">Fecha</Label>
              <Input
                id="add-date"
                type="date"
                min={week.from}
                max={week.to}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="add-tracking">Guía (opcional)</Label>
            <Input id="add-tracking" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Número de guía si aplica" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="add-reason">Motivo</Label>
            <Textarea id="add-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo del alta manual" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving || !valid}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Agregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
