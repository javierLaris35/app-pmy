"use client";

import { useState, useEffect, useMemo } from "react";
import { MapPinIcon, StampIcon, Check, ChevronsUpDown, Trash2, Search, Filter, ChevronDown, ChevronUp, Download, X, AlertCircle, CheckCircle, XCircle, Package, Loader2, Send, Scan, CircleAlertIcon, GemIcon, DollarSignIcon, User, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { BarcodeScannerInput } from "@/components/barcode-scanner-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { PackageDispatch, PackageInfo } from "@/lib/types";
import { closePackageDispatch, validateTrackingNumber } from "@/lib/services/package-dispatchs";
import InfoField from "./info-field";

interface ClosePackageDispatchProps {
  dispatch: PackageDispatch;
  onClose: () => void;
  onSuccess: () => void;
}

const VALIDATION_REGEX = /^\d{12}$/;

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
                  pkg.priority === "alta"
                    ? "destructive"
                    : pkg.priority === "media"
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
                  <MapPinIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
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
  );
};

// Componente principal
export default function ClosePackageDispatch({ dispatch, onClose, onSuccess }: ClosePackageDispatchProps) {
  const [returnedPackages, setReturnedPackages] = useState<PackageInfo[]>([]);
  const [invalidNumbers, setInvalidNumbers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [trackingNumbersRaw, setTrackingNumbersRaw] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  const { toast } = useToast();

  // Validar paquetes escaneados
  const validateReturnedPackages = async () => {
    const lines = trackingNumbersRaw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

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
      try {
        const info = await validateTrackingNumber(tn, dispatch.subsidiary.id);
        // Verificar que el paquete pertenece a esta salida
        const isFromThisDispatch = dispatch.shipments?.some(s => s.trackingNumber === tn);
        if (!isFromThisDispatch) {
          info.isValid = false;
          info.reason = "No pertenece a esta salida";
        }
        results.push(info);
      } catch (error) {
        results.push({
          trackingNumber: tn,
          isValid: false,
          reason: "Error en validación"
        } as PackageInfo);
      }
      setProgress(Math.round(((i + 1) / validNumbers.length) * 100));
    }

    setReturnedPackages(results);
    setInvalidNumbers(invalids);
    setTrackingNumbersRaw("");
    setProgress(0);
    setIsLoading(false);

    const validCount = results.filter((p) => p.isValid).length;
    const invalidCount = results.filter((p) => !p.isValid).length + invalids.length;

    toast({
      title: "Validación completada",
      description: `Se validaron ${validCount} paquetes correctamente. Errores: ${invalidCount}`,
    });
  };

  // Guardar el cierre de ruta
  const handleCloseDispatch = async () => {
    if (returnedPackages.length === 0) {
      toast({
        title: "Error",
        description: "No hay paquetes validados para procesar el cierre.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const returnedShipmentIds = returnedPackages
        .filter(p => p.isValid)
        .map(p => p.id);

      await closePackageDispatch(dispatch.id, returnedShipmentIds);
      
      toast({
        title: "Cierre exitoso",
        description: "La ruta se ha cerrado correctamente.",
      });
      
      onSuccess();
    } catch (error) {
      console.error("Error al cerrar la ruta:", error);
      toast({
        title: "Error",
        description: "No se pudo procesar el cierre de ruta.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemovePackage = (trackingNumber: string) => {
    setReturnedPackages((prev) => prev.filter((p) => p.trackingNumber !== trackingNumber));
  };

  // Calcular estadísticas
  const validReturns = returnedPackages.filter(p => p.isValid);
  const originalCount = dispatch.shipments?.length || 0;
  const deliveredCount = originalCount - validReturns.length;
  const returnRate = originalCount > 0 ? (validReturns.length / originalCount) * 100 : 0;

  // Filtrado de paquetes
  const filteredValidReturns = useMemo(() => {
    return validReturns.filter(pkg => {
      const matchesSearch = pkg.trackingNumber.includes(searchTerm) || 
                           (pkg.recipientName && pkg.recipientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           (pkg.recipientAddress && pkg.recipientAddress.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesPriority = filterPriority === "all" || pkg.priority === filterPriority;
      const matchesStatus = filterStatus === "all" || 
                           (filterStatus === "special" && (pkg.isCharge || pkg.isHighValue || pkg.payment)) ||
                           (filterStatus === "normal" && !pkg.isCharge && !pkg.isHighValue && !pkg.payment);
      
      return matchesSearch && matchesPriority && matchesStatus;
    });
  }, [validReturns, searchTerm, filterPriority, filterStatus]);

  return (
    <Card className="w-full max-w-6xl mx-auto border-0 shadow-none">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary text-primary-foreground">
                <StampIcon className="h-6 w-6" />
              </div>
              <span>Cierre de Ruta</span>
              {returnedPackages.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-sm">
                  {validReturns.length} válidos / {returnedPackages.length} total
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Procesa el cierre de ruta y registra los paquetes devueltos
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-sm text-primary-foreground bg-primary px-3 py-1.5 rounded-full">
            <MapPinIcon className="h-4 w-4" />
            <span>Sucursal: {dispatch.subsidiary.name}</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* Información de la salida */}
        <div className="space-y-4 p-4 bg-muted/20 rounded-lg">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5" />
            Información de la Salida
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InfoField label="Unidad de Transporte" value={dispatch.vehicle?.name} />
            <InfoField 
              label="Fecha" 
              value={dispatch.createdAt ? new Date(dispatch.createdAt).toLocaleDateString("es-ES") : null} 
            />
            <InfoField label="No. Seguimiento" value={dispatch.trackingNumber} />
            <InfoField label="Repartidores" value={dispatch.drivers?.map(d => d.name).join(", ")} />
            <InfoField label="Rutas" value={dispatch.routes?.map(r => r.name).join(", ")} />
            <InfoField label="Kilometraje" value={dispatch.kms} />
            <InfoField label="Paquetes en salida" value={originalCount.toString()} />
            <InfoField label="Paquetes entregados" value={deliveredCount.toString()} />
            <InfoField 
              label="Tasa de devolución" 
              value={`${returnRate.toFixed(1)}%`} 
              className={returnRate > 20 ? "text-destructive font-semibold" : ""}
            />
          </div>
        </div>

        {/* Sección de escaneo */}
        <div className="space-y-4 p-4 bg-muted/20 rounded-lg">
          <div className="space-y-2">
            <BarcodeScannerInput 
              label="Guías Regresadas (Escaneo)"
              onTrackingNumbersChange={setTrackingNumbersRaw}
              disabled={isLoading}
              placeholder="Escribe o escanea números de tracking de paquetes devueltos"
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
        </div>

        {returnedPackages.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Package className="h-5 w-5" />
                Paquetes Devueltos
                <Badge variant="outline" className="ml-2">
                  {filteredValidReturns.length} de {validReturns.length}
                </Badge>
              </h3>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <span className="font-medium">Simbología:</span>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 cursor-help">
                      <CircleAlertIcon className="h-3 w-3 text-destructive" />
                      <span>Inválido</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Paquete no válido para cierre</p>
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
                        <GemIcon className="h-3 w-3" />
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
                        <DollarSignIcon className="h-3 w-3" />
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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                    <Filter className="h-4 w-4" />
                    {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
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
                          <option value="alta">Alta</option>
                          <option value="media">Media</option>
                          <option value="baja">Baja</option>
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
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="validos" className="flex items-center gap-1">
                  <Check className="h-4 w-4" />
                  Válidos ({validReturns.length})
                </TabsTrigger>
                <TabsTrigger value="invalidos" className="flex items-center gap-1">
                  <XCircle className="h-4 w-4" />
                  Inválidos ({returnedPackages.filter(p => !p.isValid).length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="validos" className="space-y-3 mt-4">
                {filteredValidReturns.length > 0 ? (
                  <ScrollArea className="h-[400px] rounded-md border">
                    <div className="grid grid-cols-1 divide-y">
                      {filteredValidReturns.map((pkg) => (
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
              
              <TabsContent value="invalidos" className="mt-4">
                {returnedPackages.filter(p => !p.isValid).length > 0 ? (
                  <ScrollArea className="h-[300px] rounded-md border">
                    <div className="grid grid-cols-1 divide-y">
                      {returnedPackages.filter(p => !p.isValid).map((pkg) => (
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
            
            <div className="flex items-center gap-4 text-sm pt-4 border-t">
              <div className="flex items-center gap-1">
                <Package className="w-4 h-4" />
                <span className="font-medium">Resumen:</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-green-600 font-semibold">{validReturns.length}</span>
                <span>válidos</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-destructive font-semibold">{returnedPackages.filter(p => !p.isValid).length}</span>
                <span>inválidos</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-blue-600 font-semibold">{deliveredCount}</span>
                <span>entregados</span>
              </div>
              <div className="flex items-center gap-1">
                <span className={returnRate > 20 ? "text-destructive font-semibold" : "text-amber-600 font-semibold"}>
                  {returnRate.toFixed(1)}%
                </span>
                <span>tasa de devolución</span>
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
            <X className="h-4 w-4" />
            Cancelar
          </Button>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={validateReturnedPackages} 
              disabled={isLoading || !trackingNumbersRaw} 
              className="gap-2"
              variant="outline"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Scan className="h-4 w-4" />
              )}
              {isLoading ? "Procesando..." : "Validar paquetes"}
            </Button>
            
            <Button
              onClick={handleCloseDispatch}
              disabled={isLoading || returnedPackages.length === 0}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Procesar cierre
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}