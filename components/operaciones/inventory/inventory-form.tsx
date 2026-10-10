"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import {
  Check,
  CircleAlertIcon,
  GemIcon,
  Package,
  PackageCheckIcon,
  Send,
  Trash2,
  Loader2,
  Download,
  X,
  Clock,
  BanknoteIcon
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
import { StatBar, StatItem } from "@/components/shared/stat-bar";
import { PackagesPanelHeader } from "@/components/shared/packages-panel-header";
import { PackageFilters, computePackageFilterCounts } from "@/components/shared/package-filters";
import { daysUntilCommit } from "@/components/shared/package-list-item";
import { PackagesList } from "@/components/shared/packages-list";
import { CarrierFilter, InventoryPackageToolbar, useInventoryPackageView } from "./inventory-package-view";
import { TransferPackageDialog } from "@/components/shared/transfer-package-dialog";
import {
  initScannerFeedback,
  playExpiresTodaySound,
  playExpiresTomorrowSound,
  playNotFoundSound,
  playInvalidSound,
} from "@/lib/scanner-feedback";
import { CatalogSelect } from "@/components/shared/catalog-select";

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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSubsidiaryId?: string | null;
  subsidiaryName?: string | null;
  onClose?: () => void;
  onSuccess?: () => void;
}

// Tipos de inventario
export enum InventoryType {
  INITIAL = "initial",      // Inventario Inicial
  DEX = "dex",             // Inventario DEX
  FINAL = "final"          // Inventario Final
}



const INVALID_FORMAT_REASON = "Formato de guía inválido";

export default function InventoryForm({ open, onOpenChange, selectedSubsidiaryId: propSubsidiaryId, subsidiaryName: propSubsidiaryName, onClose, onSuccess }: Props) {
  // Estados persistentes
  const [scannedPackages, setScannedPackages] = useLocalStorage<{trackingNumber: string}[]>(
    'inventory_scanned_packages', 
    []
  );
  const [packages, setPackages] = useLocalStorage<PackageInfo[]>(
    'inventory_packages', 
    []
  );
  // Estado para el tipo de inventario
  const [inventoryType, setInventoryType] = useLocalStorage<InventoryType>(
    'inventory_type',
    InventoryType.INITIAL
  );

  // Estados regulares
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [onlyToday, setOnlyToday] = useState(false);
  const [onlyPayment, setOnlyPayment] = useState(false);
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

  const selectedSubsidiaryId = useMemo(() => {
    return propSubsidiaryId || null; 
  }, [propSubsidiaryId]);

  const selectedSubsidiaryName = useMemo(() => {
    return propSubsidiaryName || null;
  }, [propSubsidiaryName]);

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

  // Aviso de vencimiento SIN ventana: la ventana bloqueante se quitó en ene-2026 porque
  // cortaba el escaneo. Antes, además, la lista de "mañana" sobrescribía la de "hoy".
  const handleExpirationCheck = useCallback((newPackages: PackageInfo[]) => {
    const today: string[] = [];
    const tomorrow: string[] = [];
    newPackages.forEach(pkg => {
      if (!pkg.isValid || !pkg.commitDateTime || shownExpiringPackages.has(pkg.trackingNumber)) return;
      const days = getDaysUntilExpiration(pkg.commitDateTime);
      if (days === 0) today.push(pkg.dhlUniqueId || pkg.trackingNumber);
      else if (days === 1) tomorrow.push(pkg.dhlUniqueId || pkg.trackingNumber);
    });
    if (today.length === 0 && tomorrow.length === 0) return;

    if (today.length > 0) playExpirationSound();
    else playTomorrowExpirationSound();
    toast({
      title: today.length > 0 ? `Vence hoy: ${today.length} guía(s)` : `Vence mañana: ${tomorrow.length} guía(s)`,
      description: [
        today.length > 0 ? `Hoy: ${today.join(", ")}` : "",
        tomorrow.length > 0 ? `Mañana: ${tomorrow.join(", ")}` : "",
      ].filter(Boolean).join(" · "),
      variant: today.length > 0 ? "destructive" : undefined,
    });

    const keys = newPackages
      .filter(p => p.commitDateTime && [0, 1].includes(getDaysUntilExpiration(p.commitDateTime)))
      .map(p => p.trackingNumber);
    setShownExpiringPackages(prev => new Set([...prev, ...keys]));
  }, [getDaysUntilExpiration, shownExpiringPackages, playExpirationSound, playTomorrowExpirationSound, toast]);

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

  const clearAllStorage = useCallback(() => {
    const keys = [
      'inventory_scanned_packages',
      'inventory_packages',
      'inventory_missing_trackings', // claves viejas: se limpian si quedaron
      'inventory_unscanned_trackings',
      'inventory_type'
    ];
    keys.forEach(key => {
      try { window.localStorage.removeItem(key); } catch (error) { console.warn(`Error clearing ${key}:`, error); }
    });

    setScannedPackages([]);
    setPackages([]);
    setInventoryType(InventoryType.INITIAL);
    setShownExpiringPackages(new Set());
    // Resetear la firma para que volver a escanear el mismo set vuelva a validar.
    lastSignatureRef.current = "";
    barScannerInputRef.current?.clear();

    toast({
      title: "Datos limpiados",
      description: "Todos los datos locales han sido eliminados.",
    });
  }, [setScannedPackages, setPackages, setInventoryType, toast]);

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

    try {
      // Códigos ya validados (no pendientes): no se reconsultan.
      const validatedCodes = new Set<string>();
      packages.forEach(p => {
        if (p.isPendingValidation) return;
        if (p.trackingNumber) validatedCodes.add(p.trackingNumber.trim().toUpperCase());
        if (p.dhlUniqueId) validatedCodes.add(p.dhlUniqueId.trim().toUpperCase());
      });

      // Solo lo NUEVO pega al backend => validación "en vivo" (payload liviano).
      const newCodes = validNumbers.filter(tn => !validatedCodes.has(tn.trim().toUpperCase()));

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
      packages.forEach(p => { if (!p.isPendingValidation) indexPkg(p); });
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
      if (!isOnline) {
        const offlinePackages: PackageInfo[] = validNumbers.map(tn => ({
          id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          trackingNumber: tn,
          isValid: false,
          reason: "Sin conexión - validar cuando se restablezca internet",
          isOffline: true,
          createdAt: new Date(),
        } as unknown as PackageInfo));

        setPackages((prev) => [...prev, ...offlinePackages]);
        
        toast({
          title: "Modo offline activado",
          description: `Se guardaron localmente. Se validarán cuando se recupere la conexión.`,
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

  // Contadores estandarizados (StatBar) para el resumen de la jornada.
  const inventoryStats = useMemo<StatItem[]>(() => {
    let today = 0, tomorrow = 0, withPayment = 0, f2 = 0, highValue = 0;
    for (const p of validPackages) {
      const d = daysUntilCommit(p.commitDateTime);
      if (d === 0) today++;
      else if (d === 1) tomorrow++;
      if (p.payment) withPayment++;
      if (p.isCharge) f2++;
      if (p.isHighValue) highValue++;
    }
    return [
      { label: "Total", value: packages.length, icon: Package },
      { label: "Válidos", value: validPackages.length, valueClassName: "text-green-600" },
      { label: "Vencen hoy", value: today, valueClassName: "text-red-600", icon: Clock },
      { label: "Vencen mañana", value: tomorrow, valueClassName: "text-amber-600", icon: Clock },
      { label: "Con cobro", value: withPayment, valueClassName: "text-blue-600", icon: BanknoteIcon },
      { label: "F2 / Carga", value: f2, valueClassName: "text-green-600" },
      { label: "Alto valor", value: highValue, valueClassName: "text-violet-600", icon: GemIcon },
      { label: "No incluidas", value: rejectedTrackings.length, valueClassName: "text-red-600" },
    ];
  }, [validPackages, packages.length, rejectedTrackings.length]);

  // Filtros de búsqueda/chips (la paquetería y la ciudad van en la barra de vista).
  const matchesFilters = useCallback((pkg: PackageInfo) => {
    const term = searchTerm.trim().toLowerCase();
    const uniqueId = (pkg.dhlUniqueId || "").toLowerCase();
    const matchesSearch = !term ||
      pkg.trackingNumber.toLowerCase().includes(term) ||
      uniqueId.includes(term) ||
      (pkg.recipientZip && pkg.recipientZip.includes(term)) ||
      (pkg.recipientName && pkg.recipientName.toLowerCase().includes(term)) ||
      (pkg.recipientAddress && pkg.recipientAddress.toLowerCase().includes(term));
    const matchesPriority = filterPriority === "all" || pkg.priority === filterPriority;
    const matchesStatus = filterStatus === "all" ||
      (filterStatus === "special" && (pkg.isCharge || pkg.isHighValue || pkg.payment)) ||
      (filterStatus === "normal" && !pkg.isCharge && !pkg.isHighValue && !pkg.payment);
    const matchesToday = !onlyToday || daysUntilCommit(pkg.commitDateTime) === 0;
    const matchesPayment = !onlyPayment || !!pkg.payment;
    return matchesSearch && matchesPriority && matchesStatus && matchesToday && matchesPayment;
  }, [searchTerm, filterPriority, filterStatus, onlyToday, onlyPayment]);

  const filterCounts = useMemo(() => computePackageFilterCounts(packages, daysUntilCommit), [packages]);
  const searchedPackages = useMemo(() => packages.filter(matchesFilters), [packages, matchesFilters]);
  // Paquetería + ciudad + orden (igual que Entrada/Salida de bodega).
  const view = useInventoryPackageView(searchedPackages);
  const visibleValid = useMemo(() => view.visible.filter(p => p.isValid && !p.isPendingValidation), [view.visible]);
  const visibleRejected = useMemo(() => view.visible.filter(p => !p.isValid && !p.isPendingValidation), [view.visible]);

  const activeFilterCount =
    (filterPriority !== "all" ? 1 : 0) +
    (filterStatus !== "all" ? 1 : 0) +
    (onlyToday ? 1 : 0) +
    (onlyPayment ? 1 : 0);

  const clearFilters = () => {
    setSearchTerm("");
    setFilterPriority("all");
    setFilterStatus("all");
    setOnlyToday(false);
    setOnlyPayment(false);
    view.setCarrier("all");
    view.setCity("all");
  };

  const getInventoryTypeLabel = (type: InventoryType): string => {
    switch (type) {
      case InventoryType.INITIAL: return "Inicial";
      case InventoryType.DEX: return "DEX";
      case InventoryType.FINAL: return "Final";
      default: return "Inicial";
    }
  };

  /** Descarga un archivo generado (no abre pestaña: el navegador bloquea ventanas tras un await). */
  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const fileStamp = () =>
    new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-");

  /** Inventario en captura para PDF/Excel. */
  const buildDraftReport = () => ({
    inventoryDate: new Date().toISOString(),
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
      const typeLabel = getInventoryTypeLabel(inventoryType).toUpperCase();
      downloadBlob(blob, `INVENTARIO-${typeLabel}--${selectedSubsidiaryName ?? ""}--${fileStamp()}.pdf`);
      await generateInventoryExcel(report, true, options);
    } catch (err) {
      console.error("PDF export error", err);
      toast({ title: "Error", description: "No se pudo generar el PDF.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  /** PDF + Excel del inventario guardado (todos los paquetes, en el orden elegido) y envío por correo. */
  const handleSendEmail = async (inventory: Inventory): Promise<boolean> => {
    try {
      const options = { packages: view.orderAll(validPackages) };
      const inventoryTypeLabel = getInventoryTypeLabel(inventoryType).toUpperCase();
      const baseName = `INVENTARIO-${inventoryTypeLabel}--${selectedSubsidiaryName}--${fileStamp()}`;

      const blob = await pdf(<InventoryPDFReport report={inventory} {...options} />).toBlob();
      downloadBlob(blob, `${baseName}.pdf`);
      const pdfFile = new File([blob], `${baseName}.pdf`, { type: "application/pdf" });

      const excelBuffer = await generateInventoryExcel(inventory, true, options);
      const excelFile = new File([excelBuffer], `${baseName}.xlsx`, {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      // IMPORTANTE: enviar el id del inventario para que el backend resuelva el
      // correo de la sucursal correcta (fix que se había perdido al condensar el archivo).
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
      toast({ title: "Error", description: "No se pudo guardar el inventario. Intenta de nuevo.", variant: "destructive" });
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
    clearAllStorage();
    setIsLoading(false);
    onSuccess?.();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange} >
        <DialogContent
          className="max-w-6xl max-h-[95vh] p-0 gap-0 flex flex-col overflow-hidden"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          showCloseButton={false}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Inventario de Paquetes</DialogTitle>
          </DialogHeader>

          {isValidationPackages && (
            <LoaderWithOverlay overlay transparent text="Validando paquetes..." className="rounded-lg" />
          )}

          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
            <OperationHeader
              inline
              icon={PackageCheckIcon}
              title="Inventario de Paquetes"
              description="Escanea y valida paquetes"
              subsidiaryName={selectedSubsidiaryName}
              isOffline={!isOnline}
              actions={
                <div className="flex items-center gap-2 w-full sm:w-auto">
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
                    className="h-9 flex-1 sm:flex-none sm:w-[170px]"
                  />

                  {packages.length > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={clearAllStorage}
                          disabled={isLoading}
                          className="h-9 w-9 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Limpiar todo</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              }
            />

            {packages.length > 0 && <StatBar items={inventoryStats} />}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              
              {/* COLUMNA IZQUIERDA - Componente de escaneo */}
              <div className="xl:col-span-1 space-y-4">
                <Card>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <ScanInput
                        ref={barScannerInputRef}
                        storageKey="scan:inventario"
                        defaultView="rich"
                        onPackagesChange={setScannedPackages}
                        disabled={isValidationPackages || !selectedSubsidiaryId}
                        placeholder={!selectedSubsidiaryId ? "Selecciona una sucursal primero" : "Escanea guías FedEx o DHL"}
                      />
                    </div>

                    {(isValidationPackages || isLoading) && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label>Progreso de validación</Label>
                          <span className="text-sm text-muted-foreground">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    )}

                    {/*<Button 
                      onClick={handleValidatePackages} 
                      disabled={isValidationPackages || isLoading || !selectedSubsidiaryId || scannedPackages.length === 0} 
                      className="w-full gap-2"
                      variant="outline"
                    >
                      {isValidationPackages ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scan className="h-4 w-4" />}
                      {isValidationPackages ? "Validando..." : "Validar paquetes"}
                    </Button>*/}
                  </CardContent>
                </Card>

              </div>

              {/* COLUMNA DERECHA - Tabla de validaciones */}
              <div className="xl:col-span-2 space-y-3">
                <PackagesPanelHeader
                  subtitle={<>Tipo: <span className="font-medium">{getInventoryTypeLabel(inventoryType)}</span></>}
                  isOffline={!isOnline}
                />

                <PackageFilters
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  searchPlaceholder="Buscar ID de pieza, tracking maestro, CP, destinatario..."
                  carrier={view.carrier}
                  onCarrierChange={(v) => view.setCarrier(v as CarrierFilter)}
                  showCarrier={false}
                  onlyToday={onlyToday}
                  onToggleToday={() => setOnlyToday((v) => !v)}
                  onlyPayment={onlyPayment}
                  onTogglePayment={() => setOnlyPayment((v) => !v)}
                  priority={filterPriority}
                  onPriorityChange={setFilterPriority}
                  type={filterStatus}
                  onTypeChange={setFilterStatus}
                  activeFilterCount={activeFilterCount}
                  onClear={clearFilters}
                  counts={filterCounts}
                />

                {/* Listado Principal */}
                {packages.length > 0 ? (
                  <>
                    <InventoryPackageToolbar view={view} />

                    <Tabs defaultValue="todos" className="w-full">
                      <TabsList className="grid w-full grid-cols-3 mb-3">
                        <TabsTrigger value="todos" className="flex items-center gap-1 text-xs py-2">
                          <Package className="h-3 w-3" /> Todos
                          <Badge variant="secondary" className="ml-1 text-xs">{view.visible.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="validos" className="flex items-center gap-1 text-xs py-2">
                          <Check className="h-3 w-3" /> Válidos
                          <Badge variant="secondary" className="ml-1 text-xs">{visibleValid.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="no-incluidas" className="flex items-center gap-1 text-xs py-2">
                          <CircleAlertIcon className="h-3 w-3" /> No incluidas
                          <Badge variant="secondary" className="ml-1 text-xs">{visibleRejected.length}</Badge>
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="todos">
                        <PackagesList
                          packages={view.visible}
                          showFilters={false}
                          groupBy={view.groupBy}
                          showRowNumbers={view.showRowNumbers}
                          onRemove={handleRemovePackage}
                          onTransfer={canTransfer ? setTransferPkg : undefined}
                          isLoading={isLoading || isValidationPackages}
                          maxHeightClass="max-h-[400px]"
                          emptyTitle="Sin coincidencias"
                          emptyDescription="Ninguna guía coincide con la paquetería o ciudad elegida."
                        />
                      </TabsContent>

                      <TabsContent value="validos">
                        <PackagesList
                          packages={visibleValid}
                          showFilters={false}
                          groupBy={view.groupBy}
                          showRowNumbers={view.showRowNumbers}
                          onRemove={handleRemovePackage}
                          isLoading={isLoading}
                          maxHeightClass="max-h-[400px]"
                          emptyTitle="Sin paquetes válidos"
                          emptyDescription="No hay paquetes válidos con estos filtros."
                        />
                      </TabsContent>

                      {/* Escaneadas que no entran: no existen, son de otra sucursal o el formato es inválido. */}
                      <TabsContent value="no-incluidas">
                        <PackagesList
                          packages={visibleRejected}
                          showFilters={false}
                          groupBy={view.groupBy}
                          showRowNumbers={view.showRowNumbers}
                          onRemove={handleRemovePackage}
                          onTransfer={canTransfer ? setTransferPkg : undefined}
                          isLoading={isLoading || isValidationPackages}
                          maxHeightClass="max-h-[400px]"
                          emptyTitle="Todo entra al inventario"
                          emptyDescription="No hay guías rechazadas."
                        />
                      </TabsContent>
                    </Tabs>
                  </>
                ) : (
                  <div className="text-center py-16 border-2 border-dashed border-muted rounded-lg">
                    <Package className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">Sin paquetes escaneados</h3>
                    <p className="text-muted-foreground">Escanea algunos paquetes para comenzar</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-row justify-end gap-2 border-t bg-background p-3 sm:p-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading} className="gap-2">
              <X className="h-4 w-4" /> Cancelar
            </Button>
            <Button
              onClick={handleExportPDF}
              disabled={isLoading || isValidationPackages || packages.length === 0}
              variant="outline"
              className="gap-2"
            >
              <Download className="h-4 w-4" /> Exportar PDF
            </Button>
            <Button
              onClick={handleSaveInventory}
              disabled={isLoading || isValidationPackages || validPackages.length === 0}
              className="gap-2"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Guardar {getInventoryTypeLabel(inventoryType)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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