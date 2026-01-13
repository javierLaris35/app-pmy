"use client";

import { useState, useEffect } from "react";
import {
  Package,
  AlertTriangle,
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  Loader2,
  X,
  ExternalLink,
  Truck,
  FileText,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Tipos de datos
interface PendingPackage {
  id: string;
  trackingNumber: string;
  recipientName: string;
  status: string;
  subsidiaryName: string;
  createdAt: string;
  reason?: string;
}

interface WithoutDEXPackage {
  id: string;
  trackingNumber: string;
  recipientName: string;
  subsidiaryName: string;
  carrier: string;
  missingDocument: string;
}

interface ExpiringPackage {
  id: string;
  trackingNumber: string;
  recipientName: string;
  expiryDate: string;
  subsidiaryName: string;
  hoursRemaining: number;
}

interface DashboardStats {
  pendingYesterday: number;
  withoutDEX: number;
  expiringToday: number;
}

interface DashboardWelcomeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export default function DashboardWelcome({
  open,
  onOpenChange,
  userId,
}: DashboardWelcomeProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    pendingYesterday: 0,
    withoutDEX: 0,
    expiringToday: 0,
  });
  const [pendingPackages, setPendingPackages] = useState<PendingPackage[]>([]);
  const [withoutDEXPackages, setWithoutDEXPackages] = useState<WithoutDEXPackage[]>([]);
  const [expiringPackages, setExpiringPackages] = useState<ExpiringPackage[]>([]);
  const [activeTab, setActiveTab] = useState("summary");

  // Simular carga de datos (reemplazar con tu API real)
  useEffect(() => {
    if (open) {
      fetchDashboardData();
    }
  }, [open, userId]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Aquí llamarías a tus servicios reales
      // Por ahora simulamos datos
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Datos simulados
      const mockPending: PendingPackage[] = [
        {
          id: "1",
          trackingNumber: "TRK123456789",
          recipientName: "Juan Pérez",
          status: "pendiente",
          subsidiaryName: "Sucursal Norte",
          createdAt: "2024-01-15T08:00:00Z",
          reason: "Dirección incorrecta"
        },
        {
          id: "2",
          trackingNumber: "TRK987654321",
          recipientName: "María García",
          status: "reprogramado",
          subsidiaryName: "Sucursal Sur",
          createdAt: "2024-01-15T09:30:00Z",
        }
      ];

      const mockWithoutDEX: WithoutDEXPackage[] = [
        {
          id: "1",
          trackingNumber: "TRK555555555",
          recipientName: "Carlos López",
          subsidiaryName: "Sucursal Centro",
          carrier: "FedEx",
          missingDocument: "DEX 67"
        },
        {
          id: "2",
          trackingNumber: "TRK666666666",
          recipientName: "Ana Martínez",
          subsidiaryName: "Sucursal Este",
          carrier: "DHL",
          missingDocument: "Guía aérea"
        }
      ];

      const mockExpiring: ExpiringPackage[] = [
        {
          id: "1",
          trackingNumber: "TRK777777777",
          recipientName: "Roberto Sánchez",
          expiryDate: "2024-01-16T18:00:00Z",
          subsidiaryName: "Sucursal Oeste",
          hoursRemaining: 6
        },
        {
          id: "2",
          trackingNumber: "TRK888888888",
          recipientName: "Laura Fernández",
          expiryDate: "2024-01-16T20:00:00Z",
          subsidiaryName: "Sucursal Norte",
          hoursRemaining: 8
        }
      ];

      setPendingPackages(mockPending);
      setWithoutDEXPackages(mockWithoutDEX);
      setExpiringPackages(mockExpiring);
      setStats({
        pendingYesterday: mockPending.length,
        withoutDEX: mockWithoutDEX.length,
        expiringToday: mockExpiring.length,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: es });
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pendiente':
        return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">Pendiente</Badge>;
      case 'reprogramado':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">Reprogramado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getHoursRemainingBadge = (hours: number) => {
    if (hours <= 4) {
      return <Badge className="bg-red-500 hover:bg-red-600">Crítico ({hours}h)</Badge>;
    } else if (hours <= 12) {
      return <Badge className="bg-orange-500 hover:bg-orange-600">Urgente ({hours}h)</Badge>;
    } else {
      return <Badge className="bg-yellow-500 hover:bg-yellow-600">Próximo ({hours}h)</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Bell className="h-6 w-6 text-primary" />
                Bienvenido al Sistema de Logística
              </DialogTitle>
              <DialogDescription>
                Resumen de alertas y pendientes para hoy {format(new Date(), "dd 'de' MMMM, yyyy", { locale: es })}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Resumen
            </TabsTrigger>
            <TabsTrigger value="details" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Detalles
            </TabsTrigger>
            <TabsTrigger value="actions" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Acciones
            </TabsTrigger>
          </TabsList>

          {/* Pestaña de Resumen */}
          <TabsContent value="summary" className="space-y-6">
            <ScrollArea className="h-[calc(90vh-250px)] pr-4">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Cargando alertas...</span>
              </div>
            ) : (
              <>
                {/* Tarjetas de estadísticas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Paquetes pendientes de ayer */}
                  <Card className="border-2 border-amber-200 hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between">
                        <span className="text-amber-700 flex items-center gap-2">
                          <Clock className="h-5 w-5" />
                          Pendientes de ayer
                        </span>
                        <Badge className="bg-amber-500 hover:bg-amber-600">
                          {stats.pendingYesterday}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Paquetes no procesados del día anterior
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-bold text-amber-700 mb-2">
                        {stats.pendingYesterday}
                      </div>
                      <p className="text-sm text-gray-600">
                        Requieren atención prioritaria
                      </p>
                      {pendingPackages.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-4 w-full text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                          onClick={() => setActiveTab("details")}
                        >
                          Ver detalles
                          <ExternalLink className="h-3 w-3 ml-2" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>

                  {/* Sin DEX/67 */}
                  <Card className="border-2 border-red-200 hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between">
                        <span className="text-red-700 flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5" />
                          Sin DEX/67
                        </span>
                        <Badge className="bg-red-500 hover:bg-red-600">
                          {stats.withoutDEX}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Paquetes sin documentación completa
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-bold text-red-700 mb-2">
                        {stats.withoutDEX}
                      </div>
                      <p className="text-sm text-gray-600">
                        Documentación pendiente
                      </p>
                      {withoutDEXPackages.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-4 w-full text-red-700 hover:text-red-800 hover:bg-red-50"
                          onClick={() => setActiveTab("details")}
                        >
                          Ver detalles
                          <ExternalLink className="h-3 w-3 ml-2" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>

                  {/* Vencen hoy */}
                  <Card className="border-2 border-blue-200 hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between">
                        <span className="text-blue-700 flex items-center gap-2">
                          <Calendar className="h-5 w-5" />
                          Vencen hoy
                        </span>
                        <Badge className="bg-blue-500 hover:bg-blue-600">
                          {stats.expiringToday}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Paquetes que vencen en las próximas horas
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-bold text-blue-700 mb-2">
                        {stats.expiringToday}
                      </div>
                      <p className="text-sm text-gray-600">
                        Atención inmediata requerida
                      </p>
                      {expiringPackages.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-4 w-full text-blue-700 hover:text-blue-800 hover:bg-blue-50"
                          onClick={() => setActiveTab("details")}
                        >
                          Ver detalles
                          <ExternalLink className="h-3 w-3 ml-2" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Resumen rápido */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Estado general del sistema
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {stats.pendingYesterday === 0 ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-amber-500" />
                          )}
                          <span>Paquetes pendientes de ayer</span>
                        </div>
                        <Badge variant={stats.pendingYesterday === 0 ? "outline" : "destructive"}>
                          {stats.pendingYesterday === 0 ? "Al día" : `${stats.pendingYesterday} pendientes`}
                        </Badge>
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {stats.withoutDEX === 0 ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                          <span>Paquetes sin DEX/67</span>
                        </div>
                        <Badge variant={stats.withoutDEX === 0 ? "outline" : "destructive"}>
                          {stats.withoutDEX === 0 ? "Completo" : `${stats.withoutDEX} incompletos`}
                        </Badge>
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {stats.expiringToday === 0 ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-blue-500" />
                          )}
                          <span>Paquetes que vencen hoy</span>
                        </div>
                        <Badge variant={stats.expiringToday === 0 ? "outline" : "secondary"}>
                          {stats.expiringToday === 0 ? "Ninguno" : `${stats.expiringToday} por vencer`}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
            </ScrollArea>
          </TabsContent>

          {/* Pestaña de Detalles */}
          <TabsContent value="details" className="space-y-6">
            <ScrollArea className="h-[calc(90vh-250px)] pr-4">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Cargando detalles...</span>
              </div>
            ) : (
              <>
                {/* Paquetes pendientes de ayer */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-700">
                      <Clock className="h-5 w-5" />
                      Paquetes pendientes de ayer ({pendingPackages.length})
                    </CardTitle>
                    <CardDescription>
                      Detalles de los paquetes no procesados del día anterior
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {pendingPackages.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" />
                        <p>No hay paquetes pendientes de ayer</p>
                        <p className="text-sm mt-1">¡Excelente trabajo!</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-64">
                        <div className="space-y-3">
                          {pendingPackages.map((pkg) => (
                            <div
                              key={pkg.id}
                              className="p-4 border rounded-lg hover:bg-amber-50 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Package className="h-4 w-4 text-amber-600" />
                                    <code className="font-mono font-bold text-gray-800">
                                      {pkg.trackingNumber}
                                    </code>
                                  </div>
                                  <div className="text-sm text-gray-700">
                                    {pkg.recipientName}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {pkg.subsidiaryName} • {formatDate(pkg.createdAt)}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  {getStatusBadge(pkg.status)}
                                  {pkg.reason && (
                                    <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700">
                                      {pkg.reason}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>

                {/* Paquetes sin DEX/67 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-700">
                      <AlertTriangle className="h-5 w-5" />
                      Paquetes sin DEX/67 ({withoutDEXPackages.length})
                    </CardTitle>
                    <CardDescription>
                      Paquetes que requieren documentación adicional
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {withoutDEXPackages.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" />
                        <p>Todos los paquetes tienen documentación completa</p>
                        <p className="text-sm mt-1">Documentación en orden</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-64">
                        <div className="space-y-3">
                          {withoutDEXPackages.map((pkg) => (
                            <div
                              key={pkg.id}
                              className="p-4 border rounded-lg hover:bg-red-50 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Truck className="h-4 w-4 text-red-600" />
                                    <code className="font-mono font-bold text-gray-800">
                                      {pkg.trackingNumber}
                                    </code>
                                    <Badge variant="outline" className="text-xs">
                                      {pkg.carrier}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-gray-700">
                                    {pkg.recipientName}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {pkg.subsidiaryName}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <Badge className="bg-red-500 hover:bg-red-600">
                                    Falta: {pkg.missingDocument}
                                  </Badge>
                                  <Button size="sm" variant="outline" className="text-xs">
                                    Subir documento
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>

                {/* Paquetes que vencen hoy */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-700">
                      <Calendar className="h-5 w-5" />
                      Paquetes que vencen hoy ({expiringPackages.length})
                    </CardTitle>
                    <CardDescription>
                      Paquetes con vencimiento en las próximas horas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {expiringPackages.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" />
                        <p>No hay paquetes por vencer hoy</p>
                        <p className="text-sm mt-1">Todo bajo control</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-64">
                        <div className="space-y-3">
                          {expiringPackages.map((pkg) => (
                            <div
                              key={pkg.id}
                              className="p-4 border rounded-lg hover:bg-blue-50 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Clock className="h-4 w-4 text-blue-600" />
                                    <code className="font-mono font-bold text-gray-800">
                                      {pkg.trackingNumber}
                                    </code>
                                  </div>
                                  <div className="text-sm text-gray-700">
                                    {pkg.recipientName}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {pkg.subsidiaryName} • Vence: {formatDate(pkg.expiryDate)}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  {getHoursRemainingBadge(pkg.hoursRemaining)}
                                  <Button size="sm" variant="outline" className="text-xs">
                                    Gestionar
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
            </ScrollArea>
          </TabsContent>

          {/* Pestaña de Acciones */}
          <TabsContent value="actions" className="space-y-6">
            <ScrollArea className="h-[calc(90vh-250px)] pr-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  Acciones Recomendadas
                </CardTitle>
                <CardDescription>
                  Tareas pendientes para mantener el sistema al día
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Acción 1: Revisar pendientes */}
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Clock className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <div className="font-medium">Revisar paquetes pendientes de ayer</div>
                        <div className="text-sm text-gray-500">
                          {stats.pendingYesterday} paquetes requieren atención
                        </div>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant={stats.pendingYesterday > 0 ? "default" : "outline"}
                      disabled={stats.pendingYesterday === 0}
                      onClick={() => setActiveTab("details")}
                    >
                      {stats.pendingYesterday > 0 ? "Revisar ahora" : "Completado"}
                    </Button>
                  </div>

                  {/* Acción 2: Completar DEX */}
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <div className="font-medium">Completar documentación DEX/67</div>
                        <div className="text-sm text-gray-500">
                          {stats.withoutDEX} paquetes sin documentación completa
                        </div>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant={stats.withoutDEX > 0 ? "destructive" : "outline"}
                      disabled={stats.withoutDEX === 0}
                      onClick={() => setActiveTab("details")}
                    >
                      {stats.withoutDEX > 0 ? "Completar DEX" : "Completado"}
                    </Button>
                  </div>

                  {/* Acción 3: Gestionar vencimientos */}
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Calendar className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">Gestionar paquetes por vencer</div>
                        <div className="text-sm text-gray-500">
                          {stats.expiringToday} paquetes vencen hoy
                        </div>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant={stats.expiringToday > 0 ? "default" : "outline"}
                      disabled={stats.expiringToday === 0}
                      onClick={() => setActiveTab("details")}
                    >
                      {stats.expiringToday > 0 ? "Gestionar ahora" : "Completado"}
                    </Button>
                  </div>

                  {/* Acción 4: Reporte diario */}
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <FileText className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium">Generar reporte de inicio</div>
                        <div className="text-sm text-gray-500">
                          Resumen del estado actual del sistema
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Generar PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Indicadores de prioridad */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-800">Indicadores de Prioridad</CardTitle>
                <CardDescription>
                  Orden de atención recomendada
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="flex-1">
                      <div className="font-medium">Crítico: Paquetes que vencen en menos de 4 horas</div>
                      <div className="text-sm text-gray-500">Atención inmediata requerida</div>
                    </div>
                    <Badge className="bg-red-500">Alta prioridad</Badge>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <div className="flex-1">
                      <div className="font-medium">Alta: Paquetes sin DEX/67</div>
                      <div className="text-sm text-gray-500">Sin documentación no pueden ser procesados</div>
                    </div>
                    <Badge className="bg-orange-500">Prioridad media</Badge>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <div className="flex-1">
                      <div className="font-medium">Media: Paquetes pendientes de ayer</div>
                      <div className="text-sm text-gray-500">Requieren atención pero no son críticos</div>
                    </div>
                    <Badge className="bg-amber-500">Prioridad baja</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Pie del diálogo */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-500">
            Última actualización: {format(new Date(), "HH:mm")}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cerrar
            </Button>
            <Button
              onClick={fetchDashboardData}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Actualizando...
                </>
              ) : (
                "Actualizar datos"
              )}
            </Button>
          </div>
          
        </div>
        <div className="flex items-center space-x-2">
                <input
                    type="checkbox"
                    id="dontShowAgain"
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    onChange={(e) => {
                        // Guardar preferencia
                        const userPrefsKey = `dashboard_prefs_${userId}`;
                        const userPrefs = {
                        showDailyWelcome: !e.target.checked
                        };
                        localStorage.setItem(userPrefsKey, JSON.stringify(userPrefs));
                    }}
                />
                <label
                    htmlFor="dontShowAgain"
                    className="text-sm text-gray-600 cursor-pointer"
                    >
                    No mostrar este resumen al iniciar sesión
                </label>
          </div>
      </DialogContent>
    </Dialog>
  );
}