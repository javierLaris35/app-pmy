"use client"

import type React from "react"
import { useEffect, useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Trash2, Send, Scan, MapPinIcon, MapPin, User, Phone, DollarSignIcon, BanknoteIcon, Package, ClipboardPasteIcon, FileText, CircleAlertIcon, GemIcon } from "lucide-react"
import { RepartidorSelector } from "../selectors/repartidor-selector"
import { RutaSelector } from "../selectors/ruta-selector"
import { UnidadSelector } from "../selectors/unidad-selector"
import { DispatchFormData, Driver, PackageDispatch, PackageInfo, Priority, Route, ShipmentStatusType, Subsidiary, Vehicles } from "@/lib/types"
import { savePackageDispatch, uploadPDFile, validateTrackingNumber } from "@/lib/services/package-dispatchs"
import { useAuthStore } from "@/store/auth.store"
import { FedExPackageDispatchPDF } from "@/lib/services/package-dispatch/package-dispatch-pdf-generator"
import { pdf } from '@react-pdf/renderer';
import { Input } from "../ui/input"
import { BarcodeScannerInput } from "../barcode-scanner-input"
import { generateDispatchExcelClient } from "@/lib/services/package-dispatch/package-dispatch-excel-generator"

type Props = {
  selectedSubsidiaryId: string | null
  subsidiaryName?: string
  onClose: () => void
  onSuccess: () => void
}

const VALIDATION_REGEX = /^\d{12}$/

const formatMexicanPhoneNumber = (phone: string): string => {
  // Remove non-digits
  const cleaned = phone.replace(/\D/g, '');

  // Handle 10-digit numbers (e.g., 6441251245 -> +52 (644) 125-1245)
  if (cleaned.length === 10) {
    return `+52 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  // Handle 12-digit numbers with '52' (e.g., +526441251245 -> +52 (644) 125-1245)
  if (cleaned.length === 12 && cleaned.startsWith('52')) {
    return `+52 (${cleaned.slice(2, 5)}) ${cleaned.slice(5, 8)}-${cleaned.slice(8)}`;
  }

  // Handle 13-digit numbers with '521' (e.g., +5216441251245 -> +52 (644) 125-1245)
  if (cleaned.length === 13 && cleaned.startsWith('521')) {
    return `+52 (${cleaned.slice(3, 6)}) ${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
  }

  // Return original if format is unknown
  return phone;
};

const PackageDispatchForm: React.FC<Props> = ({
  onClose,
  onSuccess,
}) => {
  // Form states
  const [selectedRepartidores, setSelectedRepartidores] = useState<Driver[]>([])
  const [selectedRutas, setSelectedRutas] = useState<Route[]>([])
  const [selectedUnidad, setSelectedUnidad] = useState<Vehicles>()

  // Package scanning states
  const [trackingNumbersRaw, setTrackingNumbersRaw] = useState("")
  const [currentScan, setCurrentScan] = useState("")
  const [packages, setPackages] = useState<PackageInfo[]>([])
  const [invalidNumbers, setInvalidNumbers] = useState<string[]>([])
  const [hasValidated, setHasValidated] = useState(false)
  const [selectedSubsidiaryId, setSelectedSubsidirayId] = useState<string | null>(null)
  const [selectedSubsidiaryName, setSelectedSubsidirayName] = useState<string | null>(null)
  const [selectedKms, setSelectedKms] = useState<string | null>("")

  const [trackingNumbers, setTrackingNumbers] = useState<string[]>([]);

  // Loading and progress states
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const user = useAuthStore((s) => s.user)

  const { toast } = useToast()

  useEffect(() => {
      if (user?.subsidiary) {
        setSelectedSubsidirayId(user?.subsidiary.id || null)
        setSelectedSubsidirayName(user?.subsidiary.name || null)
      }
    }, [user, setSelectedSubsidirayId])

  useEffect(() => {
    const preventZoom = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault()
    }
    const preventKeyZoom = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["+", "-", "=", "0"].includes(e.key)) {
        e.preventDefault()
      }
    }
    window.addEventListener("wheel", preventZoom, { passive: false })
    window.addEventListener("keydown", preventKeyZoom)
    return () => {
      window.removeEventListener("wheel", preventZoom)
      window.removeEventListener("keydown", preventKeyZoom)
    }
  }, [])

  const validatePackageForDispatch = async (trackingNumber: string): Promise<PackageInfo> => {
    const shipment = await validateTrackingNumber(trackingNumber, selectedSubsidiaryId)
    return shipment;
  }

  const handleValidatePackages = async () => {
    if (!selectedSubsidiaryId) {
      toast({
        title: "Error",
        description: "Selecciona una sucursal antes de validar.",
        variant: "destructive",
      })
      return
    }

    const lines = trackingNumbersRaw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)

    const uniqueLines = Array.from(new Set(lines))
    const validNumbers = uniqueLines.filter((tn) => VALIDATION_REGEX.test(tn))
    const invalids = uniqueLines.filter((tn) => !VALIDATION_REGEX.test(tn))

    if (validNumbers.length === 0) {
      toast({
        title: "Error",
        description: "No se ingresaron números válidos.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setProgress(0)

    const results: PackageInfo[] = []
    for (let i = 0; i < validNumbers.length; i++) {
      const tn = validNumbers[i]
      const info = await validatePackageForDispatch(tn)
      results.push(info)
      setProgress(Math.round(((i + 1) / validNumbers.length) * 100))
    }

    const newPackages = results.filter((r) => !packages.some((p) => p.trackingNumber === r.trackingNumber))

    setPackages((prev) => [...prev, ...newPackages])
    setInvalidNumbers(invalids)
    setHasValidated(true)
    setTrackingNumbersRaw("")
    setProgress(0)
    setIsLoading(false)

    const validCount = newPackages.filter((p) => p.isValid).length
    const invalidCount = newPackages.filter((p) => !p.isValid).length

    toast({
      title: "Validación completada",
      description: `Se agregaron ${validCount} paquetes válidos. Paquetes inválidos: ${invalidCount + invalids.length}`,
    })
  }

  const handleRemovePackage = useCallback((trackingNumber: string) => {
    setPackages((prev) => prev.filter((p) => p.trackingNumber !== trackingNumber))
  }, [])

  const handleDispatch = async () => {
    if (!selectedSubsidiaryId) {
      toast({
        title: "Sucursal no seleccionada",
        description: "Por favor selecciona una sucursal antes de procesar.",
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

    if(!selectedKms){
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
    setProgress(0); // Assuming you have a progress state for UI feedback

    try {
      const dispatchData: DispatchFormData = {
        drivers: selectedRepartidores,
        routes: selectedRutas,
        vehicle: selectedUnidad,
        shipments: validPackages.map((p) => p.id),
        subsidiary: { id: selectedSubsidiaryId, name: selectedSubsidiaryName || "Unknown" },
        kms: selectedKms
      };

      // Dispatch packages and get ID
      const dispatchResponse = await savePackageDispatch(dispatchData);
      console.log("🚀 ~ handleDispatch ~ dispatchResponse:", dispatchResponse)
      const packageDispatchId = dispatchResponse.id; // Adjust based on actual API response

      // Upload PDF
      await handleSendEmail(dispatchResponse);

      toast({
        title: "Salida procesada exitosamente",
        description: `Se procesaron ${validPackages.length} paquetes para salida y se subió el PDF.`,
      });

      // Reset form
      setSelectedRepartidores([]);
      setSelectedRutas([]);
      setSelectedUnidad("");
      setPackages([]);
      setInvalidNumbers([]);
      setHasValidated(false);
      setProgress(0);

      onSuccess();
      return packageDispatchId; // Optional: Return for chaining or testing
    } catch (error) {
      console.error("Error in handleDispatch:", error);
      toast({
        title: "Error al procesar salida",
        description:
          error instanceof Error && error.message.includes("upload")
            ? "Error al subir el PDF."
            : "Hubo un problema al procesar la salida de paquetes.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePdfCreate = async () => {
    try {
      setIsLoading(true)
      console.log("🚀 ~ handlePdfCreate ~ selectedUnidad:", selectedUnidad)

      /*const { blob, fileName } = await generateEnhancedFedExPDFPackageDispatch(
        selectedRepartidores, 
        selectedRutas, 
        selectedUnidad, 
        validPackages, user?.subsidiary?.name)
        
      
      const pdfUrl = window.URL.createObjectURL(blob);
      window.open(pdfUrl, "_blank");*/

      /**** Nueva Libreria */
       const blob = await pdf(
          <FedExPackageDispatchPDF
            key={Date.now()}
            drivers={selectedRepartidores}
            routes={selectedRutas}
            vehicle={selectedUnidad}
            packages={validPackages}
            subsidiaryName={user?.subsidiary?.name}
            trackingNumber="123456789"
          />
        ).toBlob();

        const blobUrl = URL.createObjectURL(blob) + `#${Date.now()}`;
        window.open(blobUrl, '_blank');


      //return fileName;
      setIsLoading(false)
    } catch (error) {
      console.error("Error generating PDF:", error)
      //toast("No se pudo generar el PDF.")
    }

  }

  const handleSendEmail = async (packageDispatch: PackageDispatch) => {
    try {
      const blob = await pdf(
          <FedExPackageDispatchPDF
            key={Date.now()}
            drivers={selectedRepartidores}
            routes={selectedRutas}
            vehicle={selectedUnidad}
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

      // Convert Blob to File using the provided fileName
      const pdfFile = new File([blob], fileName, { type: 'application/pdf' });

      const excelBuffer = await generateDispatchExcelClient(packageDispatch, false);
      const excelBlob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const excelFileName = `${packageDispatch?.drivers[0]?.name.toUpperCase()}--${packageDispatch?.subsidiary?.name}--Salida a Ruta--${currentDate.replace(/\//g, "-")}.xlsx`;
      const excelFile = new File([excelBlob], excelFileName, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      // Optional: Track upload progress
      const onProgress = (percent: number) => {
        console.log(`Upload progress: ${percent}%`);
        // Update UI, e.g., setProgress(percent);
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

  const wasPastedRef = useRef(false);

  const handlePaste = useCallback(() => {
    wasPastedRef.current = true;
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();

        // Si fue pegado, permitimos procesar normalmente
        if (wasPastedRef.current) {
          wasPastedRef.current = false; // resetea el flag

          const pastedLines = currentScan.split("\n").map((line) => line.trim()).filter(Boolean);

          const codes = new Set(trackingNumbersRaw.split("\n").filter(Boolean));
          pastedLines.forEach(line => {
            const code = line.slice(-12); // solo lo último si es necesario
            if (code) codes.add(code);
          });

          setTrackingNumbersRaw(Array.from(codes).join("\n"));
          return;
        }

        // Procesamiento normal para escaneo (ej. pistola)
        const lines = currentScan.split("\n").map((line) => line.trim()).filter(Boolean);
        const lastLine = lines[lines.length - 1] || "";
        const newCode = lastLine.slice(-12);

        if (newCode) {
          const existingCodes = new Set(trackingNumbersRaw.split("\n").filter(Boolean));
          existingCodes.add(newCode);
          setTrackingNumbersRaw(Array.from(existingCodes).join("\n"));

          setCurrentScan((prev) => {
            const prevLines = prev.split("\n").slice(0, -1);
            return [...prevLines, newCode, ""].join("\n");
          });
        }
      }
    },
    [currentScan, trackingNumbersRaw]
  );

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentScan(e.target.value);
  }, []);

  const validPackages = packages.filter((p) => p.isValid)
  const invalidPackages = packages.filter((p) => !p.isValid)
  const canDispatch =
    selectedRepartidores.length > 0 && selectedRutas.length > 0 && selectedUnidad && validPackages.length > 0

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between w-full">
          {/* Lado izquierdo */}
          <div className="flex items-center gap-2">
            <ClipboardPasteIcon className="h-5 w-5" />
            <span>Salida de Paquetes</span>
            {packages.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {validPackages.length} válidos / {packages.length} total
              </Badge>
            )}
          </div>

          {/* Lado derecho */}
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPinIcon className="h-5 w-5" />
            <span>Sucursal: {selectedSubsidiaryName}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Selection Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Repartidores</Label>
            <RepartidorSelector
              selectedRepartidores={selectedRepartidores}
              onSelectionChange={setSelectedRepartidores}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label>Rutas</Label>
            <RutaSelector selectedRutas={selectedRutas} onSelectionChange={setSelectedRutas} disabled={isLoading} />
          </div>

          <div className="space-y-2">
            <Label>Unidad de Transporte</Label>
            <UnidadSelector
              selectedUnidad={selectedUnidad}
              onSelectionChange={setSelectedUnidad}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label>Kilometraje Actual de la  Unidad</Label>
            <Input type="text" onChange={(e) => setSelectedKms(e.target.value)} />
          </div>
        </div>

        {/* Package Scanning Section */}
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

          <div className="flex flex-col sm:flex-row gap-3 items-end justify-end">
            <Button onClick={handleValidatePackages} disabled={isLoading} className="w-full sm:w-auto">
              <Scan className="mr-2 h-4 w-4" />
              {isLoading ? "Procesando..." : "Validar paquetes"}
            </Button>

            <Button
              onClick={handleDispatch}
              disabled={isLoading || !canDispatch}
              variant="default"
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
            >
              <Send className="mr-2 h-4 w-4" />
              Procesar salida
            </Button>

            <Button onClick={handlePdfCreate} disabled={validPackages.length === 0} variant="outline" className="flex-1 bg-transparent">
                <FileText className="mr-2 h-4 w-4" />
                Solo generar PDF
            </Button>
          </div>

          {isLoading && (
            <div className="space-y-2">
              <Label>Progreso de validación</Label>
              <Progress value={progress} className="h-3" />
            </div>
          )}

          {invalidNumbers.length > 0 && (
            <div className="mt-4 text-red-600 font-semibold">
              <AlertCircle className="inline-block mr-2" />
              Números inválidos (no se agregaron):
              <ul className="list-disc ml-6 mt-1">
                {invalidNumbers.map((tn) => (
                  <li key={tn}>{tn}</li>
                ))}
              </ul>
            </div>
          )}

          {packages.length > 0 && (
            <div className="mt-6 space-y-2">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-x-4 gap-y-2">
                {/* Left Side: Title */}
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
                  {packages.map((pkg) => (
                    <li
                      key={pkg.trackingNumber}
                      className="flex justify-between items-center px-4 py-2 hover:bg-gray-50"
                    >
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
                              <BanknoteIcon className="h-4 w-4 text-white"/>
                              &nbsp; A COBRAR: ${pkg.payment.amount}
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
                        { !pkg.isValid && (
                          
                              <span className="flex items-center text-sm">
                                <AlertCircle className="w-4 h-4 mr-1 text-red-600" />
                                {pkg.reason}
                              </span>
                        )}
                      </div>
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
                {(selectedRepartidores.length > 0 || selectedRutas.length > 0 || selectedUnidad || packages.length > 0) && (
                    <div className="flex items-center gap-x-3 text-sm text-gray-600">
                      <Package className="w-4 h-4 text-gray-600" />
                      <span className="font-medium">Resumen:</span>
                      <span>
                        Repartidores: <span className="font-bold">{selectedRepartidores.length}</span>
                      </span>
                      <span className="text-gray-400">•</span>
                      <span>
                        Rutas: <span className="font-bold">{selectedRutas.length}</span>
                      </span>
                      <span className="text-gray-400">•</span>
                      <span>
                        Paquetes válidos: <span className="font-bold">{validPackages.length}</span>
                      </span>
                      <span className="text-gray-400">•</span>
                      <span>
                        Paquetes inválidos: <span className="font-bold text-red-600">{invalidPackages.length}</span>
                      </span>
                    </div>
                  )}
                </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default PackageDispatchForm
