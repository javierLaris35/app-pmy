"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { createMaintenanceService, updateMaintenanceService } from "@/lib/services/maintenance";
import { MaintenanceServiceItem, ServiceCategory, ServiceUnit, UNIT_LABEL } from "@/lib/types/maintenance";
import { VehicleTypeEnum } from "@/lib/types";
import { apiError } from "../shared/confirm-action";

const ALL = "__all__";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: MaintenanceServiceItem | null;
  categories: ServiceCategory[];
  onSaved: () => void;
}

export function ServiceFormDialog({ open, onOpenChange, service, categories, onSaved }: Props) {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [unit, setUnit] = useState<ServiceUnit>("servicio");
  const [price, setPrice] = useState("");
  const [vehicleType, setVehicleType] = useState<string>(ALL);
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(service?.name ?? "");
    setCategoryId(service?.categoryId ?? categories.find((c) => c.active)?.id ?? "");
    setUnit(service?.unit ?? "servicio");
    setPrice(service ? String(service.referencePrice) : "");
    setVehicleType(service?.vehicleType ?? ALL);
    setActive(service?.active ?? true);
  }, [open, service, categories]);

  const valid = name.trim().length >= 2 && categoryId && price !== "" && Number(price) >= 0;

  const save = async () => {
    setSaving(true);
    const body = {
      name: name.trim(),
      categoryId,
      unit,
      referencePrice: Number(price),
      vehicleType: vehicleType === ALL ? null : vehicleType,
      active,
    };
    try {
      if (service) await updateMaintenanceService(service.id, body);
      else await createMaintenanceService(body);
      toast.success(service ? "Servicio actualizado" : "Servicio agregado");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(apiError(e, "No se pudo guardar el servicio"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{service ? "Editar servicio" : "Nuevo servicio"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Cambio de aceite y filtro" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Categoría</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Elige una categoría" /></SelectTrigger>
                <SelectContent>
                  {categories.filter((c) => c.active || c.id === categoryId).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Unidad</Label>
              <Select value={unit} onValueChange={(v) => setUnit(v as ServiceUnit)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(UNIT_LABEL) as ServiceUnit[]).map((u) => (
                    <SelectItem key={u} value={u}>{UNIT_LABEL[u]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Precio de referencia (sin IVA)</Label>
              <Input type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
            </div>
            <div className="grid gap-1.5">
              <Label>Tipo de vehículo</Label>
              <Select value={vehicleType} onValueChange={setVehicleType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  {Object.values(VehicleTypeEnum).map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Activo</p>
              <p className="text-xs text-muted-foreground">Los inactivos no aparecen al capturar cotizaciones.</p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={!valid || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
