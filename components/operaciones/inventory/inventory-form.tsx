"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertCircle,
  Check,
  ChevronsUpDown,
  CircleAlertIcon,
  DollarSignIcon,
  GemIcon,
  MapPin,
  Package,
  PackageCheckIcon,
  Phone,
  Scan,
  Send,
  Trash2,
  User,
  Loader2,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Download,
  X
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import {
  saveInventory,
  validateInventory,
  uploadFiles // opcional si lo tienes
} from "@/lib/services/inventories";
import { InventoryReport, InventoryPackage as InventoryPackageType } from "@/lib/types"; // ajusta ruta si es necesario
import { BarcodeScannerInput } from "@/components/barcode-scanner-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { InventoryPDFReport } from "@/lib/services/inventory/inventory-pdf-generator";
import { pdf } from "@react-pdf/renderer";
import { generateInventoryExcel } from "@/lib/services/inventory/inventory-excel-generator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  selectedSubsidiaryId?: string | null;
  subsidiaryName?: string | null;
  onClose?: () => void;
  onSuccess?: () => void;
}

/**
 * Local UI package shape (si ya lo tienes en types, usa ese import en lugar de esta interfaz).
 * Asegúrate de que coincida con lo que retorna validateInventory.
 */
interface InventoryPackage {
  id?: string;
  trackingNumber: string;
  isValid: boolean;
  reason?: string | null;
  recipientName?: string | null;
  recipientAddress?: string | null;
  recipientPhone?: string | null;
  priority?: "alta" | "media" | "baja" | null;
  isCharge?: boolean;
  isHighValue?: boolean;
  payment?: { type: string; amount: number } | null;
  commitDateTime?: string | null;
}

enum TrackingNotFoundEnum {
  NOT_SCANNED = "Guia sin escaneo",
  NOT_TRACKING = "Guia faltante",
  NOT_IN_CHARGE = "No Llego en la Carga"
}

// Item UI (similar a PackageItem de UnloadingForm)
const PackageItem = ({
  pkg,
  onRemove,
  isLoading,
  selectedReasons,
  onSelectReason,
  openPopover,
  setOpenPopover,
}: {
  pkg: InventoryPackage;
  onRemove: (trackingNumber: string) => void;
  isLoading: boolean;
  selectedReasons: Record<string, string>;
  onSelectReason: (id: string, value: string) => void;
  openPopover: string | null;
  setOpenPopover: (v: string | null) => void;
}) => {
  const formatMexicanPhoneNumber = (phone?: string | null) => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) return `+52 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    if (cleaned.length === 12 && cleaned.startsWith("52")) return `+52 (${cleaned.slice(2, 5)}) ${cleaned.slice(5, 8)}-${cleaned.slice(8)}`;
    return phone;
  };

  const options = Object.entries(TrackingNotFoundEnum).map(([k, v]) => ({ key: k, label: v }));

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
                variant={pkg.priority === "alta" ? "destructive" : pkg.priority === "media" ? "secondary" : "outline"}
                className="text-xs"
              >
                {pkg.priority.toUpperCase()}
              </Badge>
            )}

            {pkg.isCharge && <Badge className="bg-green-600 text-xs">CARGA/F2/31.5</Badge>}
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

export default function InventoryForm({ selectedSubsidiaryId, subsidiaryName, onClose, onSuccess }: Props) {
  const [trackingNumbersRaw, setTrackingNumbersRaw] = useState("");
  const [packages, setPackages] = useState<InventoryPackage[]>([]);
  const [missingTrackings, setMissingTrackings] = useState<string[]>([]);
  const [unScannedTrackings, setUnScannedTrackings] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedReasons, setSelectedReasons] = useState<Record<string, string>>({});
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    // same zoom prevention UX
    const preventZoom = (e: WheelEvent) => { if (e.ctrlKey) e.preventDefault(); };
    const preventKeyZoom = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && ["+", "-", "=", "0"].includes(e.key)) e.preventDefault(); };
    window.addEventListener("wheel", preventZoom, { passive: false });
    window.addEventListener("keydown", preventKeyZoom);
    return () => {
      window.removeEventListener("wheel", preventZoom);
      window.removeEventListener("keydown", preventKeyZoom);
    };
  }, []);

  const options = Object.entries(TrackingNotFoundEnum).map(([key, value]) => ({ key, label: value }));

  const handleSelectMissingTracking = (id: string, value: string) => {
    setSelectedReasons(prev => ({ ...prev, [id]: value }));

    if (value === TrackingNotFoundEnum.NOT_TRACKING) {
      setMissingTrackings(prev => [...prev, id]);
      setUnScannedTrackings(prev => prev.filter(item => item !== id));
    } else if (value === TrackingNotFoundEnum.NOT_SCANNED) {
      setUnScannedTrackings(prev => [...prev, id]);
      setMissingTrackings(prev => prev.filter(item => item !== id));
    } else if (value === TrackingNotFoundEnum.NOT_IN_CHARGE) {
      setMissingTrackings(prev => prev.filter(item => item !== id));
      setUnScannedTrackings(prev => prev.filter(item => item !== id));
    }

    setOpenPopover(null);
  };

  // VALIDA en bloque los trackings que vienen de BarcodeScannerInput (raw multiline)
  const handleValidatePackages = async () => {
    if (!selectedSubsidiaryId) {
      toast({ title: "Error", description: "Selecciona una sucursal antes de validar.", variant: "destructive" });
      return;
    }

    const lines = trackingNumbersRaw.split("\n").map(l => l.trim()).filter(Boolean);
    const uniqueLines = Array.from(new Set(lines));
    // patrón por defecto: 8-14 dígitos? en tu caso usabas 12. Mantengo 8-20 para ser flexible.
    const validNumbers = uniqueLines.filter(tn => /^\d{8,20}$/.test(tn));
    const invalidNumbers = uniqueLines.filter(tn => !/^\d{8,20}$/.test(tn));

    if (validNumbers.length === 0) {
      toast({ title: "Error", description: "No se ingresaron números válidos.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setProgress(0);

    try {
      const result = await validateInventory(validNumbers, selectedSubsidiaryId);

      // soporta varias formas de respuesta del servicio:
      const validated: InventoryPackage[] = result?.validatedPackages ?? result?.validatedShipments ?? result ?? [];

      const newPackages = (Array.isArray(validated) ? validated : [])
        .filter((p: InventoryPackage) => !packages.some(existing => existing.trackingNumber === p.trackingNumber));

      setPackages(prev => [...prev, ...newPackages]);
      setMissingTrackings(invalidNumbers);
      setUnScannedTrackings([]); // el servicio podría traer unscanned; adaptar si lo hace
      setTrackingNumbersRaw("");

      const validCount = newPackages.filter(p => p.isValid).length;
      const invalidCount = newPackages.filter(p => !p.isValid).length;

      toast({ title: "Validación completada", description: `Se agregaron ${validCount} paquetes válidos. Paquetes inválidos: ${invalidCount + invalidNumbers.length}` });
    } catch (error) {
      console.error("validateInventory error", error);
      toast({ title: "Error", description: "Hubo un problema al validar los paquetes.", variant: "destructive" });
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  const handleRemovePackage = useCallback((trackingNumber: string) => {
    setPackages(prev => prev.filter(p => p.trackingNumber !== trackingNumber));
  }, []);

  const validPackages = packages.filter(p => p.isValid);

  const handleSaveInventory = async () => {
    if (!selectedSubsidiaryId) {
      toast({ title: "Error", description: "Selecciona una sucursal antes de guardar.", variant: "destructive" });
      return;
    }
    if (validPackages.length === 0) {
      toast({ title: "Sin paquetes válidos", description: "No hay paquetes válidos para guardar.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      // construir InventoryReport u objeto que espera tu API:
      const payload = {
        reportId: `INV-${Date.now()}`,
        createdAt: new Date().toISOString(),
        subsidiary: { id: selectedSubsidiaryId, name: subsidiaryName ?? "" },
        vehicle: undefined,
        packages: validPackages,
        missingTrackings,
        unScannedTrackings
      } as InventoryReport;

      const saved = await saveInventory(payload);
      // si tienes upload de archivos PDF/Excel:
      // await uploadInventoryFiles(...)

      toast({ title: "Inventario guardado", description: "Inventario guardado con éxito." });

      // limpiar estado si todo OK
      setPackages([]);
      setMissingTrackings([]);
      setUnScannedTrackings([]);
      setSelectedReasons({});
      onSuccess?.();
    } catch (error) {
      console.error("saveInventory error", error);
      toast({ title: "Error", description: "Hubo un problema al guardar el inventario.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setIsLoading(true);
    try {
      const report: InventoryReport = {
        reportId: `INV-${Date.now()}`,
        createdAt: new Date().toISOString(),
        subsidiary: { id: selectedSubsidiaryId ?? "", name: subsidiaryName ?? "" },
        vehicle: undefined,
        packages: packages as unknown as InventoryPackageType[], // cast si tus tipos difieren
        missingTrackings,
        unScannedTrackings,
      };
      const blob = await pdf(<InventoryPDFReport report={report} />).toBlob();
      const blobUrl = URL.createObjectURL(blob) + `#${Date.now()}`;
      window.open(blobUrl, "_blank");
    } catch (err) {
      console.error("PDF export error", err);
      toast({ title: "Error", description: "No se pudo generar el PDF.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportExcel = async () => {
    setIsLoading(true);
    try {
      const report: InventoryReport = {
        reportId: `INV-${Date.now()}`,
        createdAt: new Date().toISOString(),
        subsidiary: { id: selectedSubsidiaryId ?? "", name: subsidiaryName ?? "" },
        vehicle: undefined,
        packages: packages as unknown as InventoryPackageType[],
        missingTrackings,
        unScannedTrackings,
      };
      await generateInventoryExcel(report, true);
    } catch (err) {
      console.error("Excel export error", err);
      toast({ title: "Error", description: "No se pudo generar el Excel.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // filtrado similar al UnloadingForm
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
    <Card className="w-full max-w-6xl mx-auto border-0 shadow-none">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary text-primary-foreground">
                <PackageCheckIcon className="h-6 w-6" />
              </div>
              <span>Inventario de Paquetes</span>
              {packages.length > 0 && <Badge variant="secondary" className="ml-2 text-sm">{validPackages.length} válidos / {packages.length} total</Badge>}
            </CardTitle>
            <CardDescription>Escanea paquetes y valida su estatus en el sistema</CardDescription>
          </div>

          <div className="flex items-center gap-2 text-sm text-primary-foreground bg-primary px-3 py-1.5 rounded-full">
            <MapPin className="h-4 w-4" />
            <span>Sucursal: {subsidiaryName}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input escaneo */}
          <div className="space-y-4 p-4 bg-muted/20 rounded-lg">
            <Label className="text-base font-medium flex items-center gap-2">
              <Scan className="h-4 w-4" />
              Escaneo
            </Label>

            <BarcodeScannerInput
              label=""
              onTrackingNumbersChange={(rawString) => setTrackingNumbersRaw(rawString)}
              disabled={isLoading || !selectedSubsidiaryId}
              placeholder={!selectedSubsidiaryId ? "Selecciona una sucursal primero" : "Escribe o escanea números de tracking"}
            />

            {isLoading && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Progreso de validación</Label>
                  <span className="text-sm text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </div>

          {/* Acciones rápidas */}
          <div className="space-y-4 p-4 bg-muted/20 rounded-lg">
            <div className="flex flex-col gap-2">
              <Button onClick={handleValidatePackages} disabled={isLoading || !selectedSubsidiaryId} variant="outline" className="gap-2">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scan className="h-4 w-4" />}
                {isLoading ? "Procesando..." : "Validar paquetes"}
              </Button>

              <Button onClick={handleSaveInventory} disabled={isLoading || validPackages.length === 0} className="gap-2">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Guardar Inventario
              </Button>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExportExcel} disabled={isLoading || packages.length === 0}>Exportar Excel</Button>
                <Button variant="outline" onClick={handleExportPDF} disabled={isLoading || packages.length === 0}>Exportar PDF</Button>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de paquetes */}
        {packages.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Package className="h-5 w-5" />
                Paquetes validados
                <Badge variant="outline" className="ml-2">{filteredValidPackages.length} de {validPackages.length}</Badge>
              </h3>

              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <span className="font-medium">Simbología:</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 cursor-help">
                        <CircleAlertIcon className="h-3 w-3 text-destructive" />
                        <span>Inválido</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent><p>Paquete no válido</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <div className="flex items-center gap-1">
                  <Badge className="h-4 px-1 text-xs bg-green-600">CARGA/F2/31.5</Badge>
                  <span>Carga especial</span>
                </div>

                <div className="flex items-center gap-1">
                  <Badge className="h-4 px-1 text-xs bg-violet-600"><GemIcon className="h-3 w-3" /></Badge>
                  <span>Alto Valor</span>
                </div>

                <div className="flex items-center gap-1">
                  <Badge className="h-4 px-1 text-xs bg-blue-600"><DollarSignIcon className="h-3 w-3" /></Badge>
                  <span>Cobro</span>
                </div>
              </div>
            </div>

            {/* Buscador / filtros */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por tracking, destinatario o dirección..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Filtrar</h4>
                  <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)} className="h-8 gap-1">
                    <Filter className="h-4 w-4" />
                    {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
                <Collapsible open={showFilters}>
                  <CollapsibleContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-sm">Prioridad</Label>
                        <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                          <option value="all">Todas</option>
                          <option value="alta">Alta</option>
                          <option value="media">Media</option>
                          <option value="baja">Baja</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Tipo</Label>
                        <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                          <option value="all">Todos</option>
                          <option value="special">Especial</option>
                          <option value="normal">Normal</option>
                        </select>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>

            <Tabs defaultValue="validos" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="validos" className="flex items-center gap-1"><Check className="h-4 w-4" /> Válidos ({validPackages.length})</TabsTrigger>
                <TabsTrigger value="sin-escaneo" className="flex items-center gap-1"><AlertCircle className="h-4 w-4" /> Sin escaneo ({unScannedTrackings.length})</TabsTrigger>
                <TabsTrigger value="faltantes" className="flex items-center gap-1"><CircleAlertIcon className="h-4 w-4" /> Faltantes ({missingTrackings.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="validos" className="space-y-3 mt-4">
                {filteredValidPackages.length > 0 ? (
                  <ScrollArea className="h-[400px] rounded-md border">
                    <div className="grid grid-cols-1 divide-y">
                      {filteredValidPackages.map(pkg => (
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
                    <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p>No se encontraron paquetes con los filtros aplicados</p>
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
                          <Badge variant="outline" className="bg-amber-100 text-amber-800 text-xs">Sin escaneo</Badge>
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
                          <Badge variant="outline" className="bg-red-100 text-red-800 text-xs">Faltante</Badge>
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
                <Package className="w-4 h-4" />
                <span className="font-medium">Resumen:</span>
              </div>
              <div className="flex items-center gap-1"><span className="text-green-600 font-semibold">{validPackages.length}</span><span>válidos</span></div>
              <div className="flex items-center gap-1"><span className="text-amber-600 font-semibold">{unScannedTrackings.length}</span><span>sin escaneo</span></div>
              <div className="flex items-center gap-1"><span className="text-red-600 font-semibold">{missingTrackings.length}</span><span>faltantes</span></div>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-2 justify-between items-center p-4 bg-muted/20 rounded-lg">
          <Button type="button" variant="outline" onClick={() => onClose?.()} className="gap-2"><X className="h-4 w-4" /> Cancelar</Button>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleValidatePackages} disabled={isLoading || !selectedSubsidiaryId} className="gap-2" variant="outline">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scan className="h-4 w-4" />}
              {isLoading ? "Procesando..." : "Validar paquetes"}
            </Button>

            <Button onClick={handleSaveInventory} disabled={isLoading || validPackages.length === 0} className="gap-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Guardar Inventario
            </Button>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handleExportPDF} disabled={isLoading || packages.length === 0} variant="outline" className="gap-2">
                    <Download className="h-4 w-4" /> Exportar PDF
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Generar reporte PDF de los paquetes actuales</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
