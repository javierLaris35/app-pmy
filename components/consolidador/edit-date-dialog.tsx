"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fecha actual del ingreso (ISO o YYYY-MM-DD) para prellenar. */
  currentDate: string | null;
  onSubmit: (date: string, reason: string) => Promise<void>;
}

/** Editar la fecha de un ingreso (fecha mal registrada). Reusable en la tabla y en el buscador. */
export function EditDateDialog({ open, onOpenChange, currentDate, onSubmit }: Props) {
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDate(currentDate ? new Date(currentDate).toISOString().slice(0, 10) : "");
      setReason("");
    }
  }, [open, currentDate]);

  const valid = !!date && reason.trim().length >= 3;

  const submit = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await onSubmit(date, reason.trim());
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar fecha del ingreso</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {currentDate && (
            <div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Fecha actual:{" "}
              <span className="font-semibold text-slate-900">
                {new Date(currentDate).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}
              </span>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="new-date">Nueva fecha</Label>
            <Input id="new-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date-reason">Motivo</Label>
            <Textarea id="date-reason" placeholder="Motivo del cambio de fecha" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving || !valid}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
