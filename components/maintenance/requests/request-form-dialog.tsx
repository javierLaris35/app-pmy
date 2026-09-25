"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Package, Plus, ShoppingCart, Sparkles, Trash2, Truck, Wrench, Hammer } from "lucide-react";
import { toast } from "@/lib/toast";
import { SucursalSelector } from "@/components/sucursal-selector";
import { useVehiclesBySubsidiary } from "@/hooks/services/vehicles/use-vehicles";
import { useUnits, useVehicleSpec } from "@/hooks/services/maintenance/use-maintenance";
import { createRequest, updateRequest } from "@/lib/services/maintenance";
import {
  formatKms, MaintenanceRequest, PRIORITY_LABEL, REQUEST_TYPE_LABEL, RequestPriority, RequestType, TYPES_REQUIRING_VEHICLE,
} from "@/lib/types/maintenance";
import { Subsidiary } from "@/lib/types";
import { apiError } from "../shared/confirm-action";
import { FieldError, invalidClass } from "../shared/field-error";
import { ProductPicker } from "./product-picker";

const NONE = "__none__";
const TYPE_ICON: Record<RequestType, React.ComponentType<{ className?: string }>> = {
  mantenimiento: Wrench, servicio: Truck, reparacion: Hammer, compra: ShoppingCart,
};

interface Row {
  key: string;
  id?: string;
  productId: string | null;
  categoryId: string | null;
  description: string;
  quantity: number;
  unitId: string | null;
  notes: string;
  fromCatalog?: string | null;
}

const newRow = (): Row => ({ key: crypto.randomUUID(), productId: null, categoryId: null, description: "", quantity: 1, unitId: null, notes: "" });

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request?: MaintenanceRequest | null;
  defaultSubsidiaryId?: string;
  defaultVehicleId?: string;
  onSaved: (r: MaintenanceRequest) => void;
}

/** Nueva solicitud / editar: tipo, sucursal, unidad (según el tipo), renglones y sugerencias de la ficha de la unidad. */
export function RequestFormDialog({ open, onOpenChange, request, defaultSubsidiaryId, defaultVehicleId, onSaved }: Props) {
  const [type, setType] = useState<RequestType>("mantenimiento");
  const [subsidiaryId, setSubsidiaryId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [kms, setKms] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<RequestPriority>("media");
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const { vehicles } = useVehiclesBySubsidiary(subsidiaryId);
  const { units } = useUnits();
  const { spec } = useVehicleSpec(vehicleId || null);

  useEffect(() => {
    if (!open) return;
    setType(request?.type ?? (defaultVehicleId ? "mantenimiento" : "mantenimiento"));
    setSubsidiaryId(request?.subsidiary?.id ?? defaultSubsidiaryId ?? "");
    setVehicleId(request?.vehicleId ?? defaultVehicleId ?? "");
    setKms(request?.kmsAtRequest ? String(request.kmsAtRequest) : "");
    setDescription(request?.description ?? "");
    setPriority(request?.priority ?? "media");
    setRows(request?.items?.length
      ? request.items.map((i) => ({
          key: crypto.randomUUID(), id: i.id, productId: i.productId ?? null, categoryId: i.categoryId ?? null, description: i.description,
          quantity: Number(i.quantity), unitId: i.unitId ?? null, notes: i.notes ?? "", fromCatalog: i.product?.name ?? null,
        }))
      : [newRow()]);
    setTried(false);
  }, [open, request, defaultSubsidiaryId, defaultVehicleId]);

  const needsVehicle = TYPES_REQUIRING_VEHICLE.includes(type);
  const selected = vehicles.find((v) => v.id === vehicleId);
  const patch = (key: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  /** Reemplaza el primer renglón vacío o agrega uno nuevo. */
  const addRow = (r: Omit<Row, "key">) => setRows((rs) => {
    const emptyIdx = rs.findIndex((x) => !x.description.trim());
    const row = { ...r, key: crypto.randomUUID() };
    return emptyIdx >= 0 ? rs.map((x, i) => (i === emptyIdx ? row : x)) : [...rs, row];
  });

  const suggestions = useMemo(
    () => spec.filter((s) => !rows.some((r) => (s.productId && r.productId === s.productId) || (!s.productId && r.categoryId === s.categoryId))),
    [spec, rows],
  );
  const addSuggestion = (s: (typeof spec)[number]) => addRow({
    productId: s.productId ?? null, categoryId: s.categoryId, description: s.product?.name ?? s.category?.name ?? "",
    quantity: Number(s.quantity), unitId: s.unitId ?? s.product?.unitId ?? null, notes: s.notes ?? "", fromCatalog: s.product?.name ?? null,
  });

  const allErrors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!subsidiaryId) e.subsidiaryId = "Elige la sucursal.";
    if (needsVehicle && !vehicleId) e.vehicleId = `Para ${REQUEST_TYPE_LABEL[type].toLowerCase()} elige la unidad.`;
    if (kms !== "" && (Number(kms) < 0 || Number(kms) > 1_000_000)) e.kms = "Km no válido.";
    if (description.trim().length < 3) e.description = "Describe para qué se necesita.";
    const filled = rows.filter((r) => r.description.trim());
    if (!filled.length) e.rows = "Agrega al menos un renglón: qué se necesita y cuánto.";
    rows.forEach((r, i) => {
      if (!r.description.trim() && rows.length > 1) e[`rows.${i}.description`] = "Describe el renglón o quítalo.";
      if (r.description.trim() && !(Number(r.quantity) > 0)) e[`rows.${i}.quantity`] = "Cantidad mayor a 0.";
    });
    return e;
  }, [subsidiaryId, needsVehicle, vehicleId, type, kms, description, rows]);
  const errors = tried ? allErrors : {};

  const save = async () => {
    setTried(true);
    if (Object.keys(allErrors).length) {
      toast.error(`Revisa los campos marcados: ${Object.values(allErrors)[0]}`);
      return;
    }
    setSaving(true);
    const items = rows.filter((r) => r.description.trim()).map((r) => ({
      ...(r.id ? { id: r.id } : {}),
      productId: r.productId, categoryId: r.categoryId, description: r.description.trim(), quantity: Number(r.quantity),
      unitId: r.unitId, notes: r.notes.trim() || null,
    }));
    try {
      const body = {
        type, vehicleId: needsVehicle || vehicleId ? vehicleId || null : null, kmsAtRequest: kms === "" ? null : Number(kms),
        description: description.trim(), priority, items,
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
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{request ? `Editar ${request.folio}` : "Nueva solicitud"}</DialogTitle>
          <DialogDescription>Le llega a Compras para revisarla y cotizar. Te avisamos cuando avance.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[72vh] pr-3">
          <div className="grid gap-5 py-2">
            <div className="grid gap-1.5">
              <Label>¿Qué necesitas?</Label>
              <ToggleGroup type="single" value={type} onValueChange={(v) => v && setType(v as RequestType)} variant="outline" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(Object.keys(REQUEST_TYPE_LABEL) as RequestType[]).map((t) => {
                  const Icon = TYPE_ICON[t];
                  return (
                    <ToggleGroupItem key={t} value={t} className="h-auto justify-start gap-2 px-3 py-2 text-left data-[state=on]:border-primary data-[state=on]:bg-primary/5">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="text-sm">{REQUEST_TYPE_LABEL[t]}</span>
                    </ToggleGroupItem>
                  );
                })}
              </ToggleGroup>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-1.5">
                <Label>Sucursal</Label>
                {request ? (
                  <Input value={request.subsidiary?.name ?? ""} disabled />
                ) : (
                  <SucursalSelector
                    insideAModal
                    value={subsidiaryId}
                    onValueChange={(val) => { setSubsidiaryId((typeof val === "string" ? val : (val as Subsidiary).id) ?? ""); setVehicleId(""); }}
                  />
                )}
                <FieldError message={errors.subsidiaryId} />
              </div>
              <div className="grid gap-1.5">
                <Label>Unidad {needsVehicle ? "" : <span className="font-normal text-muted-foreground">(opcional)</span>}</Label>
                <Select value={vehicleId || NONE} onValueChange={(v) => setVehicleId(v === NONE ? "" : v)}>
                  <SelectTrigger className={invalidClass(errors.vehicleId)}><SelectValue placeholder="Elige la unidad" /></SelectTrigger>
                  <SelectContent>
                    {!needsVehicle && <SelectItem value={NONE}>No es para una unidad</SelectItem>}
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id!}>{[v.name || v.code, v.plateNumber].filter(Boolean).join(" · ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.vehicleId} />
                {selected && <p className="text-xs text-muted-foreground">Km registrado: {formatKms(selected.kms)}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Km actuales</Label>
                  <Input type="number" min={0} value={kms} onChange={(e) => setKms(e.target.value)} placeholder="Opcional" disabled={!vehicleId} className={invalidClass(errors.kms)} />
                  <FieldError message={errors.kms} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Prioridad</Label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as RequestPriority)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PRIORITY_LABEL) as RequestPriority[]).map((p) => <SelectItem key={p} value={p}>{PRIORITY_LABEL[p]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>¿Para qué se necesita?</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                placeholder="Ej. Ruido en llanta delantera derecha; toca servicio de 10,000 km" className={invalidClass(errors.description)} />
              <FieldError message={errors.description} />
            </div>

            {vehicleId && suggestions.length > 0 && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-sm font-medium"><Sparkles className="h-4 w-4 text-primary" /> Lo que lleva esta unidad</p>
                  <Button type="button" size="sm" variant="ghost" onClick={() => suggestions.forEach(addSuggestion)}>Agregar todo</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button key={s.id} type="button" onClick={() => addSuggestion(s)}
                      className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs hover:border-primary hover:text-primary">
                      <Plus className="h-3 w-3" />
                      {s.product?.name ?? s.category?.name} · {Number(s.quantity)} {s.unit?.abbreviation ?? s.unit?.name ?? ""}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-lg border">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Renglones</p>
                  <p className="text-xs text-muted-foreground">Elige del catálogo o escríbelo a mano.</p>
                </div>
                <div className="flex gap-2">
                  <ProductPicker label="Del catálogo" onPick={(p) => addRow({
                    productId: p.id, categoryId: p.categoryId ?? null, description: p.name, quantity: 1, unitId: p.unitId ?? null, notes: "", fromCatalog: p.name,
                  })} />
                  <Button type="button" size="sm" variant="outline" onClick={() => setRows((rs) => [...rs, newRow()])}>
                    <Plus className="mr-1.5 h-4 w-4" /> Renglón libre
                  </Button>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Qué se necesita</TableHead>
                    <TableHead className="w-24">Cantidad</TableHead>
                    <TableHead className="w-40">Unidad</TableHead>
                    <TableHead className="w-[26%]">Notas</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={r.key} className="align-top">
                      <TableCell>
                        <Input value={r.description} placeholder="Ej. Balatas delanteras"
                          onChange={(e) => patch(r.key, { description: e.target.value, ...(r.fromCatalog && e.target.value !== r.fromCatalog ? { productId: null, fromCatalog: null } : {}) })}
                          className={invalidClass(errors[`rows.${i}.description`])} />
                        {r.productId && <Badge variant="outline" className="mt-1 gap-1 text-[10px]"><Package className="h-3 w-3" /> Del catálogo</Badge>}
                        <FieldError message={errors[`rows.${i}.description`]} className="mt-1" />
                      </TableCell>
                      <TableCell>
                        <Input type="number" min={0.01} step="0.01" value={r.quantity} onChange={(e) => patch(r.key, { quantity: Number(e.target.value) })}
                          className={invalidClass(errors[`rows.${i}.quantity`])} />
                        <FieldError message={errors[`rows.${i}.quantity`]} className="mt-1" />
                      </TableCell>
                      <TableCell>
                        <Select value={r.unitId ?? NONE} onValueChange={(v) => patch(r.key, { unitId: v === NONE ? null : v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>—</SelectItem>
                            {units.filter((u) => u.active).map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input value={r.notes} onChange={(e) => patch(r.key, { notes: e.target.value })} placeholder="Marca, medida, color…" />
                      </TableCell>
                      <TableCell>
                        <Button type="button" size="icon" variant="ghost" className="text-destructive" disabled={rows.length === 1}
                          onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} aria-label="Quitar renglón">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {errors.rows && <FieldError message={errors.rows} className="px-3 pb-3" />}
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {request ? "Guardar" : "Enviar a Compras"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
