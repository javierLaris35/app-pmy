"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Loader2, Package, Search, X, FileText } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { searchPackageInfo } from "@/lib/services/shipments";
import { SearchShipmentDto } from "@/lib/types";
import { toast } from "@/lib/toast";
import { ManualShipmentForm } from "@/components/shipments/manual-shipment-form";
import { CreatedManualShipment, prefillFromScannedCode } from "@/lib/manual-shipment";

type ModalMode = "search" | "create";

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
  /**
   * Alta manual exitosa. `created` = paquete/carga que devolvió el backend (id
   * real); `originalCode` = el sobrante escaneado que se está resolviendo.
   */
  onCreate?: (created: CreatedManualShipment, originalCode: string) => void;
}

export function CorrectTrackingModal({
  isOpen,
  onClose,
  scannedTrackingNumber,
  subsidiaryName,
  subsidiaryId,
  onCorrect,
  onCreate,
}: CorrectTrackingModalProps) {
  const [mode, setMode] = useState<ModalMode>("search");
  const [correctedTracking, setCorrectedTracking] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [packageInfo, setPackageInfo] = useState<SearchShipmentDto | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Limpiar estado al abrir/cerrar
  useEffect(() => {
    setMode("search");
    setPackageInfo(null);
    setSearchError(null);
    setCorrectedTracking(isOpen ? scannedTrackingNumber || "" : "");
  }, [isOpen, scannedTrackingNumber]);

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
        setSearchError("No se encontró información del paquete. Verifica el número de guía.");
        setPackageInfo(null);
      } finally {
        setSearchLoading(false);
      }
    }, 800);

    return () => clearTimeout(timeout);
  }, [correctedTracking, mode]);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!correctedTracking || correctedTracking.length !== 12) {
      setSearchError("El número de guía debe tener 12 números");
      return;
    }

    if (!packageInfo) {
      setSearchError("Primero busca y valida el número de guía correcto");
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
      toast.error("Error", {
        description: "No se pudo corregir la guía. Intenta de nuevo."
      });
    } finally {
      setLoading(false);
    }
  };

  // Prellenado del alta manual con el código escaneado (FedEx o pieza DHL).
  const createInitialValues = useMemo(
    () => ({ ...prefillFromScannedCode(scannedTrackingNumber), recipientCity: subsidiaryName ?? "" }),
    [scannedTrackingNumber, subsidiaryName],
  );

  const handleCloseAttempt = (open: boolean) => {
    if (!open) {
      // Cerrar por fuera/Escape solo si ya se resolvió la búsqueda; si no, se
      // pide usar "Cancelar" (evita cerrar por accidente a medio escaneo).
      const hasFoundCorrectTracking = mode === "search" && packageInfo !== null;
      if (!hasFoundCorrectTracking) {
        toast.warning("Acción requerida", {
          description: "Encuentra la guía correcta o registra el paquete. Si no, usa Cancelar.",
          duration: 5000,
        });
        return;
      }
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseAttempt}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {mode === "search" ? "Corregir número de guía" : "Registrar paquete nuevo"}
          </DialogTitle>
          <DialogDescription>
            {mode === "search"
              ? "La guía escaneada no se encontró. Revisa el paquete físico y escribe el número correcto."
              : "Captura los datos de la etiqueta. FedEx por defecto; puedes cambiar a DHL o registrarlo como carga."
            }
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>La guía {scannedTrackingNumber} no se encontró</strong>
            <br />
            Revisa físicamente que el número escaneado sea correcto.
          </AlertDescription>
        </Alert>

        {/* Tabs para cambiar de modo */}
        <Tabs value={mode} onValueChange={(value) => setMode(value as ModalMode)} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Buscar guía correcta
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Crear nuevo
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* MODO BÚSQUEDA */}
        {mode === "search" && (
          <form onSubmit={handleSearchSubmit} className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Guía escaneada</Label>
              <Input
                value={scannedTrackingNumber}
                disabled
                className="bg-red-50 border-red-200 text-red-800 font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="correctedTracking" className="text-sm font-medium flex items-center gap-2">
                <Search className="h-4 w-4" />
                Guía correcta *
              </Label>
              <Input
                id="correctedTracking"
                value={correctedTracking}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 12);
                  setCorrectedTracking(value);
                }}
                placeholder="Escribe o escanea la guía correcta (12 números)"
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

            {packageInfo && (
              <div className="space-y-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800 font-medium">
                  <Package className="h-4 w-4" />
                  Paquete encontrado
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
                    <Label className="text-xs text-muted-foreground">Código postal</Label>
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
                      <Label className="text-xs text-muted-foreground">Fecha de entrega</Label>
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

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading || searchLoading}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !packageInfo || searchLoading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Corrigiendo...
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4 mr-2" />
                    Corregir y agregar
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        {/* MODO CREACIÓN: mismo formulario que el "+" del header */}
        {mode === "create" && (
          <div className="mt-4">
            {subsidiaryId ? (
              <ManualShipmentForm
                key={scannedTrackingNumber}
                subsidiary={{ id: subsidiaryId, name: subsidiaryName }}
                initialValues={createInitialValues}
                onCancel={onClose}
                onCreated={(created) => {
                  toast.success(created.isCharge ? "Carga registrada" : "Paquete registrado", {
                    description: `${created.dhlUniqueId || created.trackingNumber} se agregó a los válidos.`,
                  });
                  onCreate?.(created, scannedTrackingNumber);
                  onClose();
                }}
              />
            ) : (
              <p className="text-sm text-destructive">Selecciona una sucursal antes de registrar paquetes.</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
