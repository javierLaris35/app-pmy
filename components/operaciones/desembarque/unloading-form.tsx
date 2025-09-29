"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { UnidadSelector } from "@/components/selectors/unidad-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { AlertCircle, Check, ChevronsUpDown, CircleAlertIcon, DollarSignIcon, GemIcon, MapPin, MapPinIcon, Package, PackageCheckIcon, Phone, Scan, Send, Trash2, User, Loader2, Search, Filter, ChevronDown, ChevronUp, Download, X } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { validateTrackingNumbers, saveUnloading, uploadPDFile } from "@/lib/services/unloadings";
import { Consolidateds, PackageInfo, PackageInfoForUnloading, Unloading, UnloadingFormData, ValidTrackingAndConsolidateds } from "@/lib/types";
import { BarcodeScannerInput, BarcodeScannerInputHandle } from "@/components/barcode-input/barcode-scanner-input-list";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { UnloadingPDFReport } from "@/lib/services/unloading/unloading-pdf-generator";
import { pdf } from "@react-pdf/renderer";
import { generateUnloadingExcelClient } from "@/lib/services/unloading/unloading-excel-generator";
import ConsolidateDetails from "./consolidate-details";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

// Types
interface Vehicles {
  id: string;
  name: string;
}

interface Subsidiary {
  id: string;
  name: string;
}

interface Shipment {
  id: string;
  trackingNumber: string;
  isValid: boolean;
  reason?: string | null;
  recipientName?: string | null;
  commitDateTime?: string | null;
  recipientAddress?: string | null;
  recipientPhone?: string | null;
  priority?: Priority | null;
  status?: ShipmentStatusType | null;
  isCharge?: boolean;
  isHighValue?: boolean;
  payment?: {
    type: string;
    amount: number;
  };
  isOffline?: boolean;
  createdAt?: Date;
}

enum ShipmentStatusType {
  PENDING = "pending",
  DELIVERED = "delivered",
  UNDELIVERED = "undelivered",
}

enum Priority {
  ALTA = "alta",
  MEDIA = "media",
  BAJA = "baja",
}

enum TrackingNotFoundEnum {
  NOT_SCANNED = "Guia sin escaneo",
  NOT_TRACKING = "Guia faltante",
  NOT_IN_CHARGE = "No Llego en la Carga"
}

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

// Componente auxiliar para mostrar cada paquete
const PackageItem = ({ 
  pkg, 
  onRemove, 
  isLoading, 
  selectedReasons, 
  onSelectReason, 
  openPopover, 
  setOpenPopover 
}: {
  pkg: Shipment;
  onRemove: (trackingNumber: string) => void;
  isLoading: boolean;
  selectedReasons: Record<string, string>;
  onSelectReason: (id: string, value: string) => void;
  openPopover: string | null;
  setOpenPopover: (value: string | null) => void;
}) => {
  const formatMexicanPhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `+52 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    if (cleaned.length === 12 && cleaned.startsWith("52")) {
      return `+52 (${cleaned.slice(2, 5)}) ${cleaned.slice(5, 8)}-${cleaned.slice(8)}`;
    }
    if (cleaned.length === 13 && cleaned.startsWith("521")) {
      return `+52 (${cleaned.slice(3, 6)}) ${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
    }
    return phone;
  };

  const options = Object.entries(TrackingNotFoundEnum).map(([key, value]) => ({
    key,
    label: value
  }));

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
                variant={
                  pkg.priority === Priority.ALTA
                    ? "destructive"
                    : pkg.priority === Priority.MEDIA
                    ? "secondary"
                    : "outline"
                }
                className="text-xs"
              >
                {pkg.priority.toUpperCase()}
              </Badge>
            )}
            
            {pkg.isCharge && (
              <Badge className="bg-green-600 text-xs">
                CARGA/F2/31.5
              </Badge>
            )}

            {pkg.commitDateTime && (
                <Badge variant="outline" className="text-xs">
                  {new Date(pkg.commitDateTime).toLocaleDateString("es-MX", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Badge>
            )}

            {pkg.isHighValue && (
              <Badge className="bg-violet-600 text-xs">
                <GemIcon className="h-3 w-3 mr-1" />
                Alto Valor
              </Badge>
            )}
            
            {pkg.payment && (
              <Badge className="bg-blue-600 text-xs">
                <DollarSignIcon className="h-3 w-3 mr-1" />
                ${pkg.payment.amount}
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
                  <User className="w-4 w-4" />
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
          
          {!pkg.isValid && (
            <div className="flex items-center gap-1 text-sm text-destructive">
              <AlertCircle className="w-4 w-4" />
              <span className="text-xs">{pkg.reason}</span>
            </div>
          )}
        </div>
        
        <div className="flex flex-col items-end gap-2">
          {!pkg.isValid && (
            <Popover
              open={openPopover === pkg.trackingNumber}
              onOpenChange={(open) => setOpenPopover(open ? pkg.trackingNumber : null)}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-32 justify-between text-xs"
                  disabled={isLoading}
                >
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
                        <CommandItem
                          key={opt.key}
                          value={opt.label}
                          onSelect={() => onSelectReason(pkg.trackingNumber, opt.label)}
                          className="text-xs"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedReasons[pkg.trackingNumber] === opt.label
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {opt.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(pkg.trackingNumber)}
            disabled={isLoading}
            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
};

// Componente para mostrar paquetes faltantes
const MissingPackageItem = ({ pkg }: { pkg: { trackingNumber: string; recipientName?: string | null; recipientAddress?: string | null; recipientPhone?: string | null } }) => {
  const formatMexicanPhoneNumber = (phone: string): string => {
    if (!phone) return "N/A";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `+52 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  return (
    <div className="p-3 hover:bg-muted/20 transition-colors border-b">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-medium text-sm">{pkg.trackingNumber}</span>
            <Badge variant="destructive" className="text-xs">Faltante</Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
            {pkg.recipientAddress && (
              <div className="flex items-start gap-1">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-1 text-xs">{pkg.recipientAddress}</span>
              </div>
            )}
            {pkg.recipientName && (
              <div className="flex items-center gap-1">
                <User className="w-4 w-4" />
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
        </div>
      </div>
    </div>
  );
};

// Componente principal
export default function UnloadingForm({ onClose, onSuccess }: Props) {
  // Estados persistentes - TODOS LOS ESTADOS PERSISTENTES
  const [selectedUnidad, setSelectedUnidad] = useLocalStorage<Vehicles | null>(
    'unloading_unidad', 
    null
  );
  const [scannedPackages, setScannedPackages] = useLocalStorage<PackageInfo[]>(
    'unloading_scanned_packages', 
    []
  );
  const [shipments, setShipments] = useLocalStorage<PackageInfoForUnloading[]>(
    'unloading_shipments', 
    []
  );
  const [missingPackages, setMissingPackages] = useLocalStorage<{trackingNumber: string; recipientName?: string | null; recipientAddress?: string | null; recipientPhone?: string | null}[]>(
    'unloading_missing_packages', 
    []
  );
  const [surplusTrackings, setSurplusTrackings] = useLocalStorage<string[]>(
    'unloading_surplus_trackings', 
    []
  );
  const [selectedReasons, setSelectedReasons] = useLocalStorage<Record<string, string>>(
    'unloading_selected_reasons', 
    {}
  );
  const [trackingNumbersRaw, setTrackingNumbersRaw] = useLocalStorage<string>(
    'unloading_tracking_raw', 
    ""
  );
  const [consolidatedValidation, setConsolidatedValidation] = useLocalStorage<Consolidateds | null>(
    'unloading_consolidated_validation',
    null
  );

  // Estados regulares
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedSubsidiaryId, setSelectedSubsidiaryId] = useState<string | null>(null);
  const [selectedSubsidiaryName, setSelectedSubsidiaryName] = useState<string | null>(null);
  const [savedUnload, setSavedUnloading] = useState<Unloading | null>(null);
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [lastValidated, setLastValidated] = useState("");
  const [expirationAlertOpen, setExpirationAlertOpen] = useState(false);
  const [expiringPackages, setExpiringPackages] = useState<ExpiringPackage[]>([]);
  const [currentExpiringIndex, setCurrentExpiringIndex] = useState(0);
  const [isValidationPackages, setIsValidationPackages] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const barScannerInputRef = useRef<BarcodeScannerInputHandle>(null);
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);

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
      const offlinePackages = shipments.filter(pkg => pkg.isOffline);
      if (offlinePackages.length > 0 && selectedSubsidiaryId) {
        toast({
          title: "Revalidando paquetes",
          description: `Revalidando ${offlinePackages.length} paquetes creados offline...`,
        });
        
        // Revalidar paquetes offline
        offlinePackages.forEach(async (pkg) => {
          try {
            const result: ValidTrackingAndConsolidateds = await validateTrackingNumbers(
              [pkg.trackingNumber], 
              selectedSubsidiaryId
            );
            
            if (result.validatedShipments.length > 0) {
              const validated = result.validatedShipments[0];
              setShipments(prev => prev.map(prevPkg => 
                prevPkg.trackingNumber === pkg.trackingNumber ? validated : prevPkg
              ));
            }
          } catch (error) {
            console.error("Error revalidando paquete offline:", error);
          }
        });
      }
    }
  }, [isOnline, shipments, selectedSubsidiaryId, setShipments, toast]);

  // 🔥 VALIDACIÓN AUTOMÁTICA - MANTENIENDO LA ESTRUCTURA ORIGINAL
  useEffect(() => {
    if (scannedPackages.length === 0 || isLoading || !selectedSubsidiaryId) return;
    
    // Obtener tracking numbers de los paquetes escaneados
    const trackingNumbers = scannedPackages.map(pkg => pkg.trackingNumber).join("\n");
    
    if (trackingNumbers === lastValidated) return;

    const handler = setTimeout(() => {
      handleValidatePackages();
      setLastValidated(trackingNumbers);
    }, 500);

    return () => clearTimeout(handler);
  }, [scannedPackages, selectedSubsidiaryId, isLoading, lastValidated]);

  useEffect(() => {
    if (user?.subsidiary) {
      setSelectedSubsidiaryId(user.subsidiary.id);
      setSelectedSubsidiaryName(user.subsidiary.name);
    }
  }, [user]);

  useEffect(() => {
    const preventZoom = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault();
    };
    const preventKeyZoom = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["+", "-", "=", "0"].includes(e.key)) {
        e.preventDefault();
      }
    };
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

  const options = Object.entries(TrackingNotFoundEnum).map(([key, value]) => ({
    key,
    label: value
  }));

  const handleSelectMissingTracking = (id: string, value: string) => {
    setSelectedReasons(prev => ({
      ...prev,
      [id]: value
    }));

    if(value === TrackingNotFoundEnum.NOT_TRACKING) {
      // Para faltantes, agregar a missingPackages
      const existingPackage = scannedPackages.find(p => p.trackingNumber === id);
      if (existingPackage) {
        setMissingPackages(prev => [...prev.filter(p => p.trackingNumber !== id), {
          trackingNumber: id,
          recipientName: existingPackage.recipientName,
          recipientAddress: existingPackage.recipientAddress,
          recipientPhone: existingPackage.recipientPhone
        }]);
      }
      setSurplusTrackings(prev => prev.filter(item => item !== id));
    } else if(value === TrackingNotFoundEnum.NOT_SCANNED) {
      // Para sobrantes, agregar a surplusTrackings
      setSurplusTrackings(prev => [...prev.filter(item => item !== id), id]);
      setMissingPackages(prev => prev.filter(p => p.trackingNumber !== id));
    } else if(value === TrackingNotFoundEnum.NOT_IN_CHARGE) {
      // Remover de ambas listas
      setMissingPackages(prev => prev.filter(p => p.trackingNumber !== id));
      setSurplusTrackings(prev => prev.filter(item => item !== id));
    }

    setOpenPopover(null);
  }

  const checkPackageExpiration = useCallback((pkg: PackageInfoForUnloading) => {
    if (!pkg.commitDateTime) return false;

    const commitDate = new Date(pkg.commitDateTime);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    commitDate.setHours(0, 0, 0, 0);

    const timeDiff = commitDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    return daysDiff === 0;
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

  // Función para limpiar TODO el almacenamiento
  const clearAllStorage = useCallback(() => {
    const keys = [
      'unloading_unidad',
      'unloading_scanned_packages',
      'unloading_shipments',
      'unloading_missing_packages',
      'unloading_surplus_trackings',
      'unloading_selected_reasons',
      'unloading_tracking_raw',
      'unloading_consolidated_validation'
    ];

    keys.forEach(key => {
      try {
        window.localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Error clearing ${key}:`, error);
      }
    });

    // Resetear estados persistentes
    setSelectedUnidad(null);
    setScannedPackages([]);
    setShipments([]);
    setMissingPackages([]);
    setSurplusTrackings([]);
    setSelectedReasons({});
    setTrackingNumbersRaw("");
    setConsolidatedValidation(null);

    toast({
      title: "Datos limpiados",
      description: "Todos los datos locales han sido eliminados.",
    });
  }, [
    setSelectedUnidad,
    setScannedPackages,
    setShipments,
    setMissingPackages,
    setSurplusTrackings,
    setSelectedReasons,
    setTrackingNumbersRaw,
    setConsolidatedValidation
  ]);

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

    setIsLoading(true);
    setProgress(0);

    try {
      const result: ValidTrackingAndConsolidateds = await validateTrackingNumbers(validNumbers, selectedSubsidiaryId);

      // Actualizar los paquetes escaneados con la información validada
      if (barScannerInputRef.current && barScannerInputRef.current.updateValidatedPackages) {
        barScannerInputRef.current.updateValidatedPackages(result.validatedShipments);
      }

      // 1. ACTUALIZAR SHIPMENTS - Reemplazar completamente
      const newShipments = result.validatedShipments;
      setShipments(newShipments);

      // 2. MISSING PACKAGES - Extraer de consolidados
      const newMissingPackages: {trackingNumber: string; recipientName?: string | null; recipientAddress?: string | null; recipientPhone?: string | null}[] = [];
      if (result.consolidateds) {
        Object.values(result.consolidateds).forEach(consolidateds => {
          consolidateds.forEach(consolidated => {
            if (consolidated.notFound && consolidated.notFound.length > 0) {
              consolidated.notFound.forEach(missingPkg => {
                if (!newMissingPackages.some(m => m.trackingNumber === missingPkg.trackingNumber)) {
                  newMissingPackages.push({
                    trackingNumber: missingPkg.trackingNumber,
                    recipientName: missingPkg.recipientName,
                    recipientAddress: missingPkg.recipientAddress,
                    recipientPhone: missingPkg.recipientPhone
                  });
                }
              });
            }
          });
        });
      }

      setMissingPackages(newMissingPackages);

      // 3. SURPLUS TRACKINGS - Guías inválidas + guías que no están en shipments válidos
      const validTrackings = newShipments
        .filter(p => p.isValid)
        .map(p => p.trackingNumber);
      
      const surplusFromValid = validNumbers.filter(tn => !validTrackings.includes(tn));
      const allSurplus = [...invalidNumbers, ...surplusFromValid];
      
      setSurplusTrackings(allSurplus);

      // 4. CONSOLIDATED VALIDATION
      setConsolidatedValidation(result.consolidateds || null);

      const todayExpiringPackages: ExpiringPackage[] = newShipments
          .filter(pkg => pkg.isValid && pkg.commitDateTime && checkPackageExpiration(pkg))
          .map(pkg => ({
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

      const validCount = newShipments.filter((p) => p.isValid).length;
      
      toast({
        title: "Validación completada",
        description: `✅ ${validCount} válidos | ❌ ${newMissingPackages.length} faltantes | ⚠️ ${allSurplus.length} sobrantes`,
      });
    } catch (error) {
      console.error("Error validating packages:", error);
      
      // Modo offline: crear paquetes offline
      if (!isOnline) {
        const offlinePackages: PackageInfoForUnloading[] = validNumbers.map(tn => ({
          id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          trackingNumber: tn,
          isValid: false,
          reason: "Sin conexión - validar cuando se restablezca internet",
          isOffline: true,
          createdAt: new Date(),
        } as PackageInfoForUnloading));
        
        setShipments((prev) => [...prev, ...offlinePackages]);
        setSurplusTrackings(invalidNumbers);
        
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
    setShipments((prev) => prev.filter((p) => p.trackingNumber !== trackingNumber));
    setScannedPackages((prev) => prev.filter((p) => p.trackingNumber !== trackingNumber));
    setMissingPackages((prev) => prev.filter((p) => p.trackingNumber !== trackingNumber));
    setSurplusTrackings((prev) => prev.filter((p) => p !== trackingNumber));
  }, [setShipments, setScannedPackages, setMissingPackages, setSurplusTrackings]);

  const handleSendEmail = async (unloadingSaved: Unloading) => {
    const blob = await pdf(
      <UnloadingPDFReport
        key={Date.now()}
        vehicle={selectedUnidad}
        packages={validShipments}
        missingPackages={missingPackages}
        unScannedPackages={surplusTrackings}
        subsidiaryName={unloadingSaved?.subsidiary?.name ?? ""}
        unloadingTrackigNumber={unloadingSaved?.trackingNumber ?? ""}
      />
    ).toBlob();

    const blobUrl = URL.createObjectURL(blob) + `#${Date.now()}`;
    window.open(blobUrl, '_blank');

    const currentDate = new Date().toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
      });

    unloadingSaved.shipments = validShipments;

    const fileName = `${unloadingSaved?.subsidiary?.name}--Desembarque--${unloadingSaved?.subsidiary?.name}_${currentDate.replace(/\//g, "-")}.pdf`;

    const pdfFile = new File([blob], fileName, { type: 'application/pdf' });

    const excelBuffer = await generateUnloadingExcelClient(unloadingSaved, false);
    const excelBlob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const excelFileName = `${unloadingSaved?.subsidiary?.name}--Desembarque--${currentDate.replace(/\//g, "-")}.xlsx`;
    const excelFile = new File([excelBlob], excelFileName, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const onProgress = (percent: number) => {
      console.log(`Upload progress: ${percent}%`);
    };

    await uploadPDFile(pdfFile, excelFile, unloadingSaved?.subsidiary?.name, unloadingSaved?.id, onProgress);
  }

  const handleUnloading = async () => {
    if (!selectedSubsidiaryId) {
      toast({
        title: "Sucursal no seleccionada",
        description: "Por favor selecciona una sucursal antes de procesar.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedUnidad) {
      toast({
        title: "Unidad no seleccionada",
        description: "Por favor selecciona una unidad de transporte.",
        variant: "destructive",
      });
      return;
    }

    const validShipments = shipments.filter((p) => p.isValid);

    if (validShipments.length === 0) {
      toast({
        title: "No hay paquetes válidos",
        description: "No hay paquetes válidos para procesar la descarga.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setProgress(0);

    try {
      const unloadingData: UnloadingFormData = {
        vehicle: selectedUnidad,
        subsidiary: { id: selectedSubsidiaryId, name: selectedSubsidiaryName || "Unknown" },
        shipments: validShipments.map((p) => p.id),
        missingTrackings: missingPackages.map(p => p.trackingNumber),
        unScannedTrackings: surplusTrackings,
        date: new Date().toISOString(),
      };

      const newUnloading = await saveUnloading(unloadingData);
      setSavedUnloading(newUnloading);

      await handleSendEmail(newUnloading);

      toast({
        title: "Descarga procesada exitosamente",
        description: `Se procesaron ${validShipments.length} paquetes para descarga. Faltantes: ${missingPackages.length}, Sobrantes: ${surplusTrackings.length}`,
      });

      // Limpiar storage después de éxito
      clearAllStorage();

      onSuccess();
    } catch (error) {
      console.error("Error in handleUnloading:", error);
      toast({
        title: "Error al procesar descarga",
        description: "Hubo un problema al procesar la descarga de paquetes.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setSavedUnloading(null);
    }
  };

  const handleExport = async () => {
    setIsLoading(true);
    
    const blob = await pdf(
      <UnloadingPDFReport
        key={Date.now()}
        vehicle={selectedUnidad}
        packages={validShipments}
        missingPackages={missingPackages}
        unScannedPackages={surplusTrackings}
        subsidiaryName={user?.subsidiary?.name || ""}
        unloadingTrackigNumber="1254639874598"
      />
    ).toBlob();

    const blobUrl = URL.createObjectURL(blob) + `#${Date.now()}`;
    window.open(blobUrl, '_blank');
    
    setIsLoading(false);
  }

  const formatMexicanPhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `+52 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    if (cleaned.length === 12 && cleaned.startsWith("52")) {
      return `+52 (${cleaned.slice(2, 5)}) ${cleaned.slice(5, 8)}-${cleaned.slice(8)}`;
    }
    if (cleaned.length === 13 && cleaned.startsWith("521")) {
      return `+52 (${cleaned.slice(3, 6)}) ${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
    }
    return phone;
  };

  const validShipments = shipments.filter((p) => p.isValid);
  const canUnload = selectedUnidad && validShipments.length > 0;

  const filteredValidShipments = useMemo(() => {
    return validShipments.filter(pkg => {
      const matchesSearch = pkg.trackingNumber.includes(searchTerm) || 
                           (pkg.recipientName && pkg.recipientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           (pkg.recipientAddress && pkg.recipientAddress.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesPriority = filterPriority === "all" || pkg.priority === filterPriority;
      const matchesStatus = filterStatus === "all" || 
                           (filterStatus === "special" && (pkg.isCharge || pkg.isHighValue || pkg.payment)) ||
                           (filterStatus === "normal" && !pkg.isCharge && !pkg.isHighValue && !pkg.payment);
      
      return matchesSearch && matchesPriority && matchesStatus;
    });
  }, [validShipments, searchTerm, filterPriority, filterStatus]);

  return (
      <>
        <Card className="w-full max-w-6xl mx-auto border-0 shadow-none">
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
                    <PackageCheckIcon className="h-6 w-6"/>
                  </div>
                  <span>Descarga de Paquetes</span>
                  {shipments.length > 0 && (
                      <Badge variant="secondary" className="ml-2 text-sm">
                        {validShipments.length} válidos / {shipments.length} total
                      </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Procesa la descarga de paquetes de unidades de transporte
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-primary-foreground bg-primary px-3 py-1.5 rounded-full">
                  <MapPinIcon className="h-4 w-4"/>
                  <span>Sucursal: {selectedSubsidiaryName}</span>
                </div>
                
                {(shipments.length > 0 || selectedUnidad) && (
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sección de transporte */}
              <div className="space-y-4 p-4 bg-muted/20 rounded-lg">
                <div className="space-y-2">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <PackageCheckIcon className="h-4 w-4"/>
                    Unidad de Transporte
                  </Label>
                  <UnidadSelector
                      selectedUnidad={selectedUnidad}
                      onSelectionChange={setSelectedUnidad}
                      disabled={isLoading}
                  />
                </div>

                <Separator/>

                <div>
                  <ConsolidateDetails consolidatedData={consolidatedValidation || undefined}/>
                </div>
              </div>

              {/* Sección de escaneo */}
              <div className="space-y-4 p-4 bg-muted/20 rounded-lg">
                <div className="space-y-2">
                  <BarcodeScannerInput
                      ref={barScannerInputRef}
                      onPackagesChange={setScannedPackages}
                      disabled={isLoading || !selectedSubsidiaryId}
                      placeholder={!selectedSubsidiaryId ? "Selecciona una sucursal primero" : "Escribe o escanea números de tracking"}
                  />
                </div>

                {isLoading && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label>Progreso de validación</Label>
                        <span className="text-sm text-muted-foreground">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2"/>
                    </div>
                )}
              </div>
            </div>

            {shipments.length > 0 && (
                <div className="mt-6 space-y-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Package className="h-5 w-5"/>
                      Paquetes validados
                      <Badge variant="outline" className="ml-2">
                        {filteredValidShipments.length} de {validShipments.length}
                      </Badge>
                    </h3>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <span className="font-medium">Simbología:</span>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 cursor-help">
                            <CircleAlertIcon className="h-3 w-3 text-destructive"/>
                            <span>Inválido</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Paquete no válido para descarga</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 cursor-help">
                            <Badge className="h-4 px-1 text-xs bg-green-600">CARGA/F2/31.5</Badge>
                            <span>Carga especial</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Paquete de carga especial</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 cursor-help">
                            <Badge className="h-4 px-1 text-xs bg-violet-600">
                              <GemIcon className="h-3 w-3"/>
                            </Badge>
                            <span>Alto Valor</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Paquete de alto valor</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 cursor-help">
                            <Badge className="h-4 px-1 text-xs bg-blue-600">
                              <DollarSignIcon className="h-3 w-3"/>
                            </Badge>
                            <span>Cobro</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Paquete con cobro asociado</p>
                        </TooltipContent>
                      </Tooltip>

                      {!isOnline && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 cursor-help">
                              <Badge variant="outline" className="h-4 bg-yellow-100 text-yellow-800">
                                ⚡
                              </Badge>
                              <span>Offline</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Paquete guardado en modo offline</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>

                  {/* Buscador y Filtros */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                      <Input
                          placeholder="Buscar por tracking, destinatario o dirección..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">Filtrar</h4>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowFilters(!showFilters)}
                            className="h-8 gap-1"
                        >
                          <Filter className="h-4 w-4"/>
                          {showFilters ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
                        </Button>
                      </div>

                      <Collapsible open={showFilters}>
                        <CollapsibleContent className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label className="text-sm">Prioridad</Label>
                              <select
                                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                  value={filterPriority}
                                  onChange={(e) => setFilterPriority(e.target.value)}
                              >
                                <option value="all">Todas las prioridades</option>
                                <option value={Priority.ALTA}>Alta</option>
                                <option value={Priority.MEDIA}>Media</option>
                                <option value={Priority.BAJA}>Baja</option>
                              </select>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm">Tipo de paquete</Label>
                              <select
                                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                  value={filterStatus}
                                  onChange={(e) => setFilterStatus(e.target.value)}
                              >
                                <option value="all">Todos los tipos</option>
                                <option value="special">Especial (carga, alto valor, cobro)</option>
                                <option value="normal">Paquetes normales</option>
                              </select>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  </div>

                  <Tabs defaultValue="validos" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="validos" className="flex items-center gap-1">
                        <Check className="h-4 w-4"/>
                        Válidos ({validShipments.length})
                      </TabsTrigger>
                      <TabsTrigger value="faltantes" className="flex items-center gap-1">
                        <CircleAlertIcon className="h-4 w-4"/>
                        Faltantes ({missingPackages.length})
                      </TabsTrigger>
                      <TabsTrigger value="sobrantes" className="flex items-center gap-1">
                        <AlertCircle className="h-4 w-4"/>
                        Sobrantes ({surplusTrackings.length})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="validos" className="space-y-3 mt-4">
                      {filteredValidShipments.length > 0 ? (
                          <ScrollArea className="h-[400px] rounded-md border">
                            <div className="grid grid-cols-1 divide-y">
                              {filteredValidShipments.map((pkg) => (
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
                          </ScrollArea>
                      ) : (
                          <div className="text-center py-12 text-muted-foreground border rounded-md">
                            <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3"/>
                            <p>No se encontraron paquetes con los filtros aplicados</p>
                            {(searchTerm || filterPriority !== "all" || filterStatus !== "all") && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mt-3"
                                    onClick={() => {
                                      setSearchTerm("");
                                      setFilterPriority("all");
                                      setFilterStatus("all");
                                    }}
                                >
                                  Limpiar filtros
                                </Button>
                            )}
                          </div>
                      )}
                    </TabsContent>

                    <TabsContent value="faltantes" className="mt-4">
                      {missingPackages.length > 0 ? (
                          <ScrollArea className="h-[300px] rounded-md border">
                            <div className="grid grid-cols-1 divide-y">
                              {missingPackages.map((pkg, index) => (
                                  <MissingPackageItem key={`${pkg.trackingNumber}-${index}`} pkg={pkg} />
                              ))}
                            </div>
                          </ScrollArea>
                      ) : (
                          <div className="text-center py-8 text-muted-foreground border rounded-md">
                            <p>No hay paquetes faltantes</p>
                          </div>
                      )}
                    </TabsContent>

                    <TabsContent value="sobrantes" className="mt-4">
                      {surplusTrackings.length > 0 ? (
                          <ScrollArea className="h-[300px] rounded-md border p-4">
                            <ul className="space-y-2">
                              {surplusTrackings.map(tracking => (
                                  <li key={tracking}
                                      className="flex justify-between items-center py-2 px-3 rounded-md bg-amber-50">
                                    <span className="font-mono text-sm">{tracking}</span>
                                    <Badge variant="outline" className="bg-amber-100 text-amber-800 text-xs">
                                      Sobrante
                                    </Badge>
                                  </li>
                              ))}
                            </ul>
                          </ScrollArea>
                      ) : (
                          <div className="text-center py-8 text-muted-foreground border rounded-md">
                            <p>No hay guías sobrantes</p>
                          </div>
                      )}
                    </TabsContent>
                  </Tabs>

                  <div className="flex items-center gap-4 text-sm pt-4 border-t">
                    <div className="flex items-center gap-1">
                      <Package className="w-4 h-4"/>
                      <span className="font-medium">Resumen:</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-green-600 font-semibold">{validShipments.length}</span>
                      <span>válidos</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-red-600 font-semibold">{missingPackages.length}</span>
                      <span>faltantes</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-amber-600 font-semibold">{surplusTrackings.length}</span>
                      <span>sobrantes</span>
                    </div>
                  </div>
                </div>
            )}

            {/* Toolbar unificada de botones */}
            <div className="flex flex-col sm:flex-row gap-2 justify-between items-center p-4 bg-muted/20 rounded-lg">
              <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="gap-2"
              >
                <X className="h-4 w-4"/>
                Cancelar
              </Button>

              <div className="flex flex-col sm:flexRow gap-2">
                <Button
                    onClick={handleValidatePackages}
                    disabled={isLoading || !selectedSubsidiaryId || scannedPackages.length === 0}
                    className="gap-2"
                    variant="outline"
                >
                  {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin"/>
                  ) : (
                      <Scan className="h-4 w-4"/>
                  )}
                  {isLoading ? "Procesando..." : "Validar paquetes"}
                </Button>

                <Button
                    onClick={handleUnloading}
                    disabled={isLoading || !canUnload}
                    className="gap-2"
                >
                  {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin"/>
                  ) : (
                      <Send className="h-4 w-4"/>
                  )}
                  Procesar descarga
                </Button>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                          onClick={handleExport}
                          disabled={isLoading || shipments.length === 0}
                          variant="outline"
                          className="gap-2"
                      >
                        <Download className="h-4 w-4"/>
                        Exportar PDF
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Generar reporte PDF de los paquetes actuales</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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