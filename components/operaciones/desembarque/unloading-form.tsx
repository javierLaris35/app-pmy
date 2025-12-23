"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import useUnloadingStore from "@/store/unloading.store";
import { UnidadSelector } from "@/components/selectors/unidad-selector";
import { useBrowserVoice } from "@/hooks/use-browser-voice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { AlertCircle, Check, ChevronsUpDown, CircleAlertIcon, DollarSignIcon, GemIcon, MapPin, MapPinIcon, Package, PackageCheckIcon, Phone, Scan, Send, Trash2, User, Loader2, Search, Filter, ChevronDown, ChevronUp, Download, X, Eye, HelpCircle, MailIcon } from "lucide-react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
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
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoaderWithOverlay } from "@/components/loader";
import { ExpirationAlertModal, ExpiringPackage } from "@/components/ExpirationAlertModal";
import { CorrectTrackingModal } from "./correct-tracking-modal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { IconTruckLoading } from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";
import { NotFoundShipmentDetails } from "./not-found-details";

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
  selectedSubsidiaryId?: string | null;
  selectedSubsidiaryName?: string | null;
}

// Componente para el modal de completar datos
interface CompleteDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  package: Shipment | null;
  onSave: (trackingNumber: string, data: { recipientName: string; recipientAddress: string; recipientPhone: string }) => void;
}

const CompleteDataModal = ({ isOpen, onClose, package: pkg, onSave }: CompleteDataModalProps) => {
  const [formData, setFormData] = useState({
    recipientName: "",
    recipientAddress: "",
    recipientPhone: ""
  });

  useEffect(() => {
    if (pkg) {
      setFormData({
        recipientName: pkg.recipientName || "",
        recipientAddress: pkg.recipientAddress || "",
        recipientPhone: pkg.recipientPhone || ""
      });
    }
  }, [pkg]);

  const handleSave = () => {
    if (pkg && formData.recipientName && formData.recipientAddress && formData.recipientPhone) {
      onSave(pkg.trackingNumber, formData);
      onClose();
    }
  };

  const handleClose = () => {
    setFormData({ recipientName: "", recipientAddress: "", recipientPhone: "" });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-md" 
        aria-describedby={pkg?.trackingNumber ? "complete-data-desc" : undefined}
      >
        <DialogHeader>
          <DialogTitle>Completar datos del paquete</DialogTitle>
          {pkg?.trackingNumber && (
            <DialogDescription id="complete-data-desc">
              Complete la información del destinatario para el paquete <b>{pkg.trackingNumber}</b>
            </DialogDescription>
          )}
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="recipientName">Nombre del destinatario *</Label>
            <Input
              id="recipientName"
              value={formData.recipientName}
              onChange={(e) => setFormData(prev => ({ ...prev, recipientName: e.target.value }))}
              placeholder="Ingrese el nombre completo"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="recipientAddress">Dirección *</Label>
            <Textarea
              id="recipientAddress"
              value={formData.recipientAddress}
              onChange={(e) => setFormData(prev => ({ ...prev, recipientAddress: e.target.value }))}
              placeholder="Ingrese la dirección completa"
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="recipientPhone">Teléfono *</Label>
            <Input
              id="recipientPhone"
              value={formData.recipientPhone}
              onChange={(e) => setFormData(prev => ({ ...prev, recipientPhone: e.target.value }))}
              placeholder="Ingrese el número de teléfono"
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!formData.recipientName || !formData.recipientAddress || !formData.recipientPhone}
          >
            Guardar datos
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Componente auxiliar para mostrar cada paquete - MODIFICADO
const PackageItem = ({ 
  pkg, 
  onRemove, 
  isLoading, 
  selectedReasons, 
  onSelectReason, 
  openPopover, 
  setOpenPopover,
  onCompleteData
}: {
  pkg: Shipment;
  onRemove: (trackingNumber: string) => void;
  isLoading: boolean;
  selectedReasons: Record<string, string>;
  onSelectReason: (id: string, value: string) => void;
  openPopover: string | null;
  setOpenPopover: (value: string | null) => void;
  onCompleteData: (pkg: Shipment) => void;
}) => {
  const formatMexicanPhoneNumber = (phone: string | null | undefined): string => {
    if (!phone || typeof phone !== 'string') return "N/A";
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

  // Verificar si el paquete necesita datos completos
  const needsData = pkg.isValid && (!pkg.recipientName || !pkg.recipientAddress || !pkg.recipientPhone);

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
            
            {needsData && (
              <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                Datos incompletos
              </Badge>
            )}
            
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
                {pkg.payment.type} ${pkg.payment.amount}
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
              {pkg.recipientAddress ? (
                <div className="flex items-start gap-1">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-1 text-xs">{pkg.recipientAddress}</span>
                </div>
              ) : (
                <div className="flex items-start gap-1 text-yellow-600">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-1 text-xs">Dirección no disponible</span>
                </div>
              )}
              {pkg.recipientName ? (
                <div className="flex items-center gap-1">
                  <User className="w-4 w-4" />
                  <span className="text-xs">{pkg.recipientName}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-yellow-600">
                  <User className="w-4 w-4" />
                  <span className="text-xs">Nombre no disponible</span>
                </div>
              )}
              {pkg.recipientPhone ? (
                <div className="flex items-center gap-1">
                  <Phone className="w-4 w-4" />
                  <span className="text-xs">{formatMexicanPhoneNumber(pkg.recipientPhone)}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-yellow-600">
                  <Phone className="w-4 w-4" />
                  <span className="text-xs">Teléfono no disponible</span>
                </div>
              )}
            </div>
          )}
          
          {!pkg.isValid && pkg.reason && (
            <div className="flex items-center gap-1 text-sm text-destructive">
              <AlertCircle className="w-4 w-4" />
              <span className="text-xs">{pkg.reason}</span>
            </div>
          )}
        </div>
        
        <div className="flex flex-col items-end gap-2">
          {/*{needsData && (*/}
          {/*  <Button*/}
          {/*    variant="outline"*/}
          {/*    size="sm"*/}
          {/*    onClick={() => onCompleteData(pkg)}*/}
          {/*    disabled={isLoading}*/}
          {/*    className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100"*/}
          {/*  >*/}
          {/*    Completar datos*/}
          {/*  </Button>*/}
          {/*)}*/}

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
const MissingPackageItem = ({ pkg }: { pkg: { trackingNumber: string; recipientName?: string | null; recipientAddress?: string | null; recipientPhone?: string | null; recipientZip?: string | null } }) => {
  const formatMexicanPhoneNumber = (phone: string | null | undefined): string => {
    if (!phone || typeof phone !== 'string') return "N/A";
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
            {pkg.recipientZip && (
              <div className="flex items-center gap-1">
                <MailIcon className="w-4 w-4" />
                <span className="text-xs">{pkg.recipientZip}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente principal
export default function UnloadingForm({
  onClose,
  onSuccess,
  selectedSubsidiaryId: parentSubsidiaryId,
  selectedSubsidiaryName: parentSubsidiaryName,
}: Props) {
  // Ref para evitar aplicar la misma sucursal en bucle
  const parentSubsidiaryAppliedRef = useRef<string | null>(null);
  // estados persistentes (migrados a zustand + persist)
  const selectedUnidad = useUnloadingStore((s) => s.selectedUnidad);
  const setSelectedUnidad = useUnloadingStore((s) => s.setSelectedUnidad);

  const scannedPackages = useUnloadingStore((s) => s.scannedPackages);
  const setScannedPackages = useUnloadingStore((s) => s.setScannedPackages);

  const shipments = useUnloadingStore((s) => s.shipments);
  const setShipments = useUnloadingStore((s) => s.setShipments);

  const missingPackages = useUnloadingStore((s) => s.missingPackages);
  const setMissingPackages = useUnloadingStore((s) => s.setMissingPackages);

  const surplusTrackings = useUnloadingStore((s) => s.surplusTrackings);
  const setSurplusTrackings = useUnloadingStore((s) => s.setSurplusTrackings);

  const selectedReasons = useUnloadingStore((s) => s.selectedReasons);
  const setSelectedReasons = useUnloadingStore((s) => s.setSelectedReasons);

  const trackingNumbersRaw = useUnloadingStore((s) => s.trackingNumbersRaw);
  const setTrackingNumbersRaw = useUnloadingStore((s) => s.setTrackingNumbersRaw);

  const consolidatedValidation = useUnloadingStore((s) => s.consolidatedValidation);
  const setConsolidatedValidation = useUnloadingStore((s) => s.setConsolidatedValidation);

  // Persistir consolidado(s) seleccionados y conteos
  const selectedConsolidatedIds = useUnloadingStore((s) => s.selectedConsolidatedIds);
  const setSelectedConsolidatedIds = useUnloadingStore((s) => s.setSelectedConsolidatedIds);
  const setSelectedConsolidatedCounts = (counts: { totalPackages: number; totalAdded: number; totalNotFound: number } | null) => {
    try {
      if (typeof window !== "undefined") {
        if (counts) window.localStorage.setItem('unloading_selected_consolidados_counts', JSON.stringify(counts))
        else window.localStorage.removeItem('unloading_selected_consolidados_counts')
      }
    } catch (err) { console.error("Error saving consolidated counts:", err) }
  }
  // Helper para generar la misma key que usa ConsolidateDetails
  const getConsolidatedKey = (item: any, idx: number) => item.id ?? item.consNumber ?? `${item.type}-${idx}`
 
  // estados regulares
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scannerHasDueTomorrow, setScannerHasDueTomorrow] = useState(false);
  const [selectedSubsidiaryId, setSelectedSubsidiaryId] = useState<string | null>(null);
  const [selectedSubsidiaryName, setSelectedSubsidiaryName] = useState<string | null>(null);
  const [savedUnload, setSavedUnloading] = useState<Unloading | null>(null);
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [lastValidated, setLastValidated] = useState("");
  const [isValidationPackages, setIsValidationPackages] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // estados para manejo de expiración
  const [expirationAlertOpen, setExpirationAlertOpen] = useState(false);
  const [expiringPackages, setExpiringPackages] = useState<ExpiringPackage[]>([]);
  const [currentExpiringIndex, setCurrentExpiringIndex] = useState(0);
  const [shownExpiringPackages, setShownExpiringPackages] = useState<Set<string>>(new Set());

  // nuevos estados para el modal de completar datos
  const [completeDataModalOpen, setCompleteDataModalOpen] = useState(false);
  const [selectedPackageForData, setSelectedPackageForData] = useState<Shipment | null>(null);
  const [packagesNeedingData, setPackagesNeedingData] = useState<Shipment[]>([]);

  // estados para el modal de corrección de tracking
  const [correctTrackingModalOpen, setCorrectTrackingModalOpen] = useState(false);
  const [selectedTrackingToCorrect, setSelectedTrackingToCorrect] = useState<string>("");
  const [pendingSurplusQueue, setPendingSurplusQueue] = useState<string[]>([]); // Cola de surplus pendientes

  const barScannerInputRef = useRef<BarcodeScannerInputHandle>(null);
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);

  const safeArray = <T,>(arr: T[] | undefined | null | any): T[] => {
    if (Array.isArray(arr)) {
      return arr;
    }
    console.warn("⚠️ safeArray: No es un array, devolviendo array vacío:", arr);
    return [];
  };

  // Función helper para asegurar que trabajamos con objetos
  const safeObject = <T extends object>(obj: T | undefined | null | any): T => {
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      return obj;
    }
    console.warn("⚠️ safeObject: No es un objeto, devolviendo objeto vacío:", obj);
    return {} as T;
  };

  // Versiones seguras de todos los estados del store
  const safeScannedPackages = useMemo(() => {
    return safeArray(scannedPackages);
  }, [scannedPackages]);

  const safeShipments = useMemo(() => {
    return safeArray(shipments);
  }, [shipments]);

  const safeMissingPackages = useMemo(() => {
    return safeArray(missingPackages);
  }, [missingPackages]);

  const safeSurplusTrackings = useMemo(() => {
    return safeArray(surplusTrackings);
  }, [surplusTrackings]);

  const safeSelectedReasons = useMemo(() => {
    return safeObject(selectedReasons);
  }, [selectedReasons]);

  // Valid shipments usando las versiones seguras
  const validShipments = useMemo(() => 
    safeShipments.filter((p) => p.isValid), 
    [safeShipments]
  );

  // Sincronizar sucursal cuando el padre cambie su selección (aplicar sólo si cambió la id)
  useEffect(() => {
    if (!parentSubsidiaryId) return;
    if (parentSubsidiaryAppliedRef.current === parentSubsidiaryId) return;

    // Aplicar sólo si hay un cambio real
    parentSubsidiaryAppliedRef.current = parentSubsidiaryId;
    console.log("[UnloadingForm] applying parent subsidiary (once):", parentSubsidiaryId, parentSubsidiaryName);

    setSelectedSubsidiaryId(prev => (prev === parentSubsidiaryId ? prev : parentSubsidiaryId));
    setSelectedSubsidiaryName(prev => {
      const newName = parentSubsidiaryName ?? null;
      return prev === newName ? prev : newName;
    });

    // limpiar datos asociados a la sucursal previa sólo si había datos
    setScannedPackages(prev => (prev.length ? [] : prev));
    setShipments(prev => (prev.length ? [] : prev));
    setMissingPackages(prev => (prev.length ? [] : prev));
    setSurplusTrackings(prev => (prev.length ? [] : prev));
    setSelectedReasons(prev => (Object.keys(prev).length ? {} : prev));
    setConsolidatedValidation(prev => (prev ? null : prev));
    setSelectedConsolidatedIds(prev => (prev.length ? [] : prev));
    setLastValidated(prev => (prev ? "" : prev));

    // feedback leve sólo cuando hay cambio efectivo (no obligatorio)
    toast?.({ title: "Sucursal actualizada", description: parentSubsidiaryName ? `Sucursal: ${parentSubsidiaryName}` : "Sucursal actualizada." });
  }, [
    parentSubsidiaryId,
    parentSubsidiaryName,
    setScannedPackages,
    setShipments,
    setMissingPackages,
    setSurplusTrackings,
    setSelectedReasons,
    setConsolidatedValidation,
    setSelectedConsolidatedIds,
    setLastValidated,
    toast,
  ]);
 
  useEffect(() => {
    console.log("[UnloadingForm] prop parentSubsidiaryName changed:", parentSubsidiaryName, "local selectedSubsidiaryName:", selectedSubsidiaryName);
    if (parentSubsidiaryName !== undefined && parentSubsidiaryName !== selectedSubsidiaryName) {
      setSelectedSubsidiaryName(parentSubsidiaryName);
    }
  }, [parentSubsidiaryName, selectedSubsidiaryName]);
  
  // Trace general de props y estado de sucursal para debugging
  useEffect(() => {
    console.log("[UnloadingForm] props -> parentSubsidiaryId:", parentSubsidiaryId, "parentSubsidiaryName:", parentSubsidiaryName);
    console.log("[UnloadingForm] state -> selectedSubsidiaryId:", selectedSubsidiaryId, "selectedSubsidiaryName:", selectedSubsidiaryName);
  }, [parentSubsidiaryId, parentSubsidiaryName, selectedSubsidiaryId, selectedSubsidiaryName]);
  
  // Evitar setState durante render del hijo: deferir la actualización
  const handleConsolidateSelectionChange = useCallback((ids: string[]) => {
    queueMicrotask(() => setSelectedConsolidatedIds(ids));
  }, [setSelectedConsolidatedIds]);
  
  // Hook para text-to-speech
  const { speak: speakMessage } = useBrowserVoice({
    pitch: 0.8,
    rate: 1.3,
  });

  // Función para verificar si un paquete necesita datos
  const checkPackageNeedsData = useCallback((pkg: Shipment): boolean => {
    return pkg.isValid && (!pkg.recipientName || !pkg.recipientAddress || !pkg.recipientPhone);
  }, []);

  // Función para encontrar paquetes que necesitan datos
  const findPackagesNeedingData = useCallback((shipmentsList: Shipment[]): Shipment[] => {
    return shipmentsList.filter(checkPackageNeedsData);
  }, [checkPackageNeedsData]);

  // NUEVA FUNCIÓN para manejar el guardado de datos completados
  const handleSavePackageData = useCallback((trackingNumber: string, data: { recipientName: string; recipientAddress: string; recipientPhone: string }) => {
    setShipments(prev => 
      prev.map(pkg => 
        pkg.trackingNumber === trackingNumber 
          ? { 
              ...pkg, 
              recipientName: data.recipientName,
              recipientAddress: data.recipientAddress,
              recipientPhone: data.recipientPhone
            } 
          : pkg
      )
    );

    toast({
      title: "Datos guardados",
      description: `Se actualizaron los datos del paquete ${trackingNumber}`,
    });
  }, [setShipments, toast]);

  // NUEVA FUNCIÓN para abrir el modal de completar datos
  const handleOpenCompleteData = useCallback((pkg: Shipment) => {
    setSelectedPackageForData(pkg);
    setCompleteDataModalOpen(true);
  }, []);

  // NUEVA FUNCIÓN para cerrar el modal
  const handleCloseCompleteData = useCallback(() => {
    setCompleteDataModalOpen(false);
    setSelectedPackageForData(null);
  }, []);

  // FUNCIONES para corrección de tracking
  const handleOpenCorrectTracking = useCallback((trackingNumber: string) => {
    setSelectedTrackingToCorrect(trackingNumber);
    setCorrectTrackingModalOpen(true);
  }, []);

  const handleCloseCorrectTracking = useCallback(() => {
    setCorrectTrackingModalOpen(false);
    setSelectedTrackingToCorrect("");
  }, []);

  const handleCorrectTracking = useCallback(async (data: {
    originalTracking: string;
    correctedTracking: string;
    packageInfo: any;
  }) => {
    try {
      // 1. Remover el tracking incorrecto de surplus
      setSurplusTrackings(prev => prev.filter(t => t !== data.originalTracking));

      // 2. Remover el tracking incorrecto de scannedPackages
      setScannedPackages(prev => prev.filter(p => p.trackingNumber !== data.originalTracking));

      // 3. Agregar el nuevo tracking a scannedPackages
      const newPackage: PackageInfo = {
        id: `corrected-${Date.now()}`,
        trackingNumber: data.correctedTracking,
        isValid: false,
        isPendingValidation: true,
        recipientName: data.packageInfo.recipient?.name,
        recipientAddress: data.packageInfo.recipient?.address,
        recipientPhone: data.packageInfo.recipient?.phoneNumber,
      };

      setScannedPackages(prev => [...prev, newPackage]);

      toast({
        title: "Tracking corregido",
        description: `Se reemplazó ${data.originalTracking} por ${data.correctedTracking}. El paquete será validado automáticamente.`,
      });

      // 4. El efecto de validación automática se encargará de validar el nuevo tracking

    } catch (error) {
      console.error("Error corrigiendo tracking:", error);
      toast({
        title: "Error",
        description: "Hubo un problema al corregir el tracking",
        variant: "destructive",
      });
    }
  }, [setScannedPackages, setSurplusTrackings, toast]);

  // Tutorial guiado similar a monitoreo
  const startTutorial = () => {
    try {
      const driverObj = driver({
        showProgress: true,
        steps: [
          {
            element: "#unloading-tutorial-button",
            popover: {
              title: "Bienvenido al Desembarque",
              description: "Este tutorial te guiará por las acciones principales para procesar un desembarque.",
              side: "left",
              align: "start",
            },
          },
          {
            element: "#unloading-filters-section",
            popover: {
              title: "Unidad y Consolidados",
              description: "Selecciona la unidad de transporte y/o un consolidado para precargar paquetes.",
              side: "bottom",
              align: "start",
            },
          },
          {
            element: "#unidad-selector",
            popover: {
              title: "Seleccionar Unidad",
              description: "Escoge la unidad (placa, capacidad) que transportará los paquetes.",
              side: "bottom",
              align: "start",
            },
          },
          {
            element: "#consolidado-section",
            popover: {
              title: "Consolidados",
              description: "Selecciona consolidados para ver y agregar paquetes relacionados.",
              side: "bottom",
              align: "start",
            },
          },
          {
            element: "#barcode-scanner",
            popover: {
              title: "Escaneo de guías",
              description: "Aquí puedes escanear o pegar números de tracking. Asegúrate de seleccionar la sucursal primero.",
              side: "bottom",
              align: "start",
            },
          },
          {
            element: "#summary-section",
            popover: {
              title: "Resumen",
              description: "En esta sección verás válidos, faltantes y sobrantes con conteos claros.",
              side: "top",
              align: "start",
            },
          },
          {
            element: "#process-button",
            popover: {
              title: "Procesar desembarque",
              description: "Procesa el desembarque. Requiere unidad y, si aplica, chofer seleccionado.",
              side: "left",
              align: "start",
            },
          },
          {
            element: "#export-button",
            popover: {
              title: "Exportar reporte",
              description: "Genera y descarga un PDF con la información actual del desembarque.",
              side: "left",
              align: "start",
            },
          },
        ],
      })

      driverObj.drive()
    } catch (err) {
      console.warn("startTutorial error:", err)
    }
  }

  const handleCreateShipment = useCallback((formData: any) => {
    try {
      console.log("📦 Creando nuevo shipment:", formData);

      // 1. Remover del surplus
      setSurplusTrackings(prev => prev.filter(t => t !== formData.trackingNumber));

      // 2. Mapear prioridad del modal al string que espera PackageInfoForUnloading
      let priority = "media"; // default
      if (formData.priority === "URGENTE" || formData.priority === "ALTA") {
        priority = "alta";
      } else if (formData.priority === "MEDIA") {
        priority = "media";
      } else if (formData.priority === "BAJA") {
        priority = "baja";
      }

      // 3. Crear el nuevo shipment con el tipo correcto PackageInfoForUnloading
      const newShipment: PackageInfoForUnloading = {
        id: `created-${Date.now()}`,
        trackingNumber: formData.trackingNumber,
        recipientName: formData.recipientName || undefined,
        recipientAddress: formData.recipientAddress || undefined,
        recipientPhone: formData.recipientPhone || undefined,
        recipientCity: formData.recipientCity || undefined,
        recipientZip: formData.recipientZip || undefined,
        commitDateTime: formData.commitDateTime || undefined,
        shipmentType: formData.shipmentType,
        priority: priority as any, // Mapear a Priority type
        isHighValue: formData.isHighValue || false,
        isValid: true,
      };

      // 4. Agregar a la lista de shipments válidos
      setShipments(prev => [...prev, newShipment]);

      toast({
        title: "Shipment creado",
        description: `Se creó el shipment ${formData.trackingNumber} exitosamente.`,
      });

    } catch (error) {
      console.error("Error creando shipment:", error);
      toast({
        title: "Error",
        description: "Hubo un problema al crear el shipment",
        variant: "destructive",
      });
    }
  }, [setShipments, setSurplusTrackings, toast]);

  // colocarlo aquí, justo después de handleCreateShipment para que esté disponible antes de su uso
  const updateMissingPackages = useCallback((currentShipments: PackageInfoForUnloading[], currentConsolidateds: Consolidateds | null) => {
    if (!currentConsolidateds) return [];
    const validTrackings = currentShipments.filter(p => p.isValid).map(p => p.trackingNumber);
    const allConsolidateds = Object.values(currentConsolidateds).flat();
    const relevantConsolidateds = allConsolidateds.filter(c => c.added?.some((t: any) => validTrackings.includes(t.trackingNumber)));
    const updatedMissing: any[] = [];
    relevantConsolidateds.forEach(c => {
      (c.notFound || []).forEach((m: any) => {
        const excluded = selectedReasons[m.trackingNumber] === TrackingNotFoundEnum.NOT_SCANNED || selectedReasons[m.trackingNumber] === TrackingNotFoundEnum.NOT_IN_CHARGE;
        if (!validTrackings.includes(m.trackingNumber) && !excluded) {
          updatedMissing.push({
            trackingNumber: m.trackingNumber,
            recipientName: m.recipientName,
            recipientAddress: m.recipientAddress,
            recipientPhone: m.recipientPhone,
            recipientZip: m.recipientZip,
          });
        }
      });
    });
    return updatedMissing;
  }, [selectedReasons]);

  // Helpers de expiración: días hasta expiración y sonidos
  const getDaysUntilExpiration = useCallback((commitDateTime?: string | null) => {
    if (!commitDateTime) return -1;
    const commitDate = new Date(commitDateTime);
    const today = new Date();
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const commitOnly = new Date(commitDate.getFullYear(), commitDate.getMonth(), commitDate.getDate());
    const diffMs = commitOnly.getTime() - todayOnly.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  }, []);

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

  // Sonido para guías sobrantes (breve tono)
  const playSurplusSound = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioContext = new AudioCtx();
      const now = audioContext.currentTime;

      // Primer tono (ping alto)
      const o1 = audioContext.createOscillator();
      const g1 = audioContext.createGain();
      o1.type = 'triangle';
      o1.frequency.setValueAtTime(880, now);
      g1.gain.setValueAtTime(0.15, now);
      o1.connect(g1);
      g1.connect(audioContext.destination);
      o1.start(now);
      o1.stop(now + 0.09);

      // Segundo tono (ping más bajo) separado ligeramente
      const o2 = audioContext.createOscillator();
      const g2 = audioContext.createGain();
      const t2 = now + 0.12;
      o2.type = 'triangle';
      o2.frequency.setValueAtTime(660, t2);
      g2.gain.setValueAtTime(0.15, t2);
      o2.connect(g2);
      g2.connect(audioContext.destination);
      o2.start(t2);
      o2.stop(t2 + 0.12);
    } catch (err) {
      console.warn("playSurplusSound error:", err);
    }
  }, []);

  // Manejo de expiraciones (hoy y mañana)
  const handleExpirationCheck = useCallback((newShipments: PackageInfoForUnloading[]) => {
    const expiringToday: ExpiringPackage[] = [];
    const expiringTomorrow: ExpiringPackage[] = [];

    newShipments.forEach(pkg => {
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
      //setExpirationAlertOpen(true);
      speakMessage("El paquete expira hoy");
      playExpirationSound();
      const newShown = new Set(shownExpiringPackages);
      expiringToday.forEach(p => newShown.add(p.trackingNumber));
      setShownExpiringPackages(newShown);
    }

    if (expiringTomorrow.length > 0) {
      setExpiringPackages(expiringTomorrow);
      setCurrentExpiringIndex(0);
      //setExpirationAlertOpen(true);
      speakMessage("El paquete expira mañana");
      playTomorrowExpirationSound();
      const newShown = new Set(shownExpiringPackages);
      expiringTomorrow.forEach(p => newShown.add(p.trackingNumber));
      setShownExpiringPackages(newShown);
    }
  }, [getDaysUntilExpiration, shownExpiringPackages, setShownExpiringPackages, speakMessage, playExpirationSound, playTomorrowExpirationSound]);

  // Navegación del modal de expiraciones
  const handleNextExpiring = useCallback(() => {
    setCurrentExpiringIndex((idx) => {
      const next = idx + 1;
      if (next >= expiringPackages.length) {
        setExpirationAlertOpen(false);
        return 0;
      }
      return next;
    });
  }, [expiringPackages.length]);

  const handlePreviousExpiring = useCallback(() => {
    setCurrentExpiringIndex((idx) => Math.max(0, idx - 1));
  }, []);

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
  const prevIsOnlineRef = useRef(isOnline);

  useEffect(() => {
    // Solo ejecutar cuando cambia de offline a online
    const wasOffline = !prevIsOnlineRef.current;
    const isNowOnline = isOnline;

    prevIsOnlineRef.current = isOnline;

    if (wasOffline && isNowOnline && selectedSubsidiaryId) {
      setShipments(currentShipments => {
        const offlinePackages = currentShipments.filter(pkg => pkg.isOffline);

        if (offlinePackages.length > 0) {
          toast({
            title: "Revalidando paquetes",
            description: `Revalidando ${offlinePackages.length} paquetes creados offline...`,
          });

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

        return currentShipments;
      });
    }
  }, [isOnline, selectedSubsidiaryId, setShipments, toast]);

  // VALIDACIÓN (restaurada)
  const handleValidatePackages = useCallback(async () => {
    if (isLoading || isValidationPackages) return;
    
    if (!selectedSubsidiaryId) { 
      toast({ 
        title: "Error", 
        description: "Selecciona una sucursal antes de validar.", 
        variant: "destructive" 
      }); 
      return; 
    }

    // USAR safeScannedPackages aquí
    const trackingNumbers = safeScannedPackages.map(p => p.trackingNumber);
    const validNumbers = trackingNumbers.filter(t => /^\d{12}$/.test(t));
    const invalidNumbers = trackingNumbers.filter(t => !/^\d{12}$/.test(t));
    
    if (validNumbers.length === 0) { 
      toast({ 
        title: "Error", 
        description: "No se ingresaron números válidos.", 
        variant: "destructive" 
      }); 
      return; 
    }

    setIsValidationPackages(true);
    setIsLoading(true);
    
    try {
      const result: ValidTrackingAndConsolidateds = await validateTrackingNumbers(
        validNumbers, 
        selectedSubsidiaryId
      );
      
      if (barScannerInputRef.current?.updateValidatedPackages) {
        barScannerInputRef.current.updateValidatedPackages(result.validatedShipments);
      }
      
      setShipments(result.validatedShipments);
      
      // expiración
      handleExpirationCheck(result.validatedShipments);
      
      // faltantes
      const newMissing = updateMissingPackages(result.validatedShipments, result.consolidateds);
      setMissingPackages(newMissing);
      
      // sobrantes: invalid + valid pero no encontrados
      const validTrackings = result.validatedShipments
        .filter(p => p.isValid)
        .map(p => p.trackingNumber);
      
      const surplusFromValid = validNumbers.filter(tn => !validTrackings.includes(tn));
      const allSurplus = [...invalidNumbers, ...surplusFromValid];
      
      // Asegurar que prevSurplus sea un array usando safeArray
      const prevSurplus = safeArray(surplusTrackings);
      const newSurplusItems = allSurplus.filter(s => !prevSurplus.includes(s));
      
      if (newSurplusItems.length > 0) {
        speakMessage("La guía no se encontró. Por favor, verifica.");
        try { 
          playSurplusSound(); 
        } catch (err) { 
          console.warn('playSurplusSound failed', err); 
        }
      }
      
      setSurplusTrackings(allSurplus);
      setConsolidatedValidation(result.consolidateds || null);
      
      toast({ 
        title: "Validación completada", 
        description: `✅ ${result.validatedShipments.filter(p => p.isValid).length} válidos | ❌ ${newMissing.length} faltantes | ⚠️ ${allSurplus.length} sobrantes` 
      });
      
    } catch (error) {
      console.error("Error validating packages:", error);
      
      if (!isOnline) {
        const offlinePackages = validNumbers.map(tn => ({ 
          id: `offline-${Date.now()}-${Math.random().toString(36).substr(2,9)}`, 
          trackingNumber: tn, 
          isValid: false, 
          isOffline: true, 
          reason: "Sin conexión - validar cuando se restablezca internet", 
          createdAt: new Date() 
        } as PackageInfoForUnloading));
        
        setShipments(prev => [...safeArray(prev), ...offlinePackages]);
        setSurplusTrackings(invalidNumbers);
        
        toast({ 
          title: "Modo offline activado", 
          description: `Se guardaron ${validNumbers.length} paquetes localmente.` 
        });
      } else {
        toast({ 
          title: "Error", 
          description: "Hubo un problema al validar los paquetes.", 
          variant: "destructive" 
        });
      }
    } finally {
      setIsValidationPackages(false);
      setIsLoading(false);
      setTimeout(() => { 
        try { 
          barScannerInputRef.current?.focus(); 
        } catch {} 
      }, 150);
    }
  }, [
    isLoading, 
    isValidationPackages, 
    selectedSubsidiaryId, 
    safeScannedPackages,  // ✅ Ahora existe
    speakMessage, 
    surplusTrackings, 
    updateMissingPackages, 
    isOnline, 
    setShipments, 
    setMissingPackages, 
    setSurplusTrackings, 
    setConsolidatedValidation, 
    handleExpirationCheck, 
    toast, 
    playSurplusSound
  ]);

    // Normalizar arrays por seguridad (puede venir persistido malformado)
  const shipmentsArray = useMemo(() => 
    Array.isArray(shipments) ? shipments : [], 
    [shipments]
  );


  // VALIDACIÓN AUTOMÁTICA
  useEffect(() => {
    if (
      !Array.isArray(safeScannedPackages) ||  // ✅ Usar safeScannedPackages
      safeScannedPackages.length === 0 ||     // ✅ Usar safeScannedPackages
      isLoading ||
      !selectedSubsidiaryId
    ) return;

    const trackingNumbers = safeScannedPackages  // ✅ Usar safeScannedPackages
      .map(pkg => pkg.trackingNumber)
      .join("\n");

    if (trackingNumbers === lastValidated) return;

    const handler = setTimeout(() => {
      handleValidatePackages();
      setLastValidated(trackingNumbers);
    }, 500);

    return () => clearTimeout(handler);
  }, [safeScannedPackages, selectedSubsidiaryId, isLoading, lastValidated]);  // ✅ Usar safeScannedPackages


  // Efecto para debuggear missingPackages
  useEffect(() => {
    console.log("🔍 DEBUG missingPackages:", missingPackages);
    console.log("🔍 DEBUG selectedReasons:", selectedReasons);
    console.log("🔍 DEBUG surplusTrackings:", surplusTrackings);
  }, [missingPackages, selectedReasons, surplusTrackings]);

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

  // FUNCIÓN CORREGIDA PARA MANEJAR RAZONES DE PAQUETES FALTANTES
  const handleSelectMissingTracking = useCallback((id: string, value: string) => {
    // Usar safeSelectedReasons
    const newSelectedReasons = {
      ...safeSelectedReasons,
      [id]: value
    };
    setSelectedReasons(newSelectedReasons);

    // Usar las versiones seguras
    const currentMissingPackages = safeMissingPackages;
    const currentSurplusTrackings = safeSurplusTrackings;
    const currentScannedPackages = safeScannedPackages;

    // Limpiar primero de ambos arrays
    const newMissingPackages = currentMissingPackages.filter(p => p.trackingNumber !== id);
    const newSurplusTrackings = currentSurplusTrackings.filter(item => item !== id);

    // Lógica para agregar según el motivo seleccionado
    if (value === TrackingNotFoundEnum.NOT_TRACKING) {
      const existingPackage = currentScannedPackages.find(p => p.trackingNumber === id);
      if (existingPackage) {
        newMissingPackages.push({
          trackingNumber: id,
          recipientName: existingPackage.recipientName,
          recipientAddress: existingPackage.recipientAddress,
          recipientPhone: existingPackage.recipientPhone
        });
      }
    } else if (value === TrackingNotFoundEnum.NOT_SCANNED) {
      newSurplusTrackings.push(id);
    }
    // Para NOT_IN_CHARGE no se agrega a ningún array

    // Actualizar estados
    setMissingPackages(newMissingPackages);
    setSurplusTrackings(newSurplusTrackings);
    setOpenPopover(null);
    
    toast({
      title: "Motivo actualizado",
      description: `Se asignó "${value}" a la guía ${id}`,
    });
  }, [safeSelectedReasons, safeMissingPackages, safeSurplusTrackings, safeScannedPackages, setSelectedReasons, setMissingPackages, setSurplusTrackings, toast]);

  // ELIMINAR PAQUETE (usado por la UI)
  const handleRemovePackage = useCallback((tn: string) => {
    setShipments(prev => {
      const updated = prev.filter(p => p.trackingNumber !== tn);
      if (consolidatedValidation) {
        setMissingPackages(updateMissingPackages(updated, consolidatedValidation));
      }
      return updated;
    });
    setScannedPackages(prev => prev.filter(p => p.trackingNumber !== tn));
    setSurplusTrackings(prev => prev.filter(p => p !== tn));
    // limpiar cualquier razón asociada
    setSelectedReasons(prev => {
      const next = { ...prev };
      delete next[tn];
      return next;
    });
  }, [consolidatedValidation, updateMissingPackages, setShipments, setScannedPackages, setSurplusTrackings, setSelectedReasons]);


  const filteredValidShipments = useMemo(() => {
    if (!Array.isArray(validShipments)) return [];
    
    return validShipments.filter(pkg => {
      // Validar que pkg exista
      if (!pkg) return false;
      
      const matchesSearch = pkg.trackingNumber?.includes(searchTerm) ||
        (pkg.recipientName && typeof pkg.recipientName === 'string' && 
         pkg.recipientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (pkg.recipientAddress && typeof pkg.recipientAddress === 'string' && 
         pkg.recipientAddress.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesPriority = filterPriority === "all" || pkg.priority === filterPriority;
      const matchesStatus = filterStatus === "all" ||
        (filterStatus === "special" && (pkg.isCharge || pkg.isHighValue || pkg.payment)) ||
        (filterStatus === "normal" && !pkg.isCharge && !pkg.isHighValue && !pkg.payment);

      return matchesSearch && matchesPriority && matchesStatus;
    });
  }, [validShipments, searchTerm, filterPriority, filterStatus]);

  const canUnload = !!selectedUnidad && validShipments.length > 0;

  // Expiration helpers para UI
  const hasExpiringToday = expiringPackages.some(p => p.daysUntilExpiration === 0);
  const hasExpiringTomorrow = expiringPackages.some(p => p.daysUntilExpiration === 1);

  // Limpieza de estados y storage
  const clearAllStorage = useCallback(() => {
    try {
      const keys = [
        'unloading_unidad',
        'unloading_scanned_packages',
        'unloading_shipments', 
        'unloading_missing_packages',
        'unloading_surplus_trackings',
        'unloading_selected_reasons',
        'unloading_tracking_raw',
        'unloading_consolidated_validation',
        'unloading_selected_consolidados',
        'unloading_selected_consolidados_counts'
      ];
      
      keys.forEach(k => { 
        try { 
          window.localStorage.removeItem(k); 
        } catch {} 
      });
    } catch (err) {
      console.error("clearAllStorage error:", err);
    }

    // Siempre establecer arrays vacíos, no null o undefined
    setSelectedUnidad(null);
    setScannedPackages([]);
    setShipments([]);
    setMissingPackages([]);
    setSurplusTrackings([]);
    setSelectedReasons({});
    setTrackingNumbersRaw("");
    setConsolidatedValidation(null);
    setSelectedConsolidatedIds([]);
    setLastValidated("");

    try {
      toast?.({ 
        title: "Datos limpiados", 
        description: "Se eliminaron los datos temporales." 
      });
    } catch {}
  }, [
    setScannedPackages, 
    setShipments, 
    setMissingPackages, 
    setSurplusTrackings, 
    setSelectedReasons, 
    setTrackingNumbersRaw, 
    setConsolidatedValidation, 
    setSelectedConsolidatedIds, 
    setLastValidated, 
    setSelectedUnidad, 
    toast
  ]);

  const clearMissingPackages = useCallback(() => {
    try {
      const missingKeys = missingPackages.map(p => p.trackingNumber);
      setMissingPackages([]);
      setSelectedReasons(prev => {
        const next = { ...prev };
        missingKeys.forEach(k => delete next[k]);
        return next;
      });
      setSurplusTrackings(prev => prev.filter(t => !missingKeys.includes(t)));
      toast?.({ title: "Faltantes limpiados", description: "Se limpiaron los paquetes faltantes." });
    } catch (err) {
      console.error("clearMissingPackages error:", err);
    }
  }, [missingPackages, setMissingPackages, setSelectedReasons, setSurplusTrackings, toast]);

  const handleExport = useCallback(async () => {
    if (shipmentsArray.length === 0) {
      toast?.({ title: "Nada que exportar", description: "No hay paquetes para exportar." });
      return;
    }

    setIsLoading(true);
    try {
      const validList = shipmentsArray.filter(s => s.isValid);
      const blob = await pdf(
        <UnloadingPDFReport
          key={Date.now()}
          vehicle={selectedUnidad}
          packages={validList}
          missingPackages={missingPackages}
          unScannedPackages={surplusTrackings}
          subsidiaryName={selectedSubsidiaryName || ""}
          unloadingTrackigNumber={savedUnload?.trackingNumber || ""}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `unloading-${selectedSubsidiaryName || 'report'}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast?.({ title: "PDF generado", description: "Se descargó el reporte." });
    } catch (err) {
      console.error("handleExport error:", err);
      toast?.({ title: "Error", description: "No se pudo generar el PDF.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [shipments, selectedUnidad, missingPackages, surplusTrackings, selectedSubsidiaryName, savedUnload, toast]);

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

  // PROCESAR DESEMBARQUE (restaurado)
  const handleUnloading = useCallback(async () => {
    console.log("🔍 [handleUnloading] Starting...");

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

    const validList = shipmentsArray.filter(s => s.isValid);

    if (validList.length === 0) {
      toast({
        title: "No hay paquetes válidos",
        description: "No hay paquetes válidos para procesar el Desembarque.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setProgress(0);

    try {
      const data: UnloadingFormData = {
        vehicle: selectedUnidad,
        subsidiary: { id: selectedSubsidiaryId, name: selectedSubsidiaryName || "Unknown" },
        shipments: validList.map(s => s.id),
        missingTrackings: missingPackages.map(p => p.trackingNumber),
        unScannedTrackings: surplusTrackings,
        date: new Date().toISOString()
      };

      console.log("📤 Sending data to API...");
      const saved = await saveUnloading(data);
      console.log("✅ API Response:", saved);
      setSavedUnloading(saved);

      // 1. ENVIAR EMAIL (FUNCIONALIDAD CRÍTICA QUE FALTABA)
      console.log("📧 Sending email...");
      await handleSendEmail(saved);

      toast({
        title: "Desembarque procesado exitosamente",
        description: `Se procesaron ${validList.length} paquetes para el desembarque. Faltantes: ${missingPackages.length}, Sobrantes: ${surplusTrackings.length}`,
      });

      // 5. Limpiar estado
      console.log("🧹 Cleaning storage...");
      clearAllStorage();

      console.log("✅ Calling onSuccess...");
      onSuccess();
      
    } catch (error) {
      console.error("❌ Error in handleUnloading:", error);
      toast({
        title: "Error al procesar el desembarque",
        description: "Hubo un problema al procesar el desembarque de paquetes.",
        variant: "destructive",
      });
    } finally {
      console.log("🔚 Finally block");
      setIsLoading(false);
      setSavedUnloading(null);
      setProgress(0);
    }
  }, [
    selectedSubsidiaryId, 
    selectedUnidad, 
    shipmentsArray, 
    missingPackages, 
    surplusTrackings, 
    selectedSubsidiaryName, 
    onSuccess, 
    toast,
    clearAllStorage,
    handleSendEmail
  ]);

  // Resto del render (UI) - se mantiene la estructura existente
  return (
    <>
      <Card className="w-full max-w-6xl mx-auto border-0 shadow-none">
        {/* Overlay para validación de paquetes */}
        {isValidationPackages && (
          <LoaderWithOverlay 
            overlay 
            transparent 
            text="Validando paquetes..." 
            className="rounded-lg" 
          />
        )}

        {/* Overlay para procesamiento del desembarque */}
        {isLoading && !isValidationPackages && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex justify-center items-center z-50">
            <LoaderWithOverlay 
              overlay
              text="Procesando desembarque..."
              className="rounded-lg"
            />
          </div>
        )}

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
                <span>Desembarque de Paquetes</span>
                {shipmentsArray.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-sm">
                    {validShipments.length} válidos / {shipmentsArray.length} total
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Procesa el desembarque de paquetes de unidades de transporte</CardDescription>
            </div>

            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-primary-foreground bg-primary px-3 py-1.5 rounded-full">
                  <MapPinIcon className="h-4 w-4" />
                  <span>Sucursal: {selectedSubsidiaryName}</span>
                </div>

                <Button id="unloading-tutorial-button" variant="ghost" size="sm" onClick={startTutorial} className="ml-2">
                  <HelpCircle className="h-4 w-4" /> Tutorial
                </Button>

              {(shipmentsArray.length > 0 || selectedUnidad) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    clearAllStorage();
                    clearMissingPackages();
                  }}
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
            <div className="space-y-4 p-4 bg-muted/20 rounded-lg">
              <div id="unloading-filters-section" className="space-y-2">
                <Label className="text-base font-medium flex items-center gap-2">
                  <PackageCheckIcon className="h-4 w-4" />
                  Unidad de Transporte
                </Label>
                  <div id="unidad-selector">
                    <UnidadSelector selectedUnidad={selectedUnidad} onSelectionChange={setSelectedUnidad} disabled={isLoading} />
                  </div>
              </div>

              <Separator />

                <div id="consolidado-section">
                  <ConsolidateDetails
                    // SOLUCIÓN: Solo pasar consolidatedData si tiene datos REALES, no solo si es truthy
                    consolidatedData={
                      consolidatedValidation && 
                      Object.keys(consolidatedValidation).length > 0 && 
                      (
                        consolidatedValidation.airConsolidated?.length > 0 ||
                        consolidatedValidation.groundConsolidated?.length > 0 ||
                        consolidatedValidation.f2Consolidated?.length > 0
                      )
                        ? consolidatedValidation 
                        : undefined
                    }
                    initialSelectedIds={selectedConsolidatedIds}
                    onSelectionChange={handleConsolidateSelectionChange}
                    subsidiaryId={parentSubsidiaryId ?? selectedSubsidiaryId ?? null}
                  />
                  </div>
            </div>

            <div className="space-y-4 p-4 bg-muted/20 rounded-lg">
              <div className="space-y-2">
                <div id="barcode-scanner" className={cn(
                  "space-y-2 p-1 rounded-md"
                )}>
                  <BarcodeScannerInput
                    ref={barScannerInputRef}
                    onPackagesChange={setScannedPackages}
                    disabled={isLoading || !selectedSubsidiaryId}
                    placeholder={!selectedSubsidiaryId ? "Selecciona una sucursal primero" : "Escribe o escanea números de tracking"}
                    onHasDueTomorrow={setScannerHasDueTomorrow}
                  />
                </div>
              </div>

              {isLoading && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Progreso de validación</Label>
                    <span className="text-sm text-muted-foreground">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}
            </div>
          </div>

          {shipmentsArray.length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Paquetes validados
                  <Badge variant="outline" className="ml-2">
                    {filteredValidShipments.length} de {validShipments.length}
                  </Badge>
                  {packagesNeedingData.length > 0 && <Badge variant="destructive" className="ml-2">{packagesNeedingData.length} necesitan datos</Badge>}
                </h3>

                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  {/* legend / filters */}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar por tracking, destinatario o dirección..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Filtrar</h4>
                    <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)} className="h-8 gap-1">
                      <Filter className="h-4 w-4" />
                      {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>

                  <Collapsible open={showFilters}>
                    <CollapsibleContent className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-sm">Prioridad</Label>
                          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                            <option value="all">Todas las prioridades</option>
                            <option value={Priority.ALTA}>Alta</option>
                            <option value={Priority.MEDIA}>Media</option>
                            <option value={Priority.BAJA}>Baja</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm">Tipo de paquete</Label>
                          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
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
                  <TabsTrigger value="validos" className="flex items-center gap-1"><Check className="h-4 w-4" /> Válidos ({validShipments.length})</TabsTrigger>
                  <TabsTrigger value="faltantes" className="flex items-center gap-1"><CircleAlertIcon className="h-4 w-4" /> Faltantes ({missingPackages.length})</TabsTrigger>
                  <TabsTrigger value="sobrantes" className="flex items-center gap-1"><AlertCircle className="h-4 w-4" /> Sobrantes ({surplusTrackings.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="validos" className="space-y-3 mt-4">
                  {Array.isArray(filteredValidShipments) && filteredValidShipments.length > 0 ? (
                    <ScrollArea className="h-[400px] rounded-md border">
                      <div className="grid grid-cols-1 divide-y">
                        {filteredValidShipments.map((pkg) => pkg && (
                          <PackageItem key={pkg.trackingNumber} pkg={pkg} onRemove={handleRemovePackage} isLoading={isLoading} selectedReasons={selectedReasons} onSelectReason={handleSelectMissingTracking} openPopover={openPopover} setOpenPopover={setOpenPopover} onCompleteData={handleOpenCompleteData} />
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground border rounded-md">
                      <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p>No se encontraron paquetes con los filtros aplicados</p>
                      {(searchTerm || filterPriority !== "all" || filterStatus !== "all") && (
                        <Button variant="ghost" size="sm" className="mt-3" onClick={() => { setSearchTerm(""); setFilterPriority("all"); setFilterStatus("all"); }}>
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
                        {missingPackages.map((pkg, index) => pkg && <MissingPackageItem key={`${pkg.trackingNumber}-${index}`} pkg={pkg} />)}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground border rounded-md"><p>No hay paquetes faltantes</p></div>
                  )}
                </TabsContent>

                <TabsContent value="sobrantes" className="mt-4">
                  {surplusTrackings.length > 0 ? (
                    <ScrollArea className="h-[300px] rounded-md border p-4">
                      <ul className="space-y-2">
                        {surplusTrackings.map(tracking => (
                          <li key={tracking} className="flex justify-between items-center py-2 px-3 rounded-md bg-amber-50 border border-amber-200">
                            <span className="font-mono text-sm font-medium">{tracking}</span>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleOpenCorrectTracking(tracking)} disabled={isLoading} className="text-xs h-7 bg-white hover:bg-amber-100">
                                <Package className="h-3 w-3 mr-1" /> Corregir
                              </Button>
                              <Badge variant="outline" className="bg-amber-100 text-amber-800 text-xs">Sobrante</Badge>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground border rounded-md"><p>No hay guías sobrantes</p></div>
                  )}
                </TabsContent>
              </Tabs>

              <div id="summary-section" className="flex items-center gap-4 text-sm pt-4 border-t">
                <div className="flex items-center gap-1"><Package className="w-4 h-4" /><span className="font-medium">Resumen:</span></div>
                <div className="flex items-center gap-1"><span className="text-green-600 font-semibold">{validShipments.length}</span><span>válidos</span></div>
                <div className="flex items-center gap-1"><span className="text-red-600 font-semibold">{missingPackages.length}</span><span>faltantes</span></div>
                <div className="flex items-center gap-1"><span className="text-amber-600 font-semibold">{surplusTrackings.length}</span><span>sobrantes</span></div>
                {packagesNeedingData.length > 0 && (<div className="flex items-center gap-1"><span className="text-yellow-600 font-semibold">{packagesNeedingData.length}</span><span>necesitan datos</span></div>)}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 justify-between items-center p-4 bg-muted/20 rounded-lg">
            <Button type="button" variant="outline" onClick={onClose} className="gap-2"><X className="h-4 w-4" /> Cancelar</Button>

              <div className="flex flex-col sm:flexRow gap-2">
              {/*<Button id="validate-button" onClick={handleValidatePackages} disabled={isLoading || !selectedSubsidiaryId || scannedPackages.length === 0} className="gap-2" variant="outline">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scan className="h-4 w-4" />} {isLoading ? "Procesando..." : "Validar paquetes"}
              </Button>*/}

              <Button id="process-button" onClick={handleUnloading} disabled={isLoading || !canUnload || packagesNeedingData.length > 0} className="gap-2">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Procesar el desembarque
                {packagesNeedingData.length > 0 && <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">{packagesNeedingData.length}</Badge>}
              </Button>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button id="export-button" onClick={handleExport} disabled={isLoading || shipmentsArray.length === 0} variant="outline" className="gap-2">
                      <Download className="h-4 w-4" /> Exportar PDF
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Generar reporte PDF de los paquetes actuales</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/*<Button onClick={playExpirationSound}>Probar sonido de expiración</Button>*/}
            </div>
          </div>
        </CardContent>
      </Card>

      <CompleteDataModal isOpen={completeDataModalOpen} onClose={handleCloseCompleteData} package={selectedPackageForData} onSave={handleSavePackageData} />
      <CorrectTrackingModal isOpen={correctTrackingModalOpen} onClose={handleCloseCorrectTracking} scannedTrackingNumber={selectedTrackingToCorrect} subsidiaryId={selectedSubsidiaryId} subsidiaryName={selectedSubsidiaryName} onCorrect={handleCorrectTracking} onCreate={handleCreateShipment} handleValidatePackages={handleValidatePackages} />
      <ExpirationAlertModal isOpen={expirationAlertOpen} onClose={handleNextExpiring} packages={expiringPackages} currentIndex={currentExpiringIndex} onNext={handleNextExpiring} onPrevious={handlePreviousExpiring} />
    </>
  );
}