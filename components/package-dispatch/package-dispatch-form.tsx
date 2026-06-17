"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Trash2, Send, Scan, MapPin, User, Phone, BanknoteIcon, Package, ClipboardPasteIcon, CircleAlertIcon, GemIcon, Loader2, Search, X, Download, Clock } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { FedExPackageDispatchPDF } from "@/lib/services/package-dispatch/package-dispatch-pdf-generator";
import { normalizeScannedCode, isValidScannedCode } from "@/lib/tracking/normalize-scan";
import { cn } from "@/lib/utils";
import { compareByZip } from "@/lib/tracking/sort-by-zip";
import { OperationHeader } from "@/components/shared/operation-header";
import { StatBar } from "@/components/shared/stat-bar";
import { PackagesPanelHeader } from "@/components/shared/packages-panel-header";
import { PackageFilters } from "@/components/shared/package-filters";
import { PackageListItem, daysUntilCommit } from "@/components/shared/package-list-item";
import { TransferPackageDialog } from "@/components/shared/transfer-package-dialog";
import {
  initScannerFeedback,
  playExpiresTodaySound,
  playExpiresTomorrowSound,
  playNotFoundSound,
  playInvalidSound,
} from "@/lib/scanner-feedback";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSubsidiaryId: string | null;
  subsidiaryName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

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

// Señal visual de "vence hoy" (fecha local del navegador).
const isExpiringTodayLocal = (commitDateTime?: string | null): boolean => {
  if (!commitDateTime) return false;
  const d = new Date(commitDateTime);
  const t = new Date();
  return (
    d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() &&
    d.getDate() === t.getDate()
  );
};


const PackageDispatchForm: React.FC<Props> = ({
  open,
  onOpenChange,
  selectedSubsidiaryId: propSubsidiaryId,
  subsidiaryName: propSubsidiaryName,
  onClose,
  onSuccess,
}) => {
  useEffect(() => {
    // Limpiar valores corruptos del localStorage
    const cleanCorruptedStorage = () => {
      try {
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
          const value = localStorage.getItem(key);
          if (value === "undefined" || value === "null") {
            console.log(`[PackageDispatchForm] Limpiando valor corrupto para clave: ${key}`);
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.warn("Error limpiando localStorage corrupto:", error);
      }
    };

    cleanCorruptedStorage();
  }, []);

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
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCarrier, setFilterCarrier] = useState<string>("all");
  const [onlyToday, setOnlyToday] = useState(false);
  const [onlyPayment, setOnlyPayment] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  const user = useAuthStore((s) => s.user);
  const { toast } = useToast();

  // Traspaso inline (corregir paquete mal enrutado) — solo roles elevados.
  const canTransfer = ["subadmin", "admin", "superadmin"].includes((user?.role as string) || "");
  const [transferPkg, setTransferPkg] = useState<PackageInfo | null>(null);

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

    // Prepara el feedback sonoro y enlaza el desbloqueo por gesto (autoplay policy).
    initScannerFeedback();

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
    // 1. Limpiar input inmediatamente
    const rawData = trackingNumbersRaw;
    setTrackingNumbersRaw(""); 

    if (!selectedSubsidiaryId || !rawData.trim()) return;

    const lines = rawData.split("\n").map(l => l.trim()).filter(Boolean);

    // Normalizamos cada línea y clasificamos por paquetería (FedEx/DHL).
    // Es idempotente: aunque el escáner ya normalizó, esto cubre el pegado/tecleo manual.
    const validCodes = new Set<string>();
    const invalids: string[] = [];

    for (const line of lines) {
      const normalized = normalizeScannedCode(line);
      if (isValidScannedCode(normalized)) {
        validCodes.add(normalized.code); // dedupe por código final
      } else {
        invalids.push(line);
      }
    }

    const validNumbers = Array.from(validCodes);

    if (validNumbers.length === 0) {
      setInvalidNumbers(Array.from(new Set(invalids)));
      return;
    }

    setIsLoading(true);
    setProgress(0);

    const results: PackageInfo[] = [];
    for (let i = 0; i < validNumbers.length; i++) {
      // validatePackageForDispatch ya debe llamar a tu servicio con la lógica de variante
      const info = await validatePackageForDispatch(validNumbers[i]);
      results.push(info);
      setProgress(Math.round(((i + 1) / validNumbers.length) * 100));
    }

    // 2. FILTRADO ÚNICO Y CORRECTO
    setPackages((prev) => {
      // Filtramos los resultados nuevos contra lo que ya existe
      const newItems = results.filter((r) => {
        // Usamos dhlUniqueId si existe (DHL), si no, el trackingNumber (FedEx/Otros)
        const rId = (r as any).dhlUniqueId || r.trackingNumber;
        
        // Verificamos si este ID ya existe en el estado previo
        const exists = prev.some((p) => {
          const pId = (p as any).dhlUniqueId || p.trackingNumber;
          return pId === rId;
        });
        
        return !exists;
      });
      
      return [...prev, ...newItems];
    });

    // 3. Eliminamos el segundo setPackages que estaba duplicando todo
    setInvalidNumbers(Array.from(new Set(invalids)));
    setProgress(0);
    setIsLoading(false);

    // Feedback sonoro estandarizado (mismo que inventario/desembarque).
    const validResults = results.filter(r => r.isValid);
    if (validResults.some(r => daysUntilCommit(r.commitDateTime) === 0)) {
      playExpiresTodaySound();
    } else if (validResults.some(r => daysUntilCommit(r.commitDateTime) === 1)) {
      playExpiresTomorrowSound();
    }
    if (invalids.length > 0) {
      playInvalidSound();
    } else if (results.some(r => !r.isValid)) {
      playNotFoundSound();
    }

    toast({
      title: "Validación completada",
      description: `Se agregaron ${results.length} paquetes.`,
    });
  };

  const handleRemovePackage = useCallback((identifier: string) => {
    setPackages((prev) => prev.filter((p) => {
      const pId = (p as any).dhlUniqueId || p.trackingNumber;
      return pId !== identifier;
    }));
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

    // Usar Promise.all para limpiar de forma más robusta
    const cleanupPromises = keys.map(key => {
      return new Promise<void>((resolve) => {
        try {
          localStorage.removeItem(key);
          resolve();
        } catch (error) {
          console.warn(`Error clearing ${key}:`, error);
          resolve();
        }
      });
    });

    Promise.all(cleanupPromises).then(() => {
      // Resetear estados de forma segura
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
        shipments: validPackages.map((p) => p.id).filter(Boolean),
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
    // Solo ejecutamos si hay conexión y hay paquetes offline
    const offlinePackages = packages.filter(pkg => pkg.isOffline);
    
    if (isOnline && offlinePackages.length > 0 && selectedSubsidiaryId) {
      toast({
        title: "Revalidando paquetes",
        description: `Revalidando ${offlinePackages.length} paquetes...`,
      });
      
      // Procesamos la revalidación
      offlinePackages.forEach(async (pkg) => {
        try {
          const validated = await validateTrackingNumber(pkg.trackingNumber, selectedSubsidiaryId);
          
          // Actualizamos el estado asegurándonos de que ya no tenga isOffline
          setPackages(prev => prev.map(prevPkg => 
            prevPkg.trackingNumber === pkg.trackingNumber ? validated : prevPkg
          ));
        } catch (error) {
          console.error("Error revalidando paquete offline:", error);
        }
      });
    }
  }, [isOnline, selectedSubsidiaryId]);

  const validPackages = packages.filter((p) => p.isValid);
  const invalidPackages = packages.filter((p) => !p.isValid);
  const canDispatch = selectedRepartidores.length > 0 && selectedRutas.length > 0 && selectedUnidad && validPackages.length > 0 && selectedKms;

  // Resumen de la jornada (sobre paquetes válidos): urgencias y dinero a cobrar.
  const packageStats = useMemo(() => {
    let expiringToday = 0, withPayment = 0, totalToCollect = 0, f2 = 0, highValue = 0, fedex = 0, dhl = 0;
    for (const p of validPackages) {
      if (isExpiringTodayLocal(p.commitDateTime)) expiringToday++;
      if (p.payment) { withPayment++; totalToCollect += Number(p.payment.amount) || 0; }
      if (p.isCharge) f2++;
      if (p.isHighValue) highValue++;
      if (p.shipmentType === "fedex") fedex++;
      if (p.shipmentType === "dhl") dhl++;
    }
    return { total: validPackages.length, expiringToday, withPayment, totalToCollect, f2, highValue, fedex, dhl };
  }, [validPackages]);

  // Filtrado de paquetes
  const filteredValidPackages = useMemo(() => {
    return validPackages.filter(pkg => {
      const uniqueId = pkg.dhlUniqueId || "";

      const matchesSearch = pkg.trackingNumber.includes(searchTerm) ||
                            uniqueId.includes(searchTerm) ||
                           (pkg.recipientName && pkg.recipientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           (pkg.recipientAddress && pkg.recipientAddress.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           (pkg.recipientZip && pkg.recipientZip.includes(searchTerm));

      const matchesPriority = filterPriority === "all" || pkg.priority === filterPriority;
      const matchesStatus = filterStatus === "all" ||
                           (filterStatus === "special" && (pkg.isCharge || pkg.isHighValue || pkg.payment)) ||
                           (filterStatus === "normal" && !pkg.isCharge && !pkg.isHighValue && !pkg.payment);
      const matchesCarrier = filterCarrier === "all" || pkg.shipmentType === filterCarrier;
      const matchesToday = !onlyToday || isExpiringTodayLocal(pkg.commitDateTime);
      const matchesPayment = !onlyPayment || !!pkg.payment;

      return matchesSearch && matchesPriority && matchesStatus && matchesCarrier && matchesToday && matchesPayment;
    }).sort(compareByZip); // ordenado por código postal (igual que el PDF/Excel)
  }, [validPackages, searchTerm, filterPriority, filterStatus, filterCarrier, onlyToday, onlyPayment]);

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
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Salida de Paquetes</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
          {/* Header estandarizado */}
          <OperationHeader
            icon={ClipboardPasteIcon}
        title="Salida de Paquetes"
        description="Procesa la salida de paquetes para reparto en ruta"
        subsidiaryName={selectedSubsidiaryName}
        isOffline={!isOnline}
        actions={
          (packages.length > 0 || selectedRepartidores.length > 0 || selectedRutas.length > 0 || selectedUnidad) ? (
            <TooltipProvider delayDuration={100}>
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
            </TooltipProvider>
          ) : null
        }
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
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
                  subsidiaryId={selectedSubsidiaryId}
                  selectedRepartidores={selectedRepartidores}
                  onSelectionChange={setSelectedRepartidores}
                  isInsideModal={true}
                  disabled={isLoading}
                />
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <Label>Rutas</Label>
                <RutaSelector 
                  selectedRutas={selectedRutas} 
                  onSelectionChange={setSelectedRutas} 
                  disabled={isLoading}
                  isInsideModal={true}
                  subsidiaryId={selectedSubsidiaryId} // ← Esto es lo nuevo
                />
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
                  selectedUnidad={selectedUnidad || {} as Vehicles} // Convertir undefined a objeto vacío
                  onSelectionChange={setSelectedUnidad}
                  disabled={isLoading}
                  subsidiaryId={selectedSubsidiaryId}
                  isInsideModal={true}
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
                  multiCarrier
                  onTrackingNumbersChange={(rawString) => setTrackingNumbersRaw(rawString)}
                  disabled={isLoading || !selectedSubsidiaryId}
                  placeholder={!selectedSubsidiaryId ? "Selecciona una sucursal primero" : "Escanea guías FedEx o DHL"}
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

        {/* Right Column - Packages List (panel abierto, sin Card) */}
        <div className="xl:col-span-2 space-y-3">
          <PackagesPanelHeader subtitle={`${packages.length} en lista`} isOffline={!isOnline} />
              {/* Banner de urgencia: paquetes que vencen hoy */}
              {packageStats.expiringToday > 0 && (
                <button
                  type="button"
                  onClick={() => setOnlyToday((v) => !v)}
                  className="w-full flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left text-sm text-red-800 hover:bg-red-100 transition-colors"
                >
                  <Clock className="h-4 w-4 shrink-0" />
                  <span className="font-semibold">{packageStats.expiringToday}</span>
                  paquete(s) vencen <strong>hoy</strong>.
                  <span className="ml-auto text-xs underline">
                    {onlyToday ? "Quitar filtro" : "Ver solo estos"}
                  </span>
                </button>
              )}

              {/* Resumen de la jornada (StatBar estandarizado) */}
              {validPackages.length > 0 && (
                <StatBar
                  items={[
                    { label: "Total", value: packageStats.total, icon: Package },
                    { label: "Vencen hoy", value: packageStats.expiringToday, valueClassName: "text-red-600", icon: Clock },
                    {
                      label: "A cobrar",
                      value: `$${packageStats.totalToCollect.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
                      valueClassName: "text-blue-600",
                      icon: BanknoteIcon,
                    },
                    { label: "Con cobro", value: packageStats.withPayment, valueClassName: "text-blue-600" },
                    { label: "F2 / Carga", value: packageStats.f2, valueClassName: "text-green-600" },
                    { label: "Alto valor", value: packageStats.highValue, valueClassName: "text-violet-600", icon: GemIcon },
                    { label: "FedEx", value: packageStats.fedex, valueClassName: "text-[#4d148c]" },
                    { label: "DHL", value: packageStats.dhl, valueClassName: "text-[#d40511]" },
                  ]}
                />
              )}

              <PackageFilters
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
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
                          {filteredValidPackages.map(pkg => {
                            const uniqueKey = pkg.dhlUniqueId || pkg.trackingNumber;
                            return (
                              <PackageListItem
                                key={`todos-${uniqueKey}`}
                                pkg={pkg}
                                onRemove={handleRemovePackage}
                                isLoading={isLoading}
                              />
                            );
                          })}
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
                            <PackageListItem
                              key={pkg.trackingNumber}
                              pkg={pkg}
                              onRemove={handleRemovePackage}
                              isLoading={isLoading}
                              onTransfer={canTransfer ? setTransferPkg : undefined}
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
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row justify-between gap-2 border-t bg-background p-3 sm:p-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="gap-2">
            <X className="h-4 w-4" /> Cancelar
          </Button>
          <div className="flex gap-2">
            <Button
              onClick={handlePdfCreate}
              disabled={isLoading || validPackages.length === 0}
              variant="outline"
              className="gap-2"
            >
              <Download className="h-4 w-4" /> Solo generar PDF
            </Button>
            <Button onClick={handleDispatch} disabled={isLoading || !canDispatch} className="gap-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Procesar salida
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <TransferPackageDialog
      open={!!transferPkg}
      onOpenChange={(o) => !o && setTransferPkg(null)}
      pkg={transferPkg}
      currentSubsidiaryId={selectedSubsidiaryId}
      currentSubsidiaryName={selectedSubsidiaryName}
      source="package_dispatch"
      onSuccess={(pkg, destinationId) => {
        const id = (pkg as any).dhlUniqueId || pkg.trackingNumber;
        if (destinationId === selectedSubsidiaryId) {
          // Traspasado a la sucursal actual: ahora pertenece -> pasa a "válidos".
          setPackages(prev =>
            prev.map(p => {
              const pid = (p as any).dhlUniqueId || p.trackingNumber;
              return pid === id
                ? { ...p, isValid: true, reason: undefined, subsidiary: { ...((p as any).subsidiary || {}), id: destinationId } }
                : p;
            })
          );
        } else {
          // Enviado a otra sucursal: ya no está aquí -> quitarlo.
          handleRemovePackage(id);
        }
        setTransferPkg(null);
      }}
    />
    </>
  );
};

export default PackageDispatchForm;