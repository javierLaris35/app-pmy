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
import { BarcodeScannerInput } from "@/components/barcode-scanner-input";
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
import {ExpirationAlertModal, ExpiringPackage} from "@/components/ExpirationAlertModal";

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
                  <Phone className="w-4 h-4" />
                  <span className="text-xs">{formatMexicanPhoneNumber(pkg.recipientPhone)}</span>
                </div>
              )}
            </div>
          )}
          
          {!pkg.isValid && (
            <div className="flex items-center gap-1 text-sm text-destructive">
              <AlertCircle className="w-4 h-4" />
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

// Componente principal
export default function UnloadingForm({ onClose, onSuccess }: Props) {
  const [selectedUnidad, setSelectedUnidad] = useState<Vehicles | null>(null);
  const [trackingNumbersRaw, setTrackingNumbersRaw] = useState("");
  const [shipments, setShipments] = useState<PackageInfoForUnloading[]>([]);
  const [missingTrackings, setMissingTrackings] = useState<string[]>([]);
  const [unScannedTrackings, setUnScannedTrackings] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedSubsidiaryId, setSelectedSubsidiaryId] = useState<string | null>(null);
  const [selectedSubsidiaryName, setSelectedSubsidiaryName] = useState<string | null>(null);
  const [savedUnload, setSavedUnloading] = useState<Unloading | null>(null);
  const [selectedReasons, setSelectedReasons] = useState<Record<string, string>>({});
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [consolidatedValidation, setConsolidatedValidation] = useState<Consolidateds>()
  const [lastValidated, setLastValidated] = useState(""); // almacena el último string validado

  const [expirationAlertOpen, setExpirationAlertOpen] = useState(false);
  const [expiringPackages, setExpiringPackages] = useState<ExpiringPackage[]>([]);
  const [currentExpiringIndex, setCurrentExpiringIndex] = useState(0);



  const [isValidationPackages, setIsValidationPackages] = useState(false);

  // Definir el tipo del ref
  type BarcodeScannerInputHandle = React.ElementRef<typeof BarcodeScannerInput>;

// Dentro de tu componente:
  const barScannerInputRef = useRef<BarcodeScannerInputHandle>(null);


  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!trackingNumbersRaw || isLoading || !selectedSubsidiaryId) return;

    // Si ya validamos este input, no hacer nada
    if (trackingNumbersRaw === lastValidated) return;

    const handler = setTimeout(() => {
      handleValidatePackages();
      setLastValidated(trackingNumbersRaw); // marcamos que ya validamos
    }, 500);

    return () => clearTimeout(handler);
  }, [trackingNumbersRaw, selectedSubsidiaryId, isLoading, lastValidated]);

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

  // Función para simular el ENTER que envía un escáner real
  const simulateScannerEnter = (inputElement: HTMLTextAreaElement | null) => {
    if (!inputElement) return;

    // Crear y disparar un evento keydown de ENTER
    const enterKeyEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true
    });

    inputElement.dispatchEvent(enterKeyEvent);

    // También disparar un evento keyup
    const enterKeyUpEvent = new KeyboardEvent('keyup', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true
    });

    inputElement.dispatchEvent(enterKeyUpEvent);

    // Y un evento input para asegurar que se procese
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

// Función para verificar si un paquete está próximo a vencer (HOY)
  const checkPackageExpiration = useCallback((pkg: PackageInfoForUnloading) => {
    if (!pkg.commitDateTime) return false;

    const commitDate = new Date(pkg.commitDateTime);
    const today = new Date();
    // Reset hours for accurate day comparison
    today.setHours(0, 0, 0, 0);
    commitDate.setHours(0, 0, 0, 0);

    const timeDiff = commitDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    // Mostrar alerta solo si el paquete vence hoy (días restantes = 0)
    return daysDiff === 0;
  }, []);

// Función para calcular días hasta vencimiento
  const getDaysUntilExpiration = useCallback((commitDateTime: string) => {
    const commitDate = new Date(commitDateTime);
    const today = new Date();
    // Reset hours for accurate day comparison
    today.setHours(0, 0, 0, 0);
    commitDate.setHours(0, 0, 0, 0);

    const timeDiff = commitDate.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }, []);

// Función para manejar el siguiente paquete en la alerta
  const handleNextExpiring = useCallback(() => {
    const packagesDueToday = expiringPackages.filter(pkg => pkg.daysUntilExpiration === 0);
    if (currentExpiringIndex < packagesDueToday.length - 1) {
      setCurrentExpiringIndex(prev => prev + 1);
    } else {
      setExpirationAlertOpen(false);
      setCurrentExpiringIndex(0);

      // Recuperar el foco en el input de texto después de cerrar la modal
      setTimeout(() => {
        if (barScannerInputRef.current) {
          barScannerInputRef.current.focus();

          // Simular ENTER para preparar el escáner para la siguiente lectura
          try {
            const inputElement = barScannerInputRef.current.getInputElement();
            if (inputElement) {
              inputElement.setSelectionRange(
                  inputElement.value.length,
                  inputElement.value.length
              );
              // Simular el ENTER completo
              simulateScannerEnter(inputElement);
            }
          } catch (e) {
            console.log("No se pudo ajustar el campo de entrada:", e);
          }
        }
      }, 100);
    }
  }, [currentExpiringIndex, expiringPackages]);

  // Función para manejar el paquete anterior en la alerta
  const handlePreviousExpiring = useCallback(() => {
    if (currentExpiringIndex > 0) {
      setCurrentExpiringIndex(prev => prev - 1);
    }
  }, [currentExpiringIndex]);

  const handleValidatePackages = async () => {
    // Verificar si ya estamos validando para evitar duplicados
    if (isLoading || isValidationPackages) return;

    // Check Focus
    setIsValidationPackages(true);
    if (!selectedSubsidiaryId) {
      toast({
        title: "Error",
        description: "Selecciona una sucursal antes de validar.",
        variant: "destructive",
      });
      setIsValidationPackages(false);
      return;
    }

    const lines = trackingNumbersRaw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

    const uniqueLines = Array.from(new Set(lines));
    const validNumbers = uniqueLines.filter((tn) => /^\d{12}$/.test(tn));
    const invalidNumbers = uniqueLines.filter((tn) => !/^\d{12}$/.test(tn));

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

      const newShipments = result.validatedShipments.filter(
          (r) => !shipments.some((p) => p.trackingNumber === r.trackingNumber)
      );

      setShipments((prev) => [...prev, ...newShipments]);
      setMissingTrackings(invalidNumbers);
      setUnScannedTrackings([]);
      // Mantenemos el historial: NO limpiamos trackingNumbersRaw
      setConsolidatedValidation(result.consolidateds);

      // VERIFICAR PAQUETES QUE VENCEN HOY - ESTA ES LA PARTE QUE FALTA
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

      // ACTUALIZAR ESTADO Y MOSTRAR MODAL SI HAY PAQUETES QUE VENCEN HOY
      if (todayExpiringPackages.length > 0) {
        setExpiringPackages(todayExpiringPackages);
        setCurrentExpiringIndex(0);
        setExpirationAlertOpen(true);
      }

      const validCount = newShipments.filter((p) => p.isValid).length;
      const invalidCount = newShipments.filter((p) => !p.isValid).length;

      toast({
        title: "Validación completada",
        description: `Se agregaron ${validCount} paquetes válidos. Paquetes inválidos: ${
            invalidCount + invalidNumbers.length
        }`,
      });
    } catch (error) {
      console.error("Error validating packages:", error);
      toast({
        title: "Error",
        description: "Hubo un problema al validar los paquetes.",
        variant: "destructive",
      });
    } finally {
      setIsValidationPackages(false);
      setProgress(0);
      setIsLoading(false);

      // Restaurar el focus pero mantener el contenido
      setTimeout(() => {
        if (barScannerInputRef.current) {
          barScannerInputRef.current.focus();

          // Para simular el ENTER que enviaría un escáner real:
          try {
            const inputElement = barScannerInputRef.current.getInputElement();
            if (inputElement) {
              // Mantener el valor actual pero colocar el cursor al final
              inputElement.setSelectionRange(
                  inputElement.value.length,
                  inputElement.value.length
              );

              // Algunos escáneres envían un Enter después del código
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
  }, []);

  const handleSendEmail = async (unloadingSaved: Unloading) => {
    const blob = await pdf(
      <UnloadingPDFReport
        key={Date.now()}
        vehicle={selectedUnidad}
        packages={validShipments}
        missingPackages={missingTrackings}
        unScannedPackages={unScannedTrackings}
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
        missingTrackings,
        unScannedTrackings,
        date: new Date().toISOString(),
      };

      const newUnloading = await saveUnloading(unloadingData);
      setSavedUnloading(newUnloading);

      await handleSendEmail(newUnloading);

      toast({
        title: "Descarga procesada exitosamente",
        description: `Se procesaron ${validShipments.length} paquetes para descarga.`,
      });

      setSelectedUnidad(null);
      setShipments([]);
      setMissingTrackings([]);
      setUnScannedTrackings([]);
      setTrackingNumbersRaw("");
      setProgress(0);
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

  // Filtrado de paquetes
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
              <div
                  className="flex items-center gap-2 text-sm text-primary-foreground bg-primary px-3 py-1.5 rounded-full">
                <MapPinIcon className="h-4 w-4"/>
                <span>Sucursal: {selectedSubsidiaryName}</span>
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
                  <ConsolidateDetails consolidatedData={consolidatedValidation}/>
                </div>
              </div>

              {/* Sección de escaneo */}
              <div className="space-y-4 p-4 bg-muted/20 rounded-lg">
                <div className="space-y-2">
                  <BarcodeScannerInput
                      ref={barScannerInputRef}
                      onTrackingNumbersChange={(rawString) => setTrackingNumbersRaw(rawString)}
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

                    <TabsContent value="sin-escaneo" className="mt-4">
                      {unScannedTrackings.length > 0 ? (
                          <ScrollArea className="h-[300px] rounded-md border p-4">
                            <ul className="space-y-2">
                              {unScannedTrackings.map(tracking => (
                                  <li key={tracking}
                                      className="flex justify-between items-center py-2 px-3 rounded-md bg-amber-50">
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
                                  <li key={tracking}
                                      className="flex justify-between items-center py-2 px-3 rounded-md bg-red-50">
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

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                    onClick={handleValidatePackages}
                    disabled={isLoading || !selectedSubsidiaryId}
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