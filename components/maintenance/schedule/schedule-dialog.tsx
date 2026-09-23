"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { updateVehicleSchedule } from "@/lib/services/maintenance";
import { formatKms, MaintenanceVehicle, vehicleLabel } from "@/lib/types/maintenance";
import { apiError } from "../shared/confirm-action";

const INTERVALS = [5000, 7500, 10000];
const toDay = (d?: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");

interface Props {
  vehicle: MaintenanceVehicle | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

/** Programar / corregir datos de mantenimiento de la unidad. */
export function ScheduleDialog({ vehicle, onOpenChange, onSaved }: Props) {
  const [kms, setKms] = useState("");
  const [interval, setInterval] = useState("5000");
  const [customInterval, setCustomInterval] = useState("");
  const [lastKms, setLastKms] = useState("");
  const [lastDate, setLastDate] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!vehicle) return;
    const iv = vehicle.maintenanceIntervalKms ?? 5000;
    setKms(vehicle.kms ? String(vehicle.kms) : "");
    setInterval(INTERVALS.includes(iv) ? String(iv) : "otro");
    setCustomInterval(INTERVALS.includes(iv) ? "" : String(iv));
    setLastKms(vehicle.lastMaintenanceKms !== null && vehicle.lastMaintenanceKms !== undefined ? String(vehicle.lastMaintenanceKms) : "");
    setLastDate(toDay(vehicle.lastMaintenanceDate));
    setNextDate(toDay(vehicle.nextMaintenanceDate));
  }, [vehicle]);

  const intervalValue = interval === "otro" ? Number(customInterval) : Number(interval);

  const save = async () => {
    if (!vehicle) return;
    setSaving(true);
    try {
      await updateVehicleSchedule(vehicle.id, {
        ...(kms !== "" && Number(kms) !== vehicle.kms ? { kms: Number(kms) } : {}),
        maintenanceIntervalKms: intervalValue,
        lastMaintenanceKms: lastKms === "" ? null : Number(lastKms),
        lastMaintenanceDate: lastDate || null,
        nextMaintenanceDate: nextDate || null,
      });
      toast.success("Programación guardada");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(apiError(e, "No se pudo guardar la programación"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!vehicle} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Programar mantenimiento</DialogTitle>
          <DialogDescription>{vehicleLabel(vehicle)}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Km actual</Label>
            <Input type="number" min={0} value={kms} onChange={(e) => setKms(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Se actualiza solo con las salidas a ruta y cierres. Corrígelo aquí si está mal (registrado: {formatKms(vehicle?.kms)}).
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Servicio cada</Label>
              <Select value={interval} onValueChange={setInterval}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INTERVALS.map((i) => <SelectItem key={i} value={String(i)}>{i.toLocaleString("es-MX")} km</SelectItem>)}
                  <SelectItem value="otro">Otro…</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {interval === "otro" && (
              <div className="grid gap-1.5">
                <Label>Km</Label>
                <Input type="number" min={500} value={customInterval} onChange={(e) => setCustomInterval(e.target.value)} />
              </div>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Último servicio (km)</Label>
              <Input type="number" min={0} value={lastKms} onChange={(e) => setLastKms(e.target.value)} placeholder="Sin registro" />
            </div>
            <div className="grid gap-1.5">
              <Label>Último servicio (fecha)</Label>
              <Input type="date" value={lastDate} onChange={(e) => setLastDate(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Próximo servicio (fecha, opcional)</Label>
            <Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
            <p className="text-xs text-muted-foreground">Lo que ocurra primero (km o fecha) marca el servicio como próximo o vencido.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !(intervalValue >= 500)}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
