"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { UnidadSelector } from "@/components/selectors/unidad-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { AlertCircle, Check, ChevronsUpDown, CircleAlertIcon, DollarSignIcon, GemIcon, MapPin, MapPinIcon, Package, PackageCheckIcon, Phone, Scan, Send, Trash2, User, Loader2, Search, Filter, ChevronDown, ChevronUp, Download, X, ArrowRight, ArrowLeft, FileText, Mail } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { validateTrackingNumbers, saveUnloading, uploadPDFile, getConsolidatedsToStartUnloading } from "@/lib/services/unloadings";
import { Consolidateds, PackageInfo, PackageInfoForUnloading, Unloading, UnloadingFormData, ValidTrackingAndConsolidateds } from "@/lib/types";
import { BarcodeScannerInput, BarcodeScannerInputHandle } from "@/components/barcode-input/barcode-scanner-input-list";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { UnloadingPDFReport } from "@/lib/services/unloading/unloading-pdf-generator";
import { pdf } from "@react-pdf/renderer";
import { generateUnloadingExcelClient } from "@/lib/services/unloading/unloading-excel-generator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoaderWithOverlay } from "@/components/loader";
import { ExpirationAlertModal, ExpiringPackage } from "@/components/ExpirationAlertModal";
import { Checkbox } from "@/components/ui/checkbox";

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
  payment?: { type: string; amount: number };
  isOffline?: boolean;
  createdAt?: Date;
  consolidateId?: string;
}

enum ShipmentStatusType {
  PENDING = "pending",
  DELIVERED = "delivered",
  UNDELIVERED = "undelivered",
}

enum Priority {
  ALTA = "alta",
  MEDIA = "media",
  BAJA = "ba ja",
}

enum TrackingNotFoundEnum {
  NOT_SCANNED = "Guia sin escaneo",
  NOT_TRACKING = "Guia faltante",
  NOT_IN_CHARGE = "No Llego en la Carga"
}

interface ConsolidateItem {
  id: string;
  type: string;
  numberOfPackages: number;
  added: string[];
  notFound: string[];
}

interface SelectedConsolidate {
  id: string;
  type: string;
  totalPackages: number;
  added: string[];
  notFound: string[];
  scannedPackages: PackageInfoForUnloading[];
  missingPackages: string[];
}

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

// Componente para mostrar el progreso del wizard
const WizardSteps = ({ currentStep, steps }: { currentStep: number; steps: string[] }) => {
  return (
    <div className="flex items-center justify-center mb-6">
      <div className="flex items-center space-x-4">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
              index < currentStep 
                ? "bg-primary border-primary text-primary-foreground" 
                : index === currentStep
                ? "border-primary bg-primary text-primary-foreground"
                : "border-muted-foreground/30 text-muted-foreground"
            }`}>
              {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            <span className={`ml-2 text-sm font-medium ${
              index <= currentStep ? "text-foreground" : "text-muted-foreground"
            }`}>
              {step}
            </span>
            {index < steps.length - 1 && (
              <div className={`w-12 h-0.5 mx-4 ${
                index < currentStep ? "bg-primary" : "bg-muted-foreground/30"
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

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

            {pkg.consolidateId && (
              <Badge variant="outline" className="text-xs">
                Consolidado: {pkg.consolidateId}
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

// Paso 1: Selección de consolidados
const Step1SelectConsolidates = ({ 
  consolidates, 
  selectedConsolidates, 
  onSelectionChange,
  loading,
  onClearAll
}: { 
  consolidates: ConsolidateItem[];
  selectedConsolidates: SelectedConsolidate[];
  onSelectionChange: (consolidates: SelectedConsolidate[]) => void;
  loading: boolean;
  onClearAll: () => void;
}) => {
  const toggleConsolidate = (consolidate: ConsolidateItem) => {
    const isSelected = selectedConsolidates.some(c => c.id === consolidate.id);
    
    if (isSelected) {
      onSelectionChange(selectedConsolidates.filter(c => c.id !== consolidate.id));
    } else {
      const newSelected: SelectedConsolidate = {
        id: consolidate.id,
        type: consolidate.type,
        totalPackages: consolidate.numberOfPackages,
        added: consolidate.added || [],
        notFound: consolidate.notFound || [],
        scannedPackages: [],
        missingPackages: consolidate.notFound || []
      };
      onSelectionChange([...selectedConsolidates, newSelected]);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p>Cargando consolidados disponibles...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold mb-2">Selecciona los consolidados para desembarque</h3>
          <p className="text-muted-foreground">Elige uno o más consolidados que deseas procesar</p>
        </div>
        
        {selectedConsolidates.length > 0 && (
          <Button variant="outline" onClick={onClearAll} className="gap-2">
            <Trash2 className="h-4 w-4" />
            Limpiar todo
          </Button>
        )}
      </div>

      {consolidates.length === 0 ? (
        <div className="text-center py-8 border rounded-lg">
          <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">No hay consolidados disponibles para desembarque</p>
        </div>
      ) : (
        <div className="grid gap-3 max-h-96 overflow-y-auto">
          {consolidates.map((consolidate) => {
            const isSelected = selectedConsolidates.some(c => c.id === consolidate.id);
            const selectedConsolidate = selectedConsolidates.find(c => c.id === consolidate.id);
            const scannedCount = selectedConsolidate?.scannedPackages.length || 0;
            
            return (
              <Card key={consolidate.id} className={`cursor-pointer transition-all ${
                isSelected ? "border-primary bg-primary/5" : "hover:border-muted-foreground/30"
              }`} onClick={() => toggleConsolidate(consolidate)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`flex items-center justify-center w-6 h-6 rounded border ${
                        isSelected ? "bg-primary border-primary" : "border-muted-foreground"
                      }`}>
                        {isSelected && <Check className="h-4 w-4 text-primary-foreground" />}
                      </div>
                      <div>
                        <div className="font-medium">{consolidate.type}</div>
                        <div className="text-sm text-muted-foreground">
                          {consolidate.numberOfPackages} paquetes totales
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-red-600">
                        {consolidate.notFound.length} faltantes
                      </div>
                      {scannedCount > 0 && (
                        <div className="text-sm text-green-600">
                          {scannedCount} escaneados
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selectedConsolidates.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-blue-900">
                  {selectedConsolidates.length} consolidado(s) seleccionado(s)
                </div>
                <div className="text-sm text-blue-700">
                  Total: {selectedConsolidates.reduce((sum, c) => sum + c.totalPackages, 0)} paquetes
                </div>
              </div>
              <Badge variant="outline" className="bg-blue-100 text-blue-800">
                Listo para continuar
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Paso 2: Escaneo y validación
const Step2ScanAndValidate = ({
  selectedConsolidates,
  scannedPackages,
  onPackagesChange,
  shipments,
  missingTrackings,
  unScannedTrackings,
  onRemovePackage,
  selectedReasons,
  onSelectReason,
  openPopover,
  setOpenPopover,
  isLoading,
  onValidatePackages,
  searchTerm,
  setSearchTerm,
  filterPriority,
  setFilterPriority,
  filterStatus,
  setFilterStatus,
  showFilters,
  setShowFilters,
  selectedUnidad,
  selectedSubsidiaryName,
  onClearAll,
  isOnline
}: {
  selectedConsolidates: SelectedConsolidate[];
  scannedPackages: PackageInfo[];
  onPackagesChange: (packages: PackageInfo[]) => void;
  shipments: PackageInfoForUnloading[];
  missingTrackings: string[];
  unScannedTrackings: string[];
  onRemovePackage: (trackingNumber: string) => void;
  selectedReasons: Record<string, string>;
  onSelectReason: (id: string, value: string) => void;
  openPopover: string | null;
  setOpenPopover: (value: string | null) => void;
  isLoading: boolean;
  onValidatePackages: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterPriority: string;
  setFilterPriority: (priority: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  selectedUnidad: Vehicles | null;
  selectedSubsidiaryName: string | null;
  onClearAll: () => void;
  isOnline: boolean;
}) => {
  const barScannerInputRef = useRef<BarcodeScannerInputHandle>(null);
  const validShipments = shipments.filter((p) => p.isValid);

  // Resumen por consolidado
  const consolidateSummary = selectedConsolidates.map(consolidate => ({
    ...consolidate,
    progress: consolidate.totalPackages > 0 ? (consolidate.scannedPackages.length / consolidate.totalPackages) * 100 : 0
  }));

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold mb-2">Escaneo y validación de paquetes</h3>
          <p className="text-muted-foreground">Escanea los paquetes de los consolidados seleccionados</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-primary-foreground bg-primary px-3 py-1.5 rounded-full">
            <MapPinIcon className="h-4 w-4"/>
            <span>Sucursal: {selectedSubsidiaryName}</span>
          </div>
          
          <Button variant="outline" onClick={onClearAll} className="gap-2">
            <Trash2 className="h-4 w-4" />
            Limpiar todo
          </Button>
        </div>
      </div>

      {/* Indicador de modo offline */}
      {!isOnline && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
          <span className="text-yellow-800 text-sm flex items-center justify-center gap-2">
            ⚡ Modo offline - Los datos se guardan localmente
          </span>
        </div>
      )}

      {/* Resumen de consolidados */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {consolidateSummary.map((consolidate) => (
          <Card key={consolidate.id}>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="font-medium">{consolidate.type}</span>
                  <Badge variant={consolidate.progress === 100 ? "success" : "secondary"} className="text-xs">
                    {consolidate.progress === 100 ? "COMPLETO" : Math.round(consolidate.progress) + "%"}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progreso</span>
                    <span>{consolidate.scannedPackages.length}/{consolidate.totalPackages}</span>
                  </div>
                  <Progress value={consolidate.progress} className="h-2" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-center p-2 bg-green-50 rounded">
                    <div className="font-semibold text-green-600">{consolidate.scannedPackages.length}</div>
                    <div className="text-green-700">Escaneados</div>
                  </div>
                  <div className="text-center p-2 bg-red-50 rounded">
                    <div className="font-semibold text-red-600">{consolidate.missingPackages.length}</div>
                    <div className="text-red-700">Faltantes</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sección de transporte y escaneo */}
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
              onSelectionChange={() => {}} // Se maneja en el componente principal
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Sección de escaneo */}
        <div className="space-y-4 p-4 bg-muted/20 rounded-lg">
          <div className="space-y-2">
            <BarcodeScannerInput
              ref={barScannerInputRef}
              onPackagesChange={onPackagesChange}
              disabled={isLoading}
              placeholder="Escribe o escanea números de tracking"
            />
          </div>
          
          <Button
            onClick={onValidatePackages}
            disabled={isLoading || scannedPackages.length === 0}
            className="w-full"
            variant="outline"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Scan className="h-4 w-4 mr-2" />
            )}
            {isLoading ? "Procesando..." : `Validar ${scannedPackages.length} paquetes`}
          </Button>
        </div>
      </div>

      {/* Lista de paquetes */}
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
                      <Badge variant="outline" className="h-4 bg-yellow-100 text-yellow-800">⚡</Badge>
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
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
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
              <TabsTrigger value="sin-escaneo" className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4"/>
                Sin escaneo ({unScannedTrackings.length})
              </TabsTrigger>
              <TabsTrigger value="faltantes" className="flex items-center gap-1">
                <CircleAlertIcon className="h-4 w-4"/>
                Faltantes ({missingTrackings.length})
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
                        onRemove={onRemovePackage}
                        isLoading={isLoading}
                        selectedReasons={selectedReasons}
                        onSelectReason={onSelectReason}
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

            <TabsContent value="sin-escaneo" className="mt-4">
              {unScannedTrackings.length > 0 ? (
                <ScrollArea className="h-[300px] rounded-md border p-4">
                  <ul className="space-y-2">
                    {unScannedTrackings.map(tracking => (
                      <li key={tracking} className="flex justify-between items-center py-2 px-3 rounded-md bg-amber-50">
                        <span className="font-mono text-sm">{tracking}</span>
                        <Badge variant="outline" className="bg-amber-100 text-amber-800 text-xs">
                          Sin escaneo
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground border rounded-md">
                  <p>No hay guías sin escaneo</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="faltantes" className="mt-4">
              {missingTrackings.length > 0 ? (
                <ScrollArea className="h-[300px] rounded-md border p-4">
                  <ul className="space-y-2">
                    {missingTrackings.map(tracking => (
                      <li key={tracking} className="flex justify-between items-center py-2 px-3 rounded-md bg-red-50">
                        <span className="font-mono text-sm">{tracking}</span>
                        <Badge variant="outline" className="bg-red-100 text-red-800 text-xs">
                          Faltante
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground border rounded-md">
                  <p>No hay guías faltantes</p>
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
              <span className="text-amber-600 font-semibold">{unScannedTrackings.length}</span>
              <span>sin escaneo</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-red-600 font-semibold">{missingTrackings.length}</span>
              <span>faltantes</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Paso 3: Resumen y envío
const Step3SummaryAndSend = ({
  selectedConsolidates,
  shipments,
  missingTrackings,
  unScannedTrackings,
  selectedUnidad,
  selectedSubsidiaryName,
  onExport,
  onSend,
  onClearAll,
  isLoading,
  isOnline
}: {
  selectedConsolidates: SelectedConsolidate[];
  shipments: PackageInfoForUnloading[];
  missingTrackings: string[];
  unScannedTrackings: string[];
  selectedUnidad: Vehicles | null;
  selectedSubsidiaryName: string | null;
  onExport: () => void;
  onSend: () => void;
  onClearAll: () => void;
  isLoading: boolean;
  isOnline: boolean;
}) => {
  const validShipments = shipments.filter((p) => p.isValid);
  const totalPackages = selectedConsolidates.reduce((sum, c) => sum + c.totalPackages, 0);
  const scannedPackages = selectedConsolidates.reduce((sum, c) => sum + c.scannedPackages.length, 0);
  const missingPackages = selectedConsolidates.reduce((sum, c) => sum + c.missingPackages.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold mb-2">Resumen final y envío</h3>
          <p className="text-muted-foreground">Revisa la información antes de procesar el desembarque</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-primary-foreground bg-primary px-3 py-1.5 rounded-full">
            <MapPinIcon className="h-4 w-4"/>
            <span>Sucursal: {selectedSubsidiaryName}</span>
          </div>
          
          <Button variant="outline" onClick={onClearAll} className="gap-2">
            <Trash2 className="h-4 w-4" />
            Limpiar todo
          </Button>
        </div>
      </div>

      {/* Indicador de modo offline */}
      {!isOnline && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
          <span className="text-yellow-800 text-sm flex items-center justify-center gap-2">
            ⚡ Modo offline - Los datos se guardan localmente
          </span>
        </div>
      )}

      {/* Resumen general */}
      <Card>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{totalPackages}</div>
              <div className="text-sm text-blue-800">Total Esperado</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{scannedPackages}</div>
              <div className="text-sm text-green-800">Escaneados</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{missingPackages}</div>
              <div className="text-sm text-red-800">Faltantes</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progreso general del desembarque</span>
              <span>{scannedPackages}/{totalPackages} ({totalPackages > 0 ? ((scannedPackages / totalPackages) * 100).toFixed(1) : 0}%)</span>
            </div>
            <Progress value={totalPackages > 0 ? (scannedPackages / totalPackages) * 100 : 0} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Detalle por consolidado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalle por consolidado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {selectedConsolidates.map((consolidate) => (
              <div key={consolidate.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                <div>
                  <div className="font-medium">{consolidate.type}</div>
                  <div className="text-sm text-muted-foreground">
                    {consolidate.scannedPackages.length} de {consolidate.totalPackages} paquetes
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${
                    consolidate.scannedPackages.length === consolidate.totalPackages ? 
                    "text-green-600" : "text-amber-600"
                  }`}>
                    {consolidate.scannedPackages.length === consolidate.totalPackages ? 
                     "COMPLETO" : "INCOMPLETO"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {consolidate.missingPackages.length} faltantes
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Información de envío */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información del desembarque</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label className="text-sm font-medium">Unidad de transporte</Label>
              <div className="text-sm text-muted-foreground mt-1">
                {selectedUnidad ? selectedUnidad.name : "No seleccionada"}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Total de paquetes válidos</Label>
              <div className="text-sm text-muted-foreground mt-1">
                {validShipments.length} paquetes listos para procesar
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acciones finales */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={onExport}
              disabled={isLoading}
              variant="outline"
              className="flex-1"
            >
              <FileText className="h-4 w-4 mr-2" />
              Generar PDF
            </Button>
            <Button
              onClick={onSend}
              disabled={isLoading || validShipments.length === 0}
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              {isLoading ? "Procesando..." : "Enviar y Finalizar"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Al enviar, se generará el reporte PDF y se notificará por email
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

// Componente principal
export default function UnloadingForm({ onClose, onSuccess }: Props) {
  // Estados del wizard
  const [currentStep, setCurrentStep] = useLocalStorage('unloading_current_step', 0);
  const steps = ["Seleccionar Consolidados", "Escaneo y Validación", "Confirmar y Enviar"];

  // Estados persistentes (MISMO que el original)
  const [selectedUnidad, setSelectedUnidad] = useLocalStorage<Vehicles | null>('unloading_unidad', null);
  const [scannedPackages, setScannedPackages] = useLocalStorage<PackageInfo[]>('unloading_scanned_packages', []);
  const [shipments, setShipments] = useLocalStorage<PackageInfoForUnloading[]>('unloading_shipments', []);
  const [missingTrackings, setMissingTrackings] = useLocalStorage<string[]>('unloading_missing_trackings', []);
  const [unScannedTrackings, setUnScannedTrackings] = useLocalStorage<string[]>('unloading_unscanned_trackings', []);
  const [selectedReasons, setSelectedReasons] = useLocalStorage<Record<string, string>>('unloading_selected_reasons', {});
  const [selectedConsolidates, setSelectedConsolidates] = useLocalStorage<SelectedConsolidate[]>('unloading_selected_consolidates', []);

  // Estados regulares (MISMO que el original)
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
  const [consolidatedData, setConsolidatedData] = useState<Consolidateds>();
  const [lastValidated, setLastValidated] = useState("");
  const [expirationAlertOpen, setExpirationAlertOpen] = useState(false);
  const [expiringPackages, setExpiringPackages] = useState<ExpiringPackage[]>([]);
  const [currentExpiringIndex, setCurrentExpiringIndex] = useState(0);
  const [isValidationPackages, setIsValidationPackages] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [loadingConsolidates, setLoadingConsolidates] = useState(false);

  const barScannerInputRef = useRef<BarcodeScannerInputHandle>(null);
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);

  // Detectar estado de conexión (MISMO que el original)
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

  // Revalidar paquetes offline cuando se recupera conexión (MISMO que el original)
  useEffect(() => {
    if (isOnline) {
      const offlinePackages = shipments.filter(pkg => pkg.isOffline);
      if (offlinePackages.length > 0 && selectedSubsidiaryId) {
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
    }
  }, [isOnline, shipments, selectedSubsidiaryId, setShipments, toast]);

  // Validación automática al escanear (MISMO que el original)
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
    if (user?.subsidiary) {
      setSelectedSubsidiaryId(user.subsidiary.id);
      setSelectedSubsidiaryName(user.subsidiary.name);
    }
  }, [user]);

  // Cargar consolidados disponibles
  useEffect(() => {
    const loadConsolidates = async () => {
      if (!user?.subsidiary?.id) return;
      
      setLoadingConsolidates(true);
      try {
        const data = await getConsolidatedsToStartUnloading(user.subsidiary.id);
        setConsolidatedData(data);
      } catch (error) {
        console.error("Error loading consolidates:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los consolidados",
          variant: "destructive",
        });
      } finally {
        setLoadingConsolidates(false);
      }
    };

    loadConsolidates();
  }, [user?.subsidiary?.id, toast]);

  // Obtener todos los consolidados disponibles como lista plana
  const allConsolidates = useMemo(() => {
    if (!consolidatedData) return [];
    
    const consolidates: ConsolidateItem[] = [];
    
    consolidatedData.airConsolidated?.forEach(item => {
      consolidates.push({
        id: `air-${item.type}-${Math.random().toString(36).substr(2, 9)}`,
        type: item.type,
        numberOfPackages: item.numberOfPackages,
        added: item.added || [],
        notFound: item.notFound || []
      });
    });
    
    consolidatedData.groundConsolidated?.forEach(item => {
      consolidates.push({
        id: `ground-${item.type}-${Math.random().toString(36).substr(2, 9)}`,
        type: item.type,
        numberOfPackages: item.numberOfPackages,
        added: item.added || [],
        notFound: item.notFound || []
      });
    });
    
    consolidatedData.f2Consolidated?.forEach(item => {
      consolidates.push({
        id: `f2-${item.type}-${Math.random().toString(36).substr(2, 9)}`,
        type: item.type,
        numberOfPackages: item.numberOfPackages,
        added: item.added || [],
        notFound: item.notFound || []
      });
    });
    
    return consolidates;
  }, [consolidatedData]);

  // Navegación entre pasos
  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Validar si se puede avanzar al siguiente paso
  const canProceedToStep2 = selectedConsolidates.length > 0;
  const canProceedToStep3 = shipments.length > 0;

  // Función para limpiar TODO el almacenamiento (MISMO que el original)
  const clearAllStorage = useCallback(() => {
    const keys = [
      'unloading_current_step',
      'unloading_unidad',
      'unloading_scanned_packages',
      'unloading_shipments',
      'unloading_missing_trackings',
      'unloading_unscanned_trackings',
      'unloading_selected_reasons',
      'unloading_selected_consolidates'
    ];

    keys.forEach(key => {
      try {
        window.localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Error clearing ${key}:`, error);
      }
    });

    setSelectedUnidad(null);
    setScannedPackages([]);
    setShipments([]);
    setMissingTrackings([]);
    setUnScannedTrackings([]);
    setSelectedReasons({});
    setSelectedConsolidates([]);
    setCurrentStep(0);

    toast({
      title: "Datos limpiados",
      description: "Todos los datos locales han sido eliminados.",
    });
  }, [
    setSelectedUnidad,
    setScannedPackages,
    setShipments,
    setMissingTrackings,
    setUnScannedTrackings,
    setSelectedReasons,
    setSelectedConsolidates,
    setCurrentStep
  ]);

  // handleValidatePackages (MISMO que el original)
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

      if (barScannerInputRef.current && barScannerInputRef.current.updateValidatedPackages) {
        barScannerInputRef.current.updateValidatedPackages(result.validatedShipments);
      }

      const newValidShipments = result.validatedShipments.filter(
          (r) => !shipments.some((p) => p.trackingNumber === r.trackingNumber)
      );

      // Actualizar consolidados con los paquetes validados
      newValidShipments.forEach(packageInfo => {
        setSelectedConsolidates(prev => 
          prev.map(consolidate => {
            const belongsToConsolidate = consolidate.notFound.includes(packageInfo.trackingNumber) || 
                                       consolidate.added.includes(packageInfo.trackingNumber);

            if (belongsToConsolidate) {
              const updatedPackage = {
                ...packageInfo,
                consolidateId: consolidate.id
              };

              return {
                ...consolidate,
                scannedPackages: [...consolidate.scannedPackages, updatedPackage],
                missingPackages: consolidate.missingPackages.filter(tracking => tracking !== packageInfo.trackingNumber)
              };
            }
            return consolidate;
          })
        );
      });

      setShipments((prev) => [...prev, ...newValidShipments]);
      setMissingTrackings(invalidNumbers);
      setUnScannedTrackings([]);

      const todayExpiringPackages: ExpiringPackage[] = newValidShipments
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

      const validCount = newValidShipments.filter((p) => p.isValid).length;
      const invalidCount = newValidShipments.filter((p) => !p.isValid).length;

      toast({
        title: "Validación completada",
        description: `Se agregaron ${validCount} paquetes válidos. Paquetes inválidos: ${
            invalidCount + invalidNumbers.length
        }`,
      });
    } catch (error) {
      console.error("Error validating packages:", error);
      
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
    }
  };

  // Resto de funciones (MISMAS que el original)
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

  const handleRemovePackage = useCallback((trackingNumber: string) => {
    setShipments((prev) => prev.filter((p) => p.trackingNumber !== trackingNumber));
    setScannedPackages((prev) => prev.filter((p) => p.trackingNumber !== trackingNumber));
    
    setSelectedConsolidates(prev => 
      prev.map(consolidate => ({
        ...consolidate,
        scannedPackages: consolidate.scannedPackages.filter(p => p.trackingNumber !== trackingNumber),
        missingPackages: consolidate.missingPackages.includes(trackingNumber) 
          ? consolidate.missingPackages 
          : [...consolidate.missingPackages, trackingNumber]
      }))
    );
  }, [setShipments, setScannedPackages, setSelectedConsolidates]);

  const handleSelectReason = (id: string, value: string) => {
    setSelectedReasons(prev => ({
      ...prev,
      [id]: value
    }));

    if(value === TrackingNotFoundEnum.NOT_TRACKING) {
      setMissingTrackings(prev => [...prev, id]);
      setUnScannedTrackings(prev => prev.filter(item => item !== id));
    } else if(value === TrackingNotFoundEnum.NOT_SCANNED) {
      setUnScannedTrackings(prev => [...prev, id]);
      setMissingTrackings(prev => prev.filter(item => item !== id));
    } else if(value === TrackingNotFoundEnum.NOT_IN_CHARGE) {
      setMissingTrackings(prev => prev.filter(item => item !== id));
      setUnScannedTrackings(prev => prev.filter(item => item !== id));
    }

    setOpenPopover(null);
  }

  const handleExport = async () => {
    setIsLoading(true);
    const validShipments = shipments.filter((p) => p.isValid);
    const blob = await pdf(
      <UnloadingPDFReport
        key={Date.now()}
        vehicle={selectedUnidad}
        packages={validShipments}
        missingPackages={missingTrackings}
        unScannedPackages={unScannedTrackings}
        subsidiaryName={user?.subsidiary?.name || ""}
        unloadingTrackigNumber="1254639874598"
      />
    ).toBlob();

    const blobUrl = URL.createObjectURL(blob) + `#${Date.now()}`;
    window.open(blobUrl, '_blank');
    setIsLoading(false);
  }

  const handleSend = async () => {
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
        missingTrackings,
        unScannedTrackings,
        date: new Date().toISOString(),
      };

      const newUnloading = await saveUnloading(unloadingData);

      // Generar y enviar PDF
      const blob = await pdf(
        <UnloadingPDFReport
          key={Date.now()}
          vehicle={selectedUnidad}
          packages={validShipments}
          missingPackages={missingTrackings}
          unScannedPackages={unScannedTrackings}
          subsidiaryName={newUnloading?.subsidiary?.name ?? ""}
          unloadingTrackigNumber={newUnloading?.trackingNumber ?? ""}
        />
      ).toBlob();
      
      const currentDate = new Date().toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      
      const fileName = `${newUnloading?.subsidiary?.name}--Desembarque--${currentDate.replace(/\//g, "-")}.pdf`;
      const pdfFile = new File([blob], fileName, { type: 'application/pdf' });

      const excelBuffer = await generateUnloadingExcelClient(newUnloading, false);
      const excelBlob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const excelFileName = `${newUnloading?.subsidiary?.name}--Desembarque--${currentDate.replace(/\//g, "-")}.xlsx`;
      const excelFile = new File([excelBlob], excelFileName, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      await uploadPDFile(pdfFile, excelFile, newUnloading?.subsidiary?.name, newUnloading?.id, (percent) => {
        console.log(`Upload progress: ${percent}%`);
      });

      toast({
        title: "Descarga procesada exitosamente",
        description: `Se procesaron ${validShipments.length} paquetes para descarga.`,
      });

      // Limpiar storage después de éxito
      clearAllStorage();
      onSuccess();
    } catch (error) {
      console.error("Error in handleSend:", error);
      toast({
        title: "Error al procesar descarga",
        description: "Hubo un problema al procesar el desembarque.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validShipments = shipments.filter((p) => p.isValid);
  const canUnload = selectedUnidad && validShipments.length > 0;

  return (
    <div className="w-full max-w-6xl mx-auto">
      <Card className="border-0 shadow-none">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary text-primary-foreground">
                  <PackageCheckIcon className="h-6 w-6"/>
                </div>
                <span>Desembarque de paquete</span>
                {shipments.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-sm">
                    {validShipments.length} válidos / {shipments.length} total
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Procesa el Desembarque de unidades de transporte
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Progreso del wizard */}
          <WizardSteps currentStep={currentStep} steps={steps} />

          {/* Contenido del paso actual */}
          <div className="min-h-[600px]">
            {currentStep === 0 && (
              <Step1SelectConsolidates
                consolidates={allConsolidates}
                selectedConsolidates={selectedConsolidates}
                onSelectionChange={setSelectedConsolidates}
                loading={loadingConsolidates}
                onClearAll={clearAllStorage}
              />
            )}

            {currentStep === 1 && (
              <Step2ScanAndValidate
                selectedConsolidates={selectedConsolidates}
                scannedPackages={scannedPackages}
                onPackagesChange={setScannedPackages}
                shipments={shipments}
                missingTrackings={missingTrackings}
                unScannedTrackings={unScannedTrackings}
                onRemovePackage={handleRemovePackage}
                selectedReasons={selectedReasons}
                onSelectReason={handleSelectReason}
                openPopover={openPopover}
                setOpenPopover={setOpenPopover}
                isLoading={isLoading}
                onValidatePackages={handleValidatePackages}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                filterPriority={filterPriority}
                setFilterPriority={setFilterPriority}
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                selectedUnidad={selectedUnidad}
                selectedSubsidiaryName={selectedSubsidiaryName}
                onClearAll={clearAllStorage}
                isOnline={isOnline}
              />
            )}

            {currentStep === 2 && (
              <Step3SummaryAndSend
                selectedConsolidates={selectedConsolidates}
                shipments={shipments}
                missingTrackings={missingTrackings}
                unScannedTrackings={unScannedTrackings}
                selectedUnidad={selectedUnidad}
                selectedSubsidiaryName={selectedSubsidiaryName}
                onExport={handleExport}
                onSend={handleSend}
                onClearAll={clearAllStorage}
                isLoading={isLoading}
                isOnline={isOnline}
              />
            )}
          </div>

          {/* Navegación */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={currentStep === 0 ? onClose : prevStep}
              disabled={isLoading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {currentStep === 0 ? 'Cancelar' : 'Anterior'}
            </Button>

            <div className="flex gap-2">
              {currentStep === 0 && (
                <Button
                  onClick={nextStep}
                  disabled={!canProceedToStep2 || isLoading}
                >
                  Siguiente
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}

              {currentStep === 1 && (
                <Button
                  onClick={nextStep}
                  disabled={!canProceedToStep3 || isLoading}
                >
                  Continuar a Resumen
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <ExpirationAlertModal
        isOpen={expirationAlertOpen}
        onClose={() => {}} // Se maneja en las funciones originales
        packages={expiringPackages}
        currentIndex={currentExpiringIndex}
        onNext={() => {}} // Se maneja en las funciones originales
        onPrevious={() => {}} // Se maneja en las funciones originales
      />
    </div>
  );
}