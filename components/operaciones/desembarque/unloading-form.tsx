"use client";

import { useState, useEffect, useCallback } from "react";
import { UnidadSelector } from "@/components/selectors/unidad-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { AlertCircle, Check, ChevronsUpDown, CircleAlertIcon, DollarSignIcon, GemIcon, MapPin, MapPinIcon, Package, PackageCheckIcon, Phone, Scan, Send, Trash2, User } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { validateTrackingNumber, saveUnloading, uploadPDFile } from "@/lib/services/unloadings";
import { PackageInfo, PackageInfoForUnloading, Unloading, UnloadingFormData } from "@/lib/types";
import{ BarcodeScannerInput } from "@/components/barcode-scanner-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { IconPdf } from "@tabler/icons-react";
import { UnloadingPDFReport } from "@/lib/services/unloading/unloading-pdf-generator";
import { pdf } from "@react-pdf/renderer";

// Types based on the Unloading interface
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
  recipientAddress?: string | null;
  recipientPhone?: string | null;
  priority?: Priority | null;
  status?: ShipmentStatusType | null;
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
  const [savedUnload, setSavedUnloading] = useState<Unloading | null>(null)
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);

  const [selectedReasons, setSelectedReasons] = useState<Record<string, string>>({});
  const [openPopover, setOpenPopover] = useState<string | null>(null);

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

  const options = Object.entries(TrackingNotFoundEnum).map(([key, value]) => ({
    key,
    label: value
  }));

  const handleSelectMissingTracking = (id: string, value: string) => {
    // Actualizar el estado de selectedReasons primero
    setSelectedReasons(prev => ({
      ...prev,
      [id]: value
    }));

    // Manejar las listas de trackings
    if(value === TrackingNotFoundEnum.NOT_TRACKING) {
      setMissingTrackings(prev => [...prev, id]);
      setUnScannedTrackings(prev => prev.filter(item => item !== id));
    } else if(value === TrackingNotFoundEnum.NOT_SCANNED) {
      setUnScannedTrackings(prev => [...prev, id]);
      setMissingTrackings(prev => prev.filter(item => item !== id));
    } else if(value === TrackingNotFoundEnum.NOT_IN_CHARGE) {
      // Manejar este caso si es necesario
      setMissingTrackings(prev => prev.filter(item => item !== id));
      setUnScannedTrackings(prev => prev.filter(item => item !== id));
    }

    // Cerrar el popover después de actualizar los estados
    setOpenPopover(null);
  };
  const validatePackageForUnloading = async (trackingNumber: string): Promise<PackageInfo> => {
    return await validateTrackingNumber(trackingNumber, selectedSubsidiaryId);
  };

  const handleValidatePackages = async () => {
    if (!selectedSubsidiaryId) {
      toast({
        title: "Error",
        description: "Selecciona una sucursal antes de validar.",
        variant: "destructive",
      });
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
      return;
    }

    setIsLoading(true);
    setProgress(0);

    const results: Shipment[] = [];
    for (let i = 0; i < validNumbers.length; i++) {
      const tn = validNumbers[i];
      const info = await validatePackageForUnloading(tn);
      results.push(info);
      setProgress(Math.round(((i + 1) / validNumbers.length) * 100));
    }

    const newShipments = results.filter((r) => !shipments.some((p) => p.trackingNumber === r.trackingNumber));

    setShipments((prev) => [...prev, ...newShipments]);
    setMissingTrackings(invalidNumbers);
    setUnScannedTrackings([]);
    setTrackingNumbersRaw("");
    setProgress(0);
    setIsLoading(false);

    const validCount = newShipments.filter((p) => p.isValid).length;
    const invalidCount = newShipments.filter((p) => !p.isValid).length;

    toast({
      title: "Validación completada",
      description: `Se agregaron ${validCount} paquetes válidos. Paquetes inválidos: ${invalidCount + invalidNumbers.length}`,
    });
  };

  const handleRemovePackage = useCallback((trackingNumber: string) => {
    setShipments((prev) => prev.filter((p) => p.trackingNumber !== trackingNumber));
  }, []);

  const handleSendEmail = async () => {
    const blob = await pdf(
      <UnloadingPDFReport
        key={Date.now()}
        vehicle={selectedUnidad}
        packages={validShipments}
        subsidiaryName={savedUnload?.subsidiary?.name ?? ""}
        unloadingTrackigNumber={savedUnload?.trackingNumber ?? ""}
      />
    ).toBlob();

    const blobUrl = URL.createObjectURL(blob) + `#${Date.now()}`;
    window.open(blobUrl, '_blank');

    const currentDate = new Date().toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
      });

    const fileName = `PMY_Desembarque_${savedUnload?.subsidiary?.name}_${currentDate.replace(/\//g, "-")}.pdf`;

    const pdfFile = new File([blob], fileName, { type: 'application/pdf' });

    const subsidiaryName = selectedSubsidiaryName || 'Unknown';

    const onProgress = (percent: number) => {
      console.log(`Upload progress: ${percent}%`);
    };

    await uploadPDFile(pdfFile, savedUnload?.subsidiary?.name, savedUnload?.id, onProgress);

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

      await handleSendEmail()

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


  const handlePdfCreate = async() => {
    setIsLoading(true)

    const blob = await pdf(
      <UnloadingPDFReport
        key={Date.now()}
        vehicle={selectedUnidad}
        packages={validShipments}
        subsidiaryName={user?.subsidiary?.name}
        unloadingTrackigNumber="1254639874598"
      />
    ).toBlob();

    const blobUrl = URL.createObjectURL(blob) + `#${Date.now()}`;
    window.open(blobUrl, '_blank');

    setIsLoading(false)
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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackageCheckIcon className="h-5 w-5" />
            <span>Descarga de Paquetes</span>
            {shipments.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {validShipments.length} válidos / {shipments.length} total
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <MapPinIcon className="h-5 w-5" />
            <span>Sucursal: {selectedSubsidiaryName}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Unidad de Transporte</Label>
            <UnidadSelector
              selectedUnidad={selectedUnidad}
              onSelectionChange={setSelectedUnidad}
              disabled={isLoading}
            />
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex flex-row justify-between">
              <Label htmlFor="trackingNumbers">Números de seguimiento</Label>
              <Label htmlFor="trackingNumbers">Guías Agregadas: {trackingNumbersRaw.split('\n').length}</Label>
            </div>
            <BarcodeScannerInput 
                onTrackingNumbersChange={(rawString) => setTrackingNumbersRaw(rawString)} 
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <Button onClick={handleValidatePackages} disabled={isLoading} className="w-full sm:w-auto">
              <Scan className="mr-2 h-4 w-4" />
              {isLoading ? "Procesando..." : "Validar paquetes"}
            </Button>
            <Button
              onClick={handleUnloading}
              disabled={isLoading || !canUnload}
              variant="default"
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
            >
              <Send className="mr-2 h-4 w-4" />
              Procesar descarga
            </Button>
            <Button
              onClick={handlePdfCreate}
              disabled={isLoading || !canUnload}
              variant="default"
              className="w-full sm:w-auto"
            >
              <IconPdf className="mr-2 h-4 w-4" />
              Solo generar PDF
            </Button>
          </div>
          {isLoading && (
            <div className="space-y-2">
              <Label>Progreso de validación</Label>
              <Progress value={progress} className="h-3" />
            </div>
          )}
          {shipments.length > 0 && (
            <div className="mt-6 space-y-2">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-x-4 gap-y-2">
                <h3 className="text-lg font-semibold text-gray-800">Paquetes validados</h3>
              </div>
              <div className="flex flex-row items-end justify-end">
                <div className="flex items-center gap-x-3 text-xs text-gray-600 flex-wrap">
                    <span>Simbología:</span>

                    <div className="flex items-center gap-x-1">
                        <CircleAlertIcon className="h-4 w-4 text-red-600" />
                        <span>No Válido</span>
                    </div>

                    <span className="text-gray-400">•</span>

                    <div className="flex items-center gap-x-1">
                        <span>Carga/F2/31.5:</span>
                        <Badge className="h-4 text-white bg-green-600 whitespace-nowrap">
                        Carga/F2/31.5
                        </Badge>
                    </div>

                    <span className="text-gray-400">•</span>

                    <div className="flex items-center gap-x-1">
                        <span>Alto Valor:</span>
                        <Badge className="h-4 bg-violet-600 hover:bg-violet-700 flex items-center justify-center p-1">
                        <GemIcon className="h-4 w-4 text-white" />
                        </Badge>
                    </div>

                    <span className="text-gray-400">•</span>

                    <div className="flex items-center gap-x-1">
                        <span>Cobros (FTC/ROD/COD):</span>
                        <Badge className="h-4 bg-blue-600 hover:bg-blue-700 text-xs flex items-center gap-x-1 p-1">
                        <DollarSignIcon className="h-4 w-4 text-white" />
                        <span className="text-white whitespace-nowrap">A COBRAR: FTC $1000.00</span>
                        </Badge>
                    </div>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md">
                <ul className="divide-y divide-gray-300">
                  {shipments.map((pkg) => (
                    <li key={pkg.trackingNumber} className="flex justify-between items-center px-4 py-2 hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium font-mono">{pkg.trackingNumber}</span>
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
                              {pkg.priority.toLocaleUpperCase()}
                            </Badge>
                          )}
                          { pkg.isCharge && (
                                <Badge className="bg-green-600 :hover:bg-green-700 text-xs">
                                <span className="h-4 text-white">CARGA/F2/31.5</span>
                                </Badge>
                            )}
                            { pkg.isHighValue && (
                                <Badge className="bg-violet-600 :hover:bg-violet-700 text-xs">
                                <GemIcon className="h-4 w-4 text-white"/>
                                </Badge>
                            )}
                            { pkg.payment && (
                                <Badge className="bg-blue-600 :hover:bg-blue-700 text-xs">
                                <DollarSignIcon className="h-4 w-4 text-white"/>
                                &nbsp; A COBRAR: {pkg.payment.type} ${pkg.payment.amount}
                                </Badge>
                            )}
                                                    
                        </div>
                        {pkg.isValid && (
                          <div className="text-sm text-gray-600 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                            {pkg.recipientAddress && (
                              <span className="flex items-center">
                                <MapPin className="w-4 h-4 mr-1 text-black" />
                                Dirección: {pkg.recipientAddress}
                              </span>
                            )}
                            {pkg.recipientName && (
                              <span className="flex items-center">
                                <User className="w-4 h-4 mr-1 text-black" />
                                Recibe: {pkg.recipientName}
                              </span>
                            )}
                            {pkg.recipientPhone && (
                              <span className="flex items-center">
                                <Phone className="w-4 h-4 mr-1 text-black" />
                                Teléfono: {formatMexicanPhoneNumber(pkg.recipientPhone)}
                              </span>
                            )}
                          </div>
                        )}
                        {!pkg.isValid && (
                          <span className="flex items-center text-sm">
                            <AlertCircle className="w-4 h-4 mr-1 text-red-600" />
                            {pkg.reason}
                          </span>
                        )}
                      </div>

                      { !pkg.isValid && <div className="space-y-2 mr-2">
                          <Popover
                              open={openPopover === pkg.trackingNumber}
                              onOpenChange={(open) => setOpenPopover(open ? pkg.trackingNumber : null)}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={openPopover === pkg.trackingNumber}
                                  className="w-56 justify-between bg-transparent"
                                  disabled={isLoading}
                                >
                                  {selectedReasons[pkg.trackingNumber] || "Seleccionar motivo..."}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-56 p-0">
                                <Command>
                                  <CommandInput placeholder="Buscar motivo..." />
                                  <CommandList>
                                    <CommandEmpty>No se encontraron motivos.</CommandEmpty>
                                    <CommandGroup>
                                      {options.map((opt) => (
                                        <CommandItem
                                          key={opt.key}
                                          value={opt.label}
                                          onSelect={() => handleSelectMissingTracking(pkg.trackingNumber, opt.label)}
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
                        </div>  
                      }
                      <button
                        onClick={() => handleRemovePackage(pkg.trackingNumber)}
                        title="Eliminar"
                        className="text-red-600 hover:text-red-800"
                        disabled={isLoading}
                      >
                        <Trash2 size={18} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col md:flex-row justify-end items-end md:items-center gap-x-4 gap-y-2">
                <div className="flex items-center gap-x-3 text-sm text-gray-600">
                    <Package className="w-4 h-4 text-gray-600" />
                    <span className="font-medium">Resumen:</span>
                    <span>
                        Paquetes válidos: <span className="font-bold">{validShipments.length}</span>
                    </span>
                    <span className="text-gray-300">|</span>
                    <span>
                        Guias sin escaneo: 
                        <span className="font-bold text-red-600">{unScannedTrackings.length}</span>
                    </span>
                    <span>
                        Guias faltantes: 
                        <span className="font-bold text-red-600">{missingTrackings.length}</span>
                    </span>
                </div>
               </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}