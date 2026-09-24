"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { useVehiclesBySubsidiary } from "@/hooks/services/vehicles/use-vehicles";
import { createRequest, updateRequest } from "@/lib/services/maintenance";
import { formatKms, MaintenanceRequest, PRIORITY_LABEL, RequestPriority } from "@/lib/types/maintenance";
import { apiError } from "../shared/confirm-action";
import { FieldError, invalidClass } from "../shared/field-error";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subsidiaryId: string;
  request?: MaintenanceRequest | null;
  defaultVehicleId?: string;
  onSaved: (r: MaintenanceRequest) => void;
}

export function RequestFormDialog({ open, onOpenChange, subsidiaryId, request, defaultVehicleId, onSaved }: Props) {
  const { vehicles } = useVehiclesBySubsidiary(subsidiaryId);
  const [vehicleId, setVehicleId] = useState("");
  const [kms, setKms] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<RequestPriority>("media");
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!open) return;
    setVehicleId(request?.vehicleId ?? defaultVehicleId ?? "");
    setKms(request?.kmsAtRequest ? String(request.kmsAtRequest) : "");
    setDescription(request?.description ?? "");
    setPriority(request?.priority ?? "media");
    setTried(false);
  }, [open, request, defaultVehicleId]);

  const selected = vehicles.find((v) => v.id === vehicleId);
  const allErrors: Record<string, string> = {
    ...(!vehicleId ? { vehicleId: "Elige la unidad que necesita mantenimiento." } : {}),
    ...(kms !== "" && (Number(kms) < 0 || Number(kms) > 1_000_000) ? { kms: "Km no válido." } : {}),
    ...(description.trim().length < 3 ? { description: "Describe qué necesita la unidad." } : {}),
  };
  const errors = tried ? allErrors : {};

  const save = async () => {
    setTried(true);
    if (Object.keys(allErrors).length) {
      toast.error(`Revisa los campos marcados: ${Object.values(allErrors)[0]}`);
      return;
    }
    setSaving(true);
    try {
      const body = { kmsAtRequest: kms === "" ? null : Number(kms), description: description.trim(), priority };
      const saved = request ? await updateRequest(request.id, body) : await createRequest({ vehicleId, ...body });
      toast.success(request ? "Mantenimiento actualizado" : `Mantenimiento ${saved.folio} creado`);
      onSaved(saved);
      onOpenChange(false);
    } catch (e) {
      toast.error(apiError(e, "No se pudo guardar"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{request ? `Editar ${request.folio}` : "Nuevo mantenimiento"}</DialogTitle>
          <DialogDescription>Paso 1 de 5. Describe qué necesita la unidad; en el siguiente paso capturas las cotizaciones.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Unidad</Label>
            <Select value={vehicleId} onValueChange={setVehicleId} disabled={!!request}>
              <SelectTrigger className={invalidClass(errors.vehicleId)}><SelectValue placeholder={subsidiaryId ? "Elige la unidad" : "Primero elige una sucursal"} /></SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id!}>
                    {[v.name || v.code, v.plateNumber].filter(Boolean).join(" · ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.vehicleId} />
            {selected && <p className="text-xs text-muted-foreground">Km registrado: {formatKms(selected.kms)}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Km actuales</Label>
              <Input type="number" min={0} value={kms} onChange={(e) => setKms(e.target.value)} placeholder="Opcional" className={invalidClass(errors.kms)} />
              <FieldError message={errors.kms} />
            </div>
            <div className="grid gap-1.5">
              <Label>Prioridad</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as RequestPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRIORITY_LABEL) as RequestPriority[]).map((p) => (
                    <SelectItem key={p} value={p}>{PRIORITY_LABEL[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>¿Qué necesita?</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Ej. Ruido en frenos delanteros y toca servicio de 10,000 km" className={invalidClass(errors.description)} />
            <FieldError message={errors.description} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
