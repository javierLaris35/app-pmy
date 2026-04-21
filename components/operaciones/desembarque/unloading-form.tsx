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

interface Shipment {
  id: string;
  trackingNumber: string;
  isValid: boolean;
  reason?: string | null;
  recipientName?: string | null;
  commitDateTime?: string | null;
  recipientAddress?: string | null;
  recipientPhone?: string | null;
  recipientZip?: string | null; 
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
  consolidatedId?: string; 
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
    if (cleaned.length === 10) return `+52 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    if (cleaned.length === 12 && cleaned.startsWith("52")) return `+52 (${cleaned.slice(2, 5)}) ${cleaned.slice(5, 8)}-${cleaned.slice(8)}`;
    if (cleaned.length === 13 && cleaned.startsWith("521")) return `+52 (${cleaned.slice(3, 6)}) ${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
    return phone;
  };

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
              <Badge variant={pkg.priority === Priority.ALTA ? "destructive" : pkg.priority === Priority.MEDIA ? "secondary" : "outline"} className="text-xs">
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
                    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
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
          {needsData && (
            <Button variant="outline" size="sm" onClick={() => onCompleteData(pkg)} disabled={isLoading} className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100">
              Completar datos
            </Button>
          )}

          {!pkg.isValid && (
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
          
          <Button variant="ghost" size="icon" onClick={() => onRemove(pkg.trackingNumber)} disabled={isLoading} className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10">
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
};

const MissingPackageItem = ({ pkg }: { pkg: { trackingNumber: string; recipientName?: string | null; recipientAddress?: string | null; recipientPhone?: string | null; recipientZip?: string | null } }) => {
  const formatMexicanPhoneNumber = (phone: string | null | undefined): string => {
    if (!phone || typeof phone !== 'string') return "N/A";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) return `+52 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
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

export default function UnloadingForm({
  onClose,
  onSuccess,
  selectedSubsidiaryId: parentSubsidiaryId,
  selectedSubsidiaryName: parentSubsidiaryName,
}: Props) {
  const parentSubsidiaryAppliedRef = useRef<string | null>(null);
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
  const selectedConsolidatedIds = useUnloadingStore((s) => s.selectedConsolidatedIds);
  const setSelectedConsolidatedIds = useUnloadingStore((s) => s.setSelectedConsolidatedIds);

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

  const [expirationAlertOpen, setExpirationAlertOpen] = useState(false);
  const [expiringPackages, setExpiringPackages] = useState<ExpiringPackage[]>([]);
  const [currentExpiringIndex, setCurrentExpiringIndex] = useState(0);
  const [shownExpiringPackages, setShownExpiringPackages] = useState<Set<string>>(new Set());

  const [completeDataModalOpen, setCompleteDataModalOpen] = useState(false);
  const [selectedPackageForData, setSelectedPackageForData] = useState<Shipment | null>(null);
  const [packagesNeedingData, setPackagesNeedingData] = useState<Shipment[]>([]);

  const [correctTrackingModalOpen, setCorrectTrackingModalOpen] = useState(false);
  const [selectedTrackingToCorrect, setSelectedTrackingToCorrect] = useState<string>("");

  const barScannerInputRef = useRef<BarcodeScannerInputHandle>(null);
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);

  const safeArray = <T,>(arr: T[] | undefined | null | any): T[] => {
    if (Array.isArray(arr)) return arr;
    return [];
  };

  const safeObject = <T extends object>(obj: T | undefined | null | any): T => {
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj;
    return {} as T;
  };

  const safeScannedPackages = useMemo(() => safeArray(scannedPackages), [scannedPackages]);
  const safeShipments = useMemo(() => safeArray(shipments), [shipments]);
  const safeMissingPackages = useMemo(() => safeArray(missingPackages), [missingPackages]);
  const safeSurplusTrackings = useMemo(() => safeArray(surplusTrackings), [surplusTrackings]);
  const safeSelectedReasons = useMemo(() => safeObject(selectedReasons), [selectedReasons]);

  const validShipments = useMemo(() => safeShipments.filter((p) => p.isValid), [safeShipments]);

  useEffect(() => {
    if (!parentSubsidiaryId) return;
    if (parentSubsidiaryAppliedRef.current === parentSubsidiaryId) return;

    parentSubsidiaryAppliedRef.current = parentSubsidiaryId;
    setSelectedSubsidiaryId(prev => (prev === parentSubsidiaryId ? prev : parentSubsidiaryId));
    setSelectedSubsidiaryName(prev => (prev === parentSubsidiaryName ? prev : (parentSubsidiaryName ?? null)));

    setScannedPackages(prev => (prev.length ? [] : prev));
    setShipments(prev => (prev.length ? [] : prev));
    setMissingPackages(prev => (prev.length ? [] : prev));
    setSurplusTrackings(prev => (prev.length ? [] : prev));
    setSelectedReasons(prev => (Object.keys(prev).length ? {} : prev));
    setConsolidatedValidation(prev => (prev ? null : prev));
    setSelectedConsolidatedIds(prev => (prev.length ? [] : prev));
    setLastValidated(prev => (prev ? "" : prev));
  }, [parentSubsidiaryId, parentSubsidiaryName, setScannedPackages, setShipments, setMissingPackages, setSurplusTrackings, setSelectedReasons, setConsolidatedValidation, setSelectedConsolidatedIds, setLastValidated]);
  
  useEffect(() => {
    if (parentSubsidiaryName !== undefined && parentSubsidiaryName !== selectedSubsidiaryName) {
      setSelectedSubsidiaryName(parentSubsidiaryName);
    }
  }, [parentSubsidiaryName, selectedSubsidiaryName]);
  
  const handleConsolidateSelectionChange = useCallback((ids: string[]) => {
    queueMicrotask(() => setSelectedConsolidatedIds(ids));
  }, [setSelectedConsolidatedIds]);
  
  const { speak: speakMessage } = useBrowserVoice({ pitch: 0.8, rate: 1.3 });

  const checkPackageNeedsData = useCallback((pkg: Shipment): boolean => {
    return pkg.isValid && (!pkg.recipientName || !pkg.recipientAddress || !pkg.recipientPhone);
  }, []);

  const findPackagesNeedingData = useCallback((shipmentsList: Shipment[]): Shipment[] => {
    return shipmentsList.filter(checkPackageNeedsData);
  }, [checkPackageNeedsData]);

  useEffect(() => {
    setPackagesNeedingData(findPackagesNeedingData(safeShipments));
  }, [safeShipments, findPackagesNeedingData]);

  const handleSavePackageData = useCallback((trackingNumber: string, data: { recipientName: string; recipientAddress: string; recipientPhone: string }) => {
    setShipments(prev => 
      prev.map(pkg => 
        pkg.trackingNumber === trackingNumber 
          ? { ...pkg, recipientName: data.recipientName, recipientAddress: data.recipientAddress, recipientPhone: data.recipientPhone } 
          : pkg
      )
    );
    toast({ title: "Datos guardados", description: `Se actualizaron los datos del paquete ${trackingNumber}` });
  }, [setShipments, toast]);

  const handleOpenCompleteData = useCallback((pkg: Shipment) => {
    setSelectedPackageForData(pkg);
    setCompleteDataModalOpen(true);
  }, []);

  const handleCloseCompleteData = useCallback(() => {
    setCompleteDataModalOpen(false);
    setSelectedPackageForData(null);
  }, []);

  const handleOpenCorrectTracking = useCallback((trackingNumber: string) => {
    setSelectedTrackingToCorrect(trackingNumber);
    setCorrectTrackingModalOpen(true);
  }, []);

  const handleCloseCorrectTracking = useCallback(() => {
    setCorrectTrackingModalOpen(false);
    setSelectedTrackingToCorrect("");
  }, []);

  const handleCorrectTracking = useCallback(async (data: { originalTracking: string; correctedTracking: string; packageInfo: any; }) => {
    try {
      setSurplusTrackings(prev => prev.filter(t => t !== data.originalTracking));
      setScannedPackages(prev => prev.filter(p => p.trackingNumber !== data.originalTracking));

      const newPackage: PackageInfo = {
        id: `corrected-${Date.now()}`,
        trackingNumber: data.correctedTracking,
        isValid: false,
        isPendingValidation: true,
        recipientName: data.packageInfo.recipient?.name,
        recipientAddress: data.packageInfo.recipient?.address,
        recipientPhone: data.packageInfo.recipient?.phoneNumber,
        commitDateTime: data.packageInfo.commitDateTime,
        priority: Priority.ALTA
      };

      setScannedPackages(prev => [...prev, newPackage]);
      toast({ title: "Tracking corregido", description: `Se reemplazó ${data.originalTracking} por ${data.correctedTracking}.` });
    } catch (error) {
      toast({ title: "Error", description: "Hubo un problema al corregir el tracking", variant: "destructive" });
    }
  }, [setScannedPackages, setSurplusTrackings, toast]);

  const handleCreateShipment = useCallback((formData: any) => {
    try {
      setSurplusTrackings(prev => prev.filter(t => t !== formData.trackingNumber));

      let priority = "media";
      if (formData.priority === "URGENTE" || formData.priority === "ALTA") priority = "alta";
      else if (formData.priority === "BAJA") priority = "baja";

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
        priority: priority as any,
        isHighValue: formData.isHighValue || false,
        isValid: true,
      };

      setShipments(prev => [...prev, newShipment]);
      toast({ title: "Shipment creado", description: `Se creó el shipment ${formData.trackingNumber} exitosamente.` });
    } catch (error) {
      toast({ title: "Error", description: "Hubo un problema al crear el shipment", variant: "destructive" });
    }
  }, [setShipments, setSurplusTrackings, toast]);

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

  const getDaysUntilExpiration = useCallback((commitDateTime?: string | null) => {
    if (!commitDateTime) return -1;
    const commitDate = new Date(commitDateTime);
    const today = new Date();
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const commitOnly = new Date(commitDate.getFullYear(), commitDate.getMonth(), commitDate.getDate());
    const diffMs = commitOnly.getTime() - todayOnly.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  }, []);

  const playExpirationSound = useCallback(() => {}, []);
  const playTomorrowExpirationSound = useCallback(() => {}, []);
  const playSurplusSound = useCallback(() => {}, []);

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
      speakMessage("El paquete expira hoy");
      const newShown = new Set(shownExpiringPackages);
      expiringToday.forEach(p => newShown.add(p.trackingNumber));
      setShownExpiringPackages(newShown);
    }

    if (expiringTomorrow.length > 0) {
      setExpiringPackages(expiringTomorrow);
      setCurrentExpiringIndex(0);
      speakMessage("El paquete expira mañana");
      const newShown = new Set(shownExpiringPackages);
      expiringTomorrow.forEach(p => newShown.add(p.trackingNumber));
      setShownExpiringPackages(newShown);
    }
  }, [getDaysUntilExpiration, shownExpiringPackages, setShownExpiringPackages, speakMessage]);

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

  const prevIsOnlineRef = useRef(isOnline);
  
  // 🚨 SOLUCIÓN 1: Sincronización Offline Tipada 🚨
  useEffect(() => {
    const wasOffline = !prevIsOnlineRef.current;
    const isNowOnline = isOnline;
    prevIsOnlineRef.current = isOnline;

    if (wasOffline && isNowOnline && selectedSubsidiaryId) {
      const currentShipments = useUnloadingStore.getState().shipments || [];
      const offlinePackages = currentShipments.filter(pkg => pkg.isOffline);

      if (offlinePackages.length > 0) {
        toast({ title: "Sincronizando...", description: `Validando ${offlinePackages.length} paquetes escaneados offline.` });
        
        const revalidateOfflineBatch = async () => {
          try {
            // Convertimos trackings a objetos DTO para NestJS
            const payload = offlinePackages.map(pkg => ({
              trackingNumber: pkg.trackingNumber,
              isAlreadyValidated: false
            }));

            // Llamada directa al API con el payload correcto
            const result: ValidTrackingAndConsolidateds = await validateTrackingNumbers(payload as any, selectedSubsidiaryId);
            
            if (result.validatedShipments.length > 0) {
              const validadosMap = new Map(result.validatedShipments.map(v => [v.trackingNumber, v]));
              setShipments(prev => 
                prev.map(prevPkg => {
                  if (prevPkg.isOffline && validadosMap.has(prevPkg.trackingNumber)) {
                    return validadosMap.get(prevPkg.trackingNumber) as any;
                  }
                  return prevPkg;
                })
              );
            }
          } catch (error) {
            console.error("Error sincronizando modo offline:", error);
          }
        };
        revalidateOfflineBatch();
      }
    }
  }, [isOnline, selectedSubsidiaryId, setShipments, toast]);

  // 🚨 SOLUCIÓN 2: handleValidatePackages con Payload DTO 🚨
  const handleValidatePackages = useCallback(async () => {
    if (isLoading || isValidationPackages) return;
    
    if (!selectedSubsidiaryId) { 
      toast({ title: "Error", description: "Selecciona una sucursal antes de validar.", variant: "destructive" }); 
      return; 
    }

    const trackingNumbers = safeScannedPackages.map(p => p.trackingNumber);
    const validNumbers = trackingNumbers.filter(t => /^\d{12}$/.test(t));
    const invalidNumbers = trackingNumbers.filter(t => !/^\d{12}$/.test(t));
    
    if (validNumbers.length === 0) return;

    setIsValidationPackages(true);
    setIsLoading(true);
    
    try {
      // 🚀 TRANSFORMACIÓN: Mandamos el arreglo de OBJETOS que NestJS espera 🚀
      const payloadDTO = validNumbers.map(tn => ({
        trackingNumber: tn,
        isAlreadyValidated: false
      }));

      const result: ValidTrackingAndConsolidateds = await validateTrackingNumbers(
        payloadDTO as any, 
        selectedSubsidiaryId
      );
      
      if (barScannerInputRef.current?.updateValidatedPackages) {
        barScannerInputRef.current.updateValidatedPackages(result.validatedShipments);
      }
      
      setShipments(result.validatedShipments);
      handleExpirationCheck(result.validatedShipments);
      
      const newMissing = updateMissingPackages(result.validatedShipments, result.consolidateds);
      setMissingPackages(newMissing);
      
      const validTrackings = result.validatedShipments.filter(p => p.isValid).map(p => p.trackingNumber);
      const surplusFromValid = validNumbers.filter(tn => !validTrackings.includes(tn));
      const allSurplus = [...invalidNumbers, ...surplusFromValid];
      const prevSurplus = safeArray(surplusTrackings);
      const newSurplusItems = allSurplus.filter(s => !prevSurplus.includes(s));
      
      if (newSurplusItems.length > 0) {
        speakMessage("La guía no se encontró. Por favor, verifica.");
        try { playSurplusSound(); } catch (err) {}
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
        toast({ title: "Modo offline activado", description: `Se guardaron ${validNumbers.length} paquetes localmente.` });
      } else {
        toast({ title: "Error", description: "Hubo un problema al validar los paquetes.", variant: "destructive" });
      }
    } finally {
      setIsValidationPackages(false);
      setIsLoading(false);
      setTimeout(() => { try { barScannerInputRef.current?.focus(); } catch {} }, 150);
    }
  }, [
    isLoading, isValidationPackages, selectedSubsidiaryId, safeScannedPackages, speakMessage, surplusTrackings, updateMissingPackages, isOnline, setShipments, setMissingPackages, setSurplusTrackings, setConsolidatedValidation, handleExpirationCheck, toast, playSurplusSound
  ]);

  const shipmentsArray = useMemo(() => Array.isArray(shipments) ? shipments : [], [shipments]);

  // 🚨 SOLUCIÓN 3: useEffect de validación automática estabilizado 🚨
  useEffect(() => {
    if (!Array.isArray(safeScannedPackages) || safeScannedPackages.length === 0 || isLoading || !selectedSubsidiaryId) return;

    // Usamos una llave basada solo en los trackings para evitar bucles por cambios de objetos
    const currentTrackingsKey = safeScannedPackages.map(pkg => pkg.trackingNumber).sort().join(",");
    
    if (currentTrackingsKey === lastValidated) return;

    const handler = setTimeout(() => {
      if (!isValidationPackages) {
        setLastValidated(currentTrackingsKey); // Actualizamos ANTES de validar
        handleValidatePackages();
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [safeScannedPackages, selectedSubsidiaryId, isLoading, lastValidated, isValidationPackages, handleValidatePackages]);

  const handleSelectMissingTracking = useCallback((id: string, value: string) => {
    const newSelectedReasons = { ...safeSelectedReasons, [id]: value };
    setSelectedReasons(newSelectedReasons);

    const currentMissingPackages = safeMissingPackages;
    const currentSurplusTrackings = safeSurplusTrackings;
    const currentScannedPackages = safeScannedPackages;

    const newMissingPackages = currentMissingPackages.filter(p => p.trackingNumber !== id);
    const newSurplusTrackings = currentSurplusTrackings.filter(item => item !== id);

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

    setMissingPackages(newMissingPackages);
    setSurplusTrackings(newSurplusTrackings);
    setOpenPopover(null);
    toast({ title: "Motivo actualizado", description: `Se asignó "${value}" a la guía ${id}` });
  }, [safeSelectedReasons, safeMissingPackages, safeSurplusTrackings, safeScannedPackages, setSelectedReasons, setMissingPackages, setSurplusTrackings, toast]);

  const handleRemovePackage = useCallback((tn: string) => {
    setShipments(prev => {
      const updated = prev.filter(p => p.trackingNumber !== tn);
      if (consolidatedValidation) setMissingPackages(updateMissingPackages(updated, consolidatedValidation));
      return updated;
    });
    setScannedPackages(prev => prev.filter(p => p.trackingNumber !== tn));
    setSurplusTrackings(prev => prev.filter(p => p !== tn));
    setSelectedReasons(prev => {
      const next = { ...prev };
      delete next[tn];
      return next;
    });
  }, [consolidatedValidation, updateMissingPackages, setShipments, setScannedPackages, setSurplusTrackings, setSelectedReasons]);

  const filteredValidShipments = useMemo(() => {
    if (!Array.isArray(validShipments)) return [];
    return validShipments.filter(pkg => {
      if (!pkg) return false;
      const matchesSearch = pkg.trackingNumber?.includes(searchTerm) ||
        (pkg.recipientName && typeof pkg.recipientName === 'string' && pkg.recipientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (pkg.recipientAddress && typeof pkg.recipientAddress === 'string' && pkg.recipientAddress.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesPriority = filterPriority === "all" || pkg.priority === filterPriority;
      const matchesStatus = filterStatus === "all" ||
        (filterStatus === "special" && (pkg.isCharge || pkg.isHighValue || pkg.payment)) ||
        (filterStatus === "normal" && !pkg.isCharge && !pkg.isHighValue && !pkg.payment);
      return matchesSearch && matchesPriority && matchesStatus;
    });
  }, [validShipments, searchTerm, filterPriority, filterStatus]);

  const canUnload = !!selectedUnidad && validShipments.length > 0;

  const clearAllStorage = useCallback(() => {
    try {
      const keys = ['unloading_unidad', 'unloading_scanned_packages', 'unloading_shipments', 'unloading_missing_packages', 'unloading_surplus_trackings', 'unloading_selected_reasons', 'unloading_tracking_raw', 'unloading_consolidated_validation', 'unloading_selected_consolidados', 'unloading_selected_consolidados_counts'];
      keys.forEach(k => { try { window.localStorage.removeItem(k); } catch {} });
    } catch (err) {}
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
    try { toast?.({ title: "Datos limpiados", description: "Se eliminaron los datos temporales." }); } catch {}
  }, [setScannedPackages, setShipments, setMissingPackages, setSurplusTrackings, setSelectedReasons, setTrackingNumbersRaw, setConsolidatedValidation, setSelectedConsolidatedIds, setLastValidated, setSelectedUnidad, toast]);

  const clearMissingPackages = useCallback(() => {
    try {
      const missingKeys = safeMissingPackages.map(p => p.trackingNumber);
      setMissingPackages([]);
      setSelectedReasons(prev => {
        const next = { ...prev };
        missingKeys.forEach(k => delete next[k]);
        return next;
      });
      setSurplusTrackings(prev => prev.filter(t => !missingKeys.includes(t)));
      toast?.({ title: "Faltantes limpiados", description: "Se limpiaron los paquetes faltantes." });
    } catch (err) {}
  }, [safeMissingPackages, setMissingPackages, setSelectedReasons, setSurplusTrackings, toast]);

  const handleExport = useCallback(async () => {
    if (shipmentsArray.length === 0) return;
    setIsLoading(true);
    try {
      const validList = shipmentsArray.filter(s => s.isValid);
      const blob = await pdf(<UnloadingPDFReport key={Date.now()} vehicle={selectedUnidad} packages={validList} missingPackages={missingPackages} unScannedPackages={surplusTrackings} subsidiaryName={selectedSubsidiaryName || ""} unloadingTrackigNumber={savedUnload?.trackingNumber || ""} />).toBlob();
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
      toast?.({ title: "Error", description: "No se pudo generar el PDF.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [shipmentsArray, selectedUnidad, missingPackages, surplusTrackings, selectedSubsidiaryName, savedUnload, toast]);

  const handleSendEmail = useCallback(async (unloadingSaved: Unloading) => {
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
    try { window.open(blobUrl, '_blank'); } catch(e){}
    const currentDate = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
    unloadingSaved.shipments = validShipments;
    const fileName = `${unloadingSaved?.subsidiary?.name}--Desembarque--${unloadingSaved?.subsidiary?.name}_${currentDate.replace(/\//g, "-")}.pdf`;
    const pdfFile = new File([blob], fileName, { type: 'application/pdf' });
    const excelBuffer = await generateUnloadingExcelClient(unloadingSaved, false);
    const excelBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const excelFileName = `${unloadingSaved?.subsidiary?.name}--Desembarque--${currentDate.replace(/\//g, "-")}.xlsx`;
    const excelFile = new File([excelBlob], excelFileName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const onProgress = (percent: number) => { console.log(`Upload progress: ${percent}%`); };
    await uploadPDFile(pdfFile, excelFile, unloadingSaved?.subsidiary?.name, unloadingSaved?.id, onProgress);
  }, [validShipments, missingPackages, surplusTrackings, selectedUnidad]);

  const handleUnloading = useCallback(async () => {
    if (!selectedSubsidiaryId) {
      toast({ title: "Sucursal no seleccionada", description: "Por favor selecciona una sucursal antes de procesar.", variant: "destructive" });
      return;
    }
    if (!selectedUnidad) {
      toast({ title: "Unidad no seleccionada", description: "Por favor selecciona una unidad de transporte.", variant: "destructive" });
      return;
    }
    const validList = shipmentsArray.filter(s => s.isValid);
    if (validList.length === 0) {
      toast({ title: "No hay paquetes válidos", description: "No hay paquetes válidos para procesar el Desembarque.", variant: "destructive" });
      return;
    }
    const packagesWithoutId = validList.filter(s => !s.id);
    if (packagesWithoutId.length > 0) {
      toast({ title: "Validación incompleta", description: "Hay paquetes que aún no han recuperado su ID del servidor. Por favor, espera.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setProgress(0);
    try {
      const data: UnloadingFormData = {
        vehicle: selectedUnidad,
        subsidiary: { id: selectedSubsidiaryId, name: selectedSubsidiaryName || "Unknown" },
        shipments: validList.map(s => s.id as string), 
        missingTrackings: safeMissingPackages.map(p => p.trackingNumber),
        unScannedTrackings: surplusTrackings,
        date: new Date().toISOString()
      };
      const saved = await saveUnloading(data);
      setSavedUnloading(saved);
      await handleSendEmail(saved);
      toast({ title: "Desembarque procesado exitosamente", description: `Se procesaron ${validList.length} paquetes.` });
      clearAllStorage();
      onSuccess();
    } catch (error) {
      toast({ title: "Error", description: "Hubo un problema al procesar el desembarque.", variant: "destructive" });
    } finally {
      setIsLoading(false);
      setSavedUnloading(null);
      setProgress(0);
    }
  }, [selectedSubsidiaryId, selectedUnidad, shipmentsArray, safeMissingPackages, surplusTrackings, selectedSubsidiaryName, onSuccess, toast, clearAllStorage, handleSendEmail]);

  const startTutorial = () => {
    try {
      const driverObj = driver({
        showProgress: true,
        steps: [
          { element: "#unloading-tutorial-button", popover: { title: "Bienvenido", description: "Tutorial guiado." } },
          { element: "#process-button", popover: { title: "Procesar", description: "Haz clic aquí para finalizar." } },
        ]
      });
      driverObj.drive();
    } catch (err) {}
  };

  return (
    <>
      <Card className="w-full max-w-6xl mx-auto border-0 shadow-none">
        {isValidationPackages && (
          <LoaderWithOverlay overlay transparent text="Validando paquetes..." className="rounded-lg" />
        )}
        {isLoading && !isValidationPackages && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex justify-center items-center z-50">
            <LoaderWithOverlay overlay text="Procesando desembarque..." className="rounded-lg" />
          </div>
        )}
        {!isOnline && (
          <div className="bg-yellow-50 border-b border-yellow-200 p-2 text-center">
            <span className="text-yellow-800 text-sm">⚡ Modo offline activado</span>
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
                  <Badge variant="secondary" className="ml-2">
                    {validShipments.length} válidos
                  </Badge>
                )}
              </CardTitle>
            </div>
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-primary-foreground bg-primary px-3 py-1.5 rounded-full">
                  <MapPinIcon className="h-4 w-4" />
                  <span>Sucursal: {selectedSubsidiaryName}</span>
                </div>
                <Button id="unloading-tutorial-button" variant="ghost" size="sm" onClick={startTutorial}>
                  <HelpCircle className="h-4 w-4" />
                </Button>
              {(shipmentsArray.length > 0 || selectedUnidad) && (
                <Button variant="outline" size="sm" onClick={() => { clearAllStorage(); clearMissingPackages(); }} disabled={isLoading}>
                  <Trash2 className="h-4 w-4" />
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
                  <PackageCheckIcon className="h-4 w-4" /> Unidad
                </Label>
                <UnidadSelector selectedUnidad={selectedUnidad} onSelectionChange={setSelectedUnidad} disabled={isLoading} />
              </div>
              <Separator />
              <ConsolidateDetails
                consolidatedData={
                  consolidatedValidation && 
                  Object.keys(consolidatedValidation).length > 0 && 
                  (consolidatedValidation.airConsolidated?.length > 0 || consolidatedValidation.groundConsolidated?.length > 0 || consolidatedValidation.f2Consolidated?.length > 0)
                    ? consolidatedValidation 
                    : undefined
                }
                initialSelectedIds={selectedConsolidatedIds}
                onSelectionChange={handleConsolidateSelectionChange}
                subsidiaryId={parentSubsidiaryId ?? selectedSubsidiaryId ?? null}
              />
            </div>
            <div className="space-y-4 p-4 bg-muted/20 rounded-lg">
              <BarcodeScannerInput
                ref={barScannerInputRef}
                onPackagesChange={setScannedPackages}
                disabled={isLoading || !selectedSubsidiaryId}
                placeholder={!selectedSubsidiaryId ? "Selecciona sucursal" : "Escanear..."}
                onHasDueTomorrow={setScannerHasDueTomorrow}
              />
              {isLoading && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                </div>
              )}
            </div>
          </div>

          {shipmentsArray.length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)}>
                  <Filter className="h-4 w-4" />
                </Button>
              </div>

              <Tabs defaultValue="validos" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="validos">Válidos ({validShipments.length})</TabsTrigger>
                  <TabsTrigger value="faltantes">Faltantes ({missingPackages.length})</TabsTrigger>
                  <TabsTrigger value="sobrantes">Sobrantes ({surplusTrackings.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="validos" className="mt-4">
                  <ScrollArea className="h-[400px] rounded-md border">
                    <div className="divide-y">
                      {filteredValidShipments.map((pkg) => pkg && (
                        <PackageItem key={pkg.trackingNumber} pkg={pkg} onRemove={handleRemovePackage} isLoading={isLoading} selectedReasons={selectedReasons} onSelectReason={handleSelectMissingTracking} openPopover={openPopover} setOpenPopover={setOpenPopover} onCompleteData={handleOpenCompleteData} />
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="faltantes" className="mt-4">
                  <ScrollArea className="h-[300px] border rounded-md">
                    <div className="divide-y">
                      {safeMissingPackages.map((pkg, idx) => pkg && <MissingPackageItem key={`${pkg.trackingNumber}-${idx}`} pkg={pkg} />)}
                    </div>
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="sobrantes" className="mt-4">
                  <ScrollArea className="h-[300px] border rounded-md p-4">
                    <ul className="space-y-2">
                      {safeSurplusTrackings.map(t => (
                        <li key={t} className="flex justify-between items-center p-2 rounded bg-amber-50 border border-amber-200">
                          <span className="font-mono">{t}</span>
                          <Button variant="outline" size="sm" onClick={() => handleOpenCorrectTracking(t)}>Corregir</Button>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          )}

          <div className="flex justify-between items-center p-4 bg-muted/20 rounded-lg">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <div className="flex gap-2">
              <Button id="process-button" onClick={handleUnloading} disabled={isLoading || !canUnload || packagesNeedingData.length > 0}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Procesar
              </Button>
              <Button variant="outline" onClick={handleExport} disabled={isLoading || shipmentsArray.length === 0}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <CompleteDataModal isOpen={completeDataModalOpen} onClose={handleCloseCompleteData} package={selectedPackageForData} onSave={handleSavePackageData} />
      <CorrectTrackingModal 
        isOpen={correctTrackingModalOpen} 
        onClose={handleCloseCorrectTracking} 
        scannedTrackingNumber={selectedTrackingToCorrect} 
        subsidiaryId={selectedSubsidiaryId} 
        subsidiaryName={selectedSubsidiaryName} 
        onCorrect={handleCorrectTracking} 
        onCreate={handleCreateShipment} 
        handleValidatePackages={handleValidatePackages} />
      <ExpirationAlertModal isOpen={expirationAlertOpen} onClose={handleNextExpiring} packages={expiringPackages} currentIndex={currentExpiringIndex} onNext={handleNextExpiring} onPrevious={handlePreviousExpiring} />
    </>
  );
}