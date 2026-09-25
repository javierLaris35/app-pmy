"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Package, Plus, Truck, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SucursalSelector } from "@/components/sucursal-selector";
import { apiError } from "@/components/maintenance/shared/confirm-action";
import { createShipmentInDesembarcos } from "@/lib/services/shipments";
import { getCurrentHermosilloDateTime } from "@/utils/date.utils";
import {
  CreatedManualShipment,
  ManualShipmentErrors,
  ManualShipmentValues,
  emptyManualShipment,
  toAddShipmentPayload,
  validateManualShipment,
} from "@/lib/manual-shipment";
import type { AddShipmentDto, Subsidiary } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Formulario ÚNICO de alta manual de paquetes. Lo usan:
 * - Desembarque → Sobrantes → "Corregir" → "Crear nuevo".
 * - El "+" del header (Agregar envío).
 * Crea shipment o charge_shipment (FedEx por defecto, se puede cambiar a DHL)
 * vía POST /shipments/add-shipment; el backend valida lo mismo (manual-shipment.util).
 */
export interface ManualShipmentFormProps {
  /** Sucursal fija (desembarque). Si no viene, se muestra el selector. */
  subsidiary?: { id: string; name?: string | null } | null;
  initialValues?: Partial<ManualShipmentValues>;
  onCreated: (created: CreatedManualShipment, values: ManualShipmentValues) => void;
  onCancel: () => void;
}

const FieldError = ({ msg }: { msg?: string }) =>
  msg ? <p className="text-xs text-destructive">{msg}</p> : null;

export function ManualShipmentForm({ subsidiary, initialValues, onCreated, onCancel }: ManualShipmentFormProps) {
  const [values, setValues] = useState<ManualShipmentValues>(() =>
    emptyManualShipment({
      commitDateTime: getCurrentHermosilloDateTime(),
      recipientCity: subsidiary?.name ?? "",
      ...initialValues,
    }),
  );
  const [pickedSubsidiary, setPickedSubsidiary] = useState<{ id: string; name?: string | null } | null>(subsidiary ?? null);
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (subsidiary) setPickedSubsidiary(subsidiary);
  }, [subsidiary]);

  const errors: ManualShipmentErrors = useMemo(() => validateManualShipment(values), [values]);
  const visibleErrors = showErrors ? errors : {};
  const target = subsidiary ?? pickedSubsidiary;

  const set = <K extends keyof ManualShipmentValues>(field: K, value: ManualShipmentValues[K]) => {
    setServerError(null);
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);
    setServerError(null);
    if (!target?.id) {
      setServerError("Elige la sucursal.");
      return;
    }
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const result = await createShipmentInDesembarcos(toAddShipmentPayload(values, target) as AddShipmentDto);
      if (!result.ok || !result.shipment?.id) {
        setServerError(result.message || "No se pudo registrar el paquete.");
        return;
      }
      onCreated({ ...result.shipment, isCharge: !!result.isCharge }, values);
    } catch (err) {
      setServerError(apiError(err, "No se pudo registrar el paquete"));
    } finally {
      setSubmitting(false);
    }
  };

  const isDhl = values.carrier === "dhl";

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Sucursal */}
      {subsidiary ? (
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
          Sucursal: <span className="font-medium">{subsidiary.name || "—"}</span>
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Sucursal *</Label>
          <SucursalSelector
            value={pickedSubsidiary?.id ?? ""}
            returnObject
            insideAModal
            onValueChange={(v) => {
              const s = v as Subsidiary;
              if (s?.id) setPickedSubsidiary({ id: s.id, name: s.name });
            }}
          />
        </div>
      )}

      {/* Tipo y paquetería */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <ToggleGroup
            type="single"
            variant="outline"
            className="justify-start"
            value={values.kind}
            onValueChange={(v) => v && set("kind", v as ManualShipmentValues["kind"])}
          >
            <ToggleGroupItem value="shipment" className="gap-2"><Package className="h-4 w-4" /> Paquete</ToggleGroupItem>
            <ToggleGroupItem value="charge" className="gap-2"><Truck className="h-4 w-4" /> Carga (F2)</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="space-y-2">
          <Label>Paquetería</Label>
          <ToggleGroup
            type="single"
            variant="outline"
            className="justify-start"
            value={values.carrier}
            onValueChange={(v) => v && set("carrier", v as ManualShipmentValues["carrier"])}
          >
            <ToggleGroupItem value="fedex">FedEx</ToggleGroupItem>
            <ToggleGroupItem value="dhl">DHL</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Guía */}
      <div className={cn("grid gap-4", isDhl && "sm:grid-cols-2")}>
        <div className="space-y-2">
          <Label htmlFor="ms-tracking">{isDhl ? "Guía DHL (10 números) *" : "Número de guía *"}</Label>
          <Input
            id="ms-tracking"
            value={values.trackingNumber}
            onChange={(e) => set("trackingNumber", e.target.value)}
            placeholder={isDhl ? "1234567890" : "8772 2037 5691"}
            className="font-mono"
            autoFocus
          />
          <FieldError msg={visibleErrors.trackingNumber} />
        </div>
        {isDhl && (
          <div className="space-y-2">
            <Label htmlFor="ms-piece">ID de pieza (opcional)</Label>
            <Input
              id="ms-piece"
              value={values.dhlUniqueId}
              onChange={(e) => set("dhlUniqueId", e.target.value)}
              placeholder="JD0046…"
              className="font-mono"
            />
            <FieldError msg={visibleErrors.dhlUniqueId} />
          </div>
        )}
      </div>

      <Separator />

      {/* Destinatario */}
      <div className="space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><User className="h-4 w-4" /> Destinatario</h3>
        <div className="space-y-2">
          <Label htmlFor="ms-name">Nombre *</Label>
          <Input id="ms-name" value={values.recipientName} onChange={(e) => set("recipientName", e.target.value)} placeholder="Nombre del destinatario" />
          <FieldError msg={visibleErrors.recipientName} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ms-address">Dirección *</Label>
          <Input id="ms-address" value={values.recipientAddress} onChange={(e) => set("recipientAddress", e.target.value)} placeholder="Calle, número, colonia" />
          <FieldError msg={visibleErrors.recipientAddress} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="ms-city">Ciudad *</Label>
            <Input id="ms-city" value={values.recipientCity} onChange={(e) => set("recipientCity", e.target.value)} placeholder="Ciudad" />
            <FieldError msg={visibleErrors.recipientCity} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ms-zip">Código postal</Label>
            <Input id="ms-zip" inputMode="numeric" value={values.recipientZip} onChange={(e) => set("recipientZip", e.target.value)} placeholder="23454" />
            <FieldError msg={visibleErrors.recipientZip} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ms-phone">Teléfono</Label>
            <Input id="ms-phone" type="tel" value={values.recipientPhone} onChange={(e) => set("recipientPhone", e.target.value)} placeholder="624 184 7699" />
          </div>
        </div>
      </div>

      <Separator />

      {/* Entrega y extras */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ms-commit">Fecha y hora de entrega *</Label>
          <Input id="ms-commit" type="datetime-local" value={values.commitDateTime} onChange={(e) => set("commitDateTime", e.target.value)} />
          <FieldError msg={visibleErrors.commitDateTime} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ms-cons">Consolidado (opcional)</Label>
          <Input id="ms-cons" value={values.consNumber} onChange={(e) => set("consNumber", e.target.value)} placeholder="Número de consolidado" className="font-mono" />
        </div>
        {values.kind === "charge" && (
          <div className="space-y-2">
            <Label htmlFor="ms-exception">Código de excepción (opcional)</Label>
            <Input id="ms-exception" value={values.exceptionCode} onChange={(e) => set("exceptionCode", e.target.value)} />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="ms-hv" checked={values.isHighValue} onCheckedChange={(c) => set("isHighValue", c === true)} />
        <Label htmlFor="ms-hv" className="cursor-pointer font-normal">Paquete de alto valor</Label>
      </div>

      {serverError && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{serverError}</p>
      )}

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          <X className="mr-2 h-4 w-4" /> Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          {values.kind === "charge" ? "Registrar carga" : "Registrar paquete"}
        </Button>
      </div>
    </form>
  );
}
