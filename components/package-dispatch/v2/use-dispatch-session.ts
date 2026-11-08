"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DispatchFormData, DispatchSortMode, Driver, PackageDispatch, PackageInfo, Route, Vehicles } from "@/lib/types";
import { savePackageDispatch, uploadPDFile, validateTrackingNumber, validateTrackingsList } from "@/lib/services/package-dispatchs";
import { daysUntilCommit } from "@/components/shared/package-list-item";
import { normalizeScannedCode, isValidScannedCode } from "@/lib/tracking/normalize-scan";
import { playExpiresTodaySound, playExpiresTomorrowSound, playInvalidSound, playNotFoundSound } from "@/lib/scanner-feedback";
import type { ScanResolution } from "@/components/scanner/scan-input";

/**
 * Estado y acciones de la salida a ruta v2. Usa las MISMAS claves de localStorage que la
 * pantalla clásica (dispatch_*), así una salida a medias se puede abrir en cualquiera de las
 * dos. El guardado local va con un pequeño retraso para no reescribir la lista completa en
 * cada escaneo.
 */

const KEYS = {
  drivers: "dispatch_repartidores",
  routes: "dispatch_rutas",
  vehicle: "dispatch_unidad",
  kms: "dispatch_kms",
  routeDate: "dispatch_route_date",
  is315: "dispatch_is315",
  packages: "dispatch_packages",
  invalid: "dispatch_invalid_numbers",
  raw: "dispatch_tracking_raw",
} as const;

const read = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null || raw === "undefined" || raw === "null") return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

/** Estado persistido en localStorage con escritura diferida (misma forma JSON que useLocalStorage). */
function usePersisted<T>(key: string, initial: T, delay = 250) {
  const [value, setValue] = useState<T>(() => read(key, initial));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(value);
  latest.current = value;

  const flush = useCallback(() => {
    try {
      if (latest.current === undefined) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, JSON.stringify(latest.current));
    } catch {
      /* almacenamiento lleno o bloqueado: la sesión sigue en memoria */
    }
  }, [key]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, delay);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, delay, flush]);

  // Al salir de la página se guarda lo pendiente.
  useEffect(() => {
    const onHide = () => flush();
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      flush();
    };
  }, [flush]);

  return [value, setValue] as const;
}

export const pieceId = (p: Pick<PackageInfo, "trackingNumber"> & { dhlUniqueId?: string | null }) => p.dhlUniqueId || p.trackingNumber;

const todayLocal = () => new Date().toLocaleDateString("en-CA");
const tomorrowLocal = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("en-CA");
};

export type StepKey = "save" | "pdf" | "excel" | "upload";
export type StepState = "pending" | "running" | "done" | "error";
export interface ProcessState {
  open: boolean;
  steps: Record<StepKey, StepState>;
  uploadPercent: number;
  dispatch: PackageDispatch | null;
  error: string | null;
  pdfUrl: string | null;
  excelUrl: string | null;
  excelName: string | null;
  /** Foto de lo que se procesó (para reintentar el correo y para la pantalla final). */
  snapshot: {
    packages: PackageInfo[];
    invalid: string[];
    drivers: Driver[];
    routes: Route[];
    vehicle: Vehicles;
    sortMode: DispatchSortMode;
    totalToCollect: number;
  } | null;
}

const IDLE_PROCESS: ProcessState = {
  open: false,
  steps: { save: "pending", pdf: "pending", excel: "pending", upload: "pending" },
  uploadPercent: 0,
  dispatch: null,
  error: null,
  pdfUrl: null,
  excelUrl: null,
  excelName: null,
  snapshot: null,
};

export interface LastScan {
  pkg: PackageInfo;
  at: number;
}

export function useDispatchSession(subsidiaryId: string | null, subsidiaryName: string | null, sortMode: DispatchSortMode) {
  const [drivers, setDrivers] = usePersisted<Driver[]>(KEYS.drivers, []);
  const [routes, setRoutes] = usePersisted<Route[]>(KEYS.routes, []);
  const [vehicle, setVehicle] = usePersisted<Vehicles | undefined>(KEYS.vehicle, undefined);
  const [kms, setKms] = usePersisted<string>(KEYS.kms, "");
  const [routeDate, setRouteDate] = usePersisted<string>(KEYS.routeDate, todayLocal());
  const [is315, setIs315] = usePersisted<boolean>(KEYS.is315, false);
  const [packages, setPackages] = usePersisted<PackageInfo[]>(KEYS.packages, []);
  const [invalidNumbers, setInvalidNumbers] = usePersisted<string[]>(KEYS.invalid, []);
  const [rawTrackings, setRawTrackings] = usePersisted<string>(KEYS.raw, "");

  const [validating, setValidating] = useState(false);
  const [lastScans, setLastScans] = useState<LastScan[]>([]);
  const [process, setProcess] = useState<ProcessState>(IDLE_PROCESS);
  const [isOnline, setIsOnline] = useState(true);

  const packagesRef = useRef(packages);
  packagesRef.current = packages;

  // Una fecha de ruta guardada de otro día no se acarrea en silencio (misma regla que la clásica).
  useEffect(() => {
    if (routeDate && routeDate !== todayLocal()) setRouteDate(todayLocal());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const pushLast = useCallback((pkg: PackageInfo) => {
    setLastScans((prev) => [{ pkg, at: Date.now() }, ...prev.filter((s) => pieceId(s.pkg) !== pieceId(pkg))].slice(0, 6));
  }, []);

  const feedback = useCallback((results: PackageInfo[], hadMalformed = false) => {
    const valid = results.filter((r) => r.isValid);
    if (hadMalformed) playInvalidSound();
    else if (results.some((r) => !r.isValid && !r.isOffline)) playNotFoundSound();
    else if (valid.some((r) => daysUntilCommit(r.commitDateTime) === 0)) playExpiresTodaySound();
    else if (valid.some((r) => daysUntilCommit(r.commitDateTime) === 1)) playExpiresTomorrowSound();
  }, []);

  const mergeResults = useCallback(
    (results: PackageInfo[]) => {
      let added = 0;
      const existing = new Set(packagesRef.current.map(pieceId));
      const fresh: PackageInfo[] = [];
      for (const r of results) {
        const id = pieceId(r);
        if (existing.has(id)) continue;
        existing.add(id);
        fresh.push(r);
      }
      added = fresh.length;
      if (added) setPackages((prev) => [...prev, ...fresh.filter((f) => !prev.some((p) => pieceId(p) === pieceId(f)))]);
      return added;
    },
    [setPackages],
  );

  /** Uno a uno: valida al escanear. */
  const handleScan = useCallback(
    async (code: string, current: PackageInfo[]): Promise<ScanResolution> => {
      if (!subsidiaryId) return { action: "reject", message: "Selecciona una sucursal primero" };
      let info: PackageInfo;
      try {
        info = await validateTrackingNumber(code, subsidiaryId);
      } catch {
        info = {
          id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          trackingNumber: code,
          isValid: false,
          reason: "Sin conexión: se valida al volver el internet",
          isOffline: true,
          createdAt: new Date(),
        } as unknown as PackageInfo;
      }
      const id = pieceId(info);
      if (current.some((p) => pieceId(p) === id) || packagesRef.current.some((p) => pieceId(p) === id)) {
        return { action: "reject", message: `La guía ${id} ya está en la salida.` };
      }
      setPackages((prev) => (prev.some((p) => pieceId(p) === id) ? prev : [...prev, info]));
      pushLast(info);
      if (!info.isOffline) feedback([info]);
      return { action: "add", package: info };
    },
    [subsidiaryId, setPackages, pushLast, feedback],
  );

  /** Valida una lista de códigos (modo por lista y paquetes sugeridos) en una sola llamada. */
  const validateCodes = useCallback(
    async (codes: string[]): Promise<{ added: number; invalid: number; results: PackageInfo[] }> => {
      if (!subsidiaryId || codes.length === 0) return { added: 0, invalid: 0, results: [] };
      const existing = new Set(packagesRef.current.map(pieceId));
      const pending = [...new Set(codes)].filter((c) => !existing.has(c));
      if (!pending.length) return { added: 0, invalid: 0, results: [] };
      setValidating(true);
      try {
        let results: PackageInfo[];
        try {
          results = await validateTrackingsList(pending, subsidiaryId);
        } catch {
          results = pending.map(
            (trackingNumber) =>
              ({
                id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                trackingNumber,
                isValid: false,
                reason: "Sin conexión: se valida al volver el internet",
                isOffline: true,
                createdAt: new Date(),
              }) as unknown as PackageInfo,
          );
        }
        const added = mergeResults(results);
        if (results.length) pushLast(results[results.length - 1]);
        return { added, invalid: results.filter((r) => !r.isValid).length, results };
      } finally {
        setValidating(false);
      }
    },
    [subsidiaryId, mergeResults, pushLast],
  );

  /** Modo por lista: valida lo que se escaneó/pegó. */
  const validateRaw = useCallback(async () => {
    const lines = rawTrackings.split("\n").map((l) => l.trim()).filter(Boolean);
    setRawTrackings("");
    const codes = new Set<string>();
    const malformed: string[] = [];
    for (const line of lines) {
      const n = normalizeScannedCode(line);
      if (isValidScannedCode(n)) codes.add(n.code);
      else malformed.push(line);
    }
    setInvalidNumbers([...new Set(malformed)]);
    const r = await validateCodes([...codes]);
    feedback(r.results, malformed.length > 0);
    return { ...r, malformed: malformed.length };
  }, [rawTrackings, setRawTrackings, setInvalidNumbers, validateCodes, feedback]);

  const addSuggested = useCallback(
    async (codes: string[]) => {
      const r = await validateCodes(codes);
      feedback(r.results);
      return r;
    },
    [validateCodes, feedback],
  );

  const removePackage = useCallback(
    (identifier: string) => setPackages((prev) => prev.filter((p) => pieceId(p) !== identifier)),
    [setPackages],
  );

  const replacePackage = useCallback(
    (identifier: string, next: PackageInfo | null) =>
      setPackages((prev) => (next ? prev.map((p) => (pieceId(p) === identifier ? next : p)) : prev.filter((p) => pieceId(p) !== identifier))),
    [setPackages],
  );

  // Al volver el internet, las guías escaneadas sin conexión se revalidan en UNA llamada.
  useEffect(() => {
    if (!isOnline || !subsidiaryId) return;
    const offline = packagesRef.current.filter((p) => p.isOffline);
    if (!offline.length) return;
    validateTrackingsList(offline.map((p) => p.trackingNumber), subsidiaryId)
      .then((results) => {
        const byId = new Map(results.map((r) => [r.trackingNumber, r]));
        setPackages((prev) => prev.map((p) => (p.isOffline && byId.has(p.trackingNumber) ? byId.get(p.trackingNumber)! : p)));
      })
      .catch(() => {
        /* se reintenta la próxima vez que vuelva la conexión */
      });
  }, [isOnline, subsidiaryId, setPackages]);

  const clearAll = useCallback(() => {
    setDrivers([]);
    setRoutes([]);
    setVehicle(undefined);
    setKms("");
    setRouteDate(todayLocal());
    setIs315(false);
    setPackages([]);
    setInvalidNumbers([]);
    setRawTrackings("");
    setLastScans([]);
  }, [setDrivers, setRoutes, setVehicle, setKms, setRouteDate, setIs315, setPackages, setInvalidNumbers, setRawTrackings]);

  const validPackages = useMemo(() => packages.filter((p) => p.isValid), [packages]);
  const invalidPackages = useMemo(() => packages.filter((p) => !p.isValid), [packages]);

  const stats = useMemo(() => {
    let expiringToday = 0,
      expiringTomorrow = 0,
      withPayment = 0,
      totalToCollect = 0,
      fedex = 0,
      dhl = 0;
    for (const p of validPackages) {
      const d = daysUntilCommit(p.commitDateTime);
      if (d === 0) expiringToday++;
      if (d === 1) expiringTomorrow++;
      if (p.payment) {
        withPayment++;
        totalToCollect += Number(p.payment.amount) || 0;
      }
      if (p.shipmentType === "dhl") dhl++;
      else fedex++;
    }
    return { total: validPackages.length, expiringToday, expiringTomorrow, withPayment, totalToCollect, fedex, dhl };
  }, [validPackages]);

  /** Qué falta para poder procesar, en lenguaje simple (campo → mensaje). */
  const missing = useMemo(() => {
    const m: { field: "routes" | "drivers" | "vehicle" | "kms" | "packages"; label: string; message: string }[] = [];
    if (!routes.length) m.push({ field: "routes", label: "ruta", message: "Elige al menos una ruta" });
    if (!drivers.length) m.push({ field: "drivers", label: "repartidor", message: "Elige al menos un repartidor" });
    if (!vehicle?.id) m.push({ field: "vehicle", label: "unidad", message: "Elige la unidad" });
    if (!String(kms).trim()) m.push({ field: "kms", label: "kilometraje", message: "Escribe el kilometraje" });
    else if (!/^\d[\d,.]*$/.test(String(kms).trim())) m.push({ field: "kms", label: "kilometraje", message: "El kilometraje solo lleva números" });
    if (!validPackages.length) m.push({ field: "packages", label: "paquetes", message: "Escanea al menos un paquete válido" });
    return m;
  }, [routes, drivers, vehicle, kms, validPackages]);

  /** Genera PDF y Excel (cargados bajo demanda) y los sube; reintentable sin volver a guardar. */
  const runFiles = useCallback(async (dispatch: PackageDispatch, snap: NonNullable<ProcessState["snapshot"]>) => {
    const set = (k: StepKey, s: StepState) => setProcess((p) => ({ ...p, steps: { ...p.steps, [k]: s } }));
    const date = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-");
    const base = `${dispatch.drivers?.[0]?.name?.toUpperCase() ?? "SALIDA"}--${dispatch.subsidiary?.name ?? subsidiaryName ?? ""}--Salida a Ruta--${date}`;

    set("pdf", "running");
    const [{ pdf }, { FedExPackageDispatchPDF }] = await Promise.all([
      import("@react-pdf/renderer"),
      import("@/lib/services/package-dispatch/package-dispatch-pdf-generator"),
    ]);
    const { createElement } = await import("react");
    const pdfBlob = await pdf(
      createElement(FedExPackageDispatchPDF, {
        drivers: snap.drivers,
        routes: snap.routes,
        vehicle: snap.vehicle,
        invalidTrackings: snap.invalid,
        packages: snap.packages,
        subsidiaryName: dispatch.subsidiary?.name ?? subsidiaryName ?? "",
        trackingNumber: dispatch.trackingNumber,
        sortMode: snap.sortMode,
      }) as any,
    ).toBlob();
    const pdfUrl = URL.createObjectURL(pdfBlob);
    setProcess((p) => ({ ...p, pdfUrl }));
    set("pdf", "done");

    set("excel", "running");
    const { generateDispatchExcelClient } = await import("@/lib/services/package-dispatch/package-dispatch-excel-generator");
    const withShipments = { ...dispatch, shipments: snap.packages as unknown as PackageDispatch["shipments"] };
    const excelBuffer = await generateDispatchExcelClient(withShipments, snap.invalid, false, snap.sortMode);
    const excelBlob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const excelUrl = URL.createObjectURL(excelBlob);
    setProcess((p) => ({ ...p, excelUrl, excelName: `${base}.xlsx` }));
    set("excel", "done");

    set("upload", "running");
    await uploadPDFile(
      new File([pdfBlob], `${base}.pdf`, { type: "application/pdf" }),
      new File([excelBlob], `${base}.xlsx`, { type: excelBlob.type }),
      dispatch.subsidiary?.name ?? subsidiaryName ?? "",
      dispatch.id,
      (percent) => setProcess((p) => ({ ...p, uploadPercent: percent })),
    );
    set("upload", "done");
  }, [subsidiaryName]);

  /** Guarda la salida y luego archivos + correo, mostrando cada paso. */
  const processDispatch = useCallback(async () => {
    if (!subsidiaryId || missing.length || !vehicle) return;
    const snap: NonNullable<ProcessState["snapshot"]> = {
      packages: validPackages,
      invalid: invalidPackages.map((p) => p.trackingNumber),
      drivers,
      routes,
      vehicle,
      sortMode,
      totalToCollect: stats.totalToCollect,
    };
    setProcess({ ...IDLE_PROCESS, open: true, snapshot: snap, steps: { ...IDLE_PROCESS.steps, save: "running" } });

    let dispatch: PackageDispatch;
    try {
      const data: DispatchFormData = {
        drivers,
        routes,
        vehicle,
        shipments: validPackages.map((p) => p.id).filter((id): id is string => Boolean(id)),
        subsidiary: { id: subsidiaryId, name: subsidiaryName || "" } as DispatchFormData["subsidiary"],
        kms: String(kms).replace(/[^\d]/g, ""),
        routeDate,
        is315,
        sortMode,
      };
      dispatch = await savePackageDispatch(data);
    } catch (e: any) {
      setProcess((p) => ({
        ...p,
        steps: { ...p.steps, save: "error" },
        error: "No se pudo guardar la salida. Revisa la conexión e intenta de nuevo; no se creó nada.",
      }));
      return;
    }
    // La salida YA existe: se limpia la captura para que no se procese dos veces.
    setProcess((p) => ({ ...p, dispatch, steps: { ...p.steps, save: "done" } }));
    clearAll();

    try {
      await runFiles(dispatch, snap);
    } catch {
      setProcess((p) => {
        const steps = { ...p.steps };
        (Object.keys(steps) as StepKey[]).forEach((k) => {
          if (steps[k] === "running") steps[k] = "error";
        });
        return { ...p, steps, error: "La salida quedó guardada, pero no se pudieron generar o enviar los archivos. Reintenta el envío." };
      });
    }
  }, [subsidiaryId, subsidiaryName, missing, vehicle, validPackages, invalidPackages, drivers, routes, sortMode, stats, kms, routeDate, is315, clearAll, runFiles]);

  const retryFiles = useCallback(async () => {
    if (!process.dispatch || !process.snapshot) return;
    setProcess((p) => ({ ...p, error: null, uploadPercent: 0, steps: { save: "done", pdf: "pending", excel: "pending", upload: "pending" } }));
    try {
      await runFiles(process.dispatch, process.snapshot);
    } catch {
      setProcess((p) => {
        const steps = { ...p.steps };
        (Object.keys(steps) as StepKey[]).forEach((k) => {
          if (steps[k] === "running") steps[k] = "error";
        });
        return { ...p, steps, error: "Todavía no se pudieron enviar los archivos. Revisa la conexión e intenta otra vez." };
      });
    }
  }, [process.dispatch, process.snapshot, runFiles]);

  const resetProcess = useCallback(() => {
    setProcess((p) => {
      if (p.pdfUrl) URL.revokeObjectURL(p.pdfUrl);
      if (p.excelUrl) URL.revokeObjectURL(p.excelUrl);
      return IDLE_PROCESS;
    });
  }, []);

  /** Vista previa del PDF con lo capturado (sin guardar). */
  const previewPdf = useCallback(async () => {
    const [{ pdf }, { FedExPackageDispatchPDF }, { createElement }] = await Promise.all([
      import("@react-pdf/renderer"),
      import("@/lib/services/package-dispatch/package-dispatch-pdf-generator"),
      import("react"),
    ]);
    const blob = await pdf(
      createElement(FedExPackageDispatchPDF, {
        drivers,
        routes,
        vehicle: vehicle as Vehicles,
        invalidTrackings: invalidPackages.map((p) => p.trackingNumber),
        packages: validPackages,
        subsidiaryName: subsidiaryName ?? "",
        trackingNumber: "VISTA PREVIA",
        sortMode,
      }) as any,
    ).toBlob();
    window.open(URL.createObjectURL(blob), "_blank");
  }, [drivers, routes, vehicle, invalidPackages, validPackages, subsidiaryName, sortMode]);

  return {
    // datos de la salida
    drivers, setDrivers, routes, setRoutes, vehicle, setVehicle, kms, setKms, routeDate, setRouteDate, is315, setIs315,
    todayStr: todayLocal(), tomorrowStr: tomorrowLocal(),
    // paquetes
    packages, validPackages, invalidPackages, invalidNumbers, rawTrackings, setRawTrackings, lastScans, validating, stats,
    handleScan, validateRaw, addSuggested, removePackage, replacePackage, clearAll,
    // proceso
    missing, process, processDispatch, retryFiles, resetProcess, previewPdf, isOnline,
  };
}

export type DispatchSession = ReturnType<typeof useDispatchSession>;
