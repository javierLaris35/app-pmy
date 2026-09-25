"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  AddItemButton, ComboField, Field, FormSection, ItemCard, MultiComboField, SelectField, TextareaField, TextField,
} from "@/components/ui/field";
import { Flag, Gauge, Hammer, Hash, ListChecks, Loader2, MessageSquareText, Package, ShoppingCart, Store, Truck, Wrench } from "lucide-react";
import { toast } from "@/lib/toast";
import { SucursalSelector } from "@/components/sucursal-selector";
import { useVehiclesBySubsidiary } from "@/hooks/services/vehicles/use-vehicles";
import { useServiceTemplates, useUnits } from "@/hooks/services/maintenance/use-maintenance";
import { createRequest, updateRequest } from "@/lib/services/maintenance";
import {
  formatKms, MaintenanceRequest, PRIORITY_LABEL, REQUEST_TYPE_LABEL, RequestPriority, RequestType, TYPES_REQUIRING_VEHICLE,
} from "@/lib/types/maintenance";
import { Subsidiary } from "@/lib/types";
import { hasErrors, firstError, validateRequest } from "@/lib/maintenance-validation";
import { apiError } from "../shared/confirm-action";

const TYPE_ICON: Record<RequestType, React.ComponentType<{ className?: string }>> = {
  mantenimiento: Wrench, servicio: Truck, reparacion: Hammer, compra: ShoppingCart,
};

interface Row { key: string; id?: string; description: string; quantity: number; unitId: string | null; notes: string }
const newRow = (): Row => ({ key: crypto.randomUUID(), description: "", quantity: 1, unitId: null, notes: "" });

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request?: MaintenanceRequest | null;
  defaultSubsidiaryId?: string;
  defaultVehicleId?: string;
  onSaved: (r: MaintenanceRequest) => void;
}

/**
 * Nueva solicitud / editar.
 * - Mantenimiento, servicio o reparación: unidad + servicios predefinidos y/o "qué le pasa". Quien pide no
 *   tiene que saber de piezas: Compras las ve (con sugerencias) al cotizar.
 * - Compra: para qué + renglones de texto libre.
 */
export function RequestFormDialog({ open, onOpenChange, request, defaultSubsidiaryId, defaultVehicleId, onSaved }: Props) {
  const [type, setType] = useState<RequestType>("mantenimiento");
  const [subsidiaryId, setSubsidiaryId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [kms, setKms] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<RequestPriority>("media");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const { vehicles } = useVehiclesBySubsidiary(subsidiaryId);
  const { units } = useUnits();
  const { services } = useServiceTemplates();

  useEffect(() => {
    if (!open) return;
    setType(request?.type ?? "mantenimiento");
    setSubsidiaryId(request?.subsidiary?.id ?? defaultSubsidiaryId ?? "");
    setVehicleId(request?.vehicleId ?? defaultVehicleId ?? "");
    setKms(request?.kmsAtRequest ? String(request.kmsAtRequest) : "");
    setDescription(request?.description ?? "");
    setPriority(request?.priority ?? "media");
    setServiceIds(request?.services?.map((s) => s.id) ?? []);
    setRows(request?.items?.length
      ? request.items.map((i) => ({ key: crypto.randomUUID(), id: i.id, description: i.description, quantity: Number(i.quantity), unitId: i.unitId ?? null, notes: i.notes ?? "" }))
      : [newRow()]);
    setTried(false);
  }, [open, request, defaultSubsidiaryId, defaultVehicleId]);

  const needsVehicle = TYPES_REQUIRING_VEHICLE.includes(type);
  const selected = vehicles.find((v) => v.id === vehicleId);
  const patch = (key: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));

  const vehicleOptions = useMemo(() => vehicles.map((v) => ({
    value: v.id!, label: [v.name || v.code, v.plateNumber].filter(Boolean).join(" · "), hint: [v.brand, v.model].filter(Boolean).join(" ") || undefined,
  })), [vehicles]);
  const serviceOptions = useMemo(() => services
    .filter((s) => !s.vehicleType || !selected?.type || s.vehicleType === selected.type || serviceIds.includes(s.id))
    .map((s) => ({ value: s.id, label: s.name, hint: s.description ?? undefined })), [services, selected, serviceIds]);
  const unitOptions = useMemo(() => units.filter((u) => u.active).map((u) => ({ value: u.id, label: u.name, hint: u.abbreviation ?? undefined })), [units]);

  const allErrors = useMemo(() => validateRequest({
    needsVehicle, typeLabel: REQUEST_TYPE_LABEL[type], subsidiaryId, vehicleId, kms, description, serviceIds, rows,
  }), [needsVehicle, type, subsidiaryId, vehicleId, kms, description, serviceIds, rows]);
  const errors = tried ? allErrors : {};

  const save = async () => {
    setTried(true);
    if (hasErrors(allErrors)) {
      toast.error(`Revisa los campos marcados: ${firstError(allErrors)}`);
      return;
    }
    setSaving(true);
    // Si solo eligió servicios, la descripción se arma con sus nombres (el backend la pide).
    const chosenNames = services.filter((s) => serviceIds.includes(s.id)).map((s) => s.name);
    const text = description.trim() || chosenNames.join(", ");
    const items = rows.filter((r) => r.description.trim()).map((r) => ({
      ...(r.id ? { id: r.id } : {}),
      description: r.description.trim(), quantity: Number(r.quantity), unitId: r.unitId, notes: r.notes.trim() || null,
    }));
    try {
      const body = {
        type,
        vehicleId: vehicleId || null,
        kmsAtRequest: kms === "" ? null : Number(kms),
        description: text,
        priority,
        serviceTemplateIds: needsVehicle ? serviceIds : [],
        // En mantenimiento no se capturan piezas; los renglones de solicitudes viejas se conservan como estaban.
        ...(needsVehicle ? (request ? {} : { items: [] }) : { items }),
      };
      const saved = request ? await updateRequest(request.id, body) : await createRequest({ ...body, subsidiaryId });
      toast.success(request ? "Solicitud actualizada" : `Solicitud ${saved.folio} enviada a Compras`);
      onSaved(saved);
      onOpenChange(false);
    } catch (e) {
      toast.error(apiError(e, "No se pudo guardar la solicitud"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="text-lg">{request ? `Editar ${request.folio}` : "Nueva solicitud"}</DialogTitle>
          <DialogDescription>Le llega a Compras para revisarla y cotizar. Te avisamos cuando avance.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="grid gap-5 px-6 py-5">
            <FormSection title="¿Qué necesitas?">
              <ToggleGroup type="single" value={type} onValueChange={(v) => v && setType(v as RequestType)} variant="outline"
                className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(Object.keys(REQUEST_TYPE_LABEL) as RequestType[]).map((t) => {
                  const Icon = TYPE_ICON[t];
                  return (
                    <ToggleGroupItem key={t} value={t}
                      className="h-auto justify-start gap-2.5 rounded-xl border-[1.5px] px-3 py-3 text-left data-[state=on]:border-primary data-[state=on]:bg-primary/5 data-[state=on]:text-foreground">
                      <Icon className="h-4 w-4 shrink-0 text-primary" />
                      <span className="text-sm font-medium">{REQUEST_TYPE_LABEL[t]}</span>
                    </ToggleGroupItem>
                  );
                })}
              </ToggleGroup>
            </FormSection>

            <FormSection title="Datos" columns={2}>
              {request ? (
                <TextField label="Sucursal" icon={Store} value={request.subsidiary?.name ?? ""} disabled readOnly />
              ) : (
                <Field label="Sucursal" required icon={Store} error={errors.subsidiaryId}>
                  <SucursalSelector
                    insideAModal
                    bare
                    value={subsidiaryId}
                    onValueChange={(val) => { setSubsidiaryId((typeof val === "string" ? val : (val as Subsidiary).id) ?? ""); setVehicleId(""); }}
                  />
                </Field>
              )}
              <ComboField
                label="Unidad"
                required={needsVehicle}
                icon={Truck}
                value={vehicleId || null}
                onChange={(v) => setVehicleId(v ?? "")}
                options={vehicleOptions}
                placeholder={needsVehicle ? "Buscar unidad" : "No es para una unidad"}
                searchPlaceholder="Nombre, número o placas…"
                emptyText={subsidiaryId ? "No hay unidades con ese nombre en la sucursal." : "Primero elige la sucursal."}
                allowClear={!needsVehicle}
                clearLabel="No es para una unidad"
                error={errors.vehicleId}
                hint={selected ? `Km registrado: ${formatKms(selected.kms)}` : undefined}
              />
              <TextField label="Km actuales" icon={Gauge} type="number" min={0} value={kms} onChange={(e) => setKms(e.target.value)}
                placeholder="Lo que marca el tablero" disabled={!vehicleId} error={errors.kms} />
              <SelectField label="Prioridad" icon={Flag} value={priority} onValueChange={(v) => setPriority(v as RequestPriority)}
                options={(Object.keys(PRIORITY_LABEL) as RequestPriority[]).map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))} />
            </FormSection>

            {needsVehicle ? (
              <FormSection title="Detalle" description="No necesitas saber qué piezas lleva: Compras lo revisa al cotizar.">
                <MultiComboField
                  label="Servicios"
                  icon={ListChecks}
                  values={serviceIds}
                  onChange={setServiceIds}
                  options={serviceOptions}
                  placeholder="Buscar servicio (ej. servicio de 10,000 km, frenos…)"
                  searchPlaceholder="Escribe para buscar…"
                  emptyText="No está en la lista; descríbelo abajo."
                />
                <TextareaField
                  label="¿Qué necesita o qué le pasa?"
                  required={!serviceIds.length}
                  icon={MessageSquareText}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej. Rechina al frenar y se jala a la derecha; tira aceite abajo del motor"
                  error={errors.description}
                />
              </FormSection>
            ) : (
              <FormSection title="Detalle">
                <TextareaField label="¿Para qué se necesita?" required icon={MessageSquareText} rows={2} value={description}
                  onChange={(e) => setDescription(e.target.value)} placeholder="Ej. Sillas para la oficina de Hermosillo" error={errors.description} />
                <div className="grid gap-2">
                  {rows.map((r, i) => (
                    <ItemCard
                      key={r.key}
                      title={r.description.trim() || `Renglón ${i + 1}`}
                      subtitle={r.description.trim() ? `Renglón ${i + 1}` : "Qué se necesita y cuánto"}
                      aside={<span className="text-muted-foreground">× {r.quantity || 0}</span>}
                      onRemove={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                      removeDisabled={rows.length === 1}
                      removeLabel="Quitar renglón"
                    >
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_180px]">
                        <TextField label="Qué se necesita" required icon={Package} value={r.description} placeholder="Ej. Silla ejecutiva negra"
                          onChange={(e) => patch(r.key, { description: e.target.value })} error={errors[`rows.${i}.description`]} />
                        <TextField label="Cantidad" required icon={Hash} type="number" min={0.01} step="0.01" value={r.quantity}
                          onChange={(e) => patch(r.key, { quantity: Number(e.target.value) })} error={errors[`rows.${i}.quantity`]} />
                        <ComboField label="Presentación" value={r.unitId} onChange={(v) => patch(r.key, { unitId: v })} options={unitOptions}
                          allowClear clearLabel="Sin presentación" placeholder="Opcional" searchPlaceholder="Buscar presentación…" />
                      </div>
                      <TextareaField label="Notas" rows={2} value={r.notes} onChange={(e) => patch(r.key, { notes: e.target.value })}
                        placeholder="Marca, medida, color… (opcional)" />
                    </ItemCard>
                  ))}
                  {errors.rows && <p className="px-1 text-xs text-destructive">{errors.rows}</p>}
                  <AddItemButton onClick={() => setRows((rs) => [...rs, newRow()])}>Agregar renglón</AddItemButton>
                </div>
              </FormSection>
            )}
          </div>
        </ScrollArea>
        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {request ? "Guardar cambios" : "Enviar a Compras"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
