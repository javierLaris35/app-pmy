"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  X,
  Send,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Truck,
  Users,
  Gauge,
  PackageCheck,
  PackageX,
  PackageSearch,
  Calendar,
  Route,
  BarChart3,
  Lock,
  RefreshCwIcon,
  AlertTriangle,
  FileText,
  Box,
  PackagePlus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Check
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { ScanInput } from "@/components/scanner/scan-input";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, mapToPackageInfoComplete } from "@/lib/utils";
import { PackageDispatch, PackageInfo, RouteClosure, ShipmentStatusType } from "@/lib/types";
import { useAuthStore } from "@/store/auth.store";
import { save, uploadFiles, validateTrackinNumberNoVan } from "@/lib/services/route-closure";
import { pdf } from "@react-pdf/renderer";
import { getShipmensByDispatchId } from "@/lib/services/package-dispatchs";
import { RouteClosurePDF } from "@/lib/services/route-closure/route-closure-pdf-generator";
import { generateRouteClosureExcel } from "@/lib/services/route-closure/route-closure-excel-generator";
import { updateDataFromFedexByPackageDispatchId } from "@/lib/services/monitoring/monitoring";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ClosePackageDispatchProps {
  dispatchId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface NoVanPackageDetail {
  trackingNumber: string;
  isValid: boolean;
  status: string;
  isCharge: boolean;
  reason?: string | null;
}

export default function ClosePackageDispatchWizard({
  dispatchId,
  onClose,
  onSuccess,
}: ClosePackageDispatchProps) {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  const [dispatch, setDispatch] = useState<PackageDispatch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [collectionsRaw, setCollectionsRaw] = useState("");
  const [actualKms, setActualKms] = useState("");
  const [addCollections, setAddCollections] = useState(false);

  const [showDelivered, setShowDelivered] = useState(false);
  const [showNotDelivered, setShowNotDelivered] = useState(false);
  const [showOther, setShowOther] = useState(false);

  const [addNoVan, setAddNoVan] = useState(false);
  const [noVanPackages, setNoVanPackages] = useState<NoVanPackageDetail[]>([]);
  const [noVanInput, setNoVanInput] = useState("");

  
  // ESTADO PARA VALIDACIÓN BACKEND
  const [isValidatingNoVan, setIsValidatingNoVan] = useState(false);

  useEffect(() => {
    const fetchDispatchData = async () => {
      setIsLoading(true);
      try {
        const dispatchData = await getShipmensByDispatchId(dispatchId);
        setDispatch(dispatchData);
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos de la ruta",
          variant: "destructive",
        });
        onClose();
      } finally {
        setIsLoading(false);
      }
    };

    if (dispatchId) {
      fetchDispatchData();
    }
  }, [dispatchId, toast, onClose]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateHermosillo = (utcDate?: string | Date) => {
    if (!utcDate) return "—";
    return new Intl.DateTimeFormat("es-MX", {
      timeZone: "America/Hermosillo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(utcDate));
  };

  const isTodayInHermosillo = (utcDate?: string | Date) => {
    if (!utcDate) return false;
    const date = new Date(utcDate);
    const formatter = new Intl.DateTimeFormat("es-MX", {
      timeZone: "America/Hermosillo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const today = formatter.format(new Date());
    const target = formatter.format(date);
    return today === target;
  };

  const isYesterdayInHermosillo = (utcDate?: string | Date) => {
    if (!utcDate) return false;
    const date = new Date(utcDate);
    const formatter = new Intl.DateTimeFormat("es-MX", {
      timeZone: "America/Hermosillo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayFormatted = formatter.format(yesterday);
    const target = formatter.format(date);
    return yesterdayFormatted === target;
  };

  const hasOtherPackagesDueToday = (otherPackages: PackageInfo[]) => {
    const dispatchWasYesterday = isYesterdayInHermosillo(dispatch?.createdAt);
    return otherPackages.some(pkg => {
      if (!pkg.commitDateTime) return false;
      const dueToday = isTodayInHermosillo(pkg.commitDateTime);
      return dueToday && !dispatchWasYesterday;
    });
  };

  const {
  allShipments,
  dhlShipments,
  totalPackages,
  deliveredPackages,
  notDeliveredPackages,
  otherPackages,
  returnedPackages,
  deliveredCount,
  notDeliveredCount,
  otherCount,
  returnedCount,
  deliveryRate,
  notDeliveredRate,
  otherRate,
  returnRate,
  routeNames,
} = useMemo(() => {
  if (!dispatch) {
    return {
      allShipments: [], dhlShipments: [], totalPackages: 0, deliveredPackages: [],
      notDeliveredPackages: [], otherPackages: [], returnedPackages: [],
      deliveredCount: 0, notDeliveredCount: 0, otherCount: 0, returnedCount: 0,
      deliveryRate: 0, notDeliveredRate: 0, otherRate: 0, returnRate: 0, routeNames: "Sin ruta asignada",
    };
  }

  // 1. Obtener paquetes del manifiesto
  const shipments = mapToPackageInfoComplete(dispatch.shipments, dispatch.chargeShipments);
  
  const delivered: PackageInfo[] = [];
  const notDelivered: PackageInfo[] = [];
  const other: PackageInfo[] = [];
  const returned: PackageInfo[] = [];
  const dhlOnly: PackageInfo[] = [];

  const notDeliveredStatuses = [
    'no_entregado', 
    'rechazado', 
    'direccion_incorrecta', 
    'cliente_no_disponible',
    'cambio_fecha_solicitado', 
    'devuelto_a_fedex'
  ];

  // 2. Procesar paquetes originales
  shipments.forEach(pkg => {
    const isDhl = pkg.shipmentType?.toLowerCase() === 'dhl';
    if (isDhl) dhlOnly.push(pkg);

    const statusStr = pkg.status?.toLowerCase() || 'desconocido';
    const isDelivered = statusStr === 'entregado' || pkg.status === (ShipmentStatusType as any).ENTREGADO;
    const isNotDelivered = notDeliveredStatuses.includes(statusStr) || pkg.status === (ShipmentStatusType as any).NOT_DELIVERED;
    
    if (isDelivered) {
      delivered.push(pkg);
    } else if (isNotDelivered) {
      notDelivered.push(pkg);
      returned.push({ ...pkg, isValid: true });
    } else {
      other.push(pkg); 
    }
  });

  // 3. PROCESAR E INTEGRAR PAQUETES NO VAN
  noVanPackages.forEach(extra => {
    // Convertimos el objeto NoVanPackageDetail a un formato compatible con PackageInfo para los detalles
    const extraPkg: PackageInfo = {
      id: `novan-${extra.trackingNumber}`,
      trackingNumber: extra.trackingNumber,
      status: extra.status,
      isCharge: extra.isCharge,
      shipmentType: 'FEDEX', // Por defecto o según tu lógica
      recipientName: 'Paquete No VAN'
    };

    const statusStr = extra.status?.toLowerCase() || 'desconocido';
    const isDelivered = statusStr === 'entregado' || statusStr === 'delivered' || extra.status === (ShipmentStatusType as any).ENTREGADO;
    const isNotDelivered = notDeliveredStatuses.includes(statusStr) || extra.status === (ShipmentStatusType as any).NOT_DELIVERED;

    if (isDelivered) {
      delivered.push(extraPkg);
    } else if (isNotDelivered) {
      notDelivered.push(extraPkg);
      returned.push({ ...extraPkg, isValid: true });
    } else {
      other.push(extraPkg);
    }
  });

  // 4. Calcular totales finales (Originales + No VAN)
  const total = shipments.length + noVanPackages.length;
  const delCount = delivered.length;
  const notDelCount = notDelivered.length;
  const othCount = other.length;
  const retCount = returned.length;

  const delRate = total > 0 ? (delCount / total) * 100 : 0;
  const notDelRate = total > 0 ? (notDelCount / total) * 100 : 0;
  const othRate = total > 0 ? (othCount / total) * 100 : 0;
  const retRate = total > 0 ? (retCount / total) * 100 : 0;

  const routes = dispatch.routes?.map((r) => r.name).join(", ") || "Sin ruta asignada";

  return {
    allShipments: shipments, 
    dhlShipments: dhlOnly, 
    totalPackages: total,
    deliveredPackages: delivered, 
    notDeliveredPackages: notDelivered,
    otherPackages: other, 
    returnedPackages: returned,
    deliveredCount: delCount, 
    notDeliveredCount: notDelCount,
    otherCount: othCount, 
    returnedCount: retCount,
    deliveryRate: delRate, 
    notDeliveredRate: notDelRate,
    otherRate: othRate, 
    returnRate: retRate, 
    routeNames: routes,
  };
}, [dispatch, noVanPackages]);

  const [activeTab, setActiveTab] = useState<'dhl' | 'collections' | 'novan'>(
    dhlShipments.length > 0 ? 'dhl' : 'collections'
  );

  const calculateKmsTraveled = useCallback(() => {
    if (!actualKms || !dispatch?.kms) return null;
    const initial = parseInt(dispatch.kms) || 0;
    const final = parseInt(actualKms) || 0;
    return final - initial;
  }, [actualKms, dispatch]);

  const kmsTraveled = calculateKmsTraveled();
  const pendingDhlUpdates = otherPackages.some(pkg => pkg.shipmentType?.toLowerCase() === 'dhl');

  const handlePdf = async () => { 
    const collectionsForPdf = collectionsRaw.split("\n")
        .map(item => item.trim())
        .filter(item => item.length > 0);
      
      const blob = await pdf(
        <RouteClosurePDF 
          key={Date.now()}
          returnedPackages={notDeliveredPackages}
          packageDispatch={dispatch!}
          actualKms={actualKms}
          collections={collectionsForPdf}
          podPackages={deliveredPackages}
          noVanPackages={noVanPackages}
        />
      ).toBlob();

      const blobUrl = URL.createObjectURL(blob) + `#${Date.now()}`;
      window.open(blobUrl, '_blank');
  };

  const handleSendEmail = async (routeClosure: RouteClosure) => {
    setIsSubmitting(true);
    try {
      const collectionsForPdf = collectionsRaw.split("\n")
        .map(item => item.trim())
        .filter(item => item.length > 0);

      const blob = await pdf(
        <RouteClosurePDF 
          key={Date.now()}
          returnedPackages={returnedPackages}
          packageDispatch={dispatch!}
          actualKms={actualKms}
          collections={collectionsForPdf}
          podPackages={deliveredPackages}
          noVanPackages={noVanPackages}
        />
      ).toBlob();

      const currentDate = new Date().toLocaleDateString("es-ES", {
        day: "2-digit", month: "2-digit", year: "numeric",
      });
      
      const fileName = `CIERRE--${dispatch?.drivers?.[0]?.name?.toUpperCase() || 'SIN_REPARTIDOR'}--${dispatch?.subsidiary?.name || 'SIN_SUCURSAL'}--Devoluciones--${currentDate.replace(/\//g, "-")}.pdf`;
      const pdfFile = new File([blob], fileName, { type: 'application/pdf' });

      const excelBuffer = await generateRouteClosureExcel(
        returnedPackages, 
        dispatch!, 
        actualKms, 
        collectionsForPdf, 
        [], 
        false
      );
      
      const excelBlob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const excelFileName = `CIERRE--${dispatch?.drivers?.[0]?.name?.toUpperCase() || 'SIN_REPARTIDOR'}--${dispatch?.subsidiary?.name || 'SIN_SUCURSAL'}--Devoluciones--${currentDate.replace(/\//g, "-")}.xlsx`;
      const excelFile = new File([excelBlob], excelFileName, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      await uploadFiles(pdfFile, excelFile, routeClosure.id);
    } catch (error) {
      toast({
        title: "Error en documentos",
        description: "No se pudieron generar los archivos PDF/Excel",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddNoVanPackages = async () => {
    if (!noVanInput.trim() || isValidatingNoVan) return;

    // Filtramos trackings que ya están en la lista local para no re-validar
    const trackings = noVanInput
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && !noVanPackages.some(pkg => pkg.trackingNumber === t));

    if (trackings.length === 0) {
      setNoVanInput("");
      return;
    }

    setIsValidatingNoVan(true);

    try {
      // LLAMADA ÚNICA AL BACKEND (Envía el array completo)
      const results: NoVanPackageDetail[] = await validateTrackinNumberNoVan(trackings);

      const validResults = results.filter((r) => r.isValid);
      const invalidCount = results.length - validResults.length;

      if (validResults.length > 0) {
        setNoVanPackages((prev) => [...prev, ...validResults]);
        setNoVanInput("");
        toast({
          title: "Validación completada",
          description: `Se agregaron ${validResults.length} paquetes correctamente.`,
        });
      }

      if (invalidCount > 0) {
        toast({
          title: "Guías inválidas",
          description: `${invalidCount} guías no pudieron ser validadas.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error de conexión",
        description: "No se pudo comunicar con el servidor para validar.",
        variant: "destructive",
      });
    } finally {
      setIsValidatingNoVan(false);
    }
  };

  const removeNoVanPackage = (trackingNumber: string) => {
    setNoVanPackages(prev => prev.filter(p => p.trackingNumber !== trackingNumber));
  };

  const handleCloseRoute = async () => {
    if (!dispatch) return;

    if (!actualKms.trim()) {
      toast({ title: "Error", description: "Debes ingresar el kilometraje al cierre.", variant: "destructive" });
      return;
    }

    const kmsNumber = parseInt(actualKms);
    if (isNaN(kmsNumber) || kmsNumber < 0) {
      toast({ title: "Kilometraje inválido", description: "Ingresa un valor numérico válido", variant: "destructive" });
      return;
    }

    const initialKms = parseInt(dispatch.kms || "0");
    if (kmsNumber < initialKms) {
      toast({ title: "Kilometraje incorrecto", description: "El kilometraje final no puede ser menor al inicial", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const returnedShipmentIds = returnedPackages
        .filter(p => p.isValid)
        .map(p => ({ id: p.id, status: p.status, isCharge: p.isCharge }));

      const podShipmentIds = deliveredPackages
        .map(p => ({ id: p.id, status: p.status, isCharge: p.isCharge }));
      
      const closurePackageDispatch: RouteClosure = {
        packageDispatch: { id: dispatch.id },
        closeDate: new Date(),
        returnedPackages: returnedShipmentIds,
        podPackages: podShipmentIds, 
        actualKms: actualKms,
        subsidiary: user?.subsidiary,
        createdBy: user,
        collections: collectionsRaw.split("\n").map(item => item.trim()).filter(item => item.length > 0),
        noVanPackages: noVanPackages
      };

      const savedClosure = await save(closurePackageDispatch as any);
      
      toast({ title: "Cierre exitoso", description: "La ruta se ha cerrado correctamente." });
      
      await handleSendEmail(savedClosure);
      onSuccess();
    } catch (error) {
      toast({ title: "Error", description: "No se pudo procesar el cierre de ruta.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDhlStatusChange = useCallback((pkgId: string, newStatus: string) => {
    setDispatch((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        shipments: prev.shipments?.map((pkg) => pkg.id === pkgId ? { ...pkg, status: newStatus } : pkg),
        chargeShipments: prev.chargeShipments?.map((pkg) => pkg.id === pkgId ? { ...pkg, status: newStatus } : pkg)
      };
    });
  }, []);

  const handleUpdateFedex = async () => { 
    try {
      setIsLoading(true);
      await updateDataFromFedexByPackageDispatchId(dispatchId);
    } catch (error) {
      console.error("Error al actualizar datos de FedEx:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 2 && pendingDhlUpdates) {
      toast({ title: "Atención", description: "Faltan estatus de DHL por actualizar.", variant: "destructive" });
      return;
    }
    if (currentStep < totalSteps) setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando datos de la ruta...</span>
      </div>
    );
  }

  if (!dispatch) {
    return (
      <div className="text-center py-8">
        <XCircle className="h-12 w-12 mx-auto text-red-500 mb-2" />
        <p className="text-gray-700">No se pudieron cargar los datos de la ruta</p>
        <Button onClick={onClose} className="mt-4">Cerrar</Button>
      </div>
    );
  }

  const showDhlSection = dhlShipments.length > 0 || process.env.NODE_ENV === 'development';

  return (
    <div className="w-full max-w-5xl mx-auto border-0 shadow-none space-y-6">
      {/* HEADER Y PASOS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Cierre de Ruta</h2>
            <p className="text-slate-600 text-sm mt-1 flex items-center gap-2">
              <span className="font-bold text-primary">{dispatch.trackingNumber}</span>
              <span className="text-slate-300">•</span>
              <span className="font-medium">{dispatch.subsidiary?.name || "Sucursal no asignada"}</span>
              <span className="text-slate-300">•</span>
              <span className="font-medium flex items-center gap-1 italic">
                <Calendar className="h-3 w-3" /> {formatDate(dispatch.createdAt)}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {[
            { step: 1, label: "Resumen" },
            { step: 2, label: "Operaciones" },
            { step: 3, label: "Finalizar" }
          ].map((s, i) => (
            <div key={s.step} className="flex items-center">
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold border-2 transition-colors", 
                currentStep === s.step ? "border-primary bg-primary text-white" : 
                currentStep > s.step ? "border-green-500 bg-green-500 text-white" : "border-gray-200 text-gray-400 bg-white"
              )}>
                {currentStep > s.step ? <Check className="h-4 w-4" /> : s.step}
              </div>
              <span className={cn("hidden md:block ml-2 text-sm font-medium", currentStep === s.step ? "text-primary" : "text-gray-500")}>
                {s.label}
              </span>
              {i < 2 && <div className={cn("w-8 md:w-12 h-0.5 mx-2", currentStep > s.step ? "bg-green-500" : "bg-gray-200")} />}
            </div>
          ))}
        </div>
      </div>

      {/* DETALLES GENERALES DE LA RUTA (Visible en todos los pasos) */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4 px-2 pb-6 border-b border-gray-100">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium uppercase tracking-wider">
            <Truck className="h-3.5 w-3.5" /> Unidad
          </div>
          <div className="text-sm font-semibold text-slate-800">
            {dispatch.vehicle?.name || "—"}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium uppercase tracking-wider">
            <Users className="h-3.5 w-3.5" /> Repartidor(es)
          </div>
          <div className="text-sm font-semibold text-slate-800 line-clamp-1 max-w-[200px]">
            {dispatch.drivers?.map((d) => d.name).join(", ") || "—"}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium uppercase tracking-wider">
            <Route className="h-3.5 w-3.5" /> Rutas
          </div>
          <div className="text-sm font-semibold text-slate-800 max-w-[200px] truncate" title={routeNames}>
            {routeNames}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium uppercase tracking-wider">
            <BarChart3 className="h-3.5 w-3.5" /> Tasa Devolución
          </div>
          <div className={`text-sm font-bold ${returnRate > 20 ? 'text-red-600' : 'text-green-600'}`}>
            {returnRate.toFixed(1)}%
          </div>
        </div>

        {/* CONTADORES VISIBLES A PARTIR DEL PASO 2 */}
        {currentStep > 1 && (
          <div className="flex items-center gap-6 animate-in fade-in zoom-in duration-300">
            <div className="w-px h-10 bg-slate-200 mx-2 hidden lg:block"></div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium uppercase tracking-wider">
                <PackageCheck className="h-3.5 w-3.5 text-green-600" /> Entregados
              </div>
              <div className="text-sm font-bold text-green-700">
                {deliveredCount}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium uppercase tracking-wider">
                <PackageX className="h-3.5 w-3.5 text-red-600" /> No Entregados
              </div>
              <div className="text-sm font-bold text-red-700">
                {notDeliveredCount}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium uppercase tracking-wider">
                <PackageSearch className="h-3.5 w-3.5 text-amber-600" /> Otros
              </div>
              <div className="text-sm font-bold text-amber-700">
                {otherCount}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PASO 1: ESTADÍSTICAS */}
      {currentStep === 1 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 pt-2">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" /> Estadísticas de Entrega
            </h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleUpdateFedex} className="hover:bg-slate-100">
                  <RefreshCwIcon className="h-4 w-4 mr-2" /> Sincronizar FedEx
                </Button>
              </TooltipTrigger>
              <TooltipContent>Actualizar estatus recientes</TooltipContent>
            </Tooltip>
          </div>

          {hasOtherPackagesDueToday(otherPackages) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-3 text-red-700 text-sm">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p>Existen paquetes sin DEX (No entregados) con fecha compromiso para el día de hoy. <b>El cierre no podrá confirmarse.</b></p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="text-green-700 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" /> Entregados
                  </span>
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                    {deliveryRate.toFixed(1)}%
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-5xl font-bold text-green-700 mb-2">{deliveredCount}</div>
                  <div className="text-sm text-gray-600 mb-4">de {totalPackages} paquetes</div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800"
                    onClick={() => setShowDelivered(!showDelivered)}
                  >
                    {showDelivered ? "Ocultar detalles" : "Ver entregados"}
                  </Button>
                  <Collapsible open={showDelivered}>
                    <CollapsibleContent className="mt-4 pt-4 border-t border-green-200">
                      <ScrollArea className="h-64">
                        <div className="space-y-2 pr-2">
                          {deliveredPackages.length === 0 ? (
                            <div className="text-center py-4 text-gray-500">No hay paquetes entregados</div>
                          ) : (
                            deliveredPackages.map((pkg) => (
                              <div key={pkg.id || pkg.trackingNumber} className="p-2 rounded hover:bg-green-50 space-y-1 text-left">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="font-medium text-sm text-gray-800 truncate">{pkg.trackingNumber}</div>
                                  <Badge className="bg-green-100 text-green-800 shrink-0">{pkg.status || 'ENTREGADO'}</Badge>
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {pkg.recipientName || 'Sin destinatario'}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-white shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="text-red-700 flex items-center gap-2">
                    <PackageX className="h-5 w-5" /> No Entregados
                  </span>
                  <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                    {notDeliveredRate.toFixed(1)}%
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-5xl font-bold text-red-700 mb-2">{notDeliveredCount}</div>
                  <div className="text-sm text-gray-600 mb-4">de {totalPackages} paquetes</div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
                    onClick={() => setShowNotDelivered(!showNotDelivered)}
                  >
                    {showNotDelivered ? "Ocultar detalles" : "Ver no entregados"}
                  </Button>
                  <Collapsible open={showNotDelivered}>
                    <CollapsibleContent className="mt-4 pt-4 border-t border-red-200">
                      <ScrollArea className="h-64">
                        <div className="space-y-2 pr-2">
                          {notDeliveredPackages.length === 0 ? (
                            <div className="text-center py-4 text-gray-500">No hay paquetes no entregados</div>
                          ) : (
                            notDeliveredPackages.map((pkg) => {
                              const rawExceptionCode = pkg.exceptionCode ?? pkg.statusHistory
                                ?.filter(h => h.status === 'no_entregado' && h.exceptionCode)
                                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]?.exceptionCode;
                              const noEntregadoExceptionCode = rawExceptionCode ? `DEX ${rawExceptionCode}` : undefined;

                              return (
                                <div key={pkg.id || pkg.trackingNumber} className="p-2 rounded hover:bg-red-50 space-y-1 text-left">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="font-medium text-sm text-gray-800 truncate">{pkg.trackingNumber}</div>
                                    <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 shrink-0">
                                      {pkg.status || 'NO ENTREGADO'}
                                    </Badge>
                                  </div>
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="text-xs text-gray-500 truncate">{pkg.recipientName || 'Sin destinatario'}</div>
                                    {noEntregadoExceptionCode && (
                                      <div className="text-xs text-amber-600 font-medium truncate">
                                        {noEntregadoExceptionCode}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </ScrollArea>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="text-amber-700 flex items-center gap-2">
                    <PackageSearch className="h-5 w-5" /> Otros Estatus
                  </span>
                  <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                    {otherRate.toFixed(1)}%
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-5xl font-bold text-amber-700 mb-2">{otherCount}</div>
                  <div className="text-sm text-gray-600 mb-4">de {totalPackages} paquetes</div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                    onClick={() => setShowOther(!showOther)}
                  >
                    {showOther ? "Ocultar detalles" : "Ver otros"}
                  </Button>
                  <Collapsible open={showOther}>
                    <CollapsibleContent className="mt-4 pt-4 border-t border-amber-200">
                      <ScrollArea className="h-64">
                        <div className="space-y-2 pr-2">
                          {otherPackages.length === 0 ? (
                            <div className="text-center py-4 text-gray-500">No hay otros estatus</div>
                          ) : (
                            otherPackages.map((pkg) => (
                              <div key={pkg.id || pkg.trackingNumber} className={cn("p-3 rounded border space-y-2 transition-colors text-left", isTodayInHermosillo(pkg.commitDateTime) ? "bg-red-100 border-red-300 text-red-900" : "hover:bg-amber-50 border-transparent")}>
                                <div className="flex items-start justify-between gap-3">
                                  <span className="font-semibold text-sm">{pkg.trackingNumber}</span>
                                  <Badge className={cn("whitespace-normal leading-tight max-w-[45%] text-left", isTodayInHermosillo(pkg.commitDateTime) ? "bg-red-200 text-red-900 border-red-400" : "bg-amber-100 text-amber-800 border-amber-300")}>
                                    {pkg.status || "otro"}
                                  </Badge>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <span className="text-xs text-gray-600">{pkg.recipientName || "Sin destinatario"}</span>
                                  {pkg.commitDateTime && (
                                    <span className={cn("text-xs", isTodayInHermosillo(pkg.commitDateTime) ? "text-red-700 font-medium" : "text-gray-500")}>
                                      {formatDateHermosillo(pkg.commitDateTime)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* PASO 2: OPERACIONES */}
      {currentStep === 2 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 pt-2">
          
          {/* SELECTOR DE OPERACIÓN (SWITCHES) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            {/* Opción DHL */}
            {showDhlSection && (
              <div className={cn(
                "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer",
                activeTab === 'dhl' ? "bg-orange-50 border-orange-300 shadow-sm" : "bg-white border-transparent"
              )} onClick={() => setActiveTab(activeTab === 'dhl' ? null : 'dhl')}>
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", activeTab === 'dhl' ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-500")}>
                    <Truck className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-bold text-slate-700">DHL</span>
                </div>
                <Switch 
                  checked={activeTab === 'dhl'} 
                  onCheckedChange={() => setActiveTab(activeTab === 'dhl' ? null : 'dhl')}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}

            {/* Opción Recolecciones */}
            <div className={cn(
              "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer",
              activeTab === 'collections' ? "bg-purple-50 border-purple-300 shadow-sm" : "bg-white border-transparent"
            )} onClick={() => setActiveTab(activeTab === 'collections' ? null : 'collections')}>
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", activeTab === 'collections' ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-500")}>
                  <PackageCheck className="h-4 w-4" />
                </div>
                <span className="text-sm font-bold text-slate-700">Recolecciones</span>
              </div>
              <Switch 
                checked={activeTab === 'collections'} 
                onCheckedChange={() => setActiveTab(activeTab === 'collections' ? null : 'collections')}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Opción No VAN */}
            <div className={cn(
              "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer",
              activeTab === 'novan' ? "bg-slate-800 border-slate-900 shadow-sm" : "bg-white border-transparent"
            )} onClick={() => setActiveTab(activeTab === 'novan' ? null : 'novan')}>
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", activeTab === 'novan' ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500")}>
                  <PackagePlus className="h-4 w-4" />
                </div>
                {/* Aplicamos la condición aquí para el color del texto */}
                <span className={cn(
                  "text-sm font-bold transition-colors",
                  activeTab === 'novan' ? "text-white" : "text-slate-700"
                )}>
                  No VAN
                </span>
              </div>
              <Switch 
                checked={activeTab === 'novan'} 
                onCheckedChange={() => setActiveTab(activeTab === 'novan' ? null : 'novan')}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* CONTENIDO DINÁMICO (Uso de hidden para persistencia de datos) */}
          <div className="min-h-[400px] relative">
            
            {!activeTab && (
              <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-2xl border-slate-200 bg-slate-50/50">
                <Box className="h-12 w-12 text-slate-200 mb-2" />
                <p className="text-slate-400 text-sm">Selecciona una operación arriba para comenzar.</p>
              </div>
            )}

            {/* SECCIÓN DHL */}
            <div className={cn(activeTab !== 'dhl' && "hidden")}>
              <Card className="border-slate-300 shadow-xl overflow-hidden bg-white p-0">
                <div className="grid grid-cols-1 md:grid-cols-2">
                  <div className="p-6 bg-orange-50/30 border-r border-orange-100 flex flex-col justify-between min-h-[350px]">
                    <div>
                      <h3 className="text-orange-900 font-bold text-lg leading-tight mb-1">Estatus DHL</h3>
                      <p className="text-xs text-orange-700/70">Actualiza entregas de terceros.</p>
                    </div>
                    <div className="bg-orange-600 text-white p-6 rounded-2xl shadow-lg mt-4">
                      <div className="text-4xl font-black">{dhlShipments.length}</div>
                      <div className="text-[10px] opacity-80 uppercase tracking-widest font-bold">Pendientes</div>
                    </div>
                  </div>
                  <div className="p-6">
                    <ScrollArea className="h-[300px] pr-4">
                      <div className="space-y-2">
                        {dhlShipments.map((pkg) => (
                          <div key={pkg.id} className="flex justify-between items-center p-3 bg-slate-50 border rounded-xl hover:border-orange-300 transition-all">
                            <span className="font-mono font-bold text-sm text-slate-700">{pkg.trackingNumber}</span>
                            <select
                              value={Object.values(ShipmentStatusType).includes(pkg.status as any) ? pkg.status : ""}
                              onChange={(e) => handleDhlStatusChange(pkg.id, e.target.value)}
                              className="h-8 w-36 rounded-lg border-slate-300 text-[11px] px-2 outline-none focus:ring-2 focus:ring-orange-200 bg-white"
                            >
                              <option value="" disabled>Estatus...</option>
                              {Object.values(ShipmentStatusType).map((val) => (
                                <option key={val} value={val}>{val.toUpperCase()}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </Card>
            </div>

            {/* SECCIÓN RECOLECCIONES */}
            <div className={cn(activeTab !== 'collections' && "hidden")}>
              <Card className="border-slate-300 shadow-xl overflow-hidden bg-white p-0">
                <div className="grid grid-cols-1 md:grid-cols-2">
                  <div className="p-6 bg-purple-50/30 border-r border-purple-100 flex flex-col min-h-[350px]">
                    <div className="flex-1">
                      <ScanInput
                        storageKey="scan:dispatch-close-collections"
                        defaultView="simple"
                        onTrackingNumbersChange={setCollectionsRaw}
                        placeholder="Escanea guías recolectadas..."
                      />
                    </div>
                  </div>
                  <div className="p-6 flex flex-col min-h-[350px]">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumen</span>
                      <Badge className="bg-purple-600 rounded-full text-[10px] px-3">{collectionsRaw.split('\n').filter(l => l.trim()).length} Detectadas</Badge>
                    </div>
                    <ScrollArea className="flex-1 border border-slate-100 rounded-2xl p-4 bg-slate-50/50 shadow-inner">
                      <div className="space-y-2">
                        {collectionsRaw.split('\n').filter(l => l.trim()).map((line, i) => (
                          <div key={i} className="text-[11px] font-mono py-2 px-3 bg-white border border-slate-200 rounded-lg flex items-center gap-3 shadow-sm">
                            <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" /> 
                            <span className="text-slate-600">{line}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </Card>
            </div>

            {/* SECCIÓN NO VAN */}
            <div className={cn(activeTab !== 'novan' && "hidden")}>
              <Card className="border-slate-300 shadow-xl overflow-hidden bg-white p-0">
                <div className="grid grid-cols-1 md:grid-cols-2">
                  <div className="p-6 bg-slate-50 border-r border-slate-200 flex flex-col min-h-[400px]">
                    <div className="flex-1 flex flex-col gap-4">
                      <ScanInput
                        storageKey="scan:dispatch-close-novan"
                        defaultView="simple"
                        onTrackingNumbersChange={setNoVanInput}
                        placeholder="Escanea guías externas..."
                        disabled={isValidatingNoVan}
                      />
                      <Button
                        onClick={handleAddNoVanPackages} 
                        disabled={!noVanInput.trim() || isValidatingNoVan} 
                        className="w-full bg-slate-800 hover:bg-slate-900 h-12 rounded-xl font-bold shadow-md transition-all shrink-0"
                      >
                        {isValidatingNoVan ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : "Validar y Agregar"}
                      </Button>
                    </div>
                    <div className="mt-6 p-4 bg-slate-800 rounded-2xl text-white flex items-center justify-between">
                      <span className="text-[10px] font-bold opacity-70 uppercase">Validados</span>
                      <span className="text-3xl font-black">{noVanPackages.length}</span>
                    </div>
                  </div>

                  <div className="p-6 bg-white flex flex-col min-h-[400px]">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Guías agregadas</span>
                    <ScrollArea className="flex-1">
                      <div className="grid grid-cols-1 gap-2 pr-2">
                        {noVanPackages.map((p, i) => (
                          <div key={i} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-slate-300 transition-all">
                            <div className="flex flex-col">
                              <span className="font-mono font-bold text-xs text-slate-800">{p.trackingNumber}</span>
                              <div className="flex gap-1.5 mt-1">
                                <Badge className="text-[8px] h-3.5 bg-blue-50 text-blue-700 border-blue-100 uppercase">{p.status}</Badge>
                                {p.isCharge && <Badge className="text-[8px] h-3.5 bg-amber-50 text-amber-700 border-amber-100">CARGO</Badge>}
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => removeNoVanPackage(p.trackingNumber)} className="h-8 w-8 text-red-300 hover:text-red-600 rounded-full">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* PASO 3: FINALIZAR */}
      {currentStep === 3 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 pt-2 text-left">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" /> Kilometraje y Confirmación
          </h3>

          <Card className="border-blue-100 border-2 shadow-sm">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-slate-500">Kilometraje Inicial</Label>
                  <div className="p-4 bg-slate-50 border rounded-xl text-2xl font-bold text-slate-700 text-center flex flex-col justify-center h-20">
                    {dispatch.kms || "0"} <span className="text-sm font-normal text-slate-400">Km</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 font-bold">Kilometraje Final <span className="text-red-500">*</span></Label>
                  <div className="relative h-20">
                    <Input 
                      placeholder="Ej. 145678" 
                      value={actualKms} 
                      onChange={(e) => setActualKms(e.target.value.replace(/\D/g, ''))} 
                      className="text-2xl text-center font-bold h-full rounded-xl border-2 focus-visible:ring-blue-500" 
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">Km</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-500">Distancia Recorrida</Label>
                  <div className={cn(
                    "p-4 rounded-xl text-2xl font-bold text-center flex flex-col justify-center h-20 border", 
                    kmsTraveled !== null && kmsTraveled >= 0 ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-red-50 border-red-200 text-red-500"
                  )}>
                    {kmsTraveled !== null ? <>{kmsTraveled} <span className="text-sm font-normal opacity-70">Km</span></> : <span className="text-sm font-normal opacity-50">Esperando...</span>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-blue-800">Resumen del Cierre</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-3 rounded border text-center">
                  <div className="text-xs text-slate-500">Entregados</div>
                  <div className="text-xl font-bold text-green-600">{deliveredCount}</div>
                </div>
                <div className="bg-white p-3 rounded border text-center">
                  <div className="text-xs text-slate-500">No Entregados</div>
                  <div className="text-xl font-bold text-red-600">{notDeliveredCount}</div>
                </div>
                <div className="bg-white p-3 rounded border text-center">
                  <div className="text-xs text-slate-500">Otros</div>
                  <div className="text-xl font-bold text-amber-600">{otherCount}</div>
                </div>
                <div className="bg-white p-3 rounded border text-center">
                  <div className="text-xs text-slate-500">Recolecciones</div>
                  <div className="text-xl font-bold text-purple-600">{addCollections ? collectionsRaw.split('\n').filter(l => l.trim()).length : 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* FOOTER */}
      <div className="flex justify-between items-center pt-6 border-t mt-8">
        {currentStep === 1 ? (
          <Button variant="ghost" onClick={onClose} className="text-slate-500">
            <X className="h-4 w-4 mr-2" /> Cancelar
          </Button>
        ) : (
          <Button variant="outline" onClick={prevStep}>
            <ChevronLeft className="h-4 w-4 mr-2" /> Atrás
          </Button>
        )}

        <div className="flex items-center gap-3">
          {/* BOTÓN PDF SOLO DESARROLLO */}
          {process.env.NODE_ENV === 'development' && (
            <Button variant="secondary" onClick={handlePdf}>
                <FileText className="h-4 w-4 mr-2" /> Generar PDF
            </Button>
          )}

          {currentStep < totalSteps ? (
            <Button onClick={nextStep} className="bg-primary px-6">
              Siguiente <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleCloseRoute} 
              disabled={isSubmitting || !actualKms.trim() || (parseInt(actualKms) < parseInt(dispatch.kms || "0")) || hasOtherPackagesDueToday(otherPackages)}
              className="bg-green-600 hover:bg-green-700 px-8"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : <><Send className="h-4 w-4 mr-2"/> Confirmar Cierre</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
