"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Trash2, Send, Scan, MapPinIcon, MapPin, User, Phone, DollarSignIcon, BanknoteIcon, Package, ClipboardPasteIcon, FileText, CircleAlertIcon, GemIcon, Loader2, Search, Filter, ChevronDown, ChevronUp, X, Download } from "lucide-react";
import { RepartidorSelector } from "../selectors/repartidor-selector";
import { RutaSelector } from "../selectors/ruta-selector";
import { UnidadSelector } from "../selectors/unidad-selector";
import { DispatchFormData, Driver, PackageDispatch, PackageInfo, Priority, Route, Vehicles } from "@/lib/types";
import { savePackageDispatch, uploadPDFile, validateTrackingNumber } from "@/lib/services/package-dispatchs";
import { useAuthStore } from "@/store/auth.store";
import { pdf } from '@react-pdf/renderer';
import { Input } from "../ui/input";
import { BarcodeScannerInput } from "../barcode-scanner-input";
import { generateDispatchExcelClient } from "@/lib/services/package-dispatch/package-dispatch-excel-generator";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { FedExPackageDispatchPDF } from "@/lib/services/package-dispatch/package-dispatch-pdf-generator";

type Props = {
  selectedSubsidiaryId: string | null;
  subsidiaryName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const VALIDATION_REGEX = /^\d{12}$/;

const formatMexicanPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+52 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('52')) {
    return `+52 (${cleaned.slice(2, 5)}) ${cleaned.slice(5, 8)}-${cleaned.slice(8)}`;
  }
  if (cleaned.length === 13 && cleaned.startsWith('521')) {
    return `+52 (${cleaned.slice(3, 6)}) ${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
  }
  return phone;
};

// Componente auxiliar para mostrar cada paquete
const PackageItem = ({ 
  pkg, 
  onRemove, 
  isLoading 
}: {
  pkg: PackageInfo;
  onRemove: (trackingNumber: string) => void;
  isLoading: boolean;
}) => {
  return (
    <div className="p-3 hover:bg-muted/20 transition-colors border-b">
      <div className="flex justify-between items-start gap-3">
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
            
            {pkg.isHighValue && (
              <Badge className="bg-violet-600 text-xs">
                <GemIcon className="h-3 w-3 mr-1" />
              </Badge>
            )}
            
            {pkg.payment && (
              <Badge className="bg-blue-600 text-xs">
                <BanknoteIcon className="h-3 w-3 mr-1" />
                A COBRAR: {pkg.payment.type} ${pkg.payment.amount}
              </Badge>
            )}
          </div>
          
          {pkg.isValid && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
              {pkg.recipientAddress && (
                <div className="flex items-start gap-1">
                  <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-1 text-xs">{pkg.recipientAddress}</span>
                </div>
              )}
              {pkg.recipientName && (
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span className="text-xs">{pkg.recipientName}</span>
                </div>
              )}
              {pkg.recipientPhone && (
                <div className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  <span className="text-xs">{formatMexicanPhoneNumber(pkg.recipientPhone)}</span>
                </div>
              )}
            </div>
          )}
          
          {!pkg.isValid && (
            <div className="flex items-center gap-1 text-sm text-destructive">
              <AlertCircle className="w-3 h-3" />
              <span className="text-xs">{pkg.reason}</span>
            </div>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(pkg.trackingNumber)}
          disabled={isLoading}
          className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 size={12} />
        </Button>
      </div>
    </div>
  );
};

const PackageDispatchForm: React.FC<Props> = ({
  selectedSubsidiaryId: propSubsidiaryId,
  subsidiaryName: propSubsidiaryName,
  onClose,
  onSuccess,
}) => {
  // Estados del formulario con persistencia
  const [selectedRepartidores, setSelectedRepartidores] = useLocalStorage<Driver[]>(
    'dispatch_repartidores', 
    []
  );
  const [selectedRutas, setSelectedRutas] = useLocalStorage<Route[]>(
    'dispatch_rutas', 
    []
  );
  const [selectedUnidad, setSelectedUnidad] = useLocalStorage<Vehicles | undefined>(
    'dispatch_unidad', 
    undefined
  );
  const [selectedKms, setSelectedKms] = useLocalStorage<string>(
    'dispatch_kms', 
    ""
  );
  const [packages, setPackages] = useLocalStorage<PackageInfo[]>(
    'dispatch_packages', 
    []
  );
  const [invalidNumbers, setInvalidNumbers] = useLocalStorage<string[]>(
    'dispatch_invalid_numbers', 
    []
  );
  const [trackingNumbersRaw, setTrackingNumbersRaw] = useLocalStorage<string>(
    'dispatch_tracking_raw', 
    ""
  );

  // Estados de UI
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  const user = useAuthStore((s) => s.user);
  const { toast } = useToast();

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

  const validatePackageForDispatch = async (trackingNumber: string): Promise<PackageInfo> => {
    console.log("🚀 ~ validatePackageForDispatch ~ trackingNumber:", trackingNumber)
    try {
      const shipment = await validateTrackingNumber(trackingNumber, selectedSubsidiaryId);
      console.log("🚀 ~ validatePackageForDispatch ~ shipment:", shipment)
      return shipment;
    } catch (error) {
      console.warn("Error validando paquete, modo offline:", error);
      return {
        id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        trackingNumber,
        isValid: false,
        reason: "Sin conexión - validar cuando se restablezca internet",
        isOffline: true,
        createdAt: new Date(),
      } as PackageInfo;
    }
  };

  const handleValidatePackages = async () => {
    if (!selectedSubsidiaryId) {
      toast({
        title: "Error",
        description: "No se pudo determinar la sucursal. Por favor, selecciona una sucursal.",
        variant: "destructive",
      });
      return;
    }

    const lines = trackingNumbersRaw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
      
    console.log("🚀 ~ handleValidatePackages ~ lines:", lines)

    const uniqueLines = Array.from(new Set(lines));
    const validNumbers = uniqueLines.filter((tn) => VALIDATION_REGEX.test(tn));
    const invalids = uniqueLines.filter((tn) => !VALIDATION_REGEX.test(tn));

    if (validNumbers.length === 0) {
      toast({
        title: "Error",
        description: "No se ingresaron números válidos.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setProgress(0);

    const results: PackageInfo[] = [];
    for (let i = 0; i < validNumbers.length; i++) {
      const tn = validNumbers[i];
      const info = await validatePackageForDispatch(tn);
      results.push(info);
      setProgress(Math.round(((i + 1) / validNumbers.length) * 100));
    }

    const newPackages = results.filter((r) => !packages.some((p) => p.trackingNumber === r.trackingNumber));

    setPackages((prev) => [...prev, ...newPackages]);
    setInvalidNumbers(invalids);
    setTrackingNumbersRaw("");
    setProgress(0);
    setIsLoading(false);

    const validCount = newPackages.filter((p) => p.isValid).length;
    const invalidCount = newPackages.filter((p) => !p.isValid).length;

    toast({
      title: "Validación completada",
      description: `Se agregaron ${validCount} paquetes válidos. Paquetes inválidos: ${invalidCount + invalids.length}`,
    });
  };

  const handleRemovePackage = useCallback((trackingNumber: string) => {
    setPackages((prev) => prev.filter((p) => p.trackingNumber !== trackingNumber));
  }, [setPackages]);

  // Función para limpiar TODO el almacenamiento
  const clearAllStorage = useCallback(() => {
    const keys = [
      'dispatch_repartidores',
      'dispatch_rutas',
      'dispatch_unidad',
      'dispatch_kms',
      'dispatch_packages',
      'dispatch_invalid_numbers',
      'dispatch_tracking_raw'
    ];

    keys.forEach(key => {
      try {
        window.localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Error clearing ${key}:`, error);
      }
    });

    // Resetear estados
    setSelectedRepartidores([]);
    setSelectedRutas([]);
    setSelectedUnidad(undefined);
    setSelectedKms("");
    setPackages([]);
    setInvalidNumbers([]);
    setTrackingNumbersRaw("");

    toast({
      title: "Datos limpiados",
      description: "Todos los datos locales han sido eliminados.",
    });
  }, [
    setSelectedRepartidores,
    setSelectedRutas,
    setSelectedUnidad,
    setSelectedKms,
    setPackages,
    setInvalidNumbers,
    setTrackingNumbersRaw
  ]);

  const handleDispatch = async () => {
    if (!selectedSubsidiaryId) {
      toast({
        title: "Sucursal no seleccionada",
        description: "No se pudo determinar la sucursal. Por favor, selecciona una sucursal antes de procesar.",
        variant: "destructive",
      });
      return;
    }

    if (selectedRepartidores.length === 0) {
      toast({
        title: "Repartidores no seleccionados",
        description: "Por favor selecciona al menos un repartidor.",
        variant: "destructive",
      });
      return;
    }

    if (selectedRutas.length === 0) {
      toast({
        title: "Rutas no seleccionadas",
        description: "Por favor selecciona al menos una ruta.",
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

    if (!selectedKms) {
      toast({
        title: "Kilometraje requerido",
        description: "Por favor ingresa el kilometraje actual de la unidad.",
        variant: "destructive",
      });
      return;
    }

    const validPackages = packages.filter((p) => p.isValid === true);

    if (validPackages.length === 0) {
      toast({
        title: "No hay paquetes válidos",
        description: "No hay paquetes válidos para procesar la salida.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setProgress(0);

    try {
      const dispatchData: DispatchFormData = {
        drivers: selectedRepartidores,
        routes: selectedRutas,
        vehicle: selectedUnidad,
        shipments: validPackages.map((p) => p.id),
        subsidiary: { 
          id: selectedSubsidiaryId, 
          name: selectedSubsidiaryName || "Unknown" 
        },
        kms: selectedKms
      };

      const dispatchResponse = await savePackageDispatch(dispatchData);
      await handleSendEmail(dispatchResponse);

      // Limpiar storage después de éxito
      clearAllStorage();

      toast({
        title: "Salida procesada exitosamente",
        description: `Se procesaron ${validPackages.length} paquetes para salida y se subió el PDF.`,
      });

      onSuccess();
    } catch (error) {
      console.error("Error in handleDispatch:", error);
      toast({
        title: "Error al procesar salida",
        description: "Hubo un problema al procesar la salida de paquetes.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePdfCreate = async () => {
    try {
      setIsLoading(true);
      const validPackages = packages.filter((p) => p.isValid);
      const invalidPackages = packages.filter((p) => !p.isValid).map(p => p.trackingNumber);

      const blob = await pdf(
        <FedExPackageDispatchPDF
          key={Date.now()}
          drivers={selectedRepartidores}
          routes={selectedRutas}
          vehicle={selectedUnidad}
          invalidTrackings={invalidPackages}
          packages={validPackages}
          subsidiaryName={selectedSubsidiaryName}
          trackingNumber="123456789"
        />
      ).toBlob();

      const blobUrl = URL.createObjectURL(blob) + `#${Date.now()}`;
      window.open(blobUrl, '_blank');
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "No se pudo generar el PDF.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendEmail = async (packageDispatch: PackageDispatch) => {
    try {
      const validPackages = packages.filter((p) => p.isValid);
      const invalidPackages = packages.filter((p) => !p.isValid).map(p => p.trackingNumber);

      const blob = await pdf(
        <FedExPackageDispatchPDF
          key={Date.now()}
          drivers={selectedRepartidores}
          routes={selectedRutas}
          vehicle={selectedUnidad}
          invalidTrackings={invalidPackages}
          packages={validPackages}
          subsidiaryName={packageDispatch.subsidiary?.name}
          trackingNumber={packageDispatch.trackingNumber}
        />
      ).toBlob();

      const blobUrl = URL.createObjectURL(blob) + `#${Date.now()}`;
      window.open(blobUrl, '_blank');

      const currentDate = new Date().toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      packageDispatch.shipments = validPackages;

      const fileName = `${packageDispatch?.drivers[0]?.name.toUpperCase()}--${packageDispatch.subsidiary?.name}--Salida a Ruta--${currentDate.replace(/\//g, "-")}.pdf`;
      const pdfFile = new File([blob], fileName, { type: 'application/pdf' });

      const excelBuffer = await generateDispatchExcelClient(
        packageDispatch, 
        invalidPackages,
        false);

      const excelBlob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const excelFileName = `${packageDispatch?.drivers[0]?.name.toUpperCase()}--${packageDispatch?.subsidiary?.name}--Salida a Ruta--${currentDate.replace(/\//g, "-")}.xlsx`;
      const excelFile = new File([excelBlob], excelFileName, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const onProgress = (percent: number) => {
        console.log(`Upload progress: ${percent}%`);
      };

      await uploadPDFile(pdfFile, excelFile, packageDispatch.subsidiary?.name, packageDispatch.id, onProgress);

      toast({
        title: 'Éxito',
        description: `El archivo ${fileName} se ha subido correctamente.`,
      });
    } catch (error) {
      console.error('Error in handleSendEmail:', error);
      toast({
        title: 'Error',
        description: 'No se pudo subir el archivo PDF.',
        variant: 'destructive',
      });
    }
  };

  // Revalidar paquetes offline cuando se recupera conexión
  useEffect(() => {
    if (isOnline) {
      const offlinePackages = packages.filter(pkg => pkg.isOffline);
      if (offlinePackages.length > 0 && selectedSubsidiaryId) {
        toast({
          title: "Revalidando paquetes",
          description: `Revalidando ${offlinePackages.length} paquetes creados offline...`,
        });
        
        offlinePackages.forEach(async (pkg) => {
          try {
            const validated = await validateTrackingNumber(pkg.trackingNumber, selectedSubsidiaryId);
            setPackages(prev => prev.map(prevPkg => 
              prevPkg.trackingNumber === pkg.trackingNumber ? validated : prevPkg
            ));
          } catch (error) {
            console.error("Error revalidando paquete offline:", error);
          }
        });
      }
    }
  }, [isOnline, packages, selectedSubsidiaryId, setPackages, toast]);

  const validPackages = packages.filter((p) => p.isValid);
  const invalidPackages = packages.filter((p) => !p.isValid);
  const canDispatch = selectedRepartidores.length > 0 && selectedRutas.length > 0 && selectedUnidad && validPackages.length > 0 && selectedKms;

  // Filtrado de paquetes
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
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* TabHeader */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 bg-muted rounded-lg border">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary text-primary-foreground">
              <ClipboardPasteIcon className="h-6 w-6" />
            </div>
            Salida de Paquetes
            {!isOnline && (
              <Badge variant="outline" className="ml-2 bg-yellow-100 text-yellow-800">
                ⚡ Modo offline
              </Badge>
            )}
            {packages.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {validPackages.length} válidos / {packages.length} total
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">
            {isOnline 
              ? "Procesa la salida de paquetes para reparto en ruta" 
              : "Trabajando en modo offline - los datos se guardan localmente"
            }
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-primary-foreground bg-primary px-3 py-1.5 rounded-full">
            <MapPinIcon className="h-4 w-4" />
            <span>Sucursal: {selectedSubsidiaryName}</span>
          </div>
          
          {(packages.length > 0 || selectedRepartidores.length > 0) && (
            <div className="flex gap-2">
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
              
              {!isOnline && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="bg-blue-100 text-blue-800 cursor-help">
                        💾 Datos locales
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Los datos se guardan en tu navegador</p>
                      <p>Se mantendrán aunque cierres la página</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mensaje de advertencia cuando está offline */}
      {!isOnline && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <div>
              <h3 className="font-medium text-yellow-800">Modo offline</h3>
              <p className="text-yellow-700 text-sm">
                Estás trabajando sin conexión. Los datos se guardan localmente y 
                se sincronizarán cuando recuperes la conexión.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Configuration */}
        <div className="xl:col-span-1 space-y-6">
          {/* Team Configuration Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Repartidores y Rutas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label>Repartidores</Label>
                <RepartidorSelector
                  selectedRepartidores={selectedRepartidores}
                  onSelectionChange={setSelectedRepartidores}
                  disabled={isLoading}
                />
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <Label>Rutas</Label>
                <RutaSelector selectedRutas={selectedRutas} onSelectionChange={setSelectedRutas} disabled={isLoading} />
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Configuration Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Unidad y Kilometraje
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label>Unidad de Transporte</Label>
                <UnidadSelector
                  selectedUnidad={selectedUnidad}
                  onSelectionChange={setSelectedUnidad}
                  disabled={isLoading}
                />
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <Label>Kilometraje Actual</Label>
                <Input 
                  type="text" 
                  value={selectedKms}
                  onChange={(e) => setSelectedKms(e.target.value)}
                  placeholder="Ingresa el kilometraje"
                  disabled={isLoading}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>

          {/* Package Scanning Card */}
          <Card>
            <CardHeader className="">
              <CardTitle className="flex items-center gap-2">
                <Scan className="h-5 w-5" />
                Escaneo de Paquetes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <BarcodeScannerInput
                  label="" 
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
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              <Button 
                onClick={handleValidatePackages} 
                disabled={isLoading || !selectedSubsidiaryId || !trackingNumbersRaw} 
                className="w-full gap-2"
                variant="outline"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Scan className="h-4 w-4" />
                )}
                {isLoading ? "Validando..." : "Validar Paquetes"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Packages List */}
        <div className="xl:col-span-2 space-y-2">
          {/* Packages Summary Card */}
          <Card>
            <CardHeader className="">
              <div className="flex flex-col gap-4">
                {/* Título */}
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Paquetes Validados
                </CardTitle>

                {/* Simbología */}
                <div className="flex flex-col items-end gap-2 text-xs text-muted-foreground">
                  <span className="font-medium">Simbología:</span>

                  <div className="flex flex-row flex-wrap justify-end gap-3">
                    <div className="flex items-center gap-1">
                      <CircleAlertIcon className="h-3 w-3 text-destructive" />
                      <span>No Válido</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Badge className="h-4 text-white bg-green-600">CARGA/F2/31.5</Badge>
                    </div>

                    <div className="flex items-center gap-1">
                      <Badge className="h-4 bg-violet-600">
                        <GemIcon className="h-3 w-3" />
                      </Badge>
                      <span>Alto Valor</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Badge className="h-4 bg-blue-600">
                        <BanknoteIcon className="h-3 w-3" />
                        <span className="text-white">A COBRAR</span>
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-2">
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por tracking, destinatario o dirección..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Collapsible className="w-full sm:w-auto">
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Filter className="h-4 w-4" />
                      Filtros
                      {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 mt-3 p-4 bg-muted rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Prioridad</Label>
                        <select 
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={filterPriority}
                          onChange={(e) => setFilterPriority(e.target.value)}
                        >
                          <option value="all">Todas las prioridades</option>
                          <option value="alta">Alta</option>
                          <option value="media">Media</option>
                          <option value="baja">Baja</option>
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm">Tipo de paquete</Label>
                        <select 
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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

              {/* Packages Tabs */}
              {packages.length > 0 && (
                <Tabs defaultValue="validos" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="validos" className="flex items-center gap-2">
                      <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                      Válidos ({validPackages.length})
                    </TabsTrigger>
                    <TabsTrigger value="invalidos" className="flex items-center gap-2">
                      <span className="h-2 w-2 bg-destructive rounded-full"></span>
                      Inválidos ({invalidPackages.length})
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="validos" className="space-y-3 mt-4">
                    {filteredValidPackages.length > 0 ? (
                      <ScrollArea className="h-[400px] rounded-md border">
                        <div className="grid grid-cols-1 divide-y">
                          {filteredValidPackages.map((pkg) => (
                            <PackageItem 
                              key={pkg.trackingNumber} 
                              pkg={pkg} 
                              onRemove={handleRemovePackage}
                              isLoading={isLoading}
                            />
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground border rounded-md">
                        <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                        <p>No se encontraron paquetes con los filtros aplicados</p>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="invalidos" className="mt-4">
                    {invalidPackages.length > 0 ? (
                      <ScrollArea className="h-[300px] rounded-md border">
                        <div className="grid grid-cols-1 divide-y">
                          {invalidPackages.map((pkg) => (
                            <PackageItem 
                              key={pkg.trackingNumber} 
                              pkg={pkg} 
                              onRemove={handleRemovePackage}
                              isLoading={isLoading}
                            />
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground border rounded-md">
                        <p>No hay paquetes inválidos</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}

              {/* Empty State */}
              {packages.length === 0 && (
                <div className="text-center py-16 border-2 border-dashed border-muted rounded-lg">
                  <Package className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">Sin paquetes escaneados</h3>
                  <p className="text-muted-foreground">Escanea algunos paquetes para comenzar</p>
                </div>
              )}

              {/* Summary Stats */}
              {packages.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{validPackages.length}</div>
                    <div className="text-sm text-muted-foreground">Válidos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-destructive">{invalidPackages.length}</div>
                    <div className="text-sm text-muted-foreground">Inválidos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{selectedRepartidores.length}</div>
                    <div className="text-sm text-muted-foreground">Repartidores</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{selectedRutas.length}</div>
                    <div className="text-sm text-muted-foreground">Rutas</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center p-6 bg-muted rounded-lg border">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Cancelar
            </Button>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={handlePdfCreate} 
                disabled={isLoading || validPackages.length === 0} 
                variant="outline"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Solo generar PDF
              </Button>
              
              <Button
                onClick={handleDispatch}
                disabled={isLoading || !canDispatch}
                className="gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Procesar salida
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackageDispatchForm;