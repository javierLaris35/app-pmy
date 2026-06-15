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
  AlertCircle,
  Check,
  ChevronsUpDown,
  CircleAlertIcon,
  DollarSignIcon,
  GemIcon,
  MapPin,
  Package,
  PackageCheckIcon,
  Phone,
  Scan,
  Send,
  Trash2,
  User,
  Loader2,
  Search,
  Filter,
  ChevronDown,
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
import { InventoryRequest, PackageInfo, Inventory } from "@/lib/types";
import { BarcodeScannerInput, BarcodeScannerInputHandle } from "@/components/barcode-input/barcode-scanner-input-list";
import { InventoryPDFReport } from "@/lib/services/inventory/inventory-pdf-generator";
import { pdf } from "@react-pdf/renderer";
import { generateInventoryExcel } from "@/lib/services/inventory/inventory-excel-generator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LoaderWithOverlay } from "@/components/loader";
import { ExpirationAlertModal } from "@/components/ExpirationAlertModal";
import { OperationHeader } from "@/components/shared/operation-header";
import { StatBar, StatItem } from "@/components/shared/stat-bar";
import { PackagesPanelHeader } from "@/components/shared/packages-panel-header";
import { PackageFilters } from "@/components/shared/package-filters";
import { PackageListItem, daysUntilCommit } from "@/components/shared/package-list-item";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

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

enum TrackingNotFoundEnum {
  NOT_SCANNED = "Guia sin escaneo",
  NOT_TRACKING = "Guia faltante",
  NOT_IN_CHARGE = "No Llego en la Carga"
}

// Tipos de inventario
export enum InventoryType {
  INITIAL = "initial",      // Inventario Inicial
  DEX = "dex",             // Inventario DEX
  FINAL = "final"          // Inventario Final
}

// Types para manejo de expiración
interface ExpiringPackage {
  trackingNumber: string;
  recipientName?: string;
  recipientAddress?: string;
  commitDateTime?: string;
  daysUntilExpiration: number;
  priority?: string;
}

// Opciones de motivo para guías inválidas (inventario).
const REASON_OPTIONS = Object.entries(TrackingNotFoundEnum).map(([key, label]) => ({ key, label }));

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
  const [missingTrackings, setMissingTrackings] = useLocalStorage<string[]>(
    'inventory_missing_trackings', 
    []
  );
  const [unScannedTrackings, setUnScannedTrackings] = useLocalStorage<string[]>(
    'inventory_unscanned_trackings', 
    []
  );
  const [selectedReasons, setSelectedReasons] = useLocalStorage<Record<string, string>>(
    'inventory_selected_reasons', 
    {}
  );
  // Estado para el tipo de inventario
  const [inventoryType, setInventoryType] = useLocalStorage<InventoryType>(
    'inventory_type',
    InventoryType.INITIAL
  );

  // Estados regulares
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCarrier, setFilterCarrier] = useState<string>("all");
  const [onlyToday, setOnlyToday] = useState(false);
  const [onlyPayment, setOnlyPayment] = useState(false);
  const [isValidationPackages, setIsValidationPackages] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Estados para manejo de expiración
  const [expirationAlertOpen, setExpirationAlertOpen] = useState(false);
  const [expiringPackages, setExpiringPackages] = useState<ExpiringPackage[]>([]);
  const [currentExpiringIndex, setCurrentExpiringIndex] = useState(0);
  const [shownExpiringPackages, setShownExpiringPackages] = useState<Set<string>>(new Set());

  const barScannerInputRef = useRef<BarcodeScannerInputHandle>(null);
  // Firma del último contenido validado (ver efecto de auto-validación).
  const lastSignatureRef = useRef<string>("");
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);

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

  // Sonido para paquetes que VENCEN HOY (doble beep agudo).
  const playExpirationSound = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioContext = new AudioCtx();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.type = "square";
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      const now = audioContext.currentTime;
      oscillator.frequency.setValueAtTime(1000, now);
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.setValueAtTime(0, now + 0.1);
      oscillator.frequency.setValueAtTime(1000, now + 0.15);
      gainNode.gain.setValueAtTime(0.2, now + 0.15);
      gainNode.gain.setValueAtTime(0, now + 0.25);
      oscillator.start(now);
      oscillator.stop(now + 0.3);
    } catch (err) {
      console.warn("playExpirationSound error:", err);
    }
  }, []);

  // Sonido para paquetes que VENCEN MAÑANA (un beep suave).
  const playTomorrowExpirationSound = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioContext = new AudioCtx();
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = "sine";
      osc.connect(gain);
      gain.connect(audioContext.destination);
      const now = audioContext.currentTime;
      osc.frequency.setValueAtTime(700, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.setValueAtTime(0, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.14);
    } catch (err) {
      console.warn("playTomorrowExpirationSound error:", err);
    }
  }, []);

  // Sonido para guías INVÁLIDAS / NO ENCONTRADAS (dos tonos descendentes).
  const playInvalidSound = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioContext = new AudioCtx();
      const now = audioContext.currentTime;

      const o1 = audioContext.createOscillator();
      const g1 = audioContext.createGain();
      o1.type = "triangle";
      o1.frequency.setValueAtTime(880, now);
      g1.gain.setValueAtTime(0.15, now);
      o1.connect(g1);
      g1.connect(audioContext.destination);
      o1.start(now);
      o1.stop(now + 0.09);

      const o2 = audioContext.createOscillator();
      const g2 = audioContext.createGain();
      const t2 = now + 0.12;
      o2.type = "triangle";
      o2.frequency.setValueAtTime(660, t2);
      g2.gain.setValueAtTime(0.15, t2);
      o2.connect(g2);
      g2.connect(audioContext.destination);
      o2.start(t2);
      o2.stop(t2 + 0.12);
    } catch (err) {
      console.warn("playInvalidSound error:", err);
    }
  }, []);

  const handleExpirationCheck = useCallback((newPackages: PackageInfo[]) => {
    const expiringToday: ExpiringPackage[] = [];
    const expiringTomorrow: ExpiringPackage[] = [];

    newPackages.forEach(pkg => {
      if (!pkg.isValid || !pkg.commitDateTime) return;
      const days = getDaysUntilExpiration(pkg.commitDateTime);
      if (days === 0 && !shownExpiringPackages.has(pkg.trackingNumber)) {
        expiringToday.push({
          trackingNumber: pkg.trackingNumber,
          recipientName: pkg.recipientName || undefined,
          recipientAddress: pkg.recipientAddress || undefined,
          commitDateTime: pkg.commitDateTime || undefined,
          daysUntilExpiration: 0,
          priority: pkg.priority || undefined
        });
      } else if (days === 1 && !shownExpiringPackages.has(pkg.trackingNumber)) {
        expiringTomorrow.push({
          trackingNumber: pkg.trackingNumber,
          recipientName: pkg.recipientName || undefined,
          recipientAddress: pkg.recipientAddress || undefined,
          commitDateTime: pkg.commitDateTime || undefined,
          daysUntilExpiration: 1,
          priority: pkg.priority || undefined
        });
      }
    });

    if (expiringToday.length > 0) {
      setExpiringPackages(expiringToday);
      setCurrentExpiringIndex(0);
      playExpirationSound();
      const newShown = new Set(shownExpiringPackages);
      expiringToday.forEach(p => newShown.add(p.trackingNumber));
      setShownExpiringPackages(newShown);
    }

    if (expiringTomorrow.length > 0) {
      setExpiringPackages(expiringTomorrow);
      setCurrentExpiringIndex(0);
      playTomorrowExpirationSound();
      const newShown = new Set(shownExpiringPackages);
      expiringTomorrow.forEach(p => newShown.add(p.trackingNumber));
      setShownExpiringPackages(newShown);
    }
  }, [getDaysUntilExpiration, shownExpiringPackages, setShownExpiringPackages, playExpirationSound, playTomorrowExpirationSound]);

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

  const simulateScannerEnter = (inputElement: HTMLTextAreaElement | null) => {
    if (!inputElement) return;
    const enterKeyEvent = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true });
    inputElement.dispatchEvent(enterKeyEvent);
    const enterKeyUpEvent = new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true });
    inputElement.dispatchEvent(enterKeyUpEvent);
    const inputEvent = new Event('input', { bubbles: true });
    inputElement.dispatchEvent(inputEvent);
  };

  const handleSelectMissingTracking = (id: string, value: string) => {
    setSelectedReasons(prev => ({ ...prev, [id]: value }));

    if (value === TrackingNotFoundEnum.NOT_TRACKING) {
      setMissingTrackings(prev => [...prev, id]);
      setUnScannedTrackings(prev => prev.filter(item => item !== id));
    } else if (value === TrackingNotFoundEnum.NOT_SCANNED) {
      setUnScannedTrackings(prev => [...prev, id]);
      setMissingTrackings(prev => prev.filter(item => item !== id));
    } else if (value === TrackingNotFoundEnum.NOT_IN_CHARGE) {
      setMissingTrackings(prev => prev.filter(item => item !== id));
      setUnScannedTrackings(prev => prev.filter(item => item !== id));
    }
    setOpenPopover(null);
  };

  const clearAllStorage = useCallback(() => {
    const keys = [
      'inventory_scanned_packages',
      'inventory_packages',
      'inventory_missing_trackings',
      'inventory_unscanned_trackings',
      'inventory_selected_reasons',
      'inventory_type'
    ];
    keys.forEach(key => {
      try { window.localStorage.removeItem(key); } catch (error) { console.warn(`Error clearing ${key}:`, error); }
    });

    setScannedPackages([]);
    setPackages([]);
    setMissingTrackings([]);
    setUnScannedTrackings([]);
    setSelectedReasons({});
    setInventoryType(InventoryType.INITIAL);
    setShownExpiringPackages(new Set());
    // Resetear la firma para que volver a escanear el mismo set vuelva a validar.
    lastSignatureRef.current = "";
    barScannerInputRef.current?.clear();

    toast({
      title: "Datos limpiados",
      description: "Todos los datos locales han sido eliminados.",
    });
  }, [setScannedPackages, setPackages, setMissingTrackings, setUnScannedTrackings, setSelectedReasons, setInventoryType]);

  const handleNextExpiring = useCallback(() => {
    const packagesDueToday = expiringPackages.filter(pkg => pkg.daysUntilExpiration === 0);
    if (currentExpiringIndex < packagesDueToday.length - 1) {
      setCurrentExpiringIndex(prev => prev + 1);
    } else {
      setExpirationAlertOpen(false);
      setCurrentExpiringIndex(0);
      setTimeout(() => {
        if (barScannerInputRef.current) {
          barScannerInputRef.current.focus();
          try {
            const inputElement = barScannerInputRef.current.getInputElement();
            if (inputElement) {
              inputElement.setSelectionRange(inputElement.value.length, inputElement.value.length);
              simulateScannerEnter(inputElement);
            }
          } catch (e) {
            console.log("No se pudo ajustar el campo de entrada:", e);
          }
        }
      }, 100);
    }
  }, [currentExpiringIndex, expiringPackages]);

  const handlePreviousExpiring = useCallback(() => {
    if (currentExpiringIndex > 0) {
      setCurrentExpiringIndex(prev => prev - 1);
    }
  }, [currentExpiringIndex]);

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
        reason: "Formato de guía inválido",
        isPendingValidation: false,
      } as unknown as PackageInfo));

      // Merge local: conservamos lo ya validado que sigue escaneado + lo nuevo + inválidos.
      // Indexamos por código (los nuevos sobre-escriben para quedarnos con lo más reciente).
      const byCode = new Map<string, PackageInfo>();
      const indexPkg = (p: PackageInfo) => {
        [p.trackingNumber, p.dhlUniqueId]
          .filter(Boolean)
          .forEach(c => byCode.set((c as string).trim().toUpperCase(), p));
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
      setMissingTrackings(invalidNumbers);
      setUnScannedTrackings([]);

      handleExpirationCheck(newlyValidated);

      if (newlyValidated.some(p => !p.isValid) || invalidNumbers.length > 0) {
        playInvalidSound();
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
        setMissingTrackings(invalidNumbers);
        
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
  }, [setPackages, setScannedPackages, setShownExpiringPackages]);

  const validPackages = packages.filter(p => p.isValid && !p.isPendingValidation);

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
      { label: "Sin escaneo", value: unScannedTrackings.length, valueClassName: "text-amber-600" },
      { label: "Faltantes", value: missingTrackings.length, valueClassName: "text-red-600" },
    ];
  }, [validPackages, packages.length, unScannedTrackings.length, missingTrackings.length]);

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

    try {
      const payload = {
        subsidiary: { id: selectedSubsidiaryId, name:  selectedSubsidiaryName ?? "" },
        shipments: validPackages.filter(s => !s.isCharge).map(s => s.id),
        chargeShipments: validPackages.filter(s => s.isCharge).map(s => s.id),
        missingTrackings,
        inventoryDate: new Date().toISOString(),
        unScannedTrackings,
        inventoryType: inventoryType,  
      } as InventoryRequest;

      const saved = await saveInventory(payload);
      await handleSendEmail(saved)
      
      toast({ title: "Inventario guardado", description: `Inventario ${getInventoryTypeLabel(inventoryType)} guardado con éxito.` });
      clearAllStorage();
      onSuccess?.();
    } catch (error) {
      console.error("saveInventory error", error);
      toast({ title: "Error", description: "Hubo un problema al guardar el inventario.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const getInventoryTypeLabel = (type: InventoryType): string => {
    switch (type) {
      case InventoryType.INITIAL: return "Inicial";
      case InventoryType.DEX: return "DEX";
      case InventoryType.FINAL: return "Final";
      default: return "Inicial";
    }
  };

  const buildInventoryReport = (): InventoryRequest => {
    const validForExport = packages.filter(p => p.isValid && !p.isPendingValidation);
    return {
      id: `INV-${Date.now()}`,
      trackingNumber: "1234567890123",
      inventoryDate: new Date().toISOString(),
      subsidiary: { id: selectedSubsidiaryId ?? "", name: selectedSubsidiaryName ?? "" },
      shipments: validForExport.filter(p => !p.isCharge),
      chargeShipments: validForExport.filter(p => p.isCharge),
      missingTrackings,
      unScannedTrackings,
      inventoryType,
    } as unknown as InventoryRequest;
  };

  const handleExportPDF = async () => {
    setIsLoading(true);
    try {
      const report = buildInventoryReport();
      const blob = await pdf(<InventoryPDFReport report={report} />).toBlob();
      const blobUrl = URL.createObjectURL(blob) + `#${Date.now()}`;
      window.open(blobUrl, "_blank");
      await handleExportExcel();
    } catch (err) {
      console.error("PDF export error", err);
      toast({ title: "Error", description: "No se pudo generar el PDF.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportExcel = async () => {
    setIsLoading(true);
    try {
      const report = buildInventoryReport();
      await generateInventoryExcel(report, true);
    } catch (err) {
      console.error("Excel export error", err);
      toast({ title: "Error", description: "No se pudo generar el Excel.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendEmail = async (inventory: Inventory) => {
    setIsLoading(true);
    try {
      // PDF
      const blob = await pdf(<InventoryPDFReport report={inventory as any} />).toBlob();
      const blobUrl = URL.createObjectURL(blob) + `#${Date.now()}`;
      window.open(blobUrl, "_blank");

      const currentDate = new Date().toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const inventoryTypeLabel = getInventoryTypeLabel(inventoryType);
      const safeDate = currentDate.replace(/\//g, "-");

      const pdfFileName = `INVENTARIO-${inventoryTypeLabel.toUpperCase()}--${selectedSubsidiaryName}--${safeDate}.pdf`;
      const pdfFile = new File([blob], pdfFileName, { type: "application/pdf" });

      // Excel
      const excelBuffer = await generateInventoryExcel(inventory as any, true);
      const excelBlob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const excelFileName = `INVENTARIO-${inventoryTypeLabel.toUpperCase()}--${selectedSubsidiaryName}--${safeDate}.xlsx`;
      const excelFile = new File([excelBlob], excelFileName, {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      // IMPORTANTE: enviar el id del inventario para que el backend resuelva el
      // correo de la sucursal correcta (fix que se había perdido al condensar el archivo).
      await uploadFiles(pdfFile, excelFile, selectedSubsidiaryName ?? "", inventory.id);
    } catch (err) {
      console.error("Error enviando inventario:", err);
      toast({
        title: "Error",
        description: "No se pudo generar o enviar el inventario.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // CORRECCIÓN: BÚSQUEDA POR UNIQUE ID
  // ==========================================
  // Predicado de filtros compartido por las pestañas (Todos y Válidos).
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
    const matchesCarrier = filterCarrier === "all" || pkg.shipmentType === filterCarrier;
    const matchesToday = !onlyToday || daysUntilCommit(pkg.commitDateTime) === 0;
    const matchesPayment = !onlyPayment || !!pkg.payment;
    return matchesSearch && matchesPriority && matchesStatus && matchesCarrier && matchesToday && matchesPayment;
  }, [searchTerm, filterPriority, filterStatus, filterCarrier, onlyToday, onlyPayment]);

  const filteredValidPackages = useMemo(() => validPackages.filter(matchesFilters), [validPackages, matchesFilters]);
  const filteredPackages = useMemo(() => packages.filter(matchesFilters), [packages, matchesFilters]);

  const activeFilterCount =
    (filterPriority !== "all" ? 1 : 0) +
    (filterStatus !== "all" ? 1 : 0) +
    (filterCarrier !== "all" ? 1 : 0) +
    (onlyToday ? 1 : 0) +
    (onlyPayment ? 1 : 0);

  const clearFilters = () => {
    setSearchTerm("");
    setFilterPriority("all");
    setFilterStatus("all");
    setFilterCarrier("all");
    setOnlyToday(false);
    setOnlyPayment(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-6xl max-h-[95vh] p-0 gap-0 flex flex-col overflow-hidden"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Inventario de Paquetes</DialogTitle>
          </DialogHeader>

          {isValidationPackages && (
            <LoaderWithOverlay overlay transparent text="Validando paquetes..." className="rounded-lg" />
          )}

          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
            <OperationHeader
              icon={PackageCheckIcon}
              title="Inventario de Paquetes"
              description="Escanea y valida paquetes"
              subsidiaryName={selectedSubsidiaryName}
              isOffline={!isOnline}
              actions={
                <TooltipProvider delayDuration={100}>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Select
                      value={inventoryType}
                      onValueChange={(value: InventoryType) => setInventoryType(value)}
                      disabled={isLoading || packages.length > 0}
                    >
                      <SelectTrigger className="h-9 flex-1 sm:flex-none sm:w-[170px]">
                        <SelectValue placeholder="Tipo de inventario" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={InventoryType.INITIAL}>Inventario Inicial</SelectItem>
                        <SelectItem value={InventoryType.DEX}>Inventario DEX</SelectItem>
                        <SelectItem value={InventoryType.FINAL}>Inventario Final</SelectItem>
                      </SelectContent>
                    </Select>

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
                </TooltipProvider>
              }
            />

            {packages.length > 0 && <StatBar items={inventoryStats} />}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              
              {/* COLUMNA IZQUIERDA - Componente de escaneo */}
              <div className="xl:col-span-1 space-y-4">
                <Card>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <BarcodeScannerInput
                        ref={barScannerInputRef}
                        multiCarrier
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

                    <Button 
                      onClick={handleValidatePackages} 
                      disabled={isValidationPackages || isLoading || !selectedSubsidiaryId || scannedPackages.length === 0} 
                      className="w-full gap-2"
                      variant="outline"
                    >
                      {isValidationPackages ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scan className="h-4 w-4" />}
                      {isValidationPackages ? "Validando..." : "Validar paquetes"}
                    </Button>
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
                  carrier={filterCarrier}
                  onCarrierChange={setFilterCarrier}
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
                />

                {/* Listado Principal */}
                {packages.length > 0 ? (
                  <>
                    <Tabs defaultValue="todos" className="w-full">
                      <TabsList className="grid w-full grid-cols-4 mb-4">
                        <TabsTrigger value="todos" className="flex items-center gap-1 text-xs py-2">
                          <Package className="h-3 w-3" /> Todos
                          <Badge variant="secondary" className="ml-1 text-xs">{packages.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="validos" className="flex items-center gap-1 text-xs py-2">
                          <Check className="h-3 w-3" /> Válidos
                          <Badge variant="secondary" className="ml-1 text-xs">{validPackages.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="sin-escaneo" className="flex items-center gap-1 text-xs py-2">
                          <AlertCircle className="h-3 w-3" /> Sin escaneo
                          <Badge variant="secondary" className="ml-1 text-xs">{unScannedTrackings.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="faltantes" className="flex items-center gap-1 text-xs py-2">
                          <CircleAlertIcon className="h-3 w-3" /> Faltantes
                          <Badge variant="secondary" className="ml-1 text-xs">{missingTrackings.length}</Badge>
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="todos" className="space-y-3">
                        <div className="max-h-[400px] overflow-y-auto rounded-md border">
                          <div className="grid grid-cols-1 divide-y">
                            {filteredPackages.map(pkg => {
                              const pkgId = pkg.dhlUniqueId || pkg.trackingNumber;
                              return (
                                <PackageListItem
                                  key={`todos-${pkgId}`}
                                  pkg={pkg}
                                  onRemove={handleRemovePackage}
                                  isLoading={isLoading || isValidationPackages}
                                  reasonPicker={{
                                    options: REASON_OPTIONS,
                                    selected: selectedReasons[pkgId],
                                    onSelect: handleSelectMissingTracking,
                                    open: openPopover === pkgId,
                                    onOpenChange: (o) => setOpenPopover(o ? pkgId : null),
                                  }}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="validos" className="space-y-3">
                        {filteredValidPackages.length > 0 ? (
                          <div className="max-h-[400px] overflow-y-auto rounded-md border">
                            <div className="grid grid-cols-1 divide-y">
                              {filteredValidPackages.map(pkg => {
                                const pkgId = pkg.dhlUniqueId || pkg.trackingNumber;
                                return (
                                  <PackageListItem
                                    key={`validos-${pkgId}`}
                                    pkg={pkg}
                                    onRemove={handleRemovePackage}
                                    isLoading={isLoading}
                                    reasonPicker={{
                                      options: REASON_OPTIONS,
                                      selected: selectedReasons[pkgId],
                                      onSelect: handleSelectMissingTracking,
                                      open: openPopover === pkgId,
                                      onOpenChange: (o) => setOpenPopover(o ? pkgId : null),
                                    }}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-12 text-muted-foreground border rounded-md">
                            <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                            <p>No se encontraron paquetes válidos</p>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="sin-escaneo" className="space-y-3">
                        {unScannedTrackings.length > 0 ? (
                          <div className="max-h-[300px] overflow-y-auto rounded-md border">
                            <div className="p-4">
                              <div className="grid gap-2">
                                {unScannedTrackings.map(tracking => (
                                  <div key={`unscanned-${tracking}`} className="flex justify-between items-center p-3 rounded-md bg-amber-50 border border-amber-200">
                                    <span className="font-mono text-sm">{tracking}</span>
                                    <Badge variant="outline" className="bg-amber-100 text-amber-800 text-xs">Sin escaneo</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground border rounded-md">
                            <p>No hay guías sin escaneo</p>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="faltantes" className="space-y-3">
                        {missingTrackings.length > 0 ? (
                          <div className="max-h-[300px] overflow-y-auto rounded-md border">
                            <div className="p-4">
                              <div className="grid gap-2">
                                {missingTrackings.map(tracking => (
                                  <div key={`missing-${tracking}`} className="flex justify-between items-center p-3 rounded-md bg-red-50 border border-red-200">
                                    <span className="font-mono text-sm">{tracking}</span>
                                    <Badge variant="outline" className="bg-red-100 text-red-800 text-xs">Faltante</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground border rounded-md">
                            <p>No hay guías faltantes</p>
                          </div>
                        )}
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

      <ExpirationAlertModal
        isOpen={expirationAlertOpen}
        onClose={handleNextExpiring}
        packages={expiringPackages}
        currentIndex={currentExpiringIndex}
        onNext={handleNextExpiring}
        onPrevious={handlePreviousExpiring}
      />

    </>
  );
}