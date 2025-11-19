"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Loader2, Package, Search, X, Plus, User, FileText } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { searchPackageInfo } from "@/lib/services/shipments";
import { SearchShipmentDto, ShipmentStatusType, Priority, ShipmentType, AddShipmentDto} from "@/lib/types";
import { toast } from "sonner";
import { getCurrentHermosilloDateTime } from "@/utils/date.utils";
import { useCreateShipmentInDesembarcos } from "@/hooks/services/shipments/use-shipments";

type ModalMode = "search" | "create";

interface ShipmentFormData {
  trackingNumber: string;
  shipmentType: string;
  recipientName: string;
  recipientAddress: string;
  recipientCity: string;
  recipientZip: string;
  recipientPhone: string;
  commitDateTime: string;
  priority: string;
  status: string;
  isHighValue: boolean;
}

interface CorrectTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  scannedTrackingNumber: string;
  subsidiaryName?: string | null;
  subsidiaryId?: string | null;
  onCorrect: (data: {
    originalTracking: string;
    correctedTracking: string;
    packageInfo: SearchShipmentDto;
  }) => void;
  onCreate?: (data: ShipmentFormData) => void;
  handleValidatePackages:  () => void;
}

export function CorrectTrackingModal({
  isOpen,
  onClose,
  scannedTrackingNumber,
  subsidiaryName,
  subsidiaryId,
  onCorrect,
  onCreate,
  handleValidatePackages
}: CorrectTrackingModalProps) {
  const [mode, setMode] = useState<ModalMode>("search");
  const [correctedTracking, setCorrectedTracking] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [packageInfo, setPackageInfo] = useState<SearchShipmentDto | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Hook para crear shipment
  const { createShipment, isCreating, isError, error } = useCreateShipmentInDesembarcos();

  // Estado para el formulario de creación
  const [formData, setFormData] = useState<ShipmentFormData>({
    trackingNumber: "",
    shipmentType: ShipmentType.FEDEX,
    recipientName: "",
    recipientAddress: "",
    recipientCity: "",
    recipientZip: "",
    recipientPhone: "",
    commitDateTime: "",
    priority: Priority.MEDIA,
    status: ShipmentStatusType.EN_RUTA,
    isHighValue: false,
  });

  // Campo separado para confirmar el tracking number
  const [confirmedTracking, setConfirmedTracking] = useState("");

  // Limpiar estado al abrir/cerrar
  useEffect(() => {
    if (!isOpen) {
      setMode("search");
      setCorrectedTracking("");
      setConfirmedTracking("");
      setPackageInfo(null);
      setSearchError(null);
      setFormData({
        trackingNumber: "",
        shipmentType: ShipmentType.FEDEX,
        recipientName: "",
        recipientAddress: "",
        recipientCity: "",
        recipientZip: "",
        recipientPhone: "",
        commitDateTime: "",
        priority: Priority.MEDIA,
        status: ShipmentStatusType.EN_RUTA,
        isHighValue: false,
      });
    } else {
      // Prellenar valores por defecto cuando se abre la modal
      setFormData(prev => ({
        ...prev,
        trackingNumber: scannedTrackingNumber,
        // Fecha por defecto: hoy a las 9pm en Hermosillo
        commitDateTime: getCurrentHermosilloDateTime(), // 21 (9pm) es el default
        // Ciudad por defecto: nombre de la sucursal seleccionada
        recipientCity: subsidiaryName || "",
        // Tipo de envío siempre FEDEX
        shipmentType: ShipmentType.FEDEX,
        // Estado siempre EN_RUTA
        status: ShipmentStatusType.EN_RUTA,
      }));
      setConfirmedTracking(scannedTrackingNumber);
    }
  }, [isOpen, scannedTrackingNumber, subsidiaryName]);

  // Sincronizar correctedTracking con confirmedTracking
  useEffect(() => {
    if (correctedTracking) {
      setConfirmedTracking(correctedTracking);
    }
  }, [correctedTracking]);

  // Búsqueda automática cuando se ingresa un tracking de 12 dígitos (solo en modo search)
  useEffect(() => {
    if (mode !== "search" || !correctedTracking || correctedTracking.length < 12) {
      setPackageInfo(null);
      setSearchError(null);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setSearchLoading(true);
        setSearchError(null);
        const data = await searchPackageInfo(correctedTracking.trim());
        setPackageInfo(data);
      } catch (error) {
        console.error("Error buscando paquete:", error);
        setSearchError("No se encontró información del paquete. Verifica el número de tracking.");
        setPackageInfo(null);
      } finally {
        setSearchLoading(false);
      }
    }, 800);

    return () => clearTimeout(timeout);
  }, [correctedTracking, mode]);

  // Calcular prioridad automáticamente según fecha de compromiso
  useEffect(() => {
    if (!formData.commitDateTime) return;

    const commitDate = new Date(formData.commitDateTime);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    commitDate.setHours(0, 0, 0, 0);

    const diffTime = commitDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let calculatedPriority = Priority.BAJA;

    // Según las especificaciones del issue:
    // 0-1 días: ALTA
    // 2-5 días: MEDIA
    // 6+ días: BAJA
    if (diffDays <= 1) {
      calculatedPriority = Priority.ALTA;
    } else if (diffDays <= 5) {
      calculatedPriority = Priority.MEDIA;
    } else {
      calculatedPriority = Priority.BAJA;
    }

    setFormData((prev) => ({ ...prev, priority: calculatedPriority }));
  }, [formData.commitDateTime]);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!correctedTracking || correctedTracking.length !== 12) {
      setSearchError("El número de tracking debe tener 12 dígitos");
      return;
    }

    if (!packageInfo) {
      setSearchError("Primero debes buscar y validar el número de tracking correcto");
      return;
    }

    setLoading(true);
    try {
      onCorrect({
        originalTracking: scannedTrackingNumber,
        correctedTracking: correctedTracking.trim(),
        packageInfo: packageInfo,
      });
      onClose();
    } catch (error) {
      console.error("Error al corregir tracking:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subsidiaryId) {
      toast.error("Error", {
        description: "No se encontró la sucursal. Por favor, recarga la página."
      });
      return;
    }

    setLoading(true);

    try {
      // Convertir commitDateTime a commitDate y commitTime separados
      // SIN conversión de zona horaria - se mantiene la fecha local tal cual
      const dateTime = new Date(formData.commitDateTime);

      // Obtener fecha local (sin conversión a UTC)
      const year = dateTime.getFullYear();
      const month = String(dateTime.getMonth() + 1).padStart(2, '0');
      const day = String(dateTime.getDate()).padStart(2, '0');
      const commitDate = `${year}-${month}-${day}`; // YYYY-MM-DD

      // Obtener hora local (sin conversión a UTC)
      const hours = String(dateTime.getHours()).padStart(2, '0');
      const minutes = String(dateTime.getMinutes()).padStart(2, '0');
      const seconds = String(dateTime.getSeconds()).padStart(2, '0');
      const commitTime = `${hours}:${minutes}:${seconds}`; // HH:MM:SS

      // Preparar datos para el backend usando el tracking confirmado
      const dataToBackend: AddShipmentDto = {
        trackingNumber: confirmedTracking.trim(),
        recipientName: formData.recipientName.trim() || "-",
        recipientAddress: formData.recipientAddress.trim() || "-",
        recipientCity: formData.recipientCity.trim() || "-",
        recipientZip: formData.recipientZip.trim() || "-",
        recipientPhone: formData.recipientPhone.trim() || "-",
        commitDate,
        commitTime,
        status: formData.status as AddShipmentDto['status'],
        priority: formData.priority as AddShipmentDto['priority'],
        isHighValue: formData.isHighValue,
        subsidiary: {
          id: subsidiaryId
        }
      };

      console.log("Creando shipment:", dataToBackend);

      const result = await createShipment(dataToBackend);



      if (result.ok) {

        handleValidatePackages();

        toast.success("Shipment creado", {
          description: `El paquete ${confirmedTracking} ha sido registrado correctamente.`
        });



        // Llamar onCreate si existe (para compatibilidad)
        if (onCreate) {
          onCreate(formData);
        }

        onClose();
      } else {
        toast.error("Error al crear shipment", {
          description: result.message || "Ocurrió un error al crear el shipment."
        });
      }
    } catch (error) {
      console.error("Error al crear shipment:", error);
      toast.error("Error", {
        description: "No se pudo crear el shipment. Intenta de nuevo."
      });
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: keyof ShipmentFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCloseAttempt = (open: boolean) => {
    if (!open) {
      // Usuario intenta cerrar la modal
      // Verificar si ha resuelto el problema
      const hasFoundCorrectTracking = mode === "search" && packageInfo !== null;
      const hasCreatedShipment = mode === "create" && formData.recipientName.trim() !== "";

      if (!hasFoundCorrectTracking && !hasCreatedShipment) {
        toast.warning("Acción requerida", {
          description: "Debes encontrar el código de barras correcto o registrar la información del paquete antes de cerrar.",
          duration: 5000, // 5 segundos para que el usuario lo note bien
        });
        return; // No cerrar la modal
      }
    }

    // Si todo está bien, cerrar la modal
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseAttempt}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {mode === "search" ? "Corregir Número de Guía" : "Crear Nuevo Shipment"}
          </DialogTitle>
          <DialogDescription>
            {mode === "search"
              ? "El número de guía escaneado no fue encontrado. Valida el paquete físico e ingresa el número correcto."
              : "Completa el formulario para crear un nuevo shipment o charge shipment."
            }
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>El número de guía no se encontró</strong>
            <br />
            Favor de validar físicamente que el número escaneado es correcto.
          </AlertDescription>
        </Alert>

        {/* Tabs para cambiar de modo */}
        <Tabs value={mode} onValueChange={(value) => setMode(value as ModalMode)} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Buscar Tracking Correcto
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Crear Nuevo
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* MODO BÚSQUEDA */}
        {mode === "search" && (
          <form onSubmit={handleSearchSubmit} className="space-y-6 mt-4">
            {/* Número Original (Escaneado) */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Número de Guía Escaneado
              </Label>
              <Input
                value={scannedTrackingNumber}
                disabled
                className="bg-red-50 border-red-200 text-red-800 font-mono"
              />
            </div>

            {/* Número Correcto */}
            <div className="space-y-2">
              <Label htmlFor="correctedTracking" className="text-sm font-medium flex items-center gap-2">
                <Search className="h-4 w-4" />
                Número de Tracking Correcto *
              </Label>
              <Input
                id="correctedTracking"
                value={correctedTracking}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 12);
                  setCorrectedTracking(value);
                }}
                placeholder="Ingresa o escanea el número correcto (12 dígitos)"
                className="font-mono"
                required
                autoFocus
              />
              {searchLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Buscando información del paquete...
                </div>
              )}
              {searchError && (
                <p className="text-sm text-destructive">{searchError}</p>
              )}
            </div>

            {/* Información del Paquete Encontrado */}
            {packageInfo && (
              <div className="space-y-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800 font-medium">
                  <Package className="h-4 w-4" />
                  Paquete Encontrado
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Nombre</Label>
                    <p className="font-medium">{packageInfo.recipient.name || "-"}</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Teléfono</Label>
                    <p className="font-medium">{packageInfo.recipient.phoneNumber || "-"}</p>
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label className="text-xs text-muted-foreground">Dirección</Label>
                    <p className="font-medium">{packageInfo.recipient.address || "-"}</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Ciudad</Label>
                    <p className="font-medium">{packageInfo.recipient.city || "-"}</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Código Postal</Label>
                    <p className="font-medium">{packageInfo.recipient.zipCode || "-"}</p>
                  </div>

                  {packageInfo.prority && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Prioridad</Label>
                      <p className="font-medium uppercase">{packageInfo.prority}</p>
                    </div>
                  )}

                  {packageInfo.commitDateTime && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Fecha de Compromiso</Label>
                      <p className="font-medium">
                        {new Date(packageInfo.commitDateTime).toLocaleDateString("es-MX", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={true}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || !packageInfo || searchLoading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Corrigiendo...
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4 mr-2" />
                    Corregir y Agregar
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        {/* MODO CREACIÓN */}
        {mode === "create" && (
          <form onSubmit={handleCreateSubmit} className="space-y-6 mt-4">
            {/* Información Básica */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Package className="h-4 w-4" />
                Información Básica
              </h3>

              <div className="space-y-2">
                <Label htmlFor="confirmedTracking" className="text-sm font-medium flex items-center gap-2">
                  Número de Tracking *
                </Label>
                <Input
                  id="confirmedTracking"
                  value={confirmedTracking}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 12);
                    setConfirmedTracking(value);
                  }}
                  placeholder="Escanea el número de tracking (12 dígitos)"
                  className="font-mono"
                  required
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Si escribiste un código en "Buscar Tracking Correcto", aparecerá aquí. Puedes escanearlo de nuevo para confirmar.
                </p>
              </div>

              {/*
                CAMPOS OCULTOS - Por defecto siempre son los mismos valores:
                - Tipo de Envío: FEDEX (siempre)
                - Estado: EN_RUTA (siempre)
                - Fecha de Compromiso: Hoy a las 9pm Hermosillo (siempre)

                Estos campos se prellenan automáticamente al abrir la modal
                y no se muestran al usuario para simplificar la interfaz.
              */}
            </div>

            {/* Información del Destinatario */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4" />
                Información del Destinatario
              </h3>

              <div className="space-y-2">
                <Label htmlFor="recipientName">Nombre Completo</Label>
                <Input
                  id="recipientName"
                  value={formData.recipientName}
                  onChange={(e) => updateFormData("recipientName", e.target.value)}
                  placeholder="Nombre del destinatario"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipientAddress">Dirección</Label>
                <Input
                  id="recipientAddress"
                  value={formData.recipientAddress}
                  onChange={(e) => updateFormData("recipientAddress", e.target.value)}
                  placeholder="Calle, número, colonia"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="recipientCity">Ciudad</Label>
                  <Input
                    id="recipientCity"
                    value={formData.recipientCity}
                    onChange={(e) => updateFormData("recipientCity", e.target.value)}
                    placeholder="Ciudad"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipientZip">Código Postal</Label>
                  <Input
                    id="recipientZip"
                    value={formData.recipientZip}
                    onChange={(e) => updateFormData("recipientZip", e.target.value)}
                    placeholder="12345"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipientPhone">Teléfono</Label>
                <Input
                  id="recipientPhone"
                  type="tel"
                  value={formData.recipientPhone}
                  onChange={(e) => updateFormData("recipientPhone", e.target.value)}
                  placeholder="+52 123 456 7890"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isHighValue"
                  checked={formData.isHighValue}
                  onCheckedChange={(checked) => updateFormData("isHighValue", checked as boolean)}
                />
                <Label htmlFor="isHighValue" className="font-normal cursor-pointer">
                  Paquete de alto valor
                </Label>
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={true}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || isCreating}>
                {(loading || isCreating) ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Shipment
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}