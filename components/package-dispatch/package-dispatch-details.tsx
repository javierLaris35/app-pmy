"use client";

import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  AlertCircle, DollarSignIcon, GemIcon, MapPin, 
  Phone, User, Loader2, Truck, Calendar, Map, Users, Search, X
} from "lucide-react"; 
import { PackageDispatch, PackageInfo } from "@/lib/types";
import { FedExPackageDispatchPDF } from "@/lib/services/package-dispatch/package-dispatch-pdf-generator";
import { pdf } from "@react-pdf/renderer";
import { IconPdf } from "@tabler/icons-react";
import { useToast } from "@/components/ui/use-toast";
import { mapToPackageInfo } from "@/lib/utils";
import { getPackageDispatchById } from "@/lib/services/package-dispatchs";

interface Props {
  dispatch: PackageDispatch; 
  onClose: () => void;
}

const formatPhone = (phone: string | null | undefined): string => {
  if (!phone) return "N/A";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) return `+52 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  return phone;
};

// --- Subcomponentes Minimalistas ---

const InfoLabel = ({ label, value }: { label: string, value: string }) => (
  <div className="flex flex-col">
    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{label}</span>
    <span className="text-sm font-medium text-slate-800">{value}</span>
  </div>
);

const KpiItem = ({ label, value, dotColor }: { label: string, value: number, dotColor?: string }) => (
  <div className="flex flex-col gap-1 px-4 py-3 sm:py-0">
    <div className="flex items-center gap-1.5">
      {dotColor && <span className={`w-2 h-2 rounded-full ${dotColor}`} />}
      <span className="text-xs font-medium text-slate-500">{label}</span>
    </div>
    <span className="text-2xl font-light tracking-tight text-slate-900">{value}</span>
  </div>
);

export default function PackageDispatchDetails({ dispatch: initialDispatch, onClose }: Props) {
  const { toast } = useToast();
  
  const [dispatchData, setDispatchData] = useState<PackageDispatch | null>(null);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  // Estados de filtrado
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState<"all" | "valid" | "invalid">("all");
  const [attributeFilter, setAttributeFilter] = useState<"all" | "charge" | "payment" | "highValue">("all");

  useEffect(() => {
    const fetchDispatchDetails = async () => {
      try {
        setIsFetchingData(true);
        if (initialDispatch?.id) {
          const freshData = await getPackageDispatchById(initialDispatch.id);
          setDispatchData(freshData);
        }
      } catch (error) {
        toast({
          title: "Error de conexión",
          description: "No se pudieron cargar los detalles actualizados del envío.",
          variant: "destructive",
        });
      } finally {
        setIsFetchingData(false);
      }
    };
    fetchDispatchDetails();
  }, [initialDispatch.id, toast]);

  const allPackages: PackageInfo[] = useMemo(() => {
    return dispatchData ? mapToPackageInfo(dispatchData.shipments, dispatchData.chargeShipments) : [];
  }, [dispatchData]);

  // Lógica de Filtro
  const filteredPackages = useMemo(() => {
    return allPackages.filter(pkg => {
      // Búsqueda
      const matchesSearch = !searchQuery || 
        pkg.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (pkg.recipientName && pkg.recipientName.toLowerCase().includes(searchQuery.toLowerCase()));

      // Tab de Estado
      const matchesStatus = 
        statusTab === "all" || 
        (statusTab === "valid" && pkg.isValid) || 
        (statusTab === "invalid" && !pkg.isValid);

      // Filtro de Atributos
      const matchesAttribute = 
        attributeFilter === "all" ||
        (attributeFilter === "charge" && pkg.isCharge) ||
        (attributeFilter === "payment" && pkg.payment) ||
        (attributeFilter === "highValue" && pkg.isHighValue);

      return matchesSearch && matchesStatus && matchesAttribute;
    });
  }, [allPackages, searchQuery, statusTab, attributeFilter]);

  // Métricas para la barra de KPIs
  const stats = useMemo(() => ({
    total: allPackages.length,
    valid: allPackages.filter(p => p.isValid).length,
    invalid: allPackages.filter(p => !p.isValid).length,
    charges: allPackages.filter(p => p.isCharge).length,
  }), [allPackages]);

  const handlePdfCreate = async () => {
    if (!dispatchData) return;
    setIsLoadingPdf(true);
    try {
      const blob = await pdf(
        <FedExPackageDispatchPDF
          key={Date.now()}
          drivers={dispatchData.drivers ?? []}
          routes={dispatchData.routes ?? []}
          vehicle={dispatchData.vehicle ?? { id: "", name: "N/A" }}
          packages={allPackages} 
          subsidiaryName={dispatchData.subsidiary?.name ?? "N/A"}
          trackingNumber={dispatchData.trackingNumber ?? "N/A"}
        />
      ).toBlob();

      const currentDate = new Date().toLocaleDateString("es-ES").replace(/\//g, "-");
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Salida_${dispatchData.trackingNumber}_${currentDate}.pdf`;
      link.click();
    } catch (error) {
      toast({ title: "Error al generar PDF", description: "Hubo un problema al crear el documento.", variant: "destructive" });
    } finally {
      setIsLoadingPdf(false);
    }
  };

  if (isFetchingData) {
    return (
      <div className="w-full min-h-[300px] flex items-center justify-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!dispatchData) {
    return (
      <div className="w-full p-8 text-center text-slate-500">
        <p>No se encontró la información del despacho.</p>
        <Button onClick={onClose} variant="link" className="mt-2">Volver</Button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col bg-white">
      {/* 1. Header & General Info (Minimalista) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Salida <span className="text-slate-400 font-light">#{dispatchData.trackingNumber ?? "N/A"}</span>
            </h2>
            <Badge variant="secondary" className="ml-2 font-normal bg-slate-100 text-slate-600">
              {dispatchData.subsidiary?.name ?? "Sucursal N/A"}
            </Badge>
          </div>
          
          <div className="flex flex-wrap gap-x-8 gap-y-4">
            <InfoLabel label="Unidad" value={dispatchData.vehicle?.name ?? "N/A"} />
            <InfoLabel label="Repartidor(es)" value={dispatchData.drivers?.map((d) => d.name).join(", ") || "N/A"} />
            <InfoLabel label="Ruta" value={dispatchData.routes?.map((r) => r.name).join(", ") || "N/A"} />
            <InfoLabel label="Fecha" value={dispatchData.createdAt ? new Date(dispatchData.createdAt).toLocaleDateString("es-ES") : "N/A"} />
          </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="ghost" onClick={onClose} className="hidden md:flex text-slate-500">Cancelar</Button>
          <Button onClick={handlePdfCreate} disabled={isLoadingPdf} className="w-full md:w-auto shadow-sm">
            {isLoadingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <IconPdf className="mr-2 h-4 w-4" />}
            Exportar Manifiesto
          </Button>
        </div>
      </div>

      {/* 2. Barra de KPIs (Ultra Limpia, sin recuadros) */}
      <div className="flex flex-col sm:flex-row sm:items-center py-4 border-y border-slate-100 mb-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
        <KpiItem label="Total Paquetes" value={stats.total} />
        <KpiItem label="Listos para salir" value={stats.valid} dotColor="bg-emerald-500" />
        <KpiItem label="Con Inconsistencias" value={stats.invalid} dotColor="bg-red-500" />
        <KpiItem label="Cargas F2/31.5" value={stats.charges} dotColor="bg-blue-500" />
      </div>

      {/* 3. Toolbar de Filtros (Estilo SaaS Moderno) */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
        {/* Pestañas de Estado (Imitando shadcn Tabs con Tailwind) */}
        <div className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-100/80 p-1 w-full md:w-auto">
          {(["all", "valid", "invalid"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusTab(tab)}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-1.5 text-xs font-medium transition-all ${
                statusTab === tab 
                  ? "bg-white text-slate-900 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700"
              } w-full md:w-auto`}
            >
              {tab === "all" ? "Todos" : tab === "valid" ? "Validados" : "Con Error"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Búsqueda Integrada */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar guía o cliente..." 
              className="pl-8 h-9 text-sm shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <X 
                className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 cursor-pointer hover:text-slate-600" 
                onClick={() => setSearchQuery("")} 
              />
            )}
          </div>

          {/* Filtros rápidos circulares/outline */}
          <div className="hidden lg:flex items-center gap-2 border-l border-slate-200 pl-2">
             <Button 
                variant={attributeFilter === "charge" ? "default" : "outline"} 
                size="sm" 
                className={`h-9 text-xs px-3 ${attributeFilter === "charge" ? "" : "border-dashed"}`}
                onClick={() => setAttributeFilter(attributeFilter === "charge" ? "all" : "charge")}
              >
                Cargas
              </Button>
              <Button 
                variant={attributeFilter === "payment" ? "default" : "outline"} 
                size="sm" 
                className={`h-9 text-xs px-3 ${attributeFilter === "payment" ? "" : "border-dashed"}`}
                onClick={() => setAttributeFilter(attributeFilter === "payment" ? "all" : "payment")}
              >
                Cobros
              </Button>
          </div>
        </div>
      </div>

      {/* 4. Data Table Limpia */}
      <div className="rounded-md border border-slate-100">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[180px] text-xs uppercase tracking-wider text-slate-500">Tracking</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-slate-500">Destino & Contacto</TableHead>
              <TableHead className="w-[200px] text-xs uppercase tracking-wider text-slate-500">Atributos</TableHead>
              <TableHead className="w-[120px] text-xs uppercase tracking-wider text-slate-500 text-right">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPackages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-sm text-slate-500">
                  No se encontraron resultados para los filtros aplicados.
                </TableCell>
              </TableRow>
            ) : (
              filteredPackages.map((pkg, idx) => (
                <TableRow key={`${pkg.trackingNumber}-${idx}`} className="group">
                  {/* Guía */}
                  <TableCell className="font-mono text-sm font-medium text-slate-900 align-top pt-4">
                    {pkg.trackingNumber}
                  </TableCell>
                  
                  {/* Destino */}
                  <TableCell className="align-top pt-4">
                    {pkg.isValid ? (
                      <div className="flex flex-col gap-1 max-w-md">
                        {pkg.recipientName && (
                          <span className="text-sm font-medium text-slate-800">
                            {pkg.recipientName} {pkg.recipientPhone && <span className="text-slate-400 font-normal ml-1">{formatPhone(pkg.recipientPhone)}</span>}
                          </span>
                        )}
                        {pkg.recipientAddress && (
                          <span className="text-xs text-slate-500 truncate" title={pkg.recipientAddress}>
                            {pkg.recipientAddress}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 text-sm text-red-600">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span className="font-medium">{pkg.reason || "Error en validación"}</span>
                      </div>
                    )}
                  </TableCell>

                  {/* Atributos (Badges discretos) */}
                  <TableCell className="align-top pt-4">
                    <div className="flex flex-wrap gap-1.5">
                      {pkg.priority && pkg.priority !== "baja" && (
                        <Badge variant="outline" className="text-[10px] uppercase font-medium border-red-200 text-red-700">
                          Prioridad {pkg.priority}
                        </Badge>
                      )}
                      {pkg.isCharge && (
                        <Badge variant="outline" className="text-[10px] uppercase font-medium border-blue-200 text-blue-700">
                          <Truck className="w-3 h-3 mr-1" /> Carga
                        </Badge>
                      )}
                      {pkg.isHighValue && (
                        <Badge variant="outline" className="text-[10px] uppercase font-medium border-violet-200 text-violet-700">
                          <GemIcon className="w-3 h-3 mr-1" /> Valor
                        </Badge>
                      )}
                      {pkg.payment && (
                        <Badge variant="outline" className="text-[10px] uppercase font-medium border-amber-200 text-amber-700">
                          <DollarSignIcon className="w-3 h-3 mr-0.5" /> 
                          {pkg.payment.type} ${pkg.payment.amount}
                        </Badge>
                      )}
                      {!pkg.isCharge && !pkg.isHighValue && !pkg.payment && (!pkg.priority || pkg.priority === "baja") && (
                        <span className="text-xs text-slate-300">-</span>
                      )}
                    </div>
                  </TableCell>

                  {/* Estado (Solo punto de color y texto) */}
                  <TableCell className="align-top pt-4 text-right">
                    <div className="inline-flex items-center gap-1.5 justify-end">
                      <span className={`w-2 h-2 rounded-full ${pkg.isValid ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <span className="text-xs font-medium text-slate-700">
                        {pkg.isValid ? "Válido" : "Error"}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}