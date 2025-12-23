"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  ChevronUp,
  Download,
  X,
  MapPinIcon
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import {
  saveInventory,
  validateTrackingNumbers,
  uploadFiles
} from "@/lib/services/inventories";
import { InventoryReport, InventoryPackage as InventoryPackageType, InventoryRequest, PackageInfo, Shipment, ChargeShipment, Inventory } from "@/lib/types";
import { BarcodeScannerInput, BarcodeScannerInputHandle } from "@/components/barcode-input/barcode-scanner-input-list";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { InventoryPDFReport } from "@/lib/services/inventory/inventory-pdf-generator";
import { pdf } from "@react-pdf/renderer";
import { generateInventoryExcel } from "@/lib/services/inventory/inventory-excel-generator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoaderWithOverlay } from "@/components/loader";
import { ExpirationAlertModal, ExpiringPackage } from "@/components/ExpirationAlertModal";

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
  selectedSubsidiaryId?: string | null;
  subsidiaryName?: string | null;
  onClose?: () => void;
  onSuccess?: () => void;
}

interface InventoryPackage {
  id?: string;
  trackingNumber: string;
  isValid: boolean;
  reason?: string | null;
  recipientName?: string | null;
  recipientAddress?: string | null;
  recipientPhone?: string | null;
  priority?: "alta" | "media" | "baja" | null;
  isCharge?: boolean;
  isHighValue?: boolean;
  payment?: { type: string; amount: number } | null;
  commitDateTime?: string | null;
  isPendingValidation?: boolean;
  isOffline?: boolean;
  createdAt?: Date;
}

enum TrackingNotFoundEnum {
  NOT_SCANNED = "Guia sin escaneo",
  NOT_TRACKING = "Guia faltante",
  NOT_IN_CHARGE = "No Llego en la Carga"
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

const PackageItem = ({
  pkg,
  onRemove,
  isLoading,
  selectedReasons,
  onSelectReason,
  openPopover,
  setOpenPopover,
}: {
  pkg: PackageInfo;
  onRemove: (trackingNumber: string) => void;
  isLoading: boolean;
  selectedReasons: Record<string, string>;
  onSelectReason: (id: string, value: string) => void;
  openPopover: string | null;
  setOpenPopover: (v: string | null) => void;
}) => {
  const formatMexicanPhoneNumber = (phone?: string | null) => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) return `+52 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    if (cleaned.length === 12 && cleaned.startsWith("52")) return `+52 (${cleaned.slice(2, 5)}) ${cleaned.slice(5, 8)}-${cleaned.slice(8)}`;
    return phone;
  };

  const options = Object.entries(TrackingNotFoundEnum).map(([k, v]) => ({ key: k, label: v }));

  return (
    <div className="p-4 hover:bg-muted/30 transition-colors border-b">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-medium text-sm">{pkg.trackingNumber}</span>

            <Badge variant={pkg.isValid ? "success" : "destructive"} className="text-xs">
              {pkg.isValid ? "Válido" : "Inválido"}
            </Badge>

            {pkg.priority && (
              <Badge
                variant={pkg.priority === "alta" ? "destructive" : pkg.priority === "media" ? "secondary" : "outline"}
                className="text-xs"
              >
                {pkg.priority.toUpperCase()}
              </Badge>
            )}

            {pkg.isCharge && <Badge className="bg-green-600 text-xs">CARGA/F2/31.5</Badge>}
            {pkg.isHighValue && (
              <Badge className="bg-violet-600 text-xs">
                <GemIcon className="h-3 w-3 mr-1" />
                Alto Valor
              </Badge>
            )}
            {pkg.payment && (
              <Badge className="bg-blue-600 text-xs">
                <DollarSignIcon className="h-3 w-3 mr-1" />
                {pkg.payment.type} ${pkg.payment.amount}
              </Badge>
            )}
            {pkg.isPendingValidation && (
              <Badge className="bg-amber-500 text-xs">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Validando...
              </Badge>
            )}
            {pkg.isOffline && (
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 text-xs">
                ⚡ Offline
              </Badge>
            )}
          </div>

          {pkg.isValid && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
              {pkg.recipientAddress && (
                <div className="flex items-start gap-1">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-1 text-xs">{pkg.recipientAddress}</span>
                </div>
              )}
              {pkg.recipientName && (
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span className="text-xs">{pkg.recipientName}</span>
                </div>
              )}
              {pkg.recipientPhone && (
                <div className="flex items-center gap-1">
                  <Phone className="w-4 w-4" />
                  <span className="text-xs">{formatMexicanPhoneNumber(pkg.recipientPhone)}</span>
                </div>
              )}
            </div>
          )}

          {!pkg.isValid && pkg.reason && (
            <div className="flex items-center gap-1 text-sm text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs">{pkg.reason}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          {!pkg.isValid && !pkg.isPendingValidation && (
            <Popover open={openPopover === pkg.trackingNumber} onOpenChange={(open) => setOpenPopover(open ? pkg.trackingNumber : null)}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-32 justify-between text-xs" disabled={isLoading}>
                  {selectedReasons[pkg.trackingNumber] || "Motivo"}
                  <ChevronsUpDown className="ml-2 h-3 w-3 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-0">
                <Command>
                  <CommandInput placeholder="Buscar motivo..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>No se encontraron motivos.</CommandEmpty>
                    <CommandGroup>
                      {options.map((opt) => (
                        <CommandItem key={opt.key} value={opt.label} onSelect={() => onSelectReason(pkg.trackingNumber, opt.label)} className="text-xs">
                          <Check className={cn("mr-2 h-4 w-4", selectedReasons[pkg.trackingNumber] === opt.label ? "opacity-100" : "opacity-0")} />
                          {opt.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}

          {!pkg.isPendingValidation && (
            <Button variant="ghost" size="icon" onClick={() => onRemove(pkg.trackingNumber)} disabled={isLoading} className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10">
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default function InventoryForm({ selectedSubsidiaryId: propSubsidiaryId, subsidiaryName: propSubsidiaryName, onClose, onSuccess }: Props) {
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

  // Estados regulares
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [lastValidated, setLastValidated] = useState("");
  const [isValidationPackages, setIsValidationPackages] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Estados para manejo de expiración
  const [expirationAlertOpen, setExpirationAlertOpen] = useState(false);
  const [expiringPackages, setExpiringPackages] = useState<ExpiringPackage[]>([]);
  const [currentExpiringIndex, setCurrentExpiringIndex] = useState(0);

  const barScannerInputRef = useRef<BarcodeScannerInputHandle>(null);
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);

  // Determinar subsidiaria: primero la del prop, luego la del usuario
  const selectedSubsidiaryId = useMemo(() => {
    return propSubsidiaryId || user?.subsidiary?.id || null;
  }, [propSubsidiaryId, user]);

  const selectedSubsidiaryName = useMemo(() => {
    return propSubsidiaryName || user?.subsidiary?.name || null;
  }, [propSubsidiaryName, user]);

  // Detectar estado de conexión
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

  // Revalidar paquetes offline cuando se recupera conexión
  useEffect(() => {
    if (isOnline) {
      const offlinePackages = packages.filter(pkg => pkg.isOffline);
      if (offlinePackages.length > 0 && selectedSubsidiaryId) {
        toast({
          title: "Revalidando paquetes",
          description: `Revalidando ${offlinePackages.length} paquetes creados offline...`,
        });
        
        // Revalidar paquetes offline
        offlinePackages.forEach(async (pkg) => {
          try {
            const result = await validateTrackingNumbers(
              [pkg.trackingNumber], 
              selectedSubsidiaryId
            );
            
            let validatedPackages: PackageInfo[] = [];
            
            if (Array.isArray(result)) {
              validatedPackages = result;
            } else if (result && typeof result === 'object') {
              if (Array.isArray(result.validatedPackages)) {
                validatedPackages = result.validatedPackages;
              } else if (Array.isArray(result.validatedShipments)) {
                validatedPackages = result.validatedShipments;
              } else if (Array.isArray(result.packages)) {
                validatedPackages = result.packages;
              } else {
                validatedPackages = Object.values(result).filter(item => 
                  item && typeof item === 'object' && 'trackingNumber' in item
                ) as PackageInfo[];
              }
            }

            if (validatedPackages.length > 0) {
              const validated = validatedPackages[0];
              setPackages(prev => prev.map(prevPkg => 
                prevPkg.trackingNumber === pkg.trackingNumber ? validated : prevPkg
              ));
            }
          } catch (error) {
            console.error("Error revalidando paquete offline:", error);
          }
        });
      }
    }
  }, [isOnline, packages, selectedSubsidiaryId, setPackages, toast]);

  // Validación automática como en UnloadingForm
  useEffect(() => {
    if (scannedPackages.length === 0 || isLoading || !selectedSubsidiaryId) return;
    
    const trackingNumbers = scannedPackages.map(pkg => pkg.trackingNumber).join("\n");
    
    if (trackingNumbers === lastValidated) return;

    const handler = setTimeout(() => {
      handleValidatePackages();
      setLastValidated(trackingNumbers);
    }, 500);

    return () => clearTimeout(handler);
  }, [scannedPackages, selectedSubsidiaryId, isLoading, lastValidated]);

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

    const enterKeyEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true
    });

    inputElement.dispatchEvent(enterKeyEvent);

    const enterKeyUpEvent = new KeyboardEvent('keyup', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true
    });

    inputElement.dispatchEvent(enterKeyUpEvent);

    const inputEvent = new Event('input', { bubbles: true });
    inputElement.dispatchEvent(inputEvent);
  };

  const options = Object.entries(TrackingNotFoundEnum).map(([key, value]) => ({ key, label: value }));

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

  // Función para limpiar TODO el almacenamiento
  const clearAllStorage = useCallback(() => {
    const keys = [
      'inventory_scanned_packages',
      'inventory_packages',
      'inventory_missing_trackings',
      'inventory_unscanned_trackings',
      'inventory_selected_reasons'
    ];

    keys.forEach(key => {
      try {
        window.localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Error clearing ${key}:`, error);
      }
    });

    // Resetear estados persistentes
    setScannedPackages([]);
    setPackages([]);
    setMissingTrackings([]);
    setUnScannedTrackings([]);
    setSelectedReasons({});

    toast({
      title: "Datos limpiados",
      description: "Todos los datos locales han sido eliminados.",
    });
  }, [
    setScannedPackages,
    setPackages,
    setMissingTrackings,
    setUnScannedTrackings,
    setSelectedReasons
  ]);

  // Funciones para manejo de expiración
  const checkPackageExpiration = useCallback((pkg: PackageInfo): boolean => {
    if (!pkg.commitDateTime) return false;

    try {
      const commitDate = new Date(pkg.commitDateTime);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      commitDate.setHours(0, 0, 0, 0);

      const timeDiff = commitDate.getTime() - today.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

      return daysDiff === 0;
    } catch (error) {
      console.error("Error checking package expiration:", error, pkg);
      return false;
    }
  }, []);

  const getDaysUntilExpiration = useCallback((commitDateTime: string) => {
    const commitDate = new Date(commitDateTime);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    commitDate.setHours(0, 0, 0, 0);

    const timeDiff = commitDate.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }, []);

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
              inputElement.setSelectionRange(
                  inputElement.value.length,
                  inputElement.value.length
              );
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

  // Validar paquetes TODOS A LA VEZ como en UnloadingForm
  const handleValidatePackages = async () => {
    if (isLoading || isValidationPackages) return;

    if (!selectedSubsidiaryId) {
      toast({
        title: "Error",
        description: "Selecciona una sucursal antes de validar.",
        variant: "destructive",
      });
      setIsValidationPackages(false);
      return;
    }

    // Obtener tracking numbers de los paquetes escaneados
    const trackingNumbers = scannedPackages.map(pkg => pkg.trackingNumber);
    const validNumbers = trackingNumbers.filter((tn) => /^\d{12}$/.test(tn));
    const invalidNumbers = trackingNumbers.filter((tn) => !/^\d{12}$/.test(tn));

    if (validNumbers.length === 0) {
      toast({
        title: "Error",
        description: "No se ingresaron números válidos.",
        variant: "destructive",
      });
      setIsValidationPackages(false);
      return;
    }

    setIsValidationPackages(true);
    setIsLoading(true);
    setProgress(0);

    try {
      // Validar todos los paquetes a la vez como en UnloadingForm
      const result = await validateTrackingNumbers(validNumbers, selectedSubsidiaryId);

      // Extraer los paquetes validados del resultado
      let validatedPackages: PackageInfo[] = [];
      
      // Diferentes formas en que podría estar estructurada la respuesta
      if (Array.isArray(result)) {
        validatedPackages = result;
      } else if (result && typeof result === 'object') {
        if (Array.isArray(result.validatedPackages)) {
          validatedPackages = result.validatedPackages;
        } else if (Array.isArray(result.validatedShipments)) {
          validatedPackages = result.validatedShipments;
        } else if (Array.isArray(result.packages)) {
          validatedPackages = result.packages;
        } else {
          // Si no es un array, intentar convertirlo
          validatedPackages = Object.values(result).filter(item => 
            item && typeof item === 'object' && 'trackingNumber' in item
          ) as PackageInfo[];
        }
      }

      // Actualizar los paquetes escaneados con la información validada
      if (barScannerInputRef.current && barScannerInputRef.current.updateValidatedPackages) {
        barScannerInputRef.current.updateValidatedPackages(validatedPackages);
      }

      // Filtrar paquetes que ya no están en la lista escaneada
      const currentTrackingNumbers = scannedPackages.map(p => p.trackingNumber);
      setPackages(prev => prev.filter(p => currentTrackingNumbers.includes(p.trackingNumber)));

      // Agregar nuevos paquetes validados
      const newValidPackages = validatedPackages.filter(
        (r) => !packages.some((p) => p.trackingNumber === r.trackingNumber)
      );

      setPackages((prev) => [...prev, ...newValidPackages]);
      setMissingTrackings(invalidNumbers);
      setUnScannedTrackings([]);

      // Detectar paquetes que expiran hoy
      const todayExpiringPackages: ExpiringPackage[] = newValidPackages
        .filter((pkg: PackageInfo) => pkg.isValid && pkg.commitDateTime && checkPackageExpiration(pkg))
        .map((pkg: PackageInfo) => ({
          trackingNumber: pkg.trackingNumber,
          recipientName: pkg.recipientName || undefined,
          recipientAddress: pkg.recipientAddress || undefined,
          commitDateTime: pkg.commitDateTime || undefined,
          daysUntilExpiration: pkg.commitDateTime ? getDaysUntilExpiration(pkg.commitDateTime) : 0,
          priority: pkg.priority || undefined
        }));

      if (todayExpiringPackages.length > 0) {
        setExpiringPackages(todayExpiringPackages);
        setCurrentExpiringIndex(0);
        setExpirationAlertOpen(true);
      }

      const validCount = newValidPackages.filter((p: PackageInfo) => p.isValid).length;
      const invalidCount = newValidPackages.filter((p: PackageInfo) => !p.isValid).length;

      toast({
        title: "Validación completada",
        description: `Se agregaron ${validCount} paquetes válidos. Paquetes inválidos: ${
          invalidCount + invalidNumbers.length
        }`,
      });
    } catch (error) {
      console.error("Error validating packages:", error);
      
      // Modo offline: crear paquetes offline
      if (!isOnline) {
        const offlinePackages: PackageInfo[] = validNumbers.map(tn => ({
          id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          trackingNumber: tn,
          isValid: false,
          reason: "Sin conexión - validar cuando se restablezca internet",
          isOffline: true,
          createdAt: new Date(),
        } as PackageInfo));
        
        setPackages((prev) => [...prev, ...offlinePackages]);
        setMissingTrackings(invalidNumbers);
        
        toast({
          title: "Modo offline activado",
          description: `Se guardaron ${validNumbers.length} paquetes localmente. Se validarán cuando se recupere la conexión.`,
        });
      } else {
        toast({
          title: "Error",
          description: "Hubo un problema al validar los paquetes.",
          variant: "destructive",
        });
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
              inputElement.setSelectionRange(
                  inputElement.value.length,
                  inputElement.value.length
              );
              inputElement.value += '\n';
            }
          } catch (e) {
            console.log("No se pudo ajustar el campo de entrada:", e);
          }
        }
      }, 150);
    }
  };

  const handleRemovePackage = useCallback((trackingNumber: string) => {
    setPackages(prev => prev.filter(p => p.trackingNumber !== trackingNumber));
    setScannedPackages(prev => prev.filter(p => p.trackingNumber !== trackingNumber));
  }, [setPackages, setScannedPackages]);

  const validPackages = packages.filter(p => p.isValid && !p.isPendingValidation);

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
        unScannedTrackings
      } as InventoryRequest;

      const saved = await saveInventory(payload);
      await handleSendEmail(saved)
      toast({ title: "Inventario guardado", description: "Inventario guardado con éxito." });

      // Limpiar storage después de éxito
      clearAllStorage();

      onSuccess?.();
    } catch (error) {
      console.error("saveInventory error", error);
      toast({ title: "Error", description: "Hubo un problema al guardar el inventario.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setIsLoading(true);
    try {
      const validPackages = packages.filter(p => p.isValid && !p.isPendingValidation);
      const shipments = validPackages.filter(p => !p.isCharge);
      const chargeShipments = validPackages.filter(p => p.isCharge);

      const report: InventoryRequest = {
        id: `INV-${Date.now()}`,
        trackingNumber: '1234567890123',
        inventoryDate: new Date().toISOString(),
        subsidiary: { id: user?.subsidiary?.id ?? "", name: user?.subsidiary?.name ?? "" },
        shipments: shipments,
        chargeShipments: chargeShipments,
        missingTrackings,
        unScannedTrackings,
      };
      const blob = await pdf(<InventoryPDFReport report={report} />).toBlob();
      const blobUrl = URL.createObjectURL(blob) + `#${Date.now()}`;
      window.open(blobUrl, "_blank");
      handleExportExcel()
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
      const validPackages = packages.filter(p => p.isValid && !p.isPendingValidation);
      const shipments = validPackages.filter(p => !p.isCharge);
      const chargeShipments = validPackages.filter(p => p.isCharge);

      const report: InventoryRequest = {
        id: `INV-${Date.now()}`,
        trackingNumber: '1234567890123',
        inventoryDate: new Date().toISOString(),
        subsidiary: { id: user?.subsidiary?.id ?? "", name: user?.subsidiary?.name ?? "" },
        shipments: shipments,
        chargeShipments: chargeShipments,
        missingTrackings,
        unScannedTrackings,
      };
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
      // Generar PDF
      const blob = await pdf(<InventoryPDFReport report={inventory} />).toBlob();
      const blobUrl = URL.createObjectURL(blob) + `#${Date.now()}`;
      window.open(blobUrl, "_blank");

      // Nombre de archivo para PDF
      const currentDate = new Date().toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const pdfFileName = `INVENTARIO--${selectedSubsidiaryName}--${currentDate.replace(/\//g, "-")}.pdf`;
      const pdfFile = new File([blob], pdfFileName, { type: "application/pdf" });

      // Generar Excel
      const excelBuffer = await generateInventoryExcel(inventory, true);
      const excelBlob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const excelFileName = `INVENTARIO--${selectedSubsidiaryName}--${currentDate.replace(/\//g, "-")}.xlsx`;
      const excelFile = new File([excelBlob], excelFileName, {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      // Subir archivos
      await uploadFiles(pdfFile, excelFile, selectedSubsidiaryName);

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

  const filteredValidPackages = useMemo(() => {
    return validPackages.filter(pkg => {
      const matchesSearch = pkg.trackingNumber.includes(searchTerm) ||
        (pkg.recipientName && pkg.recipientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (pkg.recipientAddress && pkg.recipientAddress.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesPriority = filterPriority === "all" || pkg.priority === filterPriority;
      const matchesStatus = filterStatus === "all" ||
        (filterStatus === "special" && (pkg.isCharge || pkg.isHighValue || pkg.payment)) ||
        (filterStatus === "normal" && !pkg.isCharge && !pkg.isHighValue && !pkg.payment);
      return matchesSearch && matchesPriority && matchesStatus;
    });
  }, [validPackages, searchTerm, filterPriority, filterStatus]);

  return (
    <>
      <Card className="w-full max-w-7xl mx-auto border-0 shadow-none">
        {isValidationPackages && (
          <LoaderWithOverlay
            overlay
            transparent
            text="Validando paquetes..."
            className="rounded-lg"
          />
        )}
        
        {/* Indicador de modo offline */}
        {!isOnline && (
          <div className="bg-yellow-50 border-b border-yellow-200 p-2 text-center">
            <span className="text-yellow-800 text-sm flex items-center justify-center gap-2">
              ⚡ Modo offline - Los datos se guardan localmente
            </span>
          </div>
        )}

        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary text-primary-foreground">
                  <PackageCheckIcon className="h-6 w-6" />
                </div>
                <span>Inventario de Paquetes</span>
                {packages.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-sm">
                    {validPackages.length} válidos / {packages.length} total
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Escanea paquetes y valida su estatus en el sistema</CardDescription>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-primary-foreground bg-primary px-3 py-1.5 rounded-full">
                <MapPinIcon className="h-4 w-4" />
                <span>Sucursal: {selectedSubsidiaryName}</span>
              </div>
              
              {(packages.length > 0) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllStorage}
                  className="gap-2"
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4" />
                  Limpiar todo
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* COLUMNA IZQUIERDA - Componente de escaneo */}
            <div className="xl:col-span-1 space-y-6">
              <Card>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <BarcodeScannerInput
                      ref={barScannerInputRef}
                      onPackagesChange={setScannedPackages}
                      disabled={isValidationPackages || !selectedSubsidiaryId}
                      placeholder={!selectedSubsidiaryId ? "Selecciona una sucursal primero" : "Escribe o escanea números de tracking"}
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

              {/* Botones de acción en la columna izquierda */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <Button 
                    onClick={handleSaveInventory} 
                    disabled={isLoading || isValidationPackages || validPackages.length === 0} 
                    className="w-full gap-2"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Guardar Inventario
                  </Button>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          onClick={handleExportPDF} 
                          disabled={isLoading || isValidationPackages || packages.length === 0} 
                          variant="outline" 
                          className="w-full gap-2"
                        >
                          <Download className="h-4 w-4" /> Exportar PDF
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Generar reporte PDF de los paquetes actuales</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => onClose?.()} 
                    className="w-full gap-2"
                  >
                    <X className="h-4 w-4" /> Cancelar
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* COLUMNA DERECHA - Tabla de validaciones MEJORADA */}
            <div className="xl:col-span-2">
              <Card>
                <CardContent className="p-6 space-y-4">
                  
                  {/* Header mejorado */}
                  <div className="flex flex-col gap-4 pb-4 border-b">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Package className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">Paquetes Validados</h3>
                          <p className="text-sm text-muted-foreground">
                            {packages.length} paquetes procesados
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {validPackages.length} válidos
                        </Badge>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          {unScannedTrackings.length} sin escaneo
                        </Badge>
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          {missingTrackings.length} faltantes
                        </Badge>
                      </div>
                    </div>

                    {/* Simbología compacta */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-medium">Leyenda:</span>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span>Válido</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span>Inválido</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge className="h-4 px-1 text-xs bg-green-600">CARGA</Badge>
                        <span>Carga especial</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge className="h-4 px-1 text-xs bg-violet-600">
                          <GemIcon className="h-3 w-3" />
                        </Badge>
                        <span>Alto Valor</span>
                      </div>
                      {!isOnline && (
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="h-4 bg-yellow-100 text-yellow-800">
                            ⚡
                          </Badge>
                          <span>Offline</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Barra de búsqueda y filtros mejorada */}
                  <div className="flex flex-col sm:flex-row gap-3 bg-muted/30 p-3 rounded-lg">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Buscar tracking, destinatario o dirección..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="pl-10 bg-background" 
                      />
                    </div>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1">
                          <Filter className="h-4 w-4" />
                          Filtros
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="grid gap-4">
                          <div className="space-y-2">
                            <h4 className="font-medium">Filtrar por</h4>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label className="text-sm">Prioridad</Label>
                                <select 
                                  className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm" 
                                  value={filterPriority} 
                                  onChange={(e) => setFilterPriority(e.target.value)}
                                >
                                  <option value="all">Todas</option>
                                  <option value="alta">Alta</option>
                                  <option value="media">Media</option>
                                  <option value="baja">Baja</option>
                                </select>
                              </div>

                              <div className="space-y-2">
                                <Label className="text-sm">Tipo</Label>
                                <select 
                                  className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm" 
                                  value={filterStatus} 
                                  onChange={(e) => setFilterStatus(e.target.value)}
                                >
                                  <option value="all">Todos</option>
                                  <option value="special">Especial</option>
                                  <option value="normal">Normal</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Contenido principal */}
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
                              {packages.map(pkg => (
                                <PackageItem
                                  key={pkg.trackingNumber}
                                  pkg={pkg}
                                  onRemove={handleRemovePackage}
                                  isLoading={isLoading || isValidationPackages}
                                  selectedReasons={selectedReasons}
                                  onSelectReason={handleSelectMissingTracking}
                                  openPopover={openPopover}
                                  setOpenPopover={setOpenPopover}
                                />
                              ))}
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="validos" className="space-y-3">
                          {filteredValidPackages.length > 0 ? (
                            <div className="max-h-[400px] overflow-y-auto rounded-md border">
                              <div className="grid grid-cols-1 divide-y">
                                {filteredValidPackages.map(pkg => (
                                  <PackageItem
                                    key={pkg.trackingNumber}
                                    pkg={pkg}
                                    onRemove={handleRemovePackage}
                                    isLoading={isLoading}
                                    selectedReasons={selectedReasons}
                                    onSelectReason={handleSelectMissingTracking}
                                    openPopover={openPopover}
                                    setOpenPopover={setOpenPopover}
                                  />
                                ))}
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
                                    <div key={tracking} className="flex justify-between items-center p-3 rounded-md bg-amber-50 border border-amber-200">
                                      <span className="font-mono text-sm">{tracking}</span>
                                      <Badge variant="outline" className="bg-amber-100 text-amber-800 text-xs">
                                        Sin escaneo
                                      </Badge>
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
                                    <div key={tracking} className="flex justify-between items-center p-3 rounded-md bg-red-50 border border-red-200">
                                      <span className="font-mono text-sm">{tracking}</span>
                                      <Badge variant="outline" className="bg-red-100 text-red-800 text-xs">
                                        Faltante
                                      </Badge>
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
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
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