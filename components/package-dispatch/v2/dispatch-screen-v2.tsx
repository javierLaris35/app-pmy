"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  AlertTriangle, ArrowLeft, Check, ClipboardCopy, Download, Eye, FileText, History, Loader2, Package, RotateCcw, Scan, Send, Trash2, X,
} from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { OperationHeader } from "@/components/shared/operation-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PmySpinner } from "@/components/ui/pmy-loader";
import { useToast } from "@/components/ui/use-toast";
import { RepartidorSelector } from "@/components/selectors/repartidor-selector";
import { RutaSelector } from "@/components/selectors/ruta-selector";
import { UnidadSelector } from "@/components/selectors/unidad-selector";
import { ScanInput, ScanInputHandle } from "@/components/scanner/scan-input";
import { clearScanBuffer } from "@/components/scanner/use-scan-buffer";
import { PackageListItem, daysUntilCommit } from "@/components/shared/package-list-item";
import { PackageFilters } from "@/components/shared/package-filters";
import { TransferPackageDialog } from "@/components/shared/transfer-package-dialog";
import { initScannerFeedback } from "@/lib/scanner-feedback";
import { useSubsidiaries } from "@/hooks/services/subsidiaries/use-subsidiaries";
import { useAuthStore } from "@/store/auth.store";
import { DispatchSortMode, Driver, PackageInfo, Vehicles } from "@/lib/types";
import { dispatchCarrierSections, sortForDispatch, subsidiaryDispatchSortMode } from "@/lib/tracking/sort-by-zip";
import { getDriversBySucursalId } from "@/lib/services/drivers";
import { getVehiclesBySucursalId } from "@/lib/services/vehicles";
import { getRoutesBySucursalId } from "@/lib/services/routes";
import { axiosConfig } from "@/lib/axios-config";
import { getRouteSuggestions, SuggestionsResult } from "@/lib/services/route-suggestions";
import { cn } from "@/lib/utils";
import { DispatchSuggestedPanel } from "../dispatch-suggested-panel";
import { pieceId, StepKey, useDispatchSession } from "./use-dispatch-session";

const SCAN_KEY = "scan:dispatch";

const SORT_OPTIONS: { mode: DispatchSortMode; label: string }[] = [
  { mode: "carrier_cp", label: "Paquetería + CP" },
  { mode: "cp", label: "CP + dirección" },
  { mode: "scan", label: "Escaneo" },
];

const money = (n: number) => `$${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;

/** Fila de la lista memorizada: escanear una guía nueva no vuelve a dibujar las 300 anteriores. */
const Row = memo(function Row(props: { pkg: PackageInfo; index: number; onRemove: (id: string) => void; onTransfer?: (p: PackageInfo) => void; busy: boolean }) {
  return (
    <div style={{ contentVisibility: "auto", containIntrinsicSize: "auto 72px" }}>
      <PackageListItem pkg={props.pkg} index={props.index} onRemove={props.onRemove} onTransfer={props.onTransfer} isLoading={props.busy} />
    </div>
  );
});

/** Paquetes de las rutas elegidas que vencen hoy (o ya vencieron) y siguen en bodega. */
function dueTodayInRoutes(data: SuggestionsResult | undefined, routeIds: Set<string>, inDispatch: Set<string>) {
  if (!data || !routeIds.size) return 0;
  const seen = new Set<string>();
  for (const r of data.routes) {
    for (const p of r.packages) {
      if (seen.has(p.pieceKey) || inDispatch.has(p.scanCode)) continue;
      if (p.bucket !== "vencido" && p.bucket !== "hoy") continue;
      if (routeIds.has(r.routeId) || p.sharedRouteIds.some((id) => routeIds.has(id))) seen.add(p.pieceKey);
    }
  }
  return seen.size;
}

interface Props {
  subsidiaryId: string | null;
  subsidiaryName: string | null;
  initialRouteId?: string | null;
  classicHref: string;
  onExit: () => void;
}

export function DispatchScreenV2({ subsidiaryId, subsidiaryName, initialRouteId, classicHref, onExit }: Props) {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const canTransfer = ["subadmin", "admin", "superadmin"].includes((user?.role as string) || "");
  const { subsidiaries } = useSubsidiaries();
  const configSortMode = useMemo<DispatchSortMode>(
    () => subsidiaryDispatchSortMode((subsidiaries as any[] | undefined)?.find((s) => s.id === subsidiaryId)),
    [subsidiaries, subsidiaryId],
  );
  const configListMode = !!(subsidiaries as any[] | undefined)?.find((s) => s.id === subsidiaryId)?.validateDispatchByList;
  const [sortOverride, setSortOverride] = useState<DispatchSortMode | null>(null);
  const sortMode = sortOverride ?? configSortMode;
  const [listOverride, setListOverride] = useState<boolean | null>(null);
  const isListMode = listOverride ?? configListMode;

  const s = useDispatchSession(subsidiaryId, subsidiaryName, sortMode);
  const scanRef = useRef<ScanInputHandle>(null);
  const [attempted, setAttempted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [tab, setTab] = useState<"ok" | "review">("ok");
  const [transferPkg, setTransferPkg] = useState<PackageInfo | null>(null);
  const [previewing, setPreviewing] = useState(false);

  // Filtros de la lista.
  const [search, setSearch] = useState("");
  const [carrier, setCarrier] = useState("all");
  const [onlyToday, setOnlyToday] = useState(false);
  const [onlyPayment, setOnlyPayment] = useState(false);
  const [priority, setPriority] = useState("all");
  const [type, setType] = useState("all");

  useEffect(() => {
    initScannerFeedback();
  }, []);

  // Catálogos de la sucursal (para aplicar sugerencias de repartidor/unidad).
  const { data: driverList } = useSWR(subsidiaryId ? ["drivers", subsidiaryId] : null, () => getDriversBySucursalId(subsidiaryId!), { revalidateOnFocus: false });
  const { data: vehicleList } = useSWR(subsidiaryId ? ["vehicles", subsidiaryId] : null, () => getVehiclesBySucursalId(subsidiaryId!), { revalidateOnFocus: false });
  const { data: suggestions } = useSWR(subsidiaryId ? ["route-suggestions", subsidiaryId] : null, () => getRouteSuggestions(subsidiaryId!), { revalidateOnFocus: false });

  // Ruta que viene de "Crear salida" en las sugerencias (una sola vez).
  const initialApplied = useRef(false);
  useEffect(() => {
    if (!initialRouteId || !subsidiaryId || initialApplied.current) return;
    initialApplied.current = true;
    if (s.routes.some((r) => r.id === initialRouteId)) return;
    getRoutesBySucursalId(subsidiaryId)
      .then((all) => {
        const r = all.find((x) => x.id === initialRouteId);
        if (r) s.setRoutes((prev) => (prev.some((p) => p.id === r.id) ? prev : [...prev, r]));
      })
      .catch(() => {});
  }, [initialRouteId, subsidiaryId, s]);

  // Sugerencia de repartidor y unidad según las últimas salidas de las rutas elegidas.
  const routeKey = s.routes.map((r) => r.id).sort().join(",");
  const { data: defaults } = useSWR(
    subsidiaryId && routeKey ? ["dispatch-defaults", subsidiaryId, routeKey] : null,
    async () => (await axiosConfig.get<{ driverIds: string[]; vehicleId: string | null; driverHits: number; sample: number }>("/route-suggestions/dispatch-defaults", { params: { subsidiaryId, routeIds: routeKey } })).data,
    { revalidateOnFocus: false },
  );
  const [suggested, setSuggested] = useState<{ driverId?: string; vehicleId?: string }>({});
  useEffect(() => {
    if (!defaults) return;
    const next: { driverId?: string; vehicleId?: string } = {};
    if (!s.drivers.length && defaults.driverIds[0] && driverList) {
      const d = driverList.find((x) => x.id === defaults.driverIds[0]);
      if (d) {
        s.setDrivers([d as Driver]);
        next.driverId = d.id;
      }
    }
    if (!s.vehicle?.id && defaults.vehicleId && vehicleList) {
      const v = vehicleList.find((x) => x.id === defaults.vehicleId);
      if (v) {
        s.setVehicle(v as Vehicles);
        next.vehicleId = v.id;
      }
    }
    if (next.driverId || next.vehicleId) setSuggested((prev) => ({ ...prev, ...next }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaults, driverList, vehicleList]);

  // Último kilometraje de la unidad (referencia; no bloquea porque se captura muy distinto).
  const { data: kmInfo } = useSWR(
    s.vehicle?.id ? ["vehicle-kms", s.vehicle.id] : null,
    async () => (await axiosConfig.get<{ lastKms: number | null }>("/route-suggestions/vehicle-kms", { params: { vehicleId: s.vehicle!.id } })).data,
    { revalidateOnFocus: false },
  );
  const kmsNumber = Number(String(s.kms).replace(/[^\d]/g, ""));
  const kmsLower = !!kmInfo?.lastKms && kmsNumber > 0 && kmsNumber < kmInfo.lastKms;

  const missingBy = (f: string) => s.missing.find((m) => m.field === f);
  const showErr = (f: string) => (attempted ? missingBy(f)?.message : undefined);

  // Lista filtrada y ordenada como el PDF.
  const inDispatch = useMemo(() => new Set(s.packages.map(pieceId)), [s.packages]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = s.validPackages.filter((p) => {
      if (q && ![p.trackingNumber, p.dhlUniqueId ?? "", p.recipientName ?? "", p.recipientAddress ?? "", p.recipientZip ?? ""].some((v) => v.toLowerCase().includes(q))) return false;
      if (carrier !== "all" && p.shipmentType !== carrier) return false;
      if (onlyToday && daysUntilCommit(p.commitDateTime) !== 0) return false;
      if (onlyPayment && !p.payment) return false;
      if (priority !== "all" && p.priority !== priority) return false;
      if (type === "special" && !(p.isCharge || p.isHighValue || p.payment)) return false;
      if (type === "normal" && (p.isCharge || p.isHighValue || p.payment)) return false;
      return true;
    });
    return sortForDispatch(list, sortMode);
  }, [s.validPackages, search, carrier, onlyToday, onlyPayment, priority, type, sortMode]);
  const sections = useMemo(() => dispatchCarrierSections(filtered, sortMode), [filtered, sortMode]);
  const activeFilters = (carrier !== "all" ? 1 : 0) + (onlyToday ? 1 : 0) + (onlyPayment ? 1 : 0) + (priority !== "all" ? 1 : 0) + (type !== "all" ? 1 : 0);

  const routeIdSet = useMemo(() => new Set(s.routes.map((r) => r.id)), [s.routes]);
  const dueLeft = useMemo(() => dueTodayInRoutes(suggestions, routeIdSet, inDispatch), [suggestions, routeIdSet, inDispatch]);

  const remove = useCallback((id: string) => s.removePackage(id), [s]);

  const focusScanner = () => setTimeout(() => scanRef.current?.focus(), 50);

  const doClear = () => {
    s.clearAll();
    scanRef.current?.clear();
    clearScanBuffer(SCAN_KEY);
    setSuggested({});
    setAttempted(false);
    setClearOpen(false);
    toast({ title: "Salida limpia", description: "Se borró lo capturado." });
    focusScanner();
  };

  const askProcess = () => {
    setAttempted(true);
    if (s.missing.length) {
      toast({ title: "Falta información", description: `Completa: ${s.missing.map((m) => m.label).join(", ")}.`, variant: "destructive" });
      return;
    }
    setConfirmOpen(true);
  };

  const doProcess = async () => {
    setConfirmOpen(false);
    await s.processDispatch();
    scanRef.current?.clear();
    clearScanBuffer(SCAN_KEY);
  };

  const preview = async () => {
    setPreviewing(true);
    try {
      await s.previewPdf();
    } catch {
      toast({ title: "No se pudo generar la vista previa", variant: "destructive" });
    } finally {
      setPreviewing(false);
    }
  };

  const validateList = async () => {
    const r = await s.validateRaw();
    scanRef.current?.clear();
    toast({
      title: `Se agregaron ${r.added} paquetes`,
      description: r.invalid + r.malformed > 0 ? `${r.invalid + r.malformed} no pasaron la validación; revísalos en "Por revisar".` : undefined,
    });
    focusScanner();
  };

  const addSuggested = async (codes: string[]) => {
    const r = await s.addSuggested(codes);
    toast({ title: `Se agregaron ${r.added} paquetes sugeridos`, description: r.invalid ? `${r.invalid} no pasaron la validación; revísalos en "Por revisar".` : undefined });
    focusScanner();
  };

  // La barra inferior va fija a la ventana pero alineada con el área de contenido (sin tapar el menú).
  const [mainBox, setMainBox] = useState<{ left: number; width: number | string }>({ left: 0, width: "100%" });
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    const update = () => {
      const r = main.getBoundingClientRect();
      setMainBox({ left: r.left, width: r.width });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(main);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const p = s.process;
  const finished = !!p.dispatch && (p.steps.upload === "done" || !!p.error);

  // ---------- Pantalla final: Salida lista ----------
  if (p.open && finished && p.dispatch && p.snapshot) {
    return (
      <AppLayout>
        <DispatchDone
          process={p}
          dueLeft={dueTodayInRoutes(suggestions, new Set(p.snapshot.routes.map((r) => r.id)), new Set(p.snapshot.packages.map(pieceId)))}
          onRetry={s.retryFiles}
          onNew={() => {
            s.resetProcess();
            focusScanner();
          }}
          onExit={() => {
            s.resetProcess();
            onExit();
          }}
        />
      </AppLayout>
    );
  }

  const last = s.lastScans[0];
  const lastDays = last?.pkg.isValid ? daysUntilCommit(last.pkg.commitDateTime) : null;

  return (
    <AppLayout>
      <div className="flex flex-col gap-3 pb-16">
        <OperationHeader
          icon={Send}
          title="Nueva salida a ruta"
          description={s.isOnline ? "En línea · lo capturado se guarda solo" : "Sin conexión · lo escaneado se valida al volver el internet"}
          subsidiaryName={subsidiaryName ?? undefined}
          isOffline={!s.isOnline}
          actions={
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={onExit} className="gap-1.5 whitespace-nowrap">
                <ArrowLeft className="h-4 w-4" /> Salidas
              </Button>
              <Button size="sm" variant="ghost" asChild className="gap-1.5 whitespace-nowrap text-muted-foreground">
                <Link href={classicHref}>
                  <History className="h-4 w-4" /> Versión clásica
                </Link>
              </Button>
              <Button size="sm" variant="outline" onClick={() => setClearOpen(true)} className="gap-1.5 whitespace-nowrap text-destructive hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="h-4 w-4" /> Limpiar
              </Button>
              <Button size="sm" variant="outline" onClick={preview} disabled={previewing || !s.validPackages.length} className="gap-1.5 whitespace-nowrap">
                {previewing ? <PmySpinner className="h-4 w-4" /> : <Eye className="h-4 w-4" />} Vista previa PDF
              </Button>
              <Button size="sm" onClick={askProcess} className="gap-1.5 whitespace-nowrap">
                <Send className="h-4 w-4" /> Procesar salida{s.stats.total ? ` (${s.stats.total})` : ""}
              </Button>
            </div>
          }
        />

        {/* Datos de la salida en una franja */}
        <section className="grid grid-cols-1 gap-3 rounded-lg border bg-background p-3 sm:grid-cols-2 xl:grid-cols-[1.5fr_1.3fr_1.2fr_1fr_0.9fr_auto]">
          <Field label="Rutas" required error={showErr("routes")}>
            <RutaSelector selectedRutas={s.routes} onSelectionChange={s.setRoutes} subsidiaryId={subsidiaryId} />
          </Field>
          <Field
            label="Repartidor"
            required
            error={showErr("drivers")}
            hint={suggested.driverId && s.drivers.some((d) => d.id === suggested.driverId) ? `Sugerido: va a estas rutas en ${defaults?.driverHits ?? 0} de sus últimas ${defaults?.sample ?? 0} salidas` : undefined}
          >
            <RepartidorSelector subsidiaryId={subsidiaryId} selectedRepartidores={s.drivers} onSelectionChange={s.setDrivers} />
          </Field>
          <Field
            label="Unidad"
            required
            error={showErr("vehicle")}
            hint={suggested.vehicleId && s.vehicle?.id === suggested.vehicleId ? "Sugerida: la que suele usar en estas rutas" : undefined}
          >
            <UnidadSelector subsidiaryId={subsidiaryId} selectedUnidad={s.vehicle} onSelectionChange={(v) => s.setVehicle(v?.id ? v : undefined)} />
          </Field>
          <Field
            label="Kilometraje"
            required
            error={showErr("kms")}
            warn={kmsLower ? `Es menor al último registrado (${kmInfo!.lastKms!.toLocaleString("es-MX")}). Revísalo.` : undefined}
            hint={!kmsLower && kmInfo?.lastKms ? `Último registrado: ${kmInfo.lastKms.toLocaleString("es-MX")} km` : undefined}
          >
            <Input inputMode="numeric" value={s.kms} onChange={(e) => s.setKms(e.target.value)} placeholder="Ej. 84250" aria-invalid={!!showErr("kms")} className={cn(showErr("kms") && "border-destructive")} />
          </Field>
          <Field
            label="Fecha de ruta"
            warn={s.routeDate !== s.todayStr ? (s.routeDate > s.todayStr ? "Fecha futura: la ruta queda con el día de mañana." : "Fecha pasada: la ruta queda con ese día, no con hoy.") : undefined}
          >
            <Input type="date" value={s.routeDate} max={s.tomorrowStr} onChange={(e) => s.setRouteDate(e.target.value > s.tomorrowStr ? s.tomorrowStr : e.target.value)} />
          </Field>
          <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 xl:mt-5 xl:h-10">
            <Label htmlFor="v2-315" className="text-sm">Ruta 31.5</Label>
            <Switch id="v2-315" checked={s.is315} onCheckedChange={s.setIs315} />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[320px_minmax(0,1fr)_370px]">
          {/* Escáner primero */}
          <section className="flex flex-col gap-3">
            <div className="space-y-2.5 rounded-lg border bg-background p-3">
              <div className="flex items-center gap-2">
                <Scan className="h-4 w-4" />
                <span className="font-semibold">Escanear</span>
                <div className="ml-auto inline-flex rounded-lg border p-0.5">
                  {[
                    { list: false, label: "Uno a uno" },
                    { list: true, label: "Por lista" },
                  ].map((o) => (
                    <button
                      key={o.label}
                      type="button"
                      onClick={() => {
                        setListOverride(o.list);
                        scanRef.current?.clear();
                        s.setRawTrackings("");
                      }}
                      className={cn("rounded-md px-2.5 py-1 text-xs font-medium", isListMode === o.list ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <ScanInput
                ref={scanRef}
                storageKey={SCAN_KEY}
                defaultView="simple"
                label=""
                mode={isListMode ? "batch" : "perScan"}
                onScan={isListMode ? undefined : s.handleScan}
                onTrackingNumbersChange={s.setRawTrackings}
                disabled={!subsidiaryId || s.validating}
                placeholder={subsidiaryId ? "Escanea o pega guías FedEx o DHL" : "Selecciona una sucursal primero"}
              />
              {isListMode && (
                <Button onClick={validateList} disabled={s.validating || !s.rawTrackings.trim()} variant="outline" className="w-full gap-2">
                  {s.validating ? <PmySpinner className="h-4 w-4" /> : <Check className="h-4 w-4" />} {s.validating ? "Validando…" : "Validar lista"}
                </Button>
              )}
            </div>

            {last && (
              <div
                className={cn(
                  "rounded-lg border-2 p-3",
                  !last.pkg.isValid ? "border-red-300 bg-red-50" : lastDays === 0 ? "border-amber-300 bg-amber-50" : "border-green-300 bg-green-50",
                )}
                aria-live="polite"
              >
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Última guía</div>
                <div className="my-0.5 text-xl font-bold tabular-nums">{pieceId(last.pkg)}</div>
                <div className="flex flex-wrap gap-1.5">
                  {last.pkg.isValid ? <Chip tone="green">Válida</Chip> : <Chip tone="red">{last.pkg.isOffline ? "Sin conexión" : "Por revisar"}</Chip>}
                  {lastDays === 0 && <Chip tone="red">Vence hoy</Chip>}
                  {lastDays === 1 && <Chip tone="amber">Vence mañana</Chip>}
                  {last.pkg.payment && <Chip tone="green">Cobro {money(Number(last.pkg.payment.amount) || 0)}</Chip>}
                  {last.pkg.isCharge && <Chip tone="slate">Carga</Chip>}
                </div>
                <div className="mt-1.5 text-xs text-muted-foreground">
                  {last.pkg.isValid ? [last.pkg.recipientZip && `CP ${last.pkg.recipientZip}`, last.pkg.recipientAddress].filter(Boolean).join(" · ") : last.pkg.reason || "No pasó la validación"}
                </div>
              </div>
            )}

            {s.lastScans.length > 1 && (
              <div className="space-y-1 rounded-lg border bg-background p-3">
                <div className="text-xs font-semibold text-muted-foreground">Recientes</div>
                {s.lastScans.slice(1).map((r) => (
                  <div key={pieceId(r.pkg)} className="flex items-center gap-2 text-sm">
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", r.pkg.isValid ? "bg-green-500" : "bg-red-500")} />
                    <span className="tabular-nums">{pieceId(r.pkg)}</span>
                    <span className={cn("ml-auto truncate text-[11px]", r.pkg.isValid ? "text-muted-foreground" : "text-red-600")}>
                      {r.pkg.isValid ? "Válida" : r.pkg.reason || "Por revisar"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Lista */}
          <section className="min-w-0 overflow-hidden rounded-lg border bg-background">
            <div className="flex flex-wrap items-center gap-1 border-b px-2">
              {(
                [
                  { v: "ok", label: "En la salida", n: s.validPackages.length, tone: "bg-muted text-foreground" },
                  { v: "review", label: "Por revisar", n: s.invalidPackages.length + s.invalidNumbers.length, tone: "bg-red-100 text-red-700" },
                ] as const
              ).map((t) => (
                <button
                  key={t.v}
                  type="button"
                  onClick={() => setTab(t.v)}
                  className={cn("-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium", tab === t.v ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
                >
                  {t.label}
                  <span className={cn("rounded-full px-1.5 text-[11px] tabular-nums", t.n ? t.tone : "bg-muted text-muted-foreground")}>{t.n}</span>
                </button>
              ))}
              {tab === "ok" && (
                <div className="ml-auto flex items-center gap-1 py-1.5">
                  <span className="mr-1 hidden text-xs text-muted-foreground md:inline">Orden:</span>
                  <div className="inline-flex overflow-hidden rounded-md border">
                    {SORT_OPTIONS.map((o, i) => (
                      <button
                        key={o.mode}
                        type="button"
                        onClick={() => setSortOverride(o.mode)}
                        aria-pressed={sortMode === o.mode}
                        className={cn("px-2.5 py-1 text-xs", i > 0 && "border-l", sortMode === o.mode ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {tab === "ok" ? (
              <>
                <div className="border-b p-2">
                  <PackageFilters
                    searchTerm={search}
                    onSearchChange={setSearch}
                    carrier={carrier}
                    onCarrierChange={setCarrier}
                    onlyToday={onlyToday}
                    onToggleToday={() => setOnlyToday((v) => !v)}
                    onlyPayment={onlyPayment}
                    onTogglePayment={() => setOnlyPayment((v) => !v)}
                    priority={priority}
                    onPriorityChange={setPriority}
                    type={type}
                    onTypeChange={setType}
                    activeFilterCount={activeFilters}
                    onClear={() => {
                      setSearch("");
                      setCarrier("all");
                      setOnlyToday(false);
                      setOnlyPayment(false);
                      setPriority("all");
                      setType("all");
                    }}
                  />
                </div>
                {s.validPackages.length === 0 ? (
                  <Empty icon={Package} title="Sin paquetes todavía" text="Escanea guías o agrega las sugeridas de la derecha." />
                ) : filtered.length === 0 ? (
                  <Empty icon={Package} title="Nada con esos filtros" text="Quita algún filtro para ver los paquetes." />
                ) : sections ? (
                  sections.map((sec) => (
                    <div key={sec.carrier}>
                      <div className={cn("sticky top-0 z-10 border-b px-3 py-1.5 text-xs font-semibold", sec.carrier === "dhl" ? "bg-amber-50 text-amber-800" : "bg-violet-50 text-violet-800")}>
                        {sec.label} · {sec.items.length}
                      </div>
                      <div className="divide-y">
                        {sec.items.map((pkg, i) => (
                          <Row key={pieceId(pkg)} pkg={pkg} index={i + 1} onRemove={remove} busy={s.validating} />
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="divide-y">
                    {filtered.map((pkg, i) => (
                      <Row key={pieceId(pkg)} pkg={pkg} index={i + 1} onRemove={remove} busy={s.validating} />
                    ))}
                  </div>
                )}
              </>
            ) : s.invalidPackages.length + s.invalidNumbers.length === 0 ? (
              <Empty icon={Check} title="Nada por revisar" text="Las guías que no pasen la validación aparecen aquí con el motivo." />
            ) : (
              <div className="divide-y">
                {s.invalidPackages.map((pkg, i) => (
                  <Row key={pieceId(pkg)} pkg={pkg} index={i + 1} onRemove={remove} onTransfer={canTransfer ? setTransferPkg : undefined} busy={s.validating} />
                ))}
                {s.invalidNumbers.map((code) => (
                  <div key={code} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="tabular-nums">{code}</span>
                    <span className="text-xs text-red-600">No parece una guía FedEx o DHL</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Vencen hoy en tus rutas */}
          <div className="lg:col-span-2 2xl:col-span-1">
            <DispatchSuggestedPanel subsidiaryId={subsidiaryId} routes={s.routes.map((r) => ({ id: r.id, name: r.name }))} inDispatch={inDispatch} disabled={s.validating} onAdd={addSuggested} />
          </div>
        </div>

        {/* Barra inferior fija con el resumen y lo que falta */}
        <footer className="fixed bottom-0 z-30 border-t bg-slate-900 text-slate-200 shadow-lg" style={{ left: mainBox.left, width: mainBox.width }}>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2.5 text-sm">
            <span><b className="text-base text-white tabular-nums">{s.stats.total}</b> paquetes</span>
            <span><b className="text-base text-red-300 tabular-nums">{s.stats.expiringToday}</b> vencen hoy</span>
            <span><b className="text-base text-green-300 tabular-nums">{money(s.stats.totalToCollect)}</b> por cobrar ({s.stats.withPayment})</span>
            {s.invalidPackages.length > 0 && (
              <button type="button" onClick={() => setTab("review")} className="underline-offset-2 hover:underline">
                <b className="text-base text-red-300 tabular-nums">{s.invalidPackages.length}</b> por revisar
              </button>
            )}
            {dueLeft > 0 && <span className="text-violet-300">Quedan {dueLeft} por vencer hoy de estas rutas en bodega</span>}
            <div className="ml-auto flex items-center gap-2">
              {s.missing.length > 0 ? (
                <span className="rounded-full bg-red-950 px-2.5 py-1 text-xs text-red-200">Falta: {s.missing.map((m) => m.label).join(", ")}</span>
              ) : (
                <span className="rounded-full bg-green-950 px-2.5 py-1 text-xs text-green-200">Lista para procesar</span>
              )}
              <Button size="sm" onClick={askProcess} className="gap-1.5">
                Procesar salida <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </footer>
      </div>


      {/* Confirmar */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>¿Procesar la salida?</DialogTitle>
            <DialogDescription>Después se genera el PDF, el Excel y se manda el correo.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Summary label="Rutas" value={s.routes.map((r) => r.name).join(", ")} />
            <Summary label="Repartidor y unidad" value={`${s.drivers.map((d) => d.name).join(", ")} · ${s.vehicle?.name ?? s.vehicle?.plateNumber ?? ""}`} />
            <Summary label="Paquetes" value={`${s.stats.total} (${s.stats.fedex} FedEx · ${s.stats.dhl} DHL)`} />
            <Summary label="Por cobrar" value={`${money(s.stats.totalToCollect)} en ${s.stats.withPayment} guías`} />
            <Summary label="Fecha y km" value={`${s.routeDate === s.todayStr ? "Hoy" : s.routeDate} · ${s.kms} km`} />
            <Summary label="Orden del PDF" value={SORT_OPTIONS.find((o) => o.mode === sortMode)?.label ?? ""} />
          </div>
          <div className="space-y-2 text-sm">
            {dueLeft > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                <b>Quedan {dueLeft} paquetes por vencer hoy</b> de estas rutas en bodega. Puedes agregarlos desde el panel de la derecha.
              </div>
            )}
            {s.invalidPackages.length > 0 && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-900">
                <b>{s.invalidPackages.length} guías por revisar</b> no van en la salida.
              </div>
            )}
            {kmsLower && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">El kilometraje es menor al último registrado ({kmInfo!.lastKms!.toLocaleString("es-MX")}).</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Seguir editando</Button>
            <Button onClick={doProcess} className="gap-1.5"><Send className="h-4 w-4" /> Sí, procesar salida</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Avance por pasos (mientras se procesa, o si falló al guardar) */}
      <Dialog open={p.open && !finished} onOpenChange={(o) => !o && p.steps.save === "error" && s.resetProcess()}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} showCloseButton={p.steps.save === "error"}>
          <DialogHeader>
            <DialogTitle>{p.steps.save === "error" ? "No se pudo guardar" : "Procesando salida…"}</DialogTitle>
            <DialogDescription>{p.steps.save === "error" ? p.error : "No cierres esta pantalla."}</DialogDescription>
          </DialogHeader>
          <Steps process={p} />
          {p.steps.save === "error" && (
            <DialogFooter>
              <Button onClick={s.resetProcess}>Volver a la salida</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Limpiar la salida?</AlertDialogTitle>
            <AlertDialogDescription>Se borran rutas, repartidor, unidad y los {s.packages.length} paquetes escaneados. No se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={doClear}>Sí, limpiar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TransferPackageDialog
        open={!!transferPkg}
        onOpenChange={(o) => !o && setTransferPkg(null)}
        pkg={transferPkg}
        currentSubsidiaryId={subsidiaryId}
        currentSubsidiaryName={subsidiaryName}
        source="package_dispatch"
        onSuccess={(pkg, destinationId) => {
          const id = pieceId(pkg as PackageInfo);
          if (destinationId === subsidiaryId) {
            s.replacePackage(id, { ...(pkg as PackageInfo), isValid: true, reason: undefined, subsidiary: { ...((pkg as any).subsidiary || {}), id: destinationId } } as PackageInfo);
          } else {
            s.replacePackage(id, null);
          }
          setTransferPkg(null);
        }}
      />
    </AppLayout>
  );
}

// ---------- Piezas pequeñas ----------

function Field({ label, required, error, warn, hint, children }: { label: string; required?: boolean; error?: string; warn?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-1">
      <Label className={cn("text-xs", error ? "text-destructive" : "text-muted-foreground")}>
        {label}
        {required && " *"}
      </Label>
      {children}
      {error ? (
        <p className="text-[11px] text-destructive">{error}</p>
      ) : warn ? (
        <p className="text-[11px] text-amber-700">{warn}</p>
      ) : hint ? (
        <p className="text-[11px] text-violet-700">{hint}</p>
      ) : null}
    </div>
  );
}

function Chip({ tone, children }: { tone: "green" | "red" | "amber" | "slate"; children: React.ReactNode }) {
  const map = { green: "bg-green-100 text-green-800", red: "bg-red-100 text-red-700", amber: "bg-amber-100 text-amber-800", slate: "bg-slate-100 text-slate-700" };
  return <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-semibold", map[tone])}>{children}</span>;
}

function Empty({ icon: Icon, title, text }: { icon: React.ComponentType<{ className?: string }>; title: string; text: string }) {
  return (
    <div className="py-14 text-center">
      <Icon className="mx-auto mb-2 h-10 w-10 text-muted-foreground/40" />
      <p className="font-medium text-muted-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/50 px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="truncate font-medium" title={value}>{value || "—"}</div>
    </div>
  );
}

const STEP_LABEL: Record<StepKey, string> = { save: "Guardar la salida", pdf: "Generar PDF", excel: "Generar Excel", upload: "Subir archivos y enviar correo" };

function Steps({ process: p }: { process: ReturnType<typeof useDispatchSession>["process"] }) {
  return (
    <ol className="space-y-2.5">
      {(Object.keys(STEP_LABEL) as StepKey[]).map((k) => {
        const st = p.steps[k];
        return (
          <li key={k} className="flex items-center gap-2.5 text-sm">
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white",
                st === "done" ? "bg-green-600" : st === "error" ? "bg-red-600" : st === "running" ? "bg-primary" : "bg-muted text-muted-foreground",
              )}
            >
              {st === "done" ? <Check className="h-3.5 w-3.5" /> : st === "error" ? <X className="h-3.5 w-3.5" /> : st === "running" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            </span>
            <span className={cn(st === "pending" && "text-muted-foreground")}>
              {STEP_LABEL[k]}
              {k === "save" && st === "done" && p.dispatch && <b> · {p.dispatch.trackingNumber}</b>}
              {k === "upload" && st === "running" && p.uploadPercent > 0 && ` · ${p.uploadPercent}%`}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function DispatchDone({
  process: p,
  dueLeft,
  onRetry,
  onNew,
  onExit,
}: {
  process: ReturnType<typeof useDispatchSession>["process"];
  dueLeft: number;
  onRetry: () => void;
  onNew: () => void;
  onExit: () => void;
}) {
  const { toast } = useToast();
  const d = p.dispatch!;
  const snap = p.snapshot!;
  const retrying = p.steps.pdf === "running" || p.steps.excel === "running" || p.steps.upload === "running";
  const ok = p.steps.upload === "done";
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-5 rounded-xl border bg-background p-6">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-full", ok ? "bg-green-100" : "bg-amber-100")}>
            {ok ? <Check className="h-6 w-6 text-green-700" /> : <AlertTriangle className="h-6 w-6 text-amber-700" />}
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold">Salida lista · {d.trackingNumber}</div>
            <div className="truncate text-sm text-muted-foreground">
              {snap.routes.map((r) => r.name).join(", ")} · {snap.drivers.map((x) => x.name).join(", ")} · {snap.packages.length} paquetes · {money(snap.totalToCollect)} por cobrar
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button variant="outline" className="h-16 flex-col gap-0.5" disabled={!p.pdfUrl} onClick={() => p.pdfUrl && window.open(p.pdfUrl, "_blank")}>
            <span className="flex items-center gap-1.5 font-semibold"><FileText className="h-4 w-4" /> Abrir PDF</span>
            <span className="text-[11px] text-muted-foreground">Para imprimir</span>
          </Button>
          <Button variant="outline" className="h-16 flex-col gap-0.5" disabled={!p.excelUrl} asChild={!!p.excelUrl}>
            {p.excelUrl ? (
              <a href={p.excelUrl} download={p.excelName ?? "salida.xlsx"}>
                <span className="flex items-center gap-1.5 font-semibold"><Download className="h-4 w-4" /> Descargar Excel</span>
                <span className="text-[11px] text-muted-foreground">Mismo orden que el PDF</span>
              </a>
            ) : (
              <span className="font-semibold">Descargar Excel</span>
            )}
          </Button>
          <Button
            variant="outline"
            className="h-16 flex-col gap-0.5"
            onClick={() => {
              navigator.clipboard?.writeText(d.trackingNumber).then(() => toast({ title: "Folio copiado" })).catch(() => {});
            }}
          >
            <span className="flex items-center gap-1.5 font-semibold"><ClipboardCopy className="h-4 w-4" /> Copiar folio</span>
            <span className="text-[11px] text-muted-foreground">{d.trackingNumber}</span>
          </Button>
        </div>

        {ok ? (
          <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-900">Correo enviado con el PDF y el Excel adjuntos.</div>
        ) : (
          <div className="space-y-3 rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-900">
            <div className="flex items-start gap-2">
              <span className="flex-1">{p.error}</span>
              <Button size="sm" variant="outline" onClick={onRetry} disabled={retrying} className="shrink-0 gap-1.5 border-red-300 bg-background text-red-700">
                {retrying ? <PmySpinner className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />} Reintentar envío
              </Button>
            </div>
            <Steps process={p} />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          {dueLeft > 0 ? <span className="flex-1 text-sm text-violet-700">Estas rutas todavía tienen {dueLeft} paquetes que vencen hoy en bodega.</span> : <span className="flex-1" />}
          <Button variant="outline" onClick={onExit}>Ir a salidas</Button>
          <Button onClick={onNew} className="gap-1.5"><Send className="h-4 w-4" /> Nueva salida</Button>
        </div>
      </div>
    </div>
  );
}
