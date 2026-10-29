"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import {
  AlertTriangle, ChevronRight, FileText, History, PencilLine, Plus, ScanLine, Search, Truck, Undo2, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FilterChip } from "@/components/ui/filter-chip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PmyLoader, PmySpinner } from "@/components/ui/pmy-loader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { UnderlineTabsList, UnderlineTabsTrigger } from "@/components/ui/underline-tabs";
import { useToast } from "@/components/ui/use-toast";
import { StatusTimelineDialog } from "@/components/consolidador/status-timeline-dialog";
import { apiError } from "@/components/maintenance/shared/confirm-action";
import { FedExPackageDispatchPDF } from "@/lib/services/package-dispatch/package-dispatch-pdf-generator";
import { regenerateAndSendDispatchEmail } from "@/lib/services/package-dispatch/regenerate-and-send";
import {
  addDispatchPackages, DispatchOverview, DispatchOverviewPackage, getDispatchOverview, getPackageDispatchById,
  removeDispatchPackages, validateTrackingsList,
} from "@/lib/services/package-dispatchs";
import {
  closureGroupOf, EMPTY_FILTERS, filterOverviewPackages, hasFilters, kindOptions, OverviewFilters, PackageKind,
  statusOptions, statusWithCode,
} from "@/lib/package-dispatch/overview-filters";
import { dispatchSortModeOf, sortForDispatch } from "@/lib/tracking/sort-by-zip";
import { normalizeScannedCode } from "@/lib/tracking/normalize-scan";
import { hasActionPermission } from "@/lib/access/permissions";
import { PackageInfo } from "@/lib/types";
import { cn, mapToPackageInfo } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { DispatchChangesList } from "./dispatch-changes-list";

/** Salidas que ya no se pueden editar (cerradas o canceladas). */
const CLOSED_DISPATCH = ["completada", "cancelada"];

interface Props {
  /** Solo se usa el id: el detalle completo se trae fresco del backend. */
  dispatch: { id: string };
  /** El diálogo que lo contiene ya trae su botón de cerrar. */
  onClose?: () => void;
}

const fmtDay = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-MX", { timeZone: "America/Hermosillo", weekday: "short", day: "2-digit", month: "short" }) : null;
/** routeDate es día de negocio guardado a medianoche UTC: se pinta por su día UTC. */
const fmtRouteDay = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-MX", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "short" }) : null;
const fmtTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("es-MX", { timeZone: "America/Hermosillo", hour: "2-digit", minute: "2-digit" }) : null;

const GROUP_TONE = {
  entregado: "border-emerald-200 bg-emerald-50 text-emerald-700",
  no_entregado: "border-red-200 bg-red-50 text-red-700",
  otro: "border-slate-200 bg-slate-50 text-slate-600",
} as const;

function StatusPill({ value }: { value: { status: string; code: string | null } | null }) {
  if (!value) return <span className="text-xs text-slate-400">Sin registro</span>;
  return (
    <Badge variant="outline" className={cn("whitespace-nowrap px-2 py-0 text-[11px] font-medium", GROUP_TONE[closureGroupOf(value.status)])}>
      {statusWithCode(value)}
    </Badge>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className={cn("rounded-md bg-slate-50 px-3 py-1.5", tone === "warn" && "bg-amber-50")}>
      <div className={cn("text-[11px] text-slate-500", tone === "warn" && "text-amber-700")}>{label}</div>
      <div className={cn("text-base font-semibold tabular-nums text-slate-900",
        tone === "ok" && "text-emerald-700", tone === "bad" && "text-red-700", tone === "warn" && "text-amber-700")}>{value}</div>
    </div>
  );
}

/** Motivo de rechazo en llano (el validador a veces responde con texto técnico). */
const plainReason = (reason?: string) => {
  const r = (reason ?? "").toLowerCase();
  if (!r) return "no se puede agregar";
  if (r.includes("no se encontraron datos") || r.includes("not found")) return "no existe en el sistema";
  if (r.includes("otra sucursal")) return "es de otra sucursal";
  return reason as string;
};

/** Separa lo pegado/escaneado en guías normalizadas (FedEx/DHL). */
const parseCodes = (raw: string) =>
  raw.split(/[\s,;]+/).map((t) => normalizeScannedCode(t)?.code ?? t.trim().toUpperCase()).filter(Boolean);

/**
 * "Ver salida": guías de la salida con su estatus de hoy y el estatus con que quedaron al
 * cerrar, filtros, y edición (agregar/quitar) dentro de la misma tabla para salidas abiertas.
 */
export default function PackageDispatchDetails({ dispatch: { id } }: Props) {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<DispatchOverview | null>(null);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [tab, setTab] = useState("paquetes");
  const [filters, setFilters] = useState<OverviewFilters>(EMPTY_FILTERS);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [timelineFor, setTimelineFor] = useState<DispatchOverviewPackage | null>(null);

  // Edición
  const [editing, setEditing] = useState(false);
  const [scan, setScan] = useState("");
  const [checking, setChecking] = useState(false);
  const [toAdd, setToAdd] = useState<PackageInfo[]>([]);
  const [rejected, setRejected] = useState<{ code: string; reason: string }[]>([]);
  const [toRemove, setToRemove] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    getDispatchOverview(id)
      .then((d) => alive && setData(d))
      .catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [id, reloadKey]);

  const closed = !!data && CLOSED_DISPATCH.includes(String(data.status ?? "").toLowerCase());
  const canEdit = !!data && !closed && hasActionPermission(user, "operaciones.salidas.editar");
  const hasClosure = !!data?.closure;

  const ordered = useMemo(
    () => (data ? sortForDispatch(data.packages, dispatchSortModeOf(data)) : []),
    [data],
  );
  const position = useMemo(() => new Map(ordered.map((p, i) => [p.key, i + 1])), [ordered]);
  const visible = useMemo(() => filterOverviewPackages(ordered, filters), [ordered, filters]);
  const setFilter = <K extends keyof OverviewFilters>(k: K, v: OverviewFilters[K]) => setFilters((f) => ({ ...f, [k]: v }));

  const resetEdit = useCallback(() => {
    setEditing(false); setScan(""); setToAdd([]); setRejected([]); setToRemove(new Set());
    setReason(""); setReasonError(""); setConfirmOpen(false);
  }, []);

  const pushCodes = async (raw: string) => {
    const codes = Array.from(new Set(parseCodes(raw)));
    if (!codes.length || !data?.subsidiary) return;
    setScan("");
    const inRoute = new Set(data.packages.map((p) => p.trackingNumber));
    const already = new Set(toAdd.map((p) => p.trackingNumber));
    const fresh = codes.filter((c) => !already.has(c));
    const dupes = fresh.filter((c) => inRoute.has(c)).map((code) => ({ code, reason: "ya está en esta salida" }));
    const toCheck = fresh.filter((c) => !inRoute.has(c));
    let valid: PackageInfo[] = [];
    let bad: { code: string; reason: string }[] = [];
    if (toCheck.length) {
      setChecking(true);
      try {
        const res = await validateTrackingsList(toCheck, data.subsidiary.id);
        valid = res.filter((r) => r.isValid);
        bad = res.filter((r) => !r.isValid).map((r) => ({ code: r.trackingNumber, reason: plainReason(r.reason) }));
      } catch (e) {
        toast({ title: "No se pudieron revisar las guías", description: apiError(e, "Intenta de nuevo"), variant: "destructive" });
      } finally {
        setChecking(false);
      }
    }
    setToAdd((prev) => [...prev, ...valid]);
    setRejected((prev) => [...prev.filter((r) => !codes.includes(r.code)), ...dupes, ...bad]);
  };

  const toggleRemove = (key: string) =>
    setToRemove((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  const changeCount = toAdd.length + toRemove.size;

  const save = async () => {
    if (!data) return;
    if (!reason.trim()) { setReasonError("Escribe el motivo del cambio."); return; }
    setSaving(true);
    try {
      const why = reason.trim();
      if (toAdd.length) await addDispatchPackages(data.id, toAdd.map((p) => p.trackingNumber), why);
      if (toRemove.size) {
        const ids = data.packages.filter((p) => toRemove.has(p.key)).map((p) => (p.shipmentId ?? p.chargeShipmentId) as string);
        await removeDispatchPackages(data.id, ids, why);
      }
      toast({ title: "Salida actualizada", description: `${toAdd.length} agregada(s), ${toRemove.size} quitada(s). Reenviando el correo…` });
      try {
        await regenerateAndSendDispatchEmail(data.id, { isResend: true });
      } catch {
        toast({ title: "La salida se guardó, pero no se reenvió el correo", description: "Reenvíalo desde Salidas a ruta.", variant: "destructive" });
      }
      resetEdit();
      setReloadKey((k) => k + 1);
    } catch (e) {
      toast({ title: "No se guardaron los cambios", description: apiError(e, "No se pudo editar la salida"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handlePdf = async () => {
    setPdfLoading(true);
    try {
      const d = await getPackageDispatchById(id);
      const blob = await pdf(
        <FedExPackageDispatchPDF
          key={Date.now()}
          drivers={d.drivers ?? []}
          routes={d.routes ?? []}
          vehicle={d.vehicle ?? { id: "", name: "N/A" }}
          packages={mapToPackageInfo(d.shipments, d.chargeShipments)}
          subsidiaryName={d.subsidiary?.name ?? "N/A"}
          trackingNumber={d.trackingNumber ?? "N/A"}
          sortMode={dispatchSortModeOf(d)}
        />,
      ).toBlob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Salida_${d.trackingNumber}_${new Date().toLocaleDateString("es-MX").replace(/\//g, "-")}.pdf`;
      link.click();
    } catch {
      toast({ title: "No se pudo generar el PDF", description: "Intenta de nuevo.", variant: "destructive" });
    } finally {
      setPdfLoading(false);
    }
  };

  if (failed) {
    return (
      <div className="p-8 text-center text-sm text-slate-500">
        No se pudo cargar la salida.
        <Button variant="link" size="sm" onClick={() => setReloadKey((k) => k + 1)}>Reintentar</Button>
      </div>
    );
  }
  if (!data) return <PmyLoader size="sm" className="min-h-[300px] w-full bg-white py-0" />;

  const c = data.counts;
  const info = [
    data.routes.map((r) => r.name).join(", "),
    data.drivers.map((d) => d.name).join(", "),
    data.vehicle?.name,
    data.routeDate ? fmtRouteDay(data.routeDate) : fmtDay(data.createdAt),
    `Salió ${fmtTime(data.createdAt)}${data.createdBy ? ` por ${data.createdBy}` : ""}`,
    data.closure && `Cerró ${fmtDay(data.closure.closedAt)} ${fmtTime(data.closure.closedAt)}${data.closure.closedBy ? ` por ${data.closure.closedBy}` : ""}`,
    data.closure?.actualKms && `Km ${data.closure.actualKms}`,
    data.is315 && "31.5",
  ].filter(Boolean);

  const carrierOptions = (["fedex", "dhl"] as const)
    .map((v) => ({ value: v, label: v === "dhl" ? "DHL" : "FedEx", count: data.packages.filter((p) => p.carrier === v).length }))
    .filter((o) => o.count > 0);

  return (
    <div className="flex w-full flex-col gap-3 bg-white">
      {/* Encabezado = barra de tareas */}
      <div className="flex flex-nowrap items-center gap-2 pr-8">
        <Truck className="h-5 w-5 shrink-0 text-slate-500" />
        <h2 className="whitespace-nowrap text-lg font-semibold text-slate-900">
          {editing ? "Editando salida" : "Salida"} <span className="font-mono font-normal text-slate-500">{data.folio ?? "N/A"}</span>
        </h2>
        <Badge variant="outline" className={cn("shrink-0", closed ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700")}>
          {closed ? (String(data.status).toLowerCase() === "cancelada" ? "Cancelada" : "Cerrada") : "En ruta"}
        </Badge>
        {data.subsidiary && <Badge variant="secondary" className="shrink-0 font-normal">{data.subsidiary.name}</Badge>}
        <div className="flex-1" />
        {editing ? (
          <>
            <Button size="sm" variant="ghost" onClick={resetEdit} disabled={saving}>Cancelar</Button>
            <Button size="sm" disabled={changeCount === 0 || saving} onClick={() => { setReasonError(""); setConfirmOpen(true); }}>
              Guardar {changeCount || ""} cambio{changeCount === 1 ? "" : "s"}
            </Button>
          </>
        ) : (
          <>
            {canEdit && (
              <Button size="sm" variant="outline" onClick={() => { setEditing(true); setTab("paquetes"); setFilters(EMPTY_FILTERS); }}>
                <PencilLine className="mr-1.5 h-4 w-4" /> Editar ruta
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handlePdf} disabled={pdfLoading}>
              {pdfLoading ? <PmySpinner className="mr-1.5 h-4 w-4" /> : <FileText className="mr-1.5 h-4 w-4" />} PDF
            </Button>
          </>
        )}
      </div>
      <p className="-mt-1 text-xs text-slate-500">{info.join(" · ")}</p>
      {data.closure && data.closure.groupFolios.length > 1 && (
        <p className="-mt-2 text-xs text-slate-500">Cerrada junto con: {data.closure.groupFolios.filter((f) => f !== data.folio).join(", ")}</p>
      )}

      {/* Contadores */}
      {!editing && (
        hasClosure ? (
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
            <Kpi label="Salieron" value={c.total} />
            <Kpi label="Entregados" value={c.entregados} tone="ok" />
            <Kpi label="No entregados" value={c.noEntregados} tone="bad" />
            <Kpi label="No VAN" value={c.noVan} />
            <Kpi label="Otros" value={c.otros} />
            <Kpi label="Cambiaron después" value={c.cambiaron} tone={c.cambiaron ? "warn" : undefined} />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
            <Kpi label="Salieron" value={c.total} />
            <Kpi label="Cargas" value={data.packages.filter((p) => p.isCharge).length} />
            <Kpi label="Cobros" value={data.packages.filter((p) => p.payment).length} />
            <Kpi label="DHL" value={data.packages.filter((p) => p.carrier === "dhl").length} />
          </div>
        )
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <UnderlineTabsList>
          <UnderlineTabsTrigger value="paquetes" size="sm" count={c.total} tone="sky">Paquetes</UnderlineTabsTrigger>
          {!editing && hasClosure && <UnderlineTabsTrigger value="recolecciones" size="sm" count={data.closure!.collections.length} tone="sky">Recolecciones</UnderlineTabsTrigger>}
          {!editing && data.noVan.length > 0 && <UnderlineTabsTrigger value="novan" size="sm" count={data.noVan.length} tone="sky">No VAN</UnderlineTabsTrigger>}
          {!editing && <UnderlineTabsTrigger value="cambios" size="sm" count={data.changesCount} tone="amber">Historial de cambios</UnderlineTabsTrigger>}
        </UnderlineTabsList>

        <TabsContent value="paquetes" className="mt-2 flex flex-col gap-2">
          {editing ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <ScanLine className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
                  <Input
                    autoFocus
                    className="h-8 pl-8 text-sm"
                    placeholder="Escanea o pega guías para agregar y presiona Enter"
                    value={scan}
                    disabled={checking || saving}
                    onChange={(e) => setScan(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void pushCodes(scan); } }}
                    onPaste={(e) => { e.preventDefault(); void pushCodes(e.clipboardData.getData("text")); }}
                  />
                </div>
                <Button size="sm" variant="outline" className="h-8" disabled={checking || saving || !scan.trim()} onClick={() => void pushCodes(scan)}>
                  {checking ? <PmySpinner className="mr-1 h-4 w-4" /> : <Plus className="mr-1 h-4 w-4" />} Agregar
                </Button>
              </div>
              {rejected.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {rejected.map((r) => (
                    <Badge key={r.code} variant="outline" className="gap-1 border-red-200 bg-red-50 font-normal text-red-700">
                      <span className="font-mono">{r.code}</span> · {r.reason}
                      <button type="button" aria-label={`Quitar aviso de ${r.code}`} onClick={() => setRejected((p) => p.filter((x) => x.code !== r.code))}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-500">Marca con la casilla las guías que se quitan. Regresan al estatus que tenían antes de salir.</p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
                <Input className="h-8 pl-8 text-sm" placeholder="Guía, destinatario o CP" value={filters.q} onChange={(e) => setFilter("q", e.target.value)} />
              </div>
              {hasClosure && (
                <FilterChip title="Al cerrar" options={statusOptions(ordered, "atClosure")} selected={filters.atClosure} onChange={(v) => setFilter("atClosure", v)} />
              )}
              <FilterChip title="Hoy" options={statusOptions(ordered, "current")} selected={filters.current} onChange={(v) => setFilter("current", v)} />
              {carrierOptions.length > 1 && (
                <FilterChip title="Paquetería" options={carrierOptions} selected={filters.carrier} onChange={(v) => setFilter("carrier", v)} />
              )}
              <FilterChip title="Tipo" options={kindOptions(ordered)} selected={filters.kind} onChange={(v) => setFilter("kind", v as PackageKind[])} />
              {hasClosure && c.cambiaron > 0 && (
                <Button size="sm" variant={filters.onlyChanged ? "default" : "outline"}
                  className={cn("h-8 text-xs", !filters.onlyChanged && "border-dashed border-amber-300 text-amber-700")}
                  onClick={() => setFilter("onlyChanged", !filters.onlyChanged)}>
                  <AlertTriangle className="mr-1 h-3.5 w-3.5" /> Solo los que cambiaron
                </Button>
              )}
              {hasFilters(filters) && (
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setFilters(EMPTY_FILTERS)}>
                  Limpiar <X className="ml-1 h-3.5 w-3.5" />
                </Button>
              )}
              <span className="ml-auto text-xs tabular-nums text-slate-500">{visible.length} de {ordered.length}</span>
            </div>
          )}

          <div className="rounded-md border">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {editing && <TableHead className="h-8 w-8 px-2" />}
                  <TableHead className="h-8 w-10 px-2">#</TableHead>
                  <TableHead className="h-8 w-36 px-2">Guía</TableHead>
                  <TableHead className="h-8 px-2">Destinatario · CP</TableHead>
                  {!editing && hasClosure && <TableHead className="h-8 w-40 px-2">Al cerrar</TableHead>}
                  <TableHead className="h-8 w-40 px-2">{editing ? "Cambio" : "Hoy"}</TableHead>
                  {!editing && <TableHead className="h-8 w-8 px-2" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {editing && toAdd.map((p) => (
                  <TableRow key={`add-${p.trackingNumber}`} className="bg-emerald-50/70 hover:bg-emerald-50">
                    <TableCell className="px-2 py-1.5" />
                    <TableCell className="px-2 py-1.5 text-slate-400">+</TableCell>
                    <TableCell className="px-2 py-1.5 font-mono">{p.trackingNumber}</TableCell>
                    <TableCell className="max-w-0 truncate px-2 py-1.5">{[p.recipientName, p.recipientZip].filter(Boolean).join(" · ") || "Sin datos"}</TableCell>
                    <TableCell className="px-2 py-1.5">
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="border-emerald-200 bg-emerald-100 px-2 py-0 text-[11px] text-emerald-800">Se agrega</Badge>
                        <Button size="icon" variant="ghost" className="h-6 w-6" aria-label="No agregar" onClick={() => setToAdd((l) => l.filter((x) => x.trackingNumber !== p.trackingNumber))}>
                          <Undo2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(editing ? ordered : visible).map((p) => {
                  const removing = editing && toRemove.has(p.key);
                  return (
                    <TableRow key={p.key} className={cn(
                      !editing && p.changedAfterClosure && "bg-amber-50/70 hover:bg-amber-50",
                      removing && "bg-red-50/70 hover:bg-red-50",
                    )}>
                      {editing && (
                        <TableCell className="px-2 py-1.5">
                          <Checkbox checked={removing} onCheckedChange={() => toggleRemove(p.key)} aria-label={`Quitar ${p.trackingNumber}`} />
                        </TableCell>
                      )}
                      <TableCell className="px-2 py-1.5 tabular-nums text-slate-400">{position.get(p.key)}</TableCell>
                      <TableCell className="px-2 py-1.5">
                        <span className={cn("font-mono", removing && "line-through")}>{p.trackingNumber}</span>
                        {p.carrier === "dhl" && <span className="ml-1 text-[10px] font-semibold text-amber-600">DHL</span>}
                      </TableCell>
                      <TableCell className="max-w-0 px-2 py-1.5">
                        <div className="flex items-center gap-1">
                          <span className="truncate" title={p.recipientAddress ?? ""}>
                            {[p.recipientName, p.recipientZip].filter(Boolean).join(" · ") || "Sin datos"}
                          </span>
                          {p.isCharge && <Badge variant="outline" className="shrink-0 border-sky-200 px-1.5 py-0 text-[10px] text-sky-700">Carga</Badge>}
                          {p.payment && <Badge variant="outline" className="shrink-0 border-amber-200 px-1.5 py-0 text-[10px] text-amber-700">{p.payment.type} ${p.payment.amount}</Badge>}
                          {p.isHighValue && <Badge variant="outline" className="shrink-0 border-violet-200 px-1.5 py-0 text-[10px] text-violet-700">Valor</Badge>}
                        </div>
                      </TableCell>
                      {!editing && hasClosure && (
                        <TableCell className="px-2 py-1.5">
                          <div className="flex items-center gap-1">
                            <StatusPill value={p.atClosure} />
                            {p.atClosure?.source === "corregido" && <span className="text-[10px] text-violet-600">corregido</span>}
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="px-2 py-1.5">
                        {removing
                          ? <Badge variant="outline" className="border-red-200 bg-red-100 px-2 py-0 text-[11px] text-red-700">Se quita</Badge>
                          : <StatusPill value={p.current} />}
                      </TableCell>
                      {!editing && (
                        <TableCell className="px-1 py-1">
                          <Button size="icon" variant="ghost" className="h-6 w-6" aria-label={`Historial de ${p.trackingNumber}`} onClick={() => setTimelineFor(p)}>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
                {!editing && visible.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-sm text-slate-500">
                      {ordered.length ? "Ninguna guía coincide con los filtros." : "Esta salida no tiene guías."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {!editing && data.closure?.reconstructed && (
            <p className="flex items-center gap-1 text-[11px] text-slate-500">
              <History className="h-3.5 w-3.5" />
              Esta ruta se cerró antes de que el sistema guardara la foto del cierre: “Al cerrar” se armó con el historial de cada guía.
            </p>
          )}
        </TabsContent>

        <TabsContent value="recolecciones" className="mt-2">
          {data.closure?.collections.length ? (
            <div className="flex flex-wrap gap-1.5">
              {data.closure.collections.map((t) => <Badge key={t} variant="outline" className="font-mono font-normal">{t}</Badge>)}
            </div>
          ) : <p className="py-6 text-center text-sm text-slate-500">El cierre no registró recolecciones.</p>}
        </TabsContent>

        <TabsContent value="novan" className="mt-2">
          <div className="flex flex-wrap gap-1.5">
            {data.noVan.map((t) => <Badge key={t} variant="outline" className="font-mono font-normal">{t}</Badge>)}
          </div>
        </TabsContent>

        <TabsContent value="cambios" className="mt-2">
          <DispatchChangesList dispatchId={data.id} refreshKey={reloadKey} />
        </TabsContent>
      </Tabs>

      <StatusTimelineDialog
        open={!!timelineFor}
        onOpenChange={(o) => !o && setTimelineFor(null)}
        tracking={timelineFor?.trackingNumber ?? null}
        record={timelineFor ? { id: (timelineFor.shipmentId ?? timelineFor.chargeShipmentId) as string, isCharge: timelineFor.isCharge } : null}
      />

      <Dialog open={confirmOpen} onOpenChange={(o) => !saving && setConfirmOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Guardar cambios de la salida</DialogTitle>
            <DialogDescription>
              {toAdd.length} se agrega{toAdd.length === 1 ? "" : "n"}, {toRemove.size} se quita{toRemove.size === 1 ? "" : "n"}.
              Queda en el historial con tu nombre y el motivo, y se reenvía el correo de la salida.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1">
            <Label htmlFor="dispatch-edit-reason" className="text-xs">Motivo <span className="text-red-600">*</span></Label>
            <Textarea
              id="dispatch-edit-reason"
              rows={3}
              maxLength={500}
              placeholder="Llegó tarde a bodega / se fue en otra ruta"
              value={reason}
              disabled={saving}
              onChange={(e) => { setReason(e.target.value); setReasonError(""); }}
              className={cn(reasonError && "border-red-500")}
            />
            {reasonError && <p className="text-xs text-red-600">{reasonError}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" disabled={saving} onClick={() => setConfirmOpen(false)}>Volver</Button>
            <Button size="sm" disabled={saving} onClick={save}>
              {saving && <PmySpinner className="mr-1.5 h-4 w-4" />} Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
