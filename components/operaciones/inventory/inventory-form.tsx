"use client";

import { PmySpinner } from "@/components/ui/pmy-loader";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import {
  CircleAlertIcon,
  Package,
  PackageCheckIcon,
  Send,
  Trash2,
  Download,
  MoreHorizontal,
  ArrowLeft,
  Search,
  X,
  Keyboard,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import {
  saveInventory,
  validateTrackingNumbers,
  uploadFiles,
  InventoryValidationPayload
} from "@/lib/services/inventories";
import { InventoryRequest, InventoryRejectedTracking, PackageInfo, Inventory } from "@/lib/types";
import { ScanInput, ScanInputHandle } from "@/components/scanner/scan-input";
import { InventoryPDFReport } from "@/lib/services/inventory/inventory-pdf-generator";
import { pdf } from "@react-pdf/renderer";
import { generateInventoryExcel } from "@/lib/services/inventory/inventory-excel-generator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LoaderWithOverlay } from "@/components/loader";
import { OperationHeader } from "@/components/shared/operation-header";
import { PackagesList } from "@/components/shared/packages-list";
import { InventoryPackageToolbar, useInventoryPackageView } from "./inventory-package-view";
import { LastReadCard, QuickCounters } from "./inventory-capture-sidebar";
import { Input } from "@/components/ui/input";
import { countQuickFilters, findScannedPackage, matchesQuickFilter, type QuickFilterKey } from "@/lib/inventory-quick-filters";
import { TransferPackageDialog } from "@/components/shared/transfer-package-dialog";
import {
  initScannerFeedback,
  playExpiresTodaySound,
  playExpiresTomorrowSound,
  playExpiresMondaySound,
  playNotFoundSound,
  playInvalidSound,
} from "@/lib/scanner-feedback";
import { CatalogSelect } from "@/components/shared/catalog-select";
import { downloadBlob, inventoryFileBase } from "@/lib/inventory-files";
import { buildInventoryFiles } from "@/lib/services/inventory/inventory-email";
import { apiError } from "@/components/maintenance/shared/confirm-action";
import { capitalizeDay, isDueOn, nextAlertDay } from "@/lib/next-operating-day";
import { noDueMark } from "@/lib/inventory-excel-rules";
import { getHolidays } from "@/lib/services/holidays/holidays";
import { ShortcutsDialog } from "@/components/warehouse/shared/shortcuts-dialog";
import useSWR from "swr";
import { adoptLegacyInventoryDraft, clearInventoryDraft, inventoryDraftKeys } from "@/lib/inventory-draft";

// Hook useLocalStorage
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      if (typeof window === "undefined") return initialValue;
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Actualización funcional sobre el valor VIGENTE: antes `value(storedValue)` usaba el
  // valor del último render y, al quitar/agregar guías seguidas, se perdían cambios.
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    setStoredValue((prev) => {
      const valueToStore = value instanceof Function ? value(prev) : value;
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
      return valueToStore;
    });
  }, [key]);

  return [storedValue, setValue] as const;
}

interface Props {
  /** Sucursal del inventario (viene de la URL; no se cambia a media captura). */
  subsidiaryId: string;
  subsidiaryName?: string | null;
  /** Se llama al guardar (haya salido o no el correo). */
  onSaved?: (saved: Inventory) => void;
  /** Volver al historial (la captura sin guardar se queda en este navegador). */
  onExit?: () => void;
}

// Tipos de inventario
export enum InventoryType {
  INITIAL = "initial",      // Inventario Inicial
  DEX = "dex",             // Inventario DEX
  FINAL = "final"          // Inventario Final
}



const INVALID_FORMAT_REASON = "Formato de guía inválido";

export default function InventoryForm({ subsidiaryId, subsidiaryName, onSaved, onExit }: Props) {
  // Captura POR SUCURSAL. Esto corre antes que los useLocalStorage de abajo: si hay una captura
  // vieja (claves globales) de ESTA sucursal, se pasa a las claves nuevas para no perderla.
  useState(() => adoptLegacyInventoryDraft(subsidiaryId));
  const draftKeys = useMemo(() => inventoryDraftKeys(subsidiaryId), [subsidiaryId]);

  // Estados persistentes
  const [scannedPackages, setScannedPackages] = useLocalStorage<{trackingNumber: string}[]>(draftKeys.scanned, []);
  const [packages, setPackages] = useLocalStorage<PackageInfo[]>(draftKeys.packages, []);
  // Estado para el tipo de inventario
  const [inventoryType, setInventoryType] = useLocalStorage<InventoryType>(draftKeys.type, InventoryType.INITIAL);

  // Estados regulares
  const [isLoading, setIsLoading] = useState(false);
  const [, setProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  // Rediseño A: los conteos de la izquierda filtran la lista (uno a la vez) y eligen la pestaña.
  const [quickFilter, setQuickFilter] = useState<QuickFilterKey | null>(null);
  const [listTab, setListTab] = useState<"valid" | "rejected">("valid");
  const [isValidationPackages, setIsValidationPackages] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Guías cuyo aviso de vencimiento ya se dio (para no repetirlo en cada validación).
  const [shownExpiringPackages, setShownExpiringPackages] = useState<Set<string>>(new Set());

  const barScannerInputRef = useRef<ScanInputHandle>(null);
  // Firma del último contenido validado (ver efecto de auto-validación).
  const lastSignatureRef = useRef<string>("");
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);

  // Traspaso inline (corregir paquete mal enrutado) — solo roles elevados.
  const canTransfer = ["subadmin", "admin", "superadmin"].includes((user?.role as string) || "");
  const [transferPkg, setTransferPkg] = useState<PackageInfo | null>(null);

  const selectedSubsidiaryId = subsidiaryId || null;
  const selectedSubsidiaryName = subsidiaryName || null;

  // Funciones de utilidad (Sonidos, expiraciones, etc.)
  const getDaysUntilExpiration = useCallback((commitDateTime?: string | null) => {
    if (!commitDateTime) return -1;
    const commitDate = new Date(commitDateTime);
    const today = new Date();
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const commitOnly = new Date(commitDate.getFullYear(), commitDate.getMonth(), commitDate.getDate());
    const diffMs = commitOnly.getTime() - todayOnly.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  }, []);

  // Sonidos del escáner: usan un AudioContext compartido y reanudado por gesto
  // (ver lib/scanner-feedback). Antes cada beep creaba un AudioContext nuevo,
  // por eso "se colgaban" tras varios escaneos y a veces no se oían.
  const playExpirationSound = useCallback(() => playExpiresTodaySound(), []);
  const playTomorrowExpirationSound = useCallback(() => playExpiresTomorrowSound(), []);
  const playNotFoundSnd = useCallback(() => playNotFoundSound(), []);
  const playInvalidSnd = useCallback(() => playInvalidSound(), []);

  // Días sin operación (domingo y festivos de Configuración): si mañana no se opera, se vigila
  // lo que vence el siguiente día que sí. Sin festivos cargados, igual cubre el domingo.
  const { data: holidays } = useSWR("holidays", () => getHolidays(), { revalidateOnFocus: false });
  const alertDay = useMemo(() => nextAlertDay(new Date(), holidays ?? []), [holidays]);

  // Aviso de vencimiento SIN ventana: la ventana bloqueante se quitó en ene-2026 porque
  // cortaba el escaneo. Antes, además, la lista de "mañana" sobrescribía la de "hoy".
  const handleExpirationCheck = useCallback((newPackages: PackageInfo[]) => {
    const today: string[] = [];
    const tomorrow: string[] = [];
    const monday: string[] = []; // si mañana no se opera: lo que vence el siguiente día que sí
    newPackages.forEach(pkg => {
      // Ya entregado o devuelto a FedEx: sin aviso ni sonido de vencimiento.
      if (!pkg.isValid || !pkg.commitDateTime || noDueMark(pkg.status) || shownExpiringPackages.has(pkg.trackingNumber)) return;
      const days = getDaysUntilExpiration(pkg.commitDateTime);
      if (days === 0) today.push(pkg.dhlUniqueId || pkg.trackingNumber);
      else if (days === 1) tomorrow.push(pkg.dhlUniqueId || pkg.trackingNumber);
      else if (isDueOn(pkg.commitDateTime, alertDay)) monday.push(pkg.dhlUniqueId || pkg.trackingNumber);
    });
    if (today.length === 0 && tomorrow.length === 0 && monday.length === 0) return;

    // Gana el más urgente: hoy > mañana > lunes.
    if (today.length > 0) playExpirationSound();
    else if (tomorrow.length > 0) playTomorrowExpirationSound();
    else playExpiresMondaySound();
    toast({
      title: today.length > 0
        ? `Vence hoy: ${today.length} guía(s)`
        : tomorrow.length > 0
          ? `Vence mañana: ${tomorrow.length} guía(s)`
          : `Vence el ${alertDay?.weekday ?? "siguiente día"}: ${monday.length} guía(s)`,
      description: [
        today.length > 0 ? `Hoy: ${today.join(", ")}` : "",
        tomorrow.length > 0 ? `Mañana: ${tomorrow.join(", ")}` : "",
        monday.length > 0 ? `${capitalizeDay(alertDay?.weekday ?? "siguiente")}: ${monday.join(", ")}` : "",
      ].filter(Boolean).join(" · "),
      variant: today.length > 0 ? "destructive" : undefined,
    });

    const keys = newPackages
      .filter(p => p.commitDateTime && ([0, 1].includes(getDaysUntilExpiration(p.commitDateTime)) || isDueOn(p.commitDateTime, alertDay)))
      .map(p => p.trackingNumber);
    setShownExpiringPackages(prev => new Set([...prev, ...keys]));
  }, [getDaysUntilExpiration, shownExpiringPackages, playExpirationSound, playTomorrowExpirationSound, toast, alertDay]);

  // Prepara el feedback sonoro y enlaza el desbloqueo por gesto (autoplay policy).
  useEffect(() => {
    initScannerFeedback();
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-validación "en vivo". Se dispara comparando una FIRMA estable del
  // contenido escaneado (por dhlUniqueId || trackingNumber):
  //  - Es estable cuando el backend resuelve una guía DHL (la pieza escaneada
  //    pasa a su guía maestra) porque el token sigue siendo el dhlUniqueId →
  //    evita el bucle de re-validación que congelaba la UI con 80+ guías.
  //  - Cambia al agregar o quitar guías → re-sincroniza la lista del padre y
  //    resuelve los pendientes (incluso los que ya estaban validados, vía merge
  //    local sin pegarle al backend) para que el escáner no quede en "Validando…".
  useEffect(() => {
    if (isLoading || isValidationPackages || !selectedSubsidiaryId) return;
    if (scannedPackages.length === 0) return;

    const signature = scannedPackages
      .map(p => (((p as any).dhlUniqueId || p.trackingNumber) || "").trim().toUpperCase())
      .sort()
      .join("|");
    if (signature === lastSignatureRef.current) return;

    const handler = setTimeout(() => {
      handleValidatePackages();
      lastSignatureRef.current = signature;
    }, 500);
    return () => clearTimeout(handler);
  }, [scannedPackages, selectedSubsidiaryId, isLoading, isValidationPackages]);

  // Al volver internet, las guías capturadas sin conexión se validan solas.
  useEffect(() => {
    if (!isOnline || isLoading || isValidationPackages || !selectedSubsidiaryId) return;
    if (!packages.some(p => (p as any).isOffline)) return;
    lastSignatureRef.current = "";
    handleValidatePackages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  useEffect(() => {
    const preventZoom = (e: WheelEvent) => { if (e.ctrlKey) e.preventDefault(); };
    const preventKeyZoom = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && ["+", "-", "=", "0"].includes(e.key)) e.preventDefault(); };
    window.addEventListener("wheel", preventZoom, { passive: false });
    window.addEventListener("keydown", preventKeyZoom);
    return () => {
      window.removeEventListener("wheel", preventZoom);
      window.removeEventListener("keydown", preventKeyZoom);
    };
  }, []);

  const clearAllStorage = useCallback((opts: { silent?: boolean } = {}) => {
    clearInventoryDraft(subsidiaryId);

    setScannedPackages([]);
    setPackages([]);
    setInventoryType(InventoryType.INITIAL);
    setShownExpiringPackages(new Set());
    // Resetear la firma para que volver a escanear el mismo set vuelva a validar.
    lastSignatureRef.current = "";
    barScannerInputRef.current?.clear();

    if (!opts.silent) {
      toast({ title: "Captura limpiada", description: "Se borró la captura de esta sucursal." });
    }
  }, [subsidiaryId, setScannedPackages, setPackages, setInventoryType, toast]);

  const handleValidatePackages = async () => {
    if (isLoading || isValidationPackages) return;

    if (!selectedSubsidiaryId) {
      toast({ title: "Error", description: "Selecciona una sucursal antes de validar.", variant: "destructive" });
      setIsValidationPackages(false);
      return;
    }

    // Guías escaneadas (dedup conservando orden de escaneo).
    const scanned = scannedPackages.map(pkg => pkg.trackingNumber);
    const seenScan = new Set<string>();
    const uniqueScanned = scanned.filter(tn => {
      const k = (tn || "").trim().toUpperCase();
      if (!k || seenScan.has(k)) return false;
      seenScan.add(k);
      return true;
    });

    const validNumbers = uniqueScanned.filter((tn) => /^[A-Za-z0-9]{8,35}$/.test(tn));
    const invalidNumbers = uniqueScanned.filter((tn) => !/^[A-Za-z0-9]{8,35}$/.test(tn));

    if (validNumbers.length === 0 && invalidNumbers.length === 0) {
      toast({ title: "Error", description: "No se ingresaron números.", variant: "destructive" });
      setIsValidationPackages(false);
      return;
    }

    setIsValidationPackages(true);
    setIsLoading(true);
    setProgress(0);

    // Códigos ya validados: no se reconsultan. Los capturados SIN CONEXIÓN no cuentan como
    // validados: se vuelven a mandar en cuanto hay internet (antes se quedaban rechazados).
    const isSettled = (p: PackageInfo) => !p.isPendingValidation && !(p as any).isOffline;
    const validatedCodes = new Set<string>();
    packages.forEach(p => {
      if (!isSettled(p)) return;
      if (p.trackingNumber) validatedCodes.add(p.trackingNumber.trim().toUpperCase());
      if (p.dhlUniqueId) validatedCodes.add(p.dhlUniqueId.trim().toUpperCase());
    });

    // Solo lo NUEVO pega al backend => validación "en vivo" (payload liviano).
    const newCodes = validNumbers.filter(tn => !validatedCodes.has(tn.trim().toUpperCase()));

    try {
      let newlyValidated: PackageInfo[] = [];
      if (newCodes.length > 0) {
        const payload: InventoryValidationPayload[] = newCodes.map(tn => ({
          trackingNumber: tn,
          isAlreadyValidated: false,
        }));
        const result = await validateTrackingNumbers(payload, selectedSubsidiaryId);
        newlyValidated = Array.isArray(result?.validatedShipments) ? result.validatedShipments : [];
      }

      // Inválidos de formato (no van al backend) para que se vean en el listado.
      const locallyInvalidPackages = invalidNumbers.map(tn => ({
        id: `invalid-${Date.now()}-${Math.random()}`,
        trackingNumber: tn,
        isValid: false,
        reason: INVALID_FORMAT_REASON,
        isPendingValidation: false,
      } as unknown as PackageInfo));

      // Merge local: conservamos lo ya validado que sigue escaneado + lo nuevo + inválidos.
      // Indexamos por código (los nuevos sobre-escriben para quedarnos con lo más reciente).
      const byCode = new Map<string, PackageInfo>();
      const indexPkg = (p: PackageInfo) => {
        [p.trackingNumber, p.dhlUniqueId]
          .filter(Boolean)
          .forEach(c => {
            const k = (c as string).trim().toUpperCase();
            byCode.set(k, p);
            // DHL: indexamos también la variante JJD<->JD. El backend devuelve la
            // forma de la BD (p. ej. "JD..."), pero el escaneo pudo ser "JJD..." (o
            // viceversa); sin esto la reconstrucción por orden de escaneo no
            // encontraría el paquete y la guía "no se leería".
            if (k.startsWith("JJD")) byCode.set(k.substring(1), p);
            else if (k.startsWith("JD")) byCode.set("J" + k, p);
          });
      };
      packages.forEach(p => { if (isSettled(p)) indexPkg(p); });
      newlyValidated.forEach(indexPkg);
      locallyInvalidPackages.forEach(indexPkg);

      // Reconstruir en ORDEN de escaneo, deduplicando.
      const allProcessedPackages: PackageInfo[] = [];
      const added = new Set<string>();
      uniqueScanned.forEach(tn => {
        const p = byCode.get(tn.trim().toUpperCase());
        if (!p) return;
        const id = ((p.dhlUniqueId || p.trackingNumber) || "").toUpperCase();
        if (added.has(id)) return;
        added.add(id);
        allProcessedPackages.push(p);
      });

      // Reflejar en el escáner (pendiente -> validado) y refrescar la lista.
      barScannerInputRef.current?.updateValidatedPackages?.(allProcessedPackages);
      setPackages(allProcessedPackages);

      handleExpirationCheck(newlyValidated);

      // Sonido diferenciado: formato inválido vs. no encontrada en sistema.
      if (invalidNumbers.length > 0) {
        playInvalidSnd();
      } else if (newlyValidated.some(p => !p.isValid)) {
        playNotFoundSnd();
      }
    } catch (error) {
      console.error("Error validating packages:", error);
      if (!isOnline || !navigator.onLine) {
        // Solo las guías NUEVAS quedan "sin conexión" (sin duplicar las que ya estaban).
        const pendingCodes = new Set(newCodes.map(tn => tn.trim().toUpperCase()));
        const offlinePackages: PackageInfo[] = newCodes.map(tn => ({
          id: `offline-${tn}`,
          trackingNumber: tn,
          isValid: false,
          reason: "Sin conexión: se valida en cuanto vuelva internet",
          isOffline: true,
          createdAt: new Date(),
        } as unknown as PackageInfo));

        setPackages((prev) => [
          ...prev.filter(p => !pendingCodes.has((p.trackingNumber || "").trim().toUpperCase())),
          ...offlinePackages,
        ]);

        toast({
          title: "Sin conexión",
          description: "Las guías quedan guardadas en este navegador y se validan solas al volver internet.",
        });
      } else {
        toast({ title: "Error", description: "Hubo un problema al validar los paquetes.", variant: "destructive" });
      }
    } finally {
      setIsValidationPackages(false);
      setProgress(0);
      setIsLoading(false);

      setTimeout(() => {
        if (barScannerInputRef.current) {
          barScannerInputRef.current.focus();
          try {
            const inputElement = barScannerInputRef.current.getInputElement();
            if (inputElement) {
              inputElement.setSelectionRange(inputElement.value.length, inputElement.value.length);
              inputElement.value += '\n';
            }
          } catch (e) {
            console.log("No se pudo ajustar el campo de entrada:", e);
          }
        }
      }, 150);
    }
  };

  // ==========================================
  // CORRECCIÓN: ELIMINAR BASADO EN UNIQUE ID
  // ==========================================
  const handleRemovePackage = useCallback((identifier: string) => {
    // Quitarla también del escáner: si no, la guía seguía visible arriba y volvía a validarse.
    const pkg = packages.find(p => ((p as any).dhlUniqueId || p.trackingNumber) === identifier);
    const codes = new Set([identifier, `J${identifier}`, identifier.startsWith("JJD") ? identifier.slice(1) : identifier]);
    if (pkg?.trackingNumber) codes.add(pkg.trackingNumber);
    codes.forEach(code => barScannerInputRef.current?.removeByTracking(code));

    setPackages(prev => prev.filter(p => {
      const pId = (p as any).dhlUniqueId || p.trackingNumber;
      return pId !== identifier;
    }));
    setScannedPackages(prev => prev.filter(p => {
      // scannedPackages podría tener el input del usuario (ej. JD1234), lo comparamos
      return p.trackingNumber !== identifier && p.trackingNumber !== `J${identifier}` && `J${p.trackingNumber}` !== identifier;
    }));

    setShownExpiringPackages(prev => {
      const newSet = new Set(prev);
      newSet.delete(identifier);
      return newSet;
    });
  }, [packages, setPackages, setScannedPackages, setShownExpiringPackages]);

  const validPackages = useMemo(() => packages.filter(p => p.isValid && !p.isPendingValidation), [packages]);

  // Escaneadas que NO entran al inventario (se guardan con su motivo para el registro).
  const rejectedTrackings = useMemo<InventoryRejectedTracking[]>(() =>
    packages
      .filter(p => !p.isValid && !p.isPendingValidation)
      .map(p => ({
        trackingNumber: p.dhlUniqueId || p.trackingNumber,
        reason: p.reason || "No válida",
        kind: p.isOffline
          ? "sin_conexion"
          : p.reason === INVALID_FORMAT_REASON
            ? "formato"
            : p.subsidiary
              ? "otra_sucursal"
              : "no_encontrada",
      })),
  [packages]);

  // Conteos de la columna izquierda (sobre las guías que entran al inventario).
  const quickCounts = useMemo(() => countQuickFilters(validPackages, new Date(), alertDay), [validPackages, alertDay]);

  // Búsqueda libre (la paquetería, la ciudad y el orden van en la barra de vista).
  const matchesSearch = useCallback((pkg: PackageInfo) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return (
      pkg.trackingNumber.toLowerCase().includes(term) ||
      (pkg.dhlUniqueId || "").toLowerCase().includes(term) ||
      (!!pkg.recipientZip && pkg.recipientZip.includes(term)) ||
      (!!pkg.recipientName && pkg.recipientName.toLowerCase().includes(term)) ||
      (!!pkg.recipientAddress && pkg.recipientAddress.toLowerCase().includes(term))
    );
  }, [searchTerm]);

  const searchedPackages = useMemo(() => packages.filter(matchesSearch), [packages, matchesSearch]);
  // Paquetería + ciudad + orden (igual que Entrada/Salida de bodega).
  const view = useInventoryPackageView(searchedPackages);
  const visibleValid = useMemo(
    () => view.visible.filter(p => p.isValid && !p.isPendingValidation && matchesQuickFilter(p, quickFilter, new Date(), alertDay)),
    [view.visible, quickFilter, alertDay],
  );
  const visibleRejected = useMemo(() => view.visible.filter(p => !p.isValid && !p.isPendingValidation), [view.visible]);

  const handlePickCounter = (key: QuickFilterKey | "valid" | "rejected") => {
    if (key === "valid" || key === "rejected") {
      setListTab(key);
      setQuickFilter(null);
      return;
    }
    setListTab("valid");
    setQuickFilter(prev => (prev === key ? null : key));
  };

  const QUICK_LABEL: Record<QuickFilterKey, string> = {
    today: "Vencen hoy",
    tomorrow: "Vencen mañana",
    nextDay: `Vencen el ${alertDay?.weekday ?? "siguiente día"}`,
    payment: "Con cobro",
    f2: "F2 / carga",
    highValue: "Alto valor",
  };

  // "Última lectura": el último código escaneado y lo que el sistema sabe de él.
  const lastScan = scannedPackages[scannedPackages.length - 1] as (PackageInfo & { dhlUniqueId?: string }) | undefined;
  const lastCode = lastScan ? (lastScan.dhlUniqueId || lastScan.trackingNumber || null) : null;
  const lastPkg = useMemo(() => findScannedPackage(lastCode, packages), [lastCode, packages]);

  // Atajos de teclado (mismas teclas que Entrada de bodega).
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const saveRef = useRef<() => void>(() => {});
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (transferPkg || showShortcuts) return; // hay una ventana abierta: que la maneje ella
      if (e.key === "F1") {
        e.preventDefault();
        barScannerInputRef.current?.focus();
      } else if (e.key === "F2") {
        e.preventDefault();
        saveRef.current();
      } else if (e.key === "F3") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape" && quickFilter) {
        setQuickFilter(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [transferPkg, showShortcuts, quickFilter]);

  const getInventoryTypeLabel = (type: InventoryType): string => {
    switch (type) {
      case InventoryType.INITIAL: return "Inicial";
      case InventoryType.DEX: return "DEX";
      case InventoryType.FINAL: return "Final";
      default: return "Inicial";
    }
  };

  /** Inventario en captura para PDF/Excel (nombre de archivo con tipo, sucursal y fecha). */
  const buildDraftReport = () => ({
    inventoryDate: new Date().toISOString(),
    type: inventoryType,
    subsidiary: { id: selectedSubsidiaryId ?? "", name: selectedSubsidiaryName ?? "" },
    rejectedTrackings,
  });

  /** Exporta lo que se ve: paquetes válidos con el filtro y el orden elegidos. */
  const handleExportPDF = async () => {
    setIsLoading(true);
    try {
      const report = buildDraftReport();
      const options = { packages: visibleValid, filterLabel: view.filterLabel };
      const blob = await pdf(<InventoryPDFReport report={report} {...options} />).toBlob();
      downloadBlob(blob, `${inventoryFileBase(report)}.pdf`);
      await generateInventoryExcel(report, true, options);
    } catch (err) {
      console.error("PDF export error", err);
      toast({ title: "No se generó el PDF", description: "Intenta de nuevo.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  /** PDF + Excel del inventario guardado (todos los paquetes, en el orden elegido) y envío por correo. */
  const handleSendEmail = async (inventory: Inventory): Promise<boolean> => {
    try {
      const { baseName, pdfBlob, pdfFile, excelFile } = await buildInventoryFiles(
        { ...inventory, type: inventory.type ?? inventoryType },
        view.orderAll(validPackages),
      );
      downloadBlob(pdfBlob, `${baseName}.pdf`);
      // El id del inventario es el que resuelve el correo de la sucursal correcta.
      await uploadFiles(pdfFile, excelFile, selectedSubsidiaryName ?? "", inventory.id);
      return true;
    } catch (err) {
      console.error("Error enviando inventario:", err);
      return false;
    }
  };

  const handleSaveInventory = async () => {
    if (!selectedSubsidiaryId) {
      toast({ title: "Error", description: "Selecciona una sucursal antes de guardar.", variant: "destructive" });
      return;
    }
    if (validPackages.length === 0) {
      toast({ title: "Sin paquetes válidos", description: "No hay paquetes válidos para guardar.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const subsidiary = { id: selectedSubsidiaryId, name: selectedSubsidiaryName ?? "" };
    let saved: Inventory;
    try {
      const payload: InventoryRequest = {
        subsidiary,
        shipments: validPackages.filter(s => !s.isCharge).map(s => s.id as string),
        chargeShipments: validPackages.filter(s => s.isCharge).map(s => s.id as string),
        inventoryDate: new Date().toISOString(),
        type: inventoryType,
        rejectedTrackings,
      };
      saved = await saveInventory(payload);
    } catch (error) {
      console.error("saveInventory error", error);
      // El backend explica en llano qué pasó (p. ej. "Estas guías son de otra sucursal: …").
      toast({ title: "No se guardó el inventario", description: apiError(error, "No se pudo guardar el inventario"), variant: "destructive" });
      setIsLoading(false);
      return;
    }

    // Ya quedó guardado: si falla el correo se avisa, pero la captura no se pierde.
    const sent = await handleSendEmail({ ...saved, subsidiary: saved.subsidiary ?? subsidiary, rejectedTrackings });
    if (sent) {
      toast({ title: "Inventario guardado", description: `Inventario ${getInventoryTypeLabel(inventoryType)} guardado y enviado por correo.` });
    } else {
      toast({
        title: "Inventario guardado, sin correo",
        description: "Se guardó, pero no se pudo enviar el correo. Descarga el PDF y el Excel desde el historial.",
        variant: "destructive",
      });
    }
    clearAllStorage({ silent: true });
    setIsLoading(false);
    onSaved?.(saved);
  };

  const pendingOffline = packages.filter(p => (p as any).isOffline).length;

  saveRef.current = () => {
    if (isLoading || isValidationPackages || validPackages.length === 0 || pendingOffline > 0) return;
    handleSaveInventory();
  };

  const handleExit = () => {
    if (packages.length > 0) {
      toast({ title: "Captura guardada en este navegador", description: "La retomas al volver a Nuevo inventario en esta sucursal." });
    }
    onExit?.();
  };

  return (
    <>
      <div className="relative space-y-3">
          {isValidationPackages && (
            <LoaderWithOverlay overlay transparent text="Validando paquetes..." className="rounded-lg" />
          )}

            <OperationHeader
              icon={PackageCheckIcon}
              title="Nuevo inventario"
              description="Escanea y valida los paquetes que están en bodega"
              subsidiaryName={selectedSubsidiaryName}
              isOffline={!isOnline}
              actions={
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help text-muted-foreground hover:text-foreground transition-colors">
                        <CircleAlertIcon className="h-4 w-4" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        <strong>Inicial:</strong> al inicio del turno<br />
                        <strong>DEX:</strong> después de envíos DEX<br />
                        <strong>Final:</strong> al final del turno
                      </p>
                    </TooltipContent>
                  </Tooltip>

                  <CatalogSelect
                    type="inventory_type"
                    value={inventoryType}
                    onValueChange={(value) => setInventoryType(value as InventoryType)}
                    disabled={isLoading || packages.length > 0}
                    placeholder="Tipo de inventario"
                    className="h-9 w-[160px]"
                  />

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setShowShortcuts(true)} aria-label="Atajos de teclado">
                        <Keyboard className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Atajos de teclado</TooltipContent>
                  </Tooltip>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 gap-1.5" disabled={isLoading}>
                        <MoreHorizontal className="h-4 w-4" />
                        Más acciones
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onSelect={handleExportPDF} disabled={isValidationPackages || validPackages.length === 0}>
                        <Download className="mr-2 h-4 w-4" /> Exportar PDF y Excel
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => clearAllStorage()}
                        disabled={packages.length === 0}
                        className="text-rose-600 focus:text-rose-700"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Limpiar captura
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={handleExit}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Volver al historial
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          size="sm"
                          onClick={handleSaveInventory}
                          disabled={isLoading || isValidationPackages || validPackages.length === 0 || pendingOffline > 0}
                          className="h-9 gap-1.5"
                        >
                          {isLoading ? <PmySpinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                          Guardar inventario ({validPackages.length})
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {pendingOffline > 0 && (
                      <TooltipContent>Faltan {pendingOffline} guía(s) por validar cuando vuelva internet.</TooltipContent>
                    )}
                  </Tooltip>
                </div>
              }
            />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
              {/* Lector: escaneo, última lectura y conteos que filtran */}
              <aside className="space-y-3 lg:sticky lg:top-3 lg:self-start">
                <Card className="py-0">
                  <CardContent className="space-y-3 p-3">
                    <ScanInput
                      ref={barScannerInputRef}
                      storageKey={draftKeys.scanStorageKey}
                      defaultView="simple"
                      onPackagesChange={setScannedPackages}
                      disabled={isValidationPackages || !selectedSubsidiaryId}
                      placeholder={!selectedSubsidiaryId ? "Selecciona una sucursal primero" : "Escanea guías FedEx o DHL"}
                    />
                    <LastReadCard code={lastCode} pkg={lastPkg} onTransfer={canTransfer ? setTransferPkg : undefined} alertDay={alertDay} />
                  </CardContent>
                </Card>

                {packages.length > 0 && (
                  <Card className="py-0">
                    <CardContent className="p-2">
                      <QuickCounters
                        valid={validPackages.length}
                        rejected={rejectedTrackings.length}
                        counts={quickCounts}
                        alertDay={alertDay}
                        active={quickFilter}
                        tab={listTab}
                        onPick={handlePickCounter}
                      />
                    </CardContent>
                  </Card>
                )}
              </aside>

              {/* Lista de guías */}
              <section className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-[220px] flex-1">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      ref={searchInputRef}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar guía, CP, nombre o dirección"
                      className="h-9 pl-8"
                    />
                  </div>
                  <InventoryPackageToolbar view={view} />
                </div>

                {packages.length > 0 ? (
                  <Tabs value={listTab} onValueChange={(v) => setListTab(v as "valid" | "rejected")} className="w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <TabsList className="h-8">
                        <TabsTrigger value="valid" className="gap-1.5 text-xs">
                          Válidos <Badge variant="secondary" className="px-1.5 text-xs">{visibleValid.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="rejected" className="gap-1.5 text-xs">
                          No incluidas <Badge variant="secondary" className="px-1.5 text-xs">{visibleRejected.length}</Badge>
                        </TabsTrigger>
                      </TabsList>
                      {quickFilter && listTab === "valid" && (
                        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setQuickFilter(null)}>
                          {QUICK_LABEL[quickFilter]} <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    <TabsContent value="valid" className="mt-2">
                      <PackagesList
                        packages={visibleValid}
                        showFilters={false}
                        groupBy={view.groupBy}
                        showRowNumbers={view.showRowNumbers}
                        alertDay={alertDay}
                        onRemove={handleRemovePackage}
                        isLoading={isLoading}
                        maxHeightClass="max-h-[calc(100vh-15rem)] min-h-[240px]"
                        emptyTitle={quickFilter ? `Sin guías en "${QUICK_LABEL[quickFilter]}"` : "Sin guías válidas"}
                        emptyDescription={quickFilter ? "Quita el filtro para ver todas." : "Ninguna guía coincide con la búsqueda, la paquetería o la ciudad."}
                      />
                    </TabsContent>

                    {/* Escaneadas que no entran: no existen, son de otra sucursal o el formato es inválido. */}
                    <TabsContent value="rejected" className="mt-2">
                      <PackagesList
                        packages={visibleRejected}
                        showFilters={false}
                        groupBy={view.groupBy}
                        showRowNumbers={view.showRowNumbers}
                        onRemove={handleRemovePackage}
                        onTransfer={canTransfer ? setTransferPkg : undefined}
                        isLoading={isLoading || isValidationPackages}
                        maxHeightClass="max-h-[calc(100vh-15rem)] min-h-[240px]"
                        emptyTitle="Todo entra al inventario"
                        emptyDescription="No hay guías rechazadas."
                      />
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="rounded-lg border-2 border-dashed border-muted py-16 text-center">
                    <Package className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mb-1 text-base font-medium">Escanea la primera guía</h3>
                    <p className="text-sm text-muted-foreground">Las guías aparecen aquí agrupadas por ciudad conforme las lees.</p>
                  </div>
                )}
              </section>
            </div>
      </div>

      <ShortcutsDialog
        open={showShortcuts}
        onOpenChange={setShowShortcuts}
        shortcuts={[
          { key: "F1", action: "Ir al escáner" },
          { key: "F2", action: "Guardar inventario" },
          { key: "F3", action: "Buscar en la lista (guía o CP)" },
          { key: "ESC", action: "Quitar el filtro de conteo" },
        ]}
      />

      <TransferPackageDialog
        open={!!transferPkg}
        onOpenChange={(o) => !o && setTransferPkg(null)}
        pkg={transferPkg}
        currentSubsidiaryId={selectedSubsidiaryId}
        currentSubsidiaryName={selectedSubsidiaryName}
        source="inventory"
        onSuccess={(pkg, destinationId) => {
          const id = (pkg as any).dhlUniqueId || pkg.trackingNumber;
          if (destinationId === selectedSubsidiaryId) {
            // Se traspasó a la sucursal actual: ahora sí pertenece -> revalidar a "válido".
            setPackages(prev =>
              prev.map(p => {
                const pid = (p as any).dhlUniqueId || p.trackingNumber;
                return pid === id
                  ? { ...p, isValid: true, reason: undefined, subsidiary: { ...((p as any).subsidiary || {}), id: destinationId } }
                  : p;
              })
            );
          } else {
            // Se mandó a otra sucursal: ya no está aquí -> quitarlo.
            handleRemovePackage(id);
          }
          setTransferPkg(null);
        }}
      />

    </>
  );
}