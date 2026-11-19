"use client";

import { PmyLoader, PmySpinner } from "@/components/ui/pmy-loader";
import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from "react";
import useSWR from "swr";
import useUnloadingStore from "@/store/unloading.store";
import { UnidadSelector } from "@/components/selectors/unidad-selector";
import { initSounds, playSound, speak } from "@/lib/sounds";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { toast as notify } from "@/lib/toast";
import { AlertTriangle, ArrowLeft, CheckCheck, Download, Keyboard, MailIcon, MapPin, MoreHorizontal, Package, PackageCheckIcon, Phone, Search, Send, Trash2, User, X } from "lucide-react";
import { OperationHeader } from "@/components/shared/operation-header";
import { Pill } from "@/components/shared/status-pill";
import { PackagesList } from "@/components/shared/packages-list";
import { saveUnloading, uploadPDFile, getUnloadingSessionInit, validateOne, getUnloadingConsolidatedByConsNumber } from "@/lib/services/unloadings";
import type { CreatedManualShipment } from "@/lib/manual-shipment";
import { variantOf } from "@/components/scanner/scan-normalize";
import { Consolidateds, ConsolidatedDetails, ConsolidatedInitItem, PackageInfo, PackageInfoForUnloading, Unloading, UnloadingFormData, UnloadingSaveResult, UnloadingSessionInit, ValidatedUnloadingOne } from "@/lib/types";
import { ScanInput, ScanInputHandle } from "@/components/scanner/scan-input";
import { clearScanBuffer } from "@/components/scanner/use-scan-buffer";
import { cn } from "@/lib/utils";
import { UnloadingPDFReport } from "@/lib/services/unloading/unloading-pdf-generator";
import { pdf } from "@react-pdf/renderer";
import { generateUnloadingExcelClient } from "@/lib/services/unloading/unloading-excel-generator";
import { normalizeScannedCode, isValidScannedCode } from "@/lib/tracking/normalize-scan";
import ConsolidateDetails from "./consolidate-details";
import { UnloadingCounters, type UnloadingTab } from "./unloading-capture-sidebar";
import { LastReadCard } from "@/components/operaciones/inventory/inventory-capture-sidebar";
import { InventoryPackageToolbar, useInventoryPackageView } from "@/components/operaciones/inventory/inventory-package-view";
import { countQuickFilters, findScannedPackage, matchesQuickFilter, type QuickFilterKey } from "@/lib/inventory-quick-filters";
import { nextAlertDay } from "@/lib/next-operating-day";
import { getHolidays } from "@/lib/services/holidays/holidays";
import { moveLegacyUnloadingScanBuffer, unloadingScanKey } from "@/lib/unloading-draft";
import { apiError } from "@/components/maintenance/shared/confirm-action";
import { ShortcutsDialog } from "@/components/warehouse/shared/shortcuts-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { LoaderWithOverlay } from "@/components/loader";
import { CorrectTrackingModal } from "./correct-tracking-modal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

// Convierte la respuesta de session-init en la estructura Consolidateds que usa
// el store: cada consolidado arranca con added vacío y notFound = universo
// esperado (para contar faltantes en cliente sin reenviar la lista al backend).
function seedConsolidatedFromInit(data: UnloadingSessionInit): Consolidateds {
  const toDetails = (item: ConsolidatedInitItem): ConsolidatedDetails => ({
    id: item.id,
    type: item.type,
    typeCode: item.typeCode,
    numberOfPackages: item.numberOfPackages,
    consNumber: item.consNumber,
    color: item.color,
    icon: null,
    added: [],
    notFound: (item.expected || []).map((e) => ({
      trackingNumber: e.trackingNumber,
      dhlUniqueId: e.dhlUniqueId,
      recipientName: e.recipientName,
      recipientAddress: e.recipientAddress,
      recipientPhone: e.recipientPhone,
      recipientZip: e.recipientZip,
    })),
  });

  return {
    airConsolidated: (data.airConsolidated || []).map(toDetails),
    groundConsolidated: (data.groundConsolidated || []).map(toDetails),
    f2Consolidated: (data.f2Consolidated || []).map(toDetails),
  };
}

// Identidad ÚNICA por pieza para el conteo (agregados / faltantes).
// DHL comparte trackingNumber (guía maestra / AWB) entre las piezas de una misma
// guía; el identificador único por pieza es el dhlUniqueId (JD), que es lo que se
// escanea. FedEx usa su trackingNumber. Casar por trackingNumber colapsaba las
// piezas DHL de una guía y las dejaba a todas como faltantes: por eso se cuenta
// por JD, y sólo se cae al trackingNumber cuando no hay JD (DHL viejo sin PID).
function pieceKey(x: { trackingNumber?: string | null; dhlUniqueId?: string | null } | null | undefined): string {
  return ((x?.dhlUniqueId || x?.trackingNumber) || "").trim().toUpperCase();
}

// Aplica los escaneos válidos ya realizados sobre una lista de consolidados recién
// sembrada (mueve cada guía de notFound a added según su consolidatedId), para no
// perder el avance al recargar o al agregar un consolidado por número.
function applyScannedToConsolidateds(seeded: Consolidateds, validScanned: any[]): Consolidateds {
  const cloneGroup = (arr: ConsolidatedDetails[]) =>
    (arr || []).map((c) => ({ ...c, added: [...(c.added || [])], notFound: [...(c.notFound || [])] }));
  const clone: Consolidateds = {
    airConsolidated: cloneGroup(seeded.airConsolidated),
    groundConsolidated: cloneGroup(seeded.groundConsolidated),
    f2Consolidated: cloneGroup(seeded.f2Consolidated),
  };
  const groups = [clone.airConsolidated, clone.groundConsolidated, clone.f2Consolidated];
  for (const r of validScanned) {
    if (!r?.isValid || !r?.consolidatedId) continue;
    for (const g of groups) {
      const c = g.find((x) => x.id === r.consolidatedId);
      if (!c) continue;
      if (!c.added.some((a) => pieceKey(a) === pieceKey(r))) {
        c.added.push({
          trackingNumber: r.trackingNumber,
          dhlUniqueId: r.dhlUniqueId,
          recipientName: r.recipientName,
          recipientAddress: r.recipientAddress,
          recipientPhone: r.recipientPhone,
          recipientZip: r.recipientZip,
        } as any);
      }
      c.notFound = c.notFound.filter((m) => pieceKey(m) !== pieceKey(r));
      break;
    }
  }
  return clone;
}

// Fusiona consolidados nuevos (p.ej. traídos por búsqueda de consNumber) en la
// estructura existente, reemplazando por id para no duplicar.
function mergeConsolidateds(prev: Consolidateds | null, add: Consolidateds): Consolidateds {
  const base: Consolidateds = prev ?? { airConsolidated: [], groundConsolidated: [], f2Consolidated: [] };
  const mergeGroup = (prevArr: ConsolidatedDetails[], addArr: ConsolidatedDetails[]) => {
    const map = new Map((prevArr || []).map((c) => [c.id, c]));
    (addArr || []).forEach((c) => map.set(c.id, c));
    return Array.from(map.values());
  };
  return {
    airConsolidated: mergeGroup(base.airConsolidated, add.airConsolidated),
    groundConsolidated: mergeGroup(base.groundConsolidated, add.groundConsolidated),
    f2Consolidated: mergeGroup(base.f2Consolidated, add.f2Consolidated),
  };
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



interface Props {
  subsidiaryId: string;
  subsidiaryName: string;
  /** Sucursal del usuario: se queda con una captura vieja (de antes de separarlas por sucursal). */
  homeSubsidiaryId: string | null;
  /** Al procesar: regresa al historial. */
  onSaved: (saved: Unloading | null) => void;
  onExit: () => void;
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

/**
 * Activa la captura de ESTA sucursal antes de pintar nada (las demás quedan guardadas aparte) y
 * luego monta la captura. Así ningún efecto ni el escáner alcanzan a ver la captura de otra sucursal.
 */
export default function UnloadingForm(props: Props) {
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    const { legacyOwner, droppedIds, droppedOpened } = useUnloadingStore
      .getState()
      .activateSubsidiary(props.subsidiaryId, props.homeSubsidiaryId);
    if (legacyOwner) moveLegacyUnloadingScanBuffer(legacyOwner);
    // Capturas de más de 2 días sin movimiento: también se borra lo que quedó en su escáner.
    droppedIds.forEach((id) => clearScanBuffer(unloadingScanKey(id)));
    if (droppedOpened) {
      notify.info("Se borró una captura de hace más de 2 días", { description: "Tenía más de 2 días sin movimiento. Empieza de nuevo." });
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!ready) return <PmyLoader size="sm" className="h-[300px]" />;
  return <UnloadingCapture {...props} />;
}

function UnloadingCapture({
  subsidiaryId: selectedSubsidiaryId,
  subsidiaryName: selectedSubsidiaryName,
  onSaved,
  onExit,
}: Props) {
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
  const consolidatedValidation = useUnloadingStore((s) => s.consolidatedValidation);
  const setConsolidatedValidation = useUnloadingStore((s) => s.setConsolidatedValidation);
  const selectedConsolidatedIds = useUnloadingStore((s) => s.selectedConsolidatedIds);
  const setSelectedConsolidatedIds = useUnloadingStore((s) => s.setSelectedConsolidatedIds);

  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [lastValidated, setLastValidated] = useState("");
  const [isValidationPackages, setIsValidationPackages] = useState(false);
  const [isOnline, setIsOnline] = useState(true);


  const [completeDataModalOpen, setCompleteDataModalOpen] = useState(false);
  const [selectedPackageForData, setSelectedPackageForData] = useState<Shipment | null>(null);

  const [correctTrackingModalOpen, setCorrectTrackingModalOpen] = useState(false);
  const [selectedTrackingToCorrect, setSelectedTrackingToCorrect] = useState<string>("");

  const barScannerInputRef = useRef<ScanInputHandle>(null);
  const { toast } = useToast();

  const safeArray = <T,>(arr: T[] | undefined | null): T[] => {
    if (Array.isArray(arr)) return arr;
    return [];
  };

  const safeScannedPackages = useMemo(() => safeArray(scannedPackages), [scannedPackages]);
  const safeShipments = useMemo(() => safeArray(shipments), [shipments]);
  const safeMissingPackages = useMemo(() => safeArray(missingPackages), [missingPackages]);
  const safeSurplusTrackings = useMemo(() => safeArray(surplusTrackings), [surplusTrackings]);

  const validShipments = useMemo(() => safeShipments.filter((p) => p.isValid), [safeShipments]);

  const handleConsolidateSelectionChange = useCallback((ids: string[]) => {
    queueMicrotask(() => setSelectedConsolidatedIds(ids));
  }, [setSelectedConsolidatedIds]);
  
  // Voz del módulo común: va en fila, después del beep, y la frase nueva reemplaza a la anterior.
  const speakMessage = useCallback((text: string) => speak(text), []);

  // Los datos de contacto (nombre/dirección/teléfono) NO bloquean "Procesar": el
  // desembarque solo envía los ids de las guías, así que exigirlos detenía la
  // operación por una guía sin teléfono (p. ej. alta manual) sin guardar nada.

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

  // Alta manual de un sobrante (guía que no venía en la carga). El backend ya
  // creó el shipment/carga; aquí se REEMPLAZA la fila inválida del código
  // escaneado por la válida (antes se agregaba un duplicado) usando el id real
  // del backend (antes `created-<fecha>`, que rompía "Procesar"), se saca de
  // Sobrantes y se refleja en el escáner. DHL-aware (JD/JJD).
  const handleCreateShipment = useCallback((created: CreatedManualShipment, originalCode: string) => {
    if (!created?.id) {
      toast({ title: "Paquete sin id", description: "El servidor no devolvió el id del paquete. Vuelve a escanearlo.", variant: "destructive" });
      return;
    }

    const up = (c?: string | null) => String(c ?? "").trim().toUpperCase();
    const withVariants = (c?: string | null) => (up(c) ? [up(c), variantOf(up(c))] : []);
    const createdKey = up(created.dhlUniqueId || created.trackingNumber);
    const drop = new Set([...withVariants(originalCode), ...withVariants(createdKey)]);
    const sameAsScanned = withVariants(originalCode).includes(createdKey);

    const newShipment: PackageInfoForUnloading = {
      id: created.id,
      trackingNumber: created.trackingNumber,
      dhlUniqueId: created.dhlUniqueId || undefined,
      recipientName: created.recipientName || undefined,
      recipientAddress: created.recipientAddress || undefined,
      recipientPhone: created.recipientPhone || undefined,
      recipientCity: created.recipientCity || undefined,
      recipientZip: created.recipientZip || undefined,
      commitDateTime: created.commitDateTime || undefined,
      shipmentType: created.shipmentType,
      priority: (created.priority ?? "media") as Priority,
      isHighValue: !!created.isHighValue,
      isCharge: created.isCharge,
      isValid: true,
    };

    setShipments(prev => [
      ...prev.filter(p => !drop.has(up(pieceKey(p))) && !drop.has(up(p.trackingNumber))),
      newShipment,
    ]);
    setSurplusTrackings(prev => prev.filter(t => !drop.has(up(t))));

    // Escáner: si se registró el mismo código escaneado, se marca válido en su
    // lugar; si se capturó otra guía, se quita el código escaneado erróneo.
    if (sameAsScanned) barScannerInputRef.current?.updateValidatedPackages([newShipment as unknown as PackageInfo]);
    else if (originalCode) barScannerInputRef.current?.removeByTracking(originalCode);
  }, [setShipments, setSurplusTrackings, toast]);

  const updateMissingPackages = useCallback((currentShipments: PackageInfoForUnloading[], currentConsolidateds: Consolidateds | null) => {
    if (!currentConsolidateds) return [];
    // Identidad por pieza (JD/dhlUniqueId o trackingNumber), consistente con el
    // conteo: así las piezas DHL válidas dejan de contarse como faltantes.
    const validKeys = new Set(currentShipments.filter(p => p.isValid).map(p => pieceKey(p)));
    const allConsolidateds = Object.values(currentConsolidateds).flat();
    const relevantConsolidateds = allConsolidateds.filter(c => c.added?.some((t: any) => validKeys.has(pieceKey(t))));
    const updatedMissing: any[] = [];
    relevantConsolidateds.forEach(c => {
      (c.notFound || []).forEach((m: any) => {
        if (!validKeys.has(pieceKey(m))) {
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
  }, []);

  const getDaysUntilExpiration = useCallback((commitDateTime?: string | null) => {
    if (!commitDateTime) return -1;
    const commitDate = new Date(commitDateTime);
    const today = new Date();
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const commitOnly = new Date(commitDate.getFullYear(), commitDate.getMonth(), commitDate.getDate());
    const diffMs = commitOnly.getTime() - todayOnly.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  }, []);

  // Sonidos del escáner: módulo común `lib/sounds` (el mismo de inventario, salidas y bodega).
  const playExpirationSound = useCallback(() => playSound("expiresToday"), []);
  const playTomorrowExpirationSound = useCallback(() => playSound("expiresTomorrow"), []);
  // Sobrante (guía escaneada que no estaba en el manifiesto) = no encontrada.
  const playSurplusSound = useCallback(() => playSound("notFound"), []);
  // Formato de guía inválido.
  const playInvalidSnd = useCallback(() => playSound("invalid"), []);

  // Prepara el audio y lo desbloquea con el primer gesto (regla de autoplay del navegador).
  useEffect(() => {
    initSounds();
  }, []);

  // Aviso de vencimiento SIN ventana (como inventarios): voz + sonido y la pastilla en "Última
  // lectura". La ventana vieja nunca se abría (faltaba abrirla) y en inventarios se quitó porque
  // cortaba el escaneo. Solo llegan guías NUEVAS, así que no se repite el aviso.
  const handleExpirationCheck = useCallback((newShipments: PackageInfoForUnloading[]) => {
    const days = newShipments
      .filter(pkg => pkg.isValid && pkg.commitDateTime)
      .map(pkg => getDaysUntilExpiration(pkg.commitDateTime));
    if (days.includes(0)) {
      speakMessage("Vence hoy");
      playExpirationSound();
      return true;
    }
    if (days.includes(1)) {
      speakMessage("Vence mañana");
      playTomorrowExpirationSound();
      return true;
    }
    return false;
  }, [getDaysUntilExpiration, speakMessage, playExpirationSound, playTomorrowExpirationSound]);

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
  
  // Guías que no se pudieron validar (sin internet o error del servidor): se quitan de la lista
  // y se vuelven a validar por el camino normal (uno por uno), que además actualiza faltantes,
  // sobrantes y consolidados. Antes se mandaban a otro endpoint que no actualizaba nada de eso.
  const retryPending = useCallback(() => {
    const pending = (useUnloadingStore.getState().shipments || []).filter(p => p.isOffline);
    if (pending.length === 0) return;
    setShipments(prev => prev.filter(p => !p.isOffline));
    setLastValidated("");
  }, [setShipments]);

  useEffect(() => {
    const wasOffline = !prevIsOnlineRef.current;
    prevIsOnlineRef.current = isOnline;
    if (wasOffline && isOnline) retryPending();
  }, [isOnline, retryPending]);

  // Validación UNO POR UNO (como inventarios). En cada escaneo solo se validan
  // las guías NUEVAS con una llamada validate-one por guía (payload mínimo), en
  // vez de reenviar toda la lista al batch. El conteo por consolidado se mantiene
  // en cliente sobre consolidatedValidation (sembrado por session-init).
  const handleValidatePackages = useCallback(async () => {
    if (isLoading || isValidationPackages) return;

    if (!selectedSubsidiaryId) {
      toast({ title: "Error", description: "Selecciona una sucursal antes de validar.", variant: "destructive" });
      return;
    }

    const trackingNumbers: string[] = safeScannedPackages.map((p: any) => p.trackingNumber);
    // Aceptamos FedEx (numérico) y DHL (JD/JJD o numérico de 18). El filtro previo
    // (/^\d{10,12}$/) descartaba TODO DHL, por eso los JD/JJD "no se leían".
    const validNumbers = trackingNumbers.filter(t => isValidScannedCode(normalizeScannedCode(t)));
    const invalidNumbers = trackingNumbers.filter(t => !isValidScannedCode(normalizeScannedCode(t)));

    if (validNumbers.length === 0) return;

    const currentShipments: PackageInfoForUnloading[] = Array.isArray(shipments) ? shipments : [];
    // Clave DHL-aware: una guía ya escaneada puede estar guardada por su
    // trackingNumber canónico o por su dhlUniqueId (JD/JJD). Contemplamos ambas
    // para no re-enviar al backend la misma guía escaneada por otra variante.
    const alreadyTns = new Set<string>();
    for (const p of currentShipments) {
      if (p.trackingNumber) alreadyTns.add(p.trackingNumber);
      if ((p as any).dhlUniqueId) alreadyTns.add((p as any).dhlUniqueId);
    }
    // Solo las guías que aún no están en shipments (nuevas).
    const newNumbers = validNumbers.filter(tn => !alreadyTns.has(tn));

    setIsValidationPackages(true);

    try {
      // Validación uno por uno RESILIENTE: el fallo de UNA guía (500/red) ya no
      // aborta el lote; las demás se cuentan igual. Antes un solo error tiraba
      // toda la tanda y "dejaba de contar".
      const settled: { code: string; result?: ValidatedUnloadingOne; failed?: boolean }[] = [];
      for (const tn of newNumbers) {
        try {
          const r = await validateOne(tn, selectedSubsidiaryId);
          settled.push({ code: tn, result: r });
        } catch (err) {
          console.error(`Error validando ${tn}:`, err);
          settled.push({ code: tn, failed: true });
        }
      }
      const results = settled.filter(s => s.result).map(s => s.result!);
      const failedCodes = settled.filter(s => s.failed).map(s => s.code);

      // Dedup por IDENTIDAD DE PIEZA (JD si existe, si no trackingNumber). Antes
      // deduplicaba por trackingNumber O dhlUniqueId: como las piezas DHL comparten
      // la guía maestra, al escanear la 2ª pieza de una guía se descartaba por
      // "ya presente". Con pieceKey cada pieza distinta (distinto JD) se agrega.
      const alreadyKeys = new Set<string>();
      for (const p of currentShipments) {
        const k = pieceKey(p);
        if (k) alreadyKeys.add(k);
      }
      const resultsToAdd: ValidatedUnloadingOne[] = [];
      for (const r of results) {
        const rk = pieceKey(r);
        if (!rk || alreadyKeys.has(rk)) continue;
        alreadyKeys.add(rk);
        resultsToAdd.push(r);
      }
      const newShipments = resultsToAdd.map(r => ({ ...r })) as unknown as PackageInfoForUnloading[];

      // Guías cuya validación FALLÓ (no cuya validación dio "no encontrado"): se
      // conservan como pendientes para no perderlas y reintentar al reconectar.
      const pendingShipments = failedCodes
        .filter(tn => !alreadyKeys.has(tn))
        .map(tn => ({
          id: `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          trackingNumber: tn,
          isValid: false,
          isOffline: true,
          reason: isOnline ? "No se pudo validar (reintentar)" : "Sin conexión - validar al reconectar",
          createdAt: new Date(),
        } as unknown as PackageInfoForUnloading));

      const updatedShipments = [...currentShipments, ...newShipments, ...pendingShipments];

      if (barScannerInputRef.current?.updateValidatedPackages) {
        barScannerInputRef.current.updateValidatedPackages(updatedShipments);
      }

      setShipments(updatedShipments);
      const announcedExpiration = handleExpirationCheck(newShipments);

      // Feedback sonoro "Registrado" al agregar guías válidas, igual que en
      // Bodega → Entrada (warehouse-scan.ts). Se omite si el aviso de vencimiento
      // ya habló ("Vence hoy/mañana") para no encimar audios.
      // Solo guías VÁLIDAS: una no encontrada también llega en newShipments y antes decía
      // "Registrado" y luego "no se encontró".
      if (newShipments.some(p => p.isValid) && !announcedExpiration) {
        speakMessage("Registrado");
      }

      // Casa una guía (resultado) contra un item por su IDENTIDAD DE PIEZA
      // (dhlUniqueId/JD si existe; si no, trackingNumber). Antes casaba por
      // trackingNumber O dhlUniqueId, y como las piezas DHL comparten la guía
      // maestra, escanear una pieza sacaba de "faltantes" a TODAS las de esa guía
      // (o no dejaba entrar las demás). Con pieceKey cada pieza cuenta por su JD.
      const sameGuide = (m: any, r: ValidatedUnloadingOne) => {
        const a = pieceKey(m), b = pieceKey(r);
        return !!a && a === b;
      };

      // Actualiza el conteo por consolidado en cliente: mueve cada guía válida de
      // notFound a added dentro del consolidado indicado por consolidatedId.
      let nextConsolidated = consolidatedValidation;
      if (nextConsolidated) {
        const cloneGroup = (arr: ConsolidatedDetails[]) =>
          (arr || []).map(c => ({ ...c, added: [...(c.added || [])], notFound: [...(c.notFound || [])] }));
        const clone: Consolidateds = {
          airConsolidated: cloneGroup(nextConsolidated.airConsolidated),
          groundConsolidated: cloneGroup(nextConsolidated.groundConsolidated),
          f2Consolidated: cloneGroup(nextConsolidated.f2Consolidated),
        };
        const groups = [clone.airConsolidated, clone.groundConsolidated, clone.f2Consolidated];
        // Consolidados que reciben al menos una guía en este escaneo → se
        // autoseleccionan y suben al tope de la lista (el usuario no pierde el foco).
        const touchedConsolidatedIds = new Set<string>();
        for (const r of resultsToAdd) {
          if (!r.isValid || !r.consolidatedId) continue;
          for (const g of groups) {
            const c = g.find(x => x.id === r.consolidatedId);
            if (!c) continue;
            if (!c.added.some(a => sameGuide(a, r))) {
              c.added.push({
                trackingNumber: r.trackingNumber,
                dhlUniqueId: r.dhlUniqueId,
                recipientName: r.recipientName,
                recipientAddress: r.recipientAddress,
                recipientPhone: r.recipientPhone,
                recipientZip: r.recipientZip,
              });
            }
            c.notFound = c.notFound.filter(m => !sameGuide(m, r));
            touchedConsolidatedIds.add(c.id);
            break;
          }
        }
        nextConsolidated = clone;
        setConsolidatedValidation(clone);

        // Autoselección de los consolidados a los que se está agregando.
        if (touchedConsolidatedIds.size > 0) {
          setSelectedConsolidatedIds(
            Array.from(new Set([...(selectedConsolidatedIds || []), ...touchedConsolidatedIds]))
          );
        }
      }

      const newMissing = updateMissingPackages(updatedShipments, nextConsolidated);
      setMissingPackages(newMissing);

      // Conjunto de claves (trackingNumber + dhlUniqueId) de TODAS las guías
      // válidas: una guía escaneada que exista aquí NO es sobrante.
      const validKeySet = new Set<string>();
      for (const p of updatedShipments) {
        if (!p.isValid) continue;
        if (p.trackingNumber) validKeySet.add(p.trackingNumber);
        if ((p as any).dhlUniqueId) validKeySet.add((p as any).dhlUniqueId);
      }

      // Sobrante = guía escaneada cuyo resultado NO fue válido (no encontrada / de
      // otra sucursal) + formato inválido. Se asocia CADA código con SU resultado
      // (no por comparar strings), así un DHL válido escaneado por su dhlUniqueId
      // ya no cae como falso "sobrante". Se conserva lo acumulado y se depura lo
      // que ya quedó válido.
      const surplusFromResults = settled
        .filter(s => s.result && !s.result.isValid)
        .map(s => s.code);
      const prevSurplus = safeArray(surplusTrackings);
      const allSurplus = Array.from(new Set([...prevSurplus, ...invalidNumbers, ...surplusFromResults]))
        .filter(code => !validKeySet.has(code));
      const newSurplusItems = allSurplus.filter(s => !prevSurplus.includes(s));

      if (newSurplusItems.length > 0) {
        speakMessage("La guía no se encontró. Por favor, verifica.");
        // Sonido diferenciado: formato inválido vs. sobrante (no encontrada en manifiesto).
        const hasNewInvalid = newSurplusItems.some(s => invalidNumbers.includes(s));
        try {
          if (hasNewInvalid) playInvalidSnd();
          else playSurplusSound();
        } catch (err) {}
      }

      setSurplusTrackings(allSurplus);
      // Sin aviso por cada escaneo: los conteos de la izquierda y "Última lectura" ya lo muestran.
    } catch (error) {
      console.error("Error validating packages:", error);
      toast({ title: "Error", description: "Hubo un problema al validar los paquetes.", variant: "destructive" });
    } finally {
      setIsValidationPackages(false);
      setTimeout(() => { try { barScannerInputRef.current?.focus(); } catch {} }, 150);
    }
  }, [
    isLoading, isValidationPackages, selectedSubsidiaryId, safeScannedPackages, shipments, consolidatedValidation, speakMessage, surplusTrackings, updateMissingPackages, isOnline, setShipments, setMissingPackages, setSurplusTrackings, setConsolidatedValidation, handleExpirationCheck, toast, playSurplusSound, playInvalidSnd, selectedConsolidatedIds, setSelectedConsolidatedIds
  ]);

  const shipmentsArray = useMemo(() => Array.isArray(shipments) ? shipments : [], [shipments]);

  // Carga el universo esperado por consolidado UNA sola vez al iniciar la sesión.
  // Si ya hay consolidatedValidation (sesión en curso persistida en el store), no
  // se re-siembra para no perder los "added" ya escaneados.
  useEffect(() => {
    if (!selectedSubsidiaryId || consolidatedValidation) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getUnloadingSessionInit(selectedSubsidiaryId);
        if (!cancelled) setConsolidatedValidation(seedConsolidatedFromInit(data));
      } catch (error) {
        console.error("Error cargando session-init:", error);
        // Antes el error se tragaba en silencio: el usuario se quedaba sin
        // conteo por consolidado y sin saber por qué. Ahora lo avisamos.
        if (!cancelled) {
          toast({
            title: "No se pudo iniciar el conteo por consolidado",
            description: "No se cargó el universo esperado; el escaneo funciona, pero el conteo de faltantes puede no reflejarse. Reintenta o recarga.",
            variant: "destructive",
          });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [selectedSubsidiaryId, consolidatedValidation, setConsolidatedValidation, toast]);

  // Recarga manual: vuelve a traer el universo esperado desde BD (por si se cargó
  // un consolidado nuevo o quedó algo en caché) SIN perder los escaneos ya hechos.
  const [reloadingConsolidateds, setReloadingConsolidateds] = useState(false);
  const reloadConsolidateds = useCallback(async () => {
    if (!selectedSubsidiaryId || reloadingConsolidateds) return;
    setReloadingConsolidateds(true);
    try {
      const data = await getUnloadingSessionInit(selectedSubsidiaryId);
      const seeded = seedConsolidatedFromInit(data);
      const validScanned = (Array.isArray(shipments) ? shipments : []).filter((p: any) => p.isValid);
      const applied = applyScannedToConsolidateds(seeded, validScanned);
      setConsolidatedValidation(applied);
      setMissingPackages(updateMissingPackages(shipments, applied));
      toast({ title: "Consolidados recargados", description: "Se actualizó la lista desde la base de datos." });
    } catch (error) {
      console.error("Error recargando consolidados:", error);
      toast({ title: "Error", description: "No se pudieron recargar los consolidados.", variant: "destructive" });
    } finally {
      setReloadingConsolidateds(false);
    }
  }, [selectedSubsidiaryId, reloadingConsolidateds, shipments, setConsolidatedValidation, setMissingPackages, updateMissingPackages, toast]);

  // Búsqueda directa por número de consolidado (consulta a BD). Lo agrega a la lista
  // y lo autoselecciona, para desembarcar un consolidado que no salió en el día.
  const searchByConsNumber = useCallback(async (consNumber: string) => {
    const cn = (consNumber || "").trim();
    if (!selectedSubsidiaryId || !cn) return;
    setReloadingConsolidateds(true);
    try {
      const item = await getUnloadingConsolidatedByConsNumber(selectedSubsidiaryId, cn);
      if (!item) {
        toast({ title: "No encontrado", description: `No existe el consolidado "${cn}" en esta sucursal.`, variant: "destructive" });
        return;
      }
      const seededItem = seedConsolidatedFromInit({
        airConsolidated: item.typeCode === "AER" ? [item] : [],
        groundConsolidated: item.typeCode === "TER" ? [item] : [],
        f2Consolidated: item.typeCode === "F2" ? [item] : [],
      });
      const validScanned = (Array.isArray(shipments) ? shipments : []).filter((p: any) => p.isValid);
      const applied = applyScannedToConsolidateds(seededItem, validScanned);
      const merged = mergeConsolidateds(consolidatedValidation, applied);
      setConsolidatedValidation(merged);
      setMissingPackages(updateMissingPackages(shipments, merged));
      setSelectedConsolidatedIds(Array.from(new Set([...(selectedConsolidatedIds || []), item.id])));
      toast({ title: "Consolidado agregado", description: `${item.type} · ${item.consNumber ?? item.id}` });
    } catch (error) {
      console.error("Error buscando consolidado por número:", error);
      toast({ title: "Error", description: "No se pudo buscar el consolidado.", variant: "destructive" });
    } finally {
      setReloadingConsolidateds(false);
    }
  }, [selectedSubsidiaryId, shipments, consolidatedValidation, selectedConsolidatedIds, setConsolidatedValidation, setMissingPackages, setSelectedConsolidatedIds, updateMissingPackages, toast]);

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

  // Quitar una guía de la lista. Se identifica por pieza (JD de DHL o guía), así quitar una
  // pieza DHL no se lleva a las demás de la misma guía (antes se buscaba solo por guía y una
  // pieza DHL no se podía quitar). También regresa la guía a "faltantes" de su consolidado.
  const handleRemovePackage = useCallback((id: string) => {
    const key = String(id ?? "").trim().toUpperCase();
    const same = (x: any) => !!key && String(pieceKey(x)).toUpperCase() === key;
    const current = useUnloadingStore.getState().shipments || [];
    const removed = current.filter(same);
    const updated = current.filter(p => !same(p));
    setShipments(updated);

    let nextConsolidated = consolidatedValidation;
    if (nextConsolidated && removed.length > 0) {
      const backToMissing = (arr: ConsolidatedDetails[]) =>
        (arr || []).map(c => {
          const out = (c.added || []).filter((a: any) => same(a));
          if (out.length === 0) return c;
          return { ...c, added: (c.added || []).filter((a: any) => !same(a)), notFound: [...(c.notFound || []), ...out] };
        });
      nextConsolidated = {
        airConsolidated: backToMissing(nextConsolidated.airConsolidated),
        groundConsolidated: backToMissing(nextConsolidated.groundConsolidated),
        f2Consolidated: backToMissing(nextConsolidated.f2Consolidated),
      };
      setConsolidatedValidation(nextConsolidated);
    }
    if (nextConsolidated) setMissingPackages(updateMissingPackages(updated, nextConsolidated));

    setScannedPackages(prev => prev.filter(p => String(pieceKey(p as any)).toUpperCase() !== key));
    barScannerInputRef.current?.removeByTracking(id);
    setSurplusTrackings(prev => prev.filter(t => String(t).toUpperCase() !== key));
  }, [consolidatedValidation, updateMissingPackages, setShipments, setScannedPackages, setSurplusTrackings, setConsolidatedValidation, setMissingPackages]);

  // ── Vista: búsqueda, paquetería/ciudad/orden (como inventarios) y conteos que filtran ──
  const { data: holidays } = useSWR("holidays", () => getHolidays(), { revalidateOnFocus: false });
  const alertDay = useMemo(() => nextAlertDay(new Date(), holidays ?? []), [holidays]);

  const [listTab, setListTab] = useState<UnloadingTab>("valid");
  const [quickFilter, setQuickFilter] = useState<QuickFilterKey | null>(null);

  const quickCounts = useMemo(
    () => countQuickFilters(validShipments as unknown as PackageInfo[], new Date(), alertDay),
    [validShipments, alertDay],
  );

  const matchesSearch = useCallback((pkg: { trackingNumber?: string | null; dhlUniqueId?: string | null; recipientZip?: string | null; recipientName?: string | null; recipientAddress?: string | null }) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return (
      String(pkg.trackingNumber ?? "").toLowerCase().includes(term) ||
      String(pkg.dhlUniqueId ?? "").toLowerCase().includes(term) ||
      String(pkg.recipientZip ?? "").includes(term) ||
      String(pkg.recipientName ?? "").toLowerCase().includes(term) ||
      String(pkg.recipientAddress ?? "").toLowerCase().includes(term)
    );
  }, [searchTerm]);

  const searchedValid = useMemo(
    () => (validShipments as unknown as PackageInfo[]).filter(matchesSearch),
    [validShipments, matchesSearch],
  );
  const view = useInventoryPackageView(searchedValid);
  const visibleValid = useMemo(
    () => view.visible.filter(p => matchesQuickFilter(p, quickFilter, new Date(), alertDay)),
    [view.visible, quickFilter, alertDay],
  );
  const visibleMissing = useMemo(() => safeMissingPackages.filter(matchesSearch), [safeMissingPackages, matchesSearch]);
  const visibleSurplus = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return safeSurplusTrackings.filter(t => !term || String(t).toLowerCase().includes(term));
  }, [safeSurplusTrackings, searchTerm]);

  const pendingCount = useMemo(() => shipmentsArray.filter(p => p.isOffline).length, [shipmentsArray]);

  // Ya entregada / devuelta: cuenta en el desembarque y en su consolidado, pero al procesar el
  // servidor no le cambia el estatus (estatus finales).
  const renderAlreadyFinal = (pkg: PackageInfo) => {
    const why = (pkg as any).alreadyFinal as string | undefined;
    return why ? (
      <Pill icon={CheckCheck} className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300" title={`${why}: no cambia de estatus al procesar`}>
        {why}
      </Pill>
    ) : null;
  };

  const handlePickCounter = (key: QuickFilterKey | UnloadingTab) => {
    if (key === "valid" || key === "missing" || key === "surplus") {
      setListTab(key);
      setQuickFilter(null);
      return;
    }
    setListTab("valid");
    setQuickFilter(prev => (prev === key ? null : key));
  };

  const QUICK_LABEL: Record<QuickFilterKey, string> = {
    today: "Vencen hoy",
    tomorrow: "Vencen mañana",
    nextDay: `Vencen el ${alertDay?.weekday ?? "siguiente día"}`,
    payment: "Con cobro",
    f2: "F2 / carga",
    highValue: "Alto valor",
  };

  // "Última lectura": el último código escaneado y lo que el sistema sabe de él.
  const lastScan = safeScannedPackages[safeScannedPackages.length - 1] as (PackageInfo & { dhlUniqueId?: string }) | undefined;
  const lastCode = lastScan ? (lastScan.dhlUniqueId || lastScan.trackingNumber || null) : null;
  const lastPkg = useMemo<PackageInfo | null>(() => {
    const found = findScannedPackage(lastCode, shipmentsArray as unknown as PackageInfo[]);
    if (found) return found;
    // Formato inválido: nunca llega a validarse, se marca directo como sobrante.
    if (lastCode && safeSurplusTrackings.includes(lastCode)) {
      return { trackingNumber: lastCode, isValid: false, reason: "No venía en la carga o la guía no es válida" } as PackageInfo;
    }
    return null;
  }, [lastCode, shipmentsArray, safeSurplusTrackings]);

  const canUnload = !!selectedUnidad && validShipments.length > 0 && pendingCount === 0 && !isValidationPackages;
  const processBlockReason = !selectedUnidad
    ? "Elige la unidad que llegó."
    : validShipments.length === 0
      ? "Escanea al menos una guía válida."
      : pendingCount > 0
        ? `Faltan ${pendingCount} guía(s) por validar.`
        : isValidationPackages
          ? "Espera a que termine de validar."
          : "";

  // Limpia la captura de ESTA sucursal (las de otras sucursales no se tocan).
  // El panel de consolidados guarda su propia selección: se vuelve a montar para soltarla.
  const [clearCount, setClearCount] = useState(0);
  const clearAllStorage = useCallback((silent = false) => {
    useUnloadingStore.getState().clearAll();
    setClearCount(c => c + 1);
    setLastValidated("");
    setQuickFilter(null);
    setListTab("valid");
    barScannerInputRef.current?.clear();
    clearScanBuffer(unloadingScanKey(selectedSubsidiaryId));
    if (!silent) toast({ title: "Captura limpia", description: "Se borró lo escaneado de esta sucursal." });
  }, [selectedSubsidiaryId, toast]);

  const buildPdfBlob = useCallback((trackingNumber: string, subsidiaryName: string) =>
    pdf(
      <UnloadingPDFReport
        key={Date.now()}
        vehicle={selectedUnidad}
        packages={validShipments}
        missingPackages={safeMissingPackages}
        unScannedPackages={safeSurplusTrackings}
        subsidiaryName={subsidiaryName}
        unloadingTrackigNumber={trackingNumber}
      />
    ).toBlob(),
  [selectedUnidad, validShipments, safeMissingPackages, safeSurplusTrackings]);

  const handleExport = useCallback(async () => {
    if (validShipments.length === 0) return;
    setIsLoading(true);
    try {
      const blob = await buildPdfBlob("", selectedSubsidiaryName || "");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Desembarque-${selectedSubsidiaryName || "sucursal"}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "No se pudo generar el PDF", description: "Intenta de nuevo.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [validShipments.length, buildPdfBlob, selectedSubsidiaryName, toast]);

  // Manda el PDF y el Excel del desembarque YA guardado (adjuntos del correo).
  const sendFiles = useCallback(async (saved: Unloading) => {
    const subsidiaryName = saved?.subsidiary?.name ?? selectedSubsidiaryName ?? "";
    const blob = await buildPdfBlob(saved?.trackingNumber ?? "", subsidiaryName);
    try { window.open(URL.createObjectURL(blob), "_blank"); } catch { /* el navegador puede bloquear la ventana */ }
    const currentDate = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-");
    const forExcel = { ...saved, shipments: validShipments as unknown as Unloading["shipments"] } as Unloading;
    const pdfFile = new File([blob], `${subsidiaryName}--Desembarque--${subsidiaryName}_${currentDate}.pdf`, { type: "application/pdf" });
    const excelBuffer = await generateUnloadingExcelClient(forExcel, false);
    const excelFile = new File(
      [new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })],
      `${subsidiaryName}--Desembarque--${currentDate}.xlsx`,
      { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    );
    await uploadPDFile(pdfFile, excelFile, subsidiaryName, saved?.id, () => {});
  }, [buildPdfBlob, selectedSubsidiaryName, validShipments]);

  // Procesar: 1) guardar  2) mandar el correo. Si el correo falla el desembarque YA quedó
  // guardado, así que se limpia la captura igual y se avisa (antes se mostraba "error al
  // procesar", la captura se quedaba y al volver a dar Procesar se duplicaba el desembarque).
  const processingRef = useRef(false);
  const handleUnloading = useCallback(async () => {
    if (processingRef.current) return;
    if (!canUnload) {
      if (processBlockReason) toast({ title: "Todavía no se puede procesar", description: processBlockReason, variant: "destructive" });
      return;
    }
    const validList = validShipments;
    if (validList.some(s => !s.id)) {
      toast({ title: "Validación incompleta", description: "Hay guías que todavía se están validando. Espera un momento.", variant: "destructive" });
      return;
    }
    processingRef.current = true;
    setIsLoading(true);
    let saved: UnloadingSaveResult;
    try {
      const data: UnloadingFormData = {
        vehicle: { id: selectedUnidad!.id, name: selectedUnidad!.name },
        subsidiary: { id: selectedSubsidiaryId, name: selectedSubsidiaryName || "" },
        // Folio de esta captura: si la respuesta se pierde y se vuelve a procesar, el servidor
        // regresa el desembarque ya guardado en vez de duplicarlo.
        clientRequestId: useUnloadingStore.getState().clientRequestId,
        shipments: validList.map(s => s.id as string),
        missingTrackings: safeMissingPackages.map(p => p.trackingNumber),
        unScannedTrackings: safeSurplusTrackings,
        date: new Date().toISOString(),
      };
      saved = await saveUnloading(data);
    } catch (error) {
      toast({ title: "No se guardó el desembarque", description: apiError(error, "Revisa tu conexión e intenta de nuevo."), variant: "destructive" });
      processingRef.current = false;
      setIsLoading(false);
      return;
    }

    let emailOk = true;
    try {
      await sendFiles(saved);
    } catch {
      emailOk = false;
    }

    clearAllStorage(true);
    const skipped = saved.skippedFinal ?? [];
    const registered = validList.length - skipped.length;
    if (saved.duplicate) {
      toast({ title: "Este desembarque ya estaba guardado", description: "No se creó otro; se reenvió el correo." });
    } else if (skipped.length > 0) {
      toast({
        title: "Desembarque guardado",
        description: `Se registraron ${registered} guías. ${skipped.length} ya estaban entregadas o devueltas y no cambiaron: ${skipped.slice(0, 5).map(s => s.trackingNumber).join(", ")}${skipped.length > 5 ? "…" : ""}.`,
      });
    } else if (emailOk) {
      toast({ title: "Desembarque guardado", description: `Se registraron ${validList.length} guías y se envió el correo.` });
    }
    if (!emailOk) {
      toast({
        title: "Desembarque guardado; el correo no salió",
        description: "El desembarque sí quedó guardado. Avisa a Sistemas para reenviar el correo.",
        variant: "destructive",
      });
    }
    processingRef.current = false;
    setIsLoading(false);
    onSaved(saved);
  }, [canUnload, processBlockReason, validShipments, selectedUnidad, selectedSubsidiaryId, selectedSubsidiaryName, safeMissingPackages, safeSurplusTrackings, sendFiles, clearAllStorage, onSaved, toast]);

  // Atajos de teclado (mismas teclas que inventarios y Entrada de bodega).
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const processRef = useRef<() => void>(() => {});
  processRef.current = handleUnloading;
  const modalOpen = showShortcuts || correctTrackingModalOpen || completeDataModalOpen;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (modalOpen) return; // hay una ventana abierta: que la maneje ella
      if (e.key === "F1") {
        e.preventDefault();
        barScannerInputRef.current?.focus();
      } else if (e.key === "F2") {
        e.preventDefault();
        processRef.current();
      } else if (e.key === "F3") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape" && quickFilter) {
        setQuickFilter(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen, quickFilter]);

  return (
    <>
      {isLoading && (
        <LoaderWithOverlay overlay text="Procesando desembarque..." className="rounded-lg" />
      )}

      <div className="relative space-y-3">
        <OperationHeader
          icon={PackageCheckIcon}
          title="Nuevo desembarque"
          description="Escanea y valida la llegada de paquetes a bodega"
          subsidiaryName={selectedSubsidiaryName}
          isOffline={!isOnline}
          actions={
            <div className="flex w-full flex-wrap items-center justify-end gap-2 2xl:w-auto 2xl:flex-nowrap 2xl:whitespace-nowrap">
              <div className="w-full sm:w-56">
                <UnidadSelector
                  selectedUnidad={selectedUnidad ?? undefined}
                  onSelectionChange={(u) => setSelectedUnidad(u ?? null)}
                  disabled={isLoading}
                  compact
                />
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setShowShortcuts(true)} aria-label="Atajos de teclado">
                    <Keyboard className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Atajos de teclado</TooltipContent>
              </Tooltip>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-1.5" disabled={isLoading}>
                    <MoreHorizontal className="h-4 w-4" />
                    Más acciones
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onSelect={handleExport} disabled={validShipments.length === 0}>
                    <Download className="mr-2 h-4 w-4" /> Exportar PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => clearAllStorage()}
                    disabled={shipmentsArray.length === 0 && safeScannedPackages.length === 0}
                    className="text-rose-600 focus:text-rose-700"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Limpiar captura
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {/* La captura se queda guardada para esta sucursal: al volver sigue donde se quedó. */}
                  <DropdownMenuItem onSelect={onExit}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Volver al historial
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex-1 sm:flex-none">
                    <Button
                      size="sm"
                      onClick={handleUnloading}
                      disabled={isLoading || !canUnload}
                      className="h-9 w-full gap-1.5"
                    >
                      {isLoading ? <PmySpinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                      Procesar ({validShipments.length})
                    </Button>
                  </span>
                </TooltipTrigger>
                {processBlockReason && <TooltipContent>{processBlockReason}</TooltipContent>}
              </Tooltip>
            </div>
          }
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          {/* Lector: escaneo, última lectura, conteos que filtran y consolidados */}
          <aside className="space-y-3 lg:sticky lg:top-3 lg:self-start">
            <Card className="py-0">
              <CardContent className="space-y-3 p-3">
                <ScanInput
                  ref={barScannerInputRef}
                  storageKey={unloadingScanKey(selectedSubsidiaryId)}
                  defaultView="simple"
                  onPackagesChange={setScannedPackages}
                  disabled={isLoading}
                  placeholder="Escanea guías FedEx o DHL"
                />
                <LastReadCard
                  code={lastCode}
                  pkg={lastPkg}
                  alertDay={alertDay}
                  okText={
                    (lastPkg as any)?.alreadyFinal
                      ? `Última lectura: cuenta · ${(lastPkg as any).alreadyFinal}, no cambia de estatus`
                      : "Última lectura: entra al desembarque"
                  }
                  failText="Última lectura: sobrante"
                />
              </CardContent>
            </Card>

            {(shipmentsArray.length > 0 || safeMissingPackages.length > 0) && (
              <Card className="py-0">
                <CardContent className="p-2">
                  <UnloadingCounters
                    valid={validShipments.length}
                    missing={safeMissingPackages.length}
                    surplus={safeSurplusTrackings.length}
                    pending={pendingCount}
                    counts={quickCounts}
                    alertDay={alertDay}
                    active={quickFilter}
                    tab={listTab}
                    onPick={handlePickCounter}
                  />
                  {pendingCount > 0 && isOnline && (
                    <Button variant="outline" size="sm" className="mx-2 mt-1 h-7 text-xs" onClick={retryPending}>
                      Volver a validar
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            <ConsolidateDetails
              key={clearCount}
              consolidatedData={
                consolidatedValidation &&
                (consolidatedValidation.airConsolidated?.length > 0 || consolidatedValidation.groundConsolidated?.length > 0 || consolidatedValidation.f2Consolidated?.length > 0)
                  ? consolidatedValidation
                  : undefined
              }
              initialSelectedIds={selectedConsolidatedIds}
              onSelectionChange={handleConsolidateSelectionChange}
              subsidiaryId={selectedSubsidiaryId}
              onReload={reloadConsolidateds}
              onSearchConsNumber={searchByConsNumber}
              reloading={reloadingConsolidateds}
            />
          </aside>

          {/* Lista de guías */}
          <section className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px] flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar guía, CP, nombre o dirección"
                  className="h-9 pl-8"
                />
              </div>
              {listTab === "valid" && <InventoryPackageToolbar view={view} />}
            </div>

            {shipmentsArray.length > 0 || safeMissingPackages.length > 0 || safeSurplusTrackings.length > 0 ? (
              <Tabs value={listTab} onValueChange={(v) => { setListTab(v as UnloadingTab); if (v !== "valid") setQuickFilter(null); }} className="w-full">
                <div className="flex flex-wrap items-center gap-2">
                  <TabsList className="h-8">
                    <TabsTrigger value="valid" className="gap-1.5 text-xs">
                      Válidos <Badge variant="secondary" className="px-1.5 text-xs">{visibleValid.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="missing" className="gap-1.5 text-xs">
                      Faltantes
                      <Badge variant="secondary" className={cn("px-1.5 text-xs", safeMissingPackages.length > 0 && "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300")}>
                        {visibleMissing.length}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="surplus" className="gap-1.5 text-xs">
                      Sobrantes
                      <Badge variant="secondary" className={cn("px-1.5 text-xs", safeSurplusTrackings.length > 0 && "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300")}>
                        {visibleSurplus.length}
                      </Badge>
                    </TabsTrigger>
                  </TabsList>
                  {quickFilter && listTab === "valid" && (
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setQuickFilter(null)}>
                      {QUICK_LABEL[quickFilter]} <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                <TabsContent value="valid" className="mt-2">
                  <PackagesList
                    packages={visibleValid}
                    showFilters={false}
                    groupBy={view.groupBy}
                    showRowNumbers={view.showRowNumbers}
                    alertDay={alertDay}
                    renderExtra={renderAlreadyFinal}
                    onRemove={handleRemovePackage}
                    onCompleteData={handleOpenCompleteData as any}
                    isLoading={isLoading}
                    maxHeightClass="max-h-[calc(100vh-15rem)] min-h-[240px]"
                    emptyTitle={quickFilter ? `Sin guías en "${QUICK_LABEL[quickFilter]}"` : "Sin guías válidas"}
                    emptyDescription={quickFilter ? "Quita el filtro para ver todas." : "Ninguna guía coincide con la búsqueda, la paquetería o la ciudad."}
                  />
                </TabsContent>

                {/* Venían en los consolidados y todavía no se escanean. */}
                <TabsContent value="missing" className="mt-2">
                  {visibleMissing.length > 0 ? (
                    <div className="max-h-[calc(100vh-15rem)] min-h-[240px] divide-y overflow-y-auto rounded-lg border">
                      {visibleMissing.map((pkg, idx) => <MissingPackageItem key={`${pkg.trackingNumber}-${idx}`} pkg={pkg} />)}
                    </div>
                  ) : (
                    <EmptyList title="Sin faltantes" description="Todo lo de los consolidados con guías escaneadas ya llegó." />
                  )}
                </TabsContent>

                {/* Escaneadas que no venían en la carga (o con formato inválido). */}
                <TabsContent value="surplus" className="mt-2">
                  {visibleSurplus.length > 0 ? (
                    <div className="max-h-[calc(100vh-15rem)] min-h-[240px] divide-y overflow-y-auto rounded-lg border">
                      {visibleSurplus.map(t => (
                        <div key={t} className="flex items-center gap-2 bg-amber-50/70 px-3 py-1.5 text-sm dark:bg-amber-950/20">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                          <span className="font-mono font-medium">{t}</span>
                          <span className="flex-1 truncate text-xs text-amber-800 dark:text-amber-300">No venía en la carga</span>
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleOpenCorrectTracking(t)}>
                            Corregir o dar de alta
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => handleRemovePackage(t)} aria-label={`Quitar ${t}`}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyList title="Sin sobrantes" description="Todo lo escaneado venía en la carga." />
                  )}
                </TabsContent>
              </Tabs>
            ) : (
              <div className="rounded-lg border-2 border-dashed border-muted py-16 text-center">
                <Package className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
                <h3 className="mb-1 text-base font-medium">Escanea la primera guía</h3>
                <p className="text-sm text-muted-foreground">Elige la unidad arriba y escanea lo que trae la carga. Las guías aparecen aquí agrupadas.</p>
              </div>
            )}
          </section>
        </div>
      </div>

      <ShortcutsDialog
        open={showShortcuts}
        onOpenChange={setShowShortcuts}
        shortcuts={[
          { key: "F1", action: "Ir al escáner" },
          { key: "F2", action: "Procesar desembarque" },
          { key: "F3", action: "Buscar en la lista (guía o CP)" },
          { key: "ESC", action: "Quitar el filtro de conteo" },
        ]}
      />
      <CompleteDataModal isOpen={completeDataModalOpen} onClose={handleCloseCompleteData} package={selectedPackageForData} onSave={handleSavePackageData} />
      <CorrectTrackingModal
        isOpen={correctTrackingModalOpen}
        onClose={handleCloseCorrectTracking}
        scannedTrackingNumber={selectedTrackingToCorrect}
        subsidiaryId={selectedSubsidiaryId}
        subsidiaryName={selectedSubsidiaryName}
        onCorrect={handleCorrectTracking}
        onCreate={handleCreateShipment}
      />
    </>
  );
}

function EmptyList({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border-2 border-dashed border-muted py-12 text-center">
      <h3 className="mb-1 text-sm font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
