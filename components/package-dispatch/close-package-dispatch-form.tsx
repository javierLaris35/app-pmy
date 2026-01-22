"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  StampIcon,
  Package,
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
  RefreshCcwDotIcon,
  RefreshCwIcon,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { BarcodeScannerInput } from "@/components/barcode-scanner-input";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, mapToPackageInfo, mapToPackageInfoComplete } from "@/lib/utils";
import { PackageDispatch, PackageInfo, RouteClosure } from "@/lib/types";
import { useAuthStore } from "@/store/auth.store";
import { save, uploadFiles } from "@/lib/services/route-closure";
import { pdf } from "@react-pdf/renderer";
import { getShipmensByDispatchId } from "@/lib/services/package-dispatchs";
import { RouteClosurePDF } from "@/lib/services/route-closure/route-closure-pdf-generator";
import { generateRouteClosureExcel } from "@/lib/services/route-closure/route-closure-excel-generator";
import { updateDataFromFedexByPackageDispatchId } from "@/lib/services/monitoring/monitoring";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";


interface ClosePackageDispatchProps {
  dispatchId: string; // Solo recibe el ID
  onClose: () => void;
  onSuccess: () => void;
}

export default function ClosePackageDispatch({
  dispatchId,
  onClose,
  onSuccess,
}: ClosePackageDispatchProps) {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  
  // Estados para los datos
  const [dispatch, setDispatch] = useState<PackageDispatch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estados para el formulario
  const [collectionsRaw, setCollectionsRaw] = useState("");
  const [actualKms, setActualKms] = useState("");
  const [addCollections, setAddCollections] = useState(false);

  // Estados para mostrar/ocultar listas detalladas
  const [showDelivered, setShowDelivered] = useState(false);
  const [showNotDelivered, setShowNotDelivered] = useState(false);
  const [showOther, setShowOther] = useState(false);

  // Obtener datos del dispatch
  useEffect(() => {
    const fetchDispatchData = async () => {
      setIsLoading(true);
      try {
        console.log("🚀 ~ fetchDispatchData ~ dispatchId:", dispatchId)
        const dispatchData = await getShipmensByDispatchId(dispatchId);
        setDispatch(dispatchData);
      } catch (error) {
        console.error("Error al cargar datos del dispatch:", error);
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

  // Formatear fecha
  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Memoizar cálculos basados en dispatch
  const {
    allShipments,
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
        allShipments: [],
        totalPackages: 0,
        deliveredPackages: [],
        notDeliveredPackages: [],
        otherPackages: [],
        returnedPackages: [],
        deliveredCount: 0,
        notDeliveredCount: 0,
        otherCount: 0,
        returnedCount: 0,
        deliveryRate: 0,
        notDeliveredRate: 0,
        otherRate: 0,
        returnRate: 0,
        routeNames: "Sin ruta asignada",
      };
    }

    // Todos los paquetes de la salida
    const shipments = mapToPackageInfoComplete(dispatch.shipments, dispatch.chargeShipments);
    const total = shipments.length;

    // Clasificar paquetes por status
    const delivered: PackageInfo[] = [];
    const notDelivered: PackageInfo[] = [];
    const other: PackageInfo[] = [];
    const returned: PackageInfo[] = [];

    shipments.forEach(pkg => {
      const status = pkg.status?.toLowerCase() || 'desconocido';
      
      if (status === 'entregado' || status === 'delivered') {
        delivered.push(pkg);
      } else if (status === 'no_entregado' || status === 'rechazado' || status === 'direccion_incorrecta' || status === 'cliente_no_disponible' || status === 'cambio_fecha_solicitado') {
        notDelivered.push(pkg);
        returned.push({
          ...pkg,
          isValid: true
        });
      } else {
        other.push(pkg);
      }
    });

    const delCount = delivered.length;
    const notDelCount = notDelivered.length;
    const othCount = other.length;
    const retCount = returned.length;

    const delRate = total > 0 ? (delCount / total) * 100 : 0;
    const notDelRate = total > 0 ? (notDelCount / total) * 100 : 0;
    const othRate = total > 0 ? (othCount / total) * 100 : 0;
    const retRate = notDelRate;

    const routes = dispatch.routes?.map((r) => r.name).join(", ") || "Sin ruta asignada";

    return {
      allShipments: shipments,
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
  }, [dispatch]);

  // Calcula kilómetros recorridos
  const calculateKmsTraveled = useCallback(() => {
    if (!actualKms || !dispatch?.kms) return null;
    const initial = parseInt(dispatch.kms) || 0;
    const final = parseInt(actualKms) || 0;
    return final - initial;
  }, [actualKms, dispatch]);

  const kmsTraveled = calculateKmsTraveled();

  // Función para enviar email con PDF y Excel
  const handleSendEmail = async (routeClosure: RouteClosure) => {
    setIsSubmitting(true);

    try {
      const collectionsForPdf = collectionsRaw.split("\n")
        .map(item => item.trim())
        .filter(item => item.length > 0);

      // Generar PDF
      const blob = await pdf(
        <RouteClosurePDF 
          key={Date.now()}
          returnedPackages={returnedPackages}
          packageDispatch={dispatch!}
          actualKms={actualKms}
          collections={collectionsForPdf}
          podPackages={[]}
        />
      ).toBlob();

      const blobUrl = URL.createObjectURL(blob) + `#${Date.now()}`;
      window.open(blobUrl, '_blank');

      const currentDate = new Date().toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      
      const fileName = `CIERRE--${dispatch?.drivers?.[0]?.name?.toUpperCase() || 'SIN_REPARTIDOR'}--${dispatch?.subsidiary?.name || 'SIN_SUCURSAL'}--Devoluciones--${currentDate.replace(/\//g, "-")}.pdf`;
      const pdfFile = new File([blob], fileName, { type: 'application/pdf' });

      // Generar Excel
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

      // Subir archivos
      await uploadFiles(pdfFile, excelFile, routeClosure.id);

    } catch (error) {
      console.error("Error al generar o enviar archivos:", error);
      toast({
        title: "Error en documentos",
        description: "No se pudieron generar los archivos PDF/Excel",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función para manejar cambio del switch
  const handleAddCollectionsChange = useCallback((checked: boolean) => {
    setAddCollections(checked);
    if (!checked) {
      setCollectionsRaw("");
    }
  }, []);

  // Manejo del cierre de ruta
  const handleCloseRoute = async () => {
    if (!dispatch) return;

    // Validación de kilometraje
    if (!actualKms.trim()) {
      toast({
        title: "Error",
        description: "Debes ingresar el kilometraje al cierre.",
        variant: "destructive",
      });
      return;
    }

    // Validar que el kilometraje sea numérico
    const kmsNumber = parseInt(actualKms);

    if (isNaN(kmsNumber) || kmsNumber < 0) {
      toast({
        title: "Kilometraje inválido",
        description: "Ingresa un valor numérico válido",
        variant: "destructive",
      });
      return;
    }

    // Validar que el kilometraje final sea mayor al inicial
    const initialKms = parseInt(dispatch.kms || "0");

    if (kmsNumber < initialKms) {
      toast({
        title: "Kilometraje incorrecto",
        description: "El kilometraje final no puede ser menor al inicial",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const returnedShipmentIds = returnedPackages
        .filter(p => p.isValid)
        .map(p => p.id);

      const closurePackageDispatch: RouteClosure = {
        packageDispatch: { id: dispatch.id },
        closeDate: new Date(),
        returnedPackages: returnedShipmentIds,
        actualKms: actualKms,
        podPackages: [],
        subsidiary: user?.subsidiary,
        createdBy: user,
        collections: collectionsRaw.split("\n")
            .map(item => item.trim())
            .filter(item => item.length > 0)
      };

      const savedClosure = await save(closurePackageDispatch);
      
      toast({
        title: "Cierre exitoso",
        description: "La ruta se ha cerrado correctamente.",
      });
      
      // Generar y enviar documentos
      await handleSendEmail(savedClosure);

      onSuccess();
    } catch (error) {
      console.error("Error al cerrar la ruta:", error);
      toast({
        title: "Error",
        description: "No se pudo procesar el cierre de ruta.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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

  const hasOtherPackagesDueToday = (otherPackages: PackageInfo[]) => {
    return otherPackages.some(
      pkg =>
        pkg.commitDateTime &&
        isTodayInHermosillo(pkg.commitDateTime)
    );
  };
  
  const handleUpdateFedex = async () => { 
    try {
      setIsLoading(true);

      const updatedPackages = await updateDataFromFedexByPackageDispatchId(dispatchId);
      console.log("🚀 ~ handleUpdateFedex ~ updatedPackages:", updatedPackages)

    } catch (error) {
      console.error("Error al actualizar datos de FedEx:", error);
    } finally {
      setIsLoading(false);
    }
  }

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
        <Button onClick={onClose} className="mt-4">
          Cerrar
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto border-0 shadow-none space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        {/* IZQUIERDA: Icono + título */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Lock className="h-9 w-9 text-primary" />
          </div>

          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
              Cierre de Ruta
            </h2>
            <p className="text-gray-600 mt-1">
              <span className="font-semibold">{dispatch.trackingNumber}</span>
              <span className="mx-2">•</span>
              <span>{dispatch.subsidiary?.name || "Sucursal no asignada"}</span>
            </p>
          </div>
        </div>

        {/* DERECHA: Botón refresh */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUpdateFedex}
              className="
                h-14 w-14
                rounded-xl
                bg-gradient-to-r from-green-600 to-emerald-600
                hover:from-green-700 hover:to-emerald-700
                shadow-md hover:shadow-lg
                transition-all
                text-white
                flex items-center justify-center
              "
            >
              <RefreshCwIcon className="h-7 w-7" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Actualizar estatus de FedEx
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Información general de la ruta */}
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Fecha Ruta</span>
              </div>
              <div className="font-semibold text-gray-800">
                {formatDate(dispatch.createdAt)}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Truck className="h-4 w-4" />
                <span className="font-medium">Unidad</span>
              </div>
              <div className="font-semibold text-gray-800">
                {dispatch.vehicle?.name || "—"}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                <span className="font-medium">Repartidor(es)</span>
              </div>
              <div className="font-semibold text-gray-800 line-clamp-1">
                {dispatch.drivers?.map((d) => d.name).join(", ") || "—"}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Route className="h-4 w-4" />
                <span className="font-medium">Ruta</span>
              </div>
              <div className="font-semibold text-gray-800">
                {routeNames}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <BarChart3 className="h-4 w-4" />
                <span className="font-medium">Tasa Devolución</span>
              </div>
              <div className={`font-bold ${returnRate > 20 ? 'text-red-600' : 'text-green-600'}`}>
                {returnRate.toFixed(1)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas principales */}
      <div>
        {/* Título y nota de bloqueo */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
          {/* Título */}
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-primary" />
            Estadísticas de Entrega
          </h3>

          {/* Nota de bloqueo */}
          {hasOtherPackagesDueToday(otherPackages) && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="text-right">
                No se podrá cerrar la ruta por paquetes <b>sin DEX</b> que vencen hoy
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tarjeta ENTREGADOS */}
          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="text-green-700 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Entregados
                </span>
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                  {deliveryRate.toFixed(1)}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-5xl font-bold text-green-700 mb-2">{deliveredCount}</div>
                <div className="text-sm text-gray-600 mb-4">
                  de {totalPackages} paquetes
                </div>
                
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
                          <div className="text-center py-4 text-gray-500">
                            No hay paquetes entregados
                          </div>
                        ) : (
                          deliveredPackages.map((pkg, index) => (
                            <div
                              key={pkg.id || pkg.trackingNumber}
                              className="p-2 rounded hover:bg-green-50 space-y-1"
                            >
                              {/* Fila superior: tracking + status */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="font-medium text-sm text-gray-800 truncate">
                                  {pkg.trackingNumber}
                                </div>

                                <Badge className="bg-green-100 text-green-800 shrink-0">
                                  {pkg.status || 'ENTREGADO'}
                                </Badge>
                              </div>

                              {/* Fila inferior: destinatario */}
                              <div className="flex items-start justify-between text-xs text-gray-500 truncate">
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

          {/* Tarjeta NO ENTREGADOS/DEVUELTOS */}
          <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="text-red-700 flex items-center gap-2">
                  <PackageX className="h-5 w-5" />
                  No Entregados
                </span>
                <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                  {notDeliveredRate.toFixed(1)}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-5xl font-bold text-red-700 mb-2">{notDeliveredCount}</div>
                <div className="text-sm text-gray-600 mb-4">
                  de {totalPackages} paquetes
                </div>
                
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
                          <div className="text-center py-4 text-gray-500">
                            No hay paquetes no entregados
                          </div>
                        ) : (
                          notDeliveredPackages.map((pkg) => {
                            const rawExceptionCode =
                              pkg.exceptionCode ??
                              pkg.statusHistory
                                ?.filter(
                                  h => h.status === 'no_entregado' && h.exceptionCode
                                )
                                .sort(
                                  (a, b) =>
                                    new Date(b.timestamp).getTime() -
                                    new Date(a.timestamp).getTime()
                                )[0]?.exceptionCode;

                            const noEntregadoExceptionCode = rawExceptionCode
                              ? `DEX ${rawExceptionCode}`
                              : undefined;

                            return (
                              <div
                                key={pkg.id || pkg.trackingNumber}
                                className="p-2 rounded hover:bg-red-50 space-y-1"
                              >
                                {/* Fila superior */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="font-medium text-sm text-gray-800 truncate">
                                    {pkg.trackingNumber}
                                  </div>

                                  <Badge
                                    variant="outline"
                                    className="bg-red-100 text-red-800 border-red-300 shrink-0"
                                  >
                                    {pkg.status || 'NO ENTREGADO'}
                                  </Badge>
                                </div>

                                {/* Fila inferior */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="text-xs text-gray-500 truncate">
                                    {pkg.recipientName || 'Sin destinatario'}
                                  </div>

                                  {noEntregadoExceptionCode && (
                                    <div className="text-xs text-amber-600 font-medium truncate max-w-[140px]">
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

          {/* Tarjeta OTROS ESTATUS */}
          <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="text-amber-700 flex items-center gap-2">
                  <PackageSearch className="h-5 w-5" />
                  Otros Estatus
                </span>
                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                  {otherRate.toFixed(1)}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-5xl font-bold text-amber-700 mb-2">{otherCount}</div>
                <div className="text-sm text-gray-600 mb-4">
                  de {totalPackages} paquetes
                </div>
                
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
                          <div className="text-center py-4 text-gray-500">
                            No hay otros estatus
                          </div>
                        ) : (
                          otherPackages.map((pkg) => (
                            <div
                              key={pkg.id || pkg.trackingNumber}
                              className={cn(
                                "p-3 rounded border space-y-2 transition-colors",
                                isTodayInHermosillo(pkg.commitDateTime)
                                  ? "bg-red-100 border-red-300 text-red-900"
                                  : "hover:bg-amber-50 border-transparent"
                              )}
                            >
                              {/* FILA 1: TRACKING + STATUS */}
                              <div className="flex items-start justify-between gap-3">
                                <span className="font-semibold text-sm text-left">
                                  {pkg.trackingNumber}
                                </span>

                                <Badge
                                  className={cn(
                                    "whitespace-normal leading-tight max-w-[45%] text-left",
                                    isTodayInHermosillo(pkg.commitDateTime)
                                      ? "bg-red-200 text-red-900 border-red-400"
                                      : "bg-amber-100 text-amber-800 border-amber-300"
                                  )}
                                >
                                  {pkg.status || "otro"}
                                </Badge>
                              </div>

                              {/* FILA 2: DETALLES */}
                              <div className="flex flex-col gap-1 text-left">
                                <span className="text-xs text-gray-600">
                                  {pkg.recipientName || "Sin destinatario"}
                                </span>

                                {pkg.commitDateTime && (
                                  <span
                                    className={cn(
                                      "text-xs",
                                      isTodayInHermosillo(pkg.commitDateTime)
                                        ? "text-red-700 font-medium"
                                        : "text-gray-500"
                                    )}
                                  >
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

      <Separator className="my-4" />

      {/* Sección de Datos para el Cierre */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-primary" />
          Información para el Cierre
        </h3>

        {/* Kilometraje */}
        <Card className="border-blue-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="flex items-center gap-3">
                <Gauge className="h-5 w-5 text-blue-600" />
                <div>
                  Kilometraje al cierre
                  <span className="text-destructive ml-1">*</span>
                </div>
              </div>
            </CardTitle>
            <CardDescription>
              Registra el kilometraje final de la unidad
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Kilometraje Inicial</Label>
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <div className="text-xl font-bold text-gray-700">{dispatch.kms || "0"} Km</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Kilometraje Final</Label>
                <div className="relative">
                  <Input
                    placeholder="145678"
                    value={actualKms}
                    onChange={(e) => setActualKms(e.target.value.replace(/\D/g, ''))}
                    className="text-lg font-medium pl-10"
                    required
                    disabled={isSubmitting}
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    Km
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Kilómetros Recorridos</Label>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  {actualKms && dispatch.kms ? (
                    <>
                      <div className="text-xl font-bold text-blue-700">
                        {kmsTraveled} Km
                      </div>
                      <div className="text-sm text-blue-600 mt-1">
                        Distancia total recorrida
                      </div>
                    </>
                  ) : (
                    <div className="text-gray-500 text-sm">
                      Ingresa el kilometraje final
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recolecciones */}
        <Card className="border-purple-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-purple-600" />
              Recolecciones
            </CardTitle>
            <CardDescription>
              Guías de paquetes recolectados durante la ruta (opcional)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Switch
                  id="add-collections"
                  checked={addCollections}
                  onCheckedChange={handleAddCollectionsChange}
                  disabled={isSubmitting}
                />
                <Label htmlFor="add-collections" className="text-base font-medium cursor-pointer">
                  Agregar recolecciones
                </Label>
              </div>
              {addCollections && collectionsRaw && (
                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                  {collectionsRaw.split('\n').filter(l => l.trim()).length} guías
                </Badge>
              )}
            </div>

            {addCollections && (
              <div className="space-y-4">
                <BarcodeScannerInput
                  label="Guías recolectadas"
                  placeholder="Escanea o escribe los números de guía (uno por línea)..."
                  value={collectionsRaw}
                  onTrackingNumbersChange={setCollectionsRaw}
                  className="min-h-[120px]"
                  disabled={isSubmitting}
                />
                
                {collectionsRaw && (
                  <div>
                    <Label className="text-sm font-medium">Previsualización</Label>
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg border max-h-40 overflow-y-auto">
                      {collectionsRaw.split('\n')
                        .filter(l => l.trim())
                        .map((guide, index) => (
                          <div key={index} className="flex items-center gap-2 py-2 border-b last:border-0">
                            <div className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded text-xs">
                              {index + 1}
                            </div>
                            <code className="font-mono text-gray-700">{guide.trim()}</code>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resumen Final */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-blue-800">Resumen del Cierre</CardTitle>
          <CardDescription>
            Revisa toda la información antes de confirmar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-white rounded-lg border shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Entregados</div>
              <div className="text-3xl font-bold text-green-600">{deliveredCount}</div>
              <div className="text-xs text-gray-500">{deliveryRate.toFixed(1)}%</div>
            </div>
            
            <div className="text-center p-4 bg-white rounded-lg border shadow-sm">
              <div className="text-sm text-gray-600 mb-1">No Entregados</div>
              <div className="text-3xl font-bold text-red-600">{notDeliveredCount}</div>
              <div className="text-xs text-gray-500">{notDeliveredRate.toFixed(1)}%</div>
            </div>
            
            <div className="text-center p-4 bg-white rounded-lg border shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Otros</div>
              <div className="text-3xl font-bold text-amber-600">{otherCount}</div>
              <div className="text-xs text-gray-500">{otherRate.toFixed(1)}%</div>
            </div>
            
            <div className="text-center p-4 bg-white rounded-lg border shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Tasa Devolución</div>
              <div className={`text-3xl font-bold ${returnRate > 20 ? 'text-red-600' : 'text-green-600'}`}>
                {returnRate.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">
                {returnRate > 20 ? 'Alta' : 'Aceptable'}
              </div>
            </div>
            
            <div className="text-center p-4 bg-white rounded-lg border shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Km Recorridos</div>
              <div className="text-3xl font-bold text-blue-600">
                {kmsTraveled !== null ? kmsTraveled : "—"}
              </div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-white rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Total de paquetes</div>
                <div className="text-2xl font-bold text-gray-800">{totalPackages}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Efectividad de entrega</div>
                <div className="text-2xl font-bold text-green-600">{deliveryRate.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Recolecciones</div>
                <div className="text-2xl font-bold text-purple-600">
                  {addCollections ? collectionsRaw.split('\n').filter(l => l.trim()).length : 0}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Paquetes devueltos</div>
                <div className="text-2xl font-bold text-red-600">{returnedCount}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botones de acción */}
      <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4 border-t">
        <Button
          variant="outline"
          size="lg"
          onClick={onClose}
          disabled={isSubmitting}
          className="border-gray-300 hover:bg-gray-100 flex-1 sm:flex-none"
        >
          <X className="h-5 w-5 mr-2" />
          Cancelar
        </Button>

        <Button
          onClick={handleCloseRoute}
          disabled={isSubmitting || !actualKms.trim() || hasOtherPackagesDueToday(otherPackages)}
          size="lg"
          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 flex-1 sm:flex-none shadow-md hover:shadow-lg transition-all"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Procesando cierre...
            </>
          ) : (
            <>
              <Send className="h-5 w-5 mr-2" />
              Confirmar Cierre de Ruta
            </>
          )}
        </Button>
      </div>
    </div>
  );
}