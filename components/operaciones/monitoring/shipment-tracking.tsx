"use client"

import { useState, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Truck,
  Ship,
  FileText,
  TableIcon,
  Car,
  RefreshCw,
  HelpCircle,
  Download,
  Activity,
  FileDown,
  Search,
  CalendarDays
} from "lucide-react"
import { AppLayout } from "../../app-layout"
import { DataTable } from "../../data-table/data-table"
import { columns } from "./columns"
import { ConsolidadoSelect } from "../consolidated/consolidated-select"
import { UnloadingSelect } from "../unloading/unloading-select"
import { PackageDispatchSelect } from "@/components/package-dispatch/package-dispatch-select"
import { Label } from "@/components/ui/label"
import {
  generateEfficientReport,
  generateReportInventory67,
  generateReportPending,
  generateReportNo67
} from "@/lib/services/monitoring/monitoring"
import { useAuthStore } from "@/store/auth.store"
import { LoaderWithOverlay } from "@/components/loader"
import { driver as driverJs } from "driver.js"
import "driver.js/dist/driver.css"
import { exportToExcel } from "./export-to-excel"
import { SucursalSelector } from "@/components/sucursal-selector"
import { MonitoringLayout } from "./monitoring-layout"
import { getHistoryById } from "@/lib/services/shipments"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"
import { RepartidorSelector } from "@/components/selectors/repartidor-selector"
import { formatDateToShortDate } from "@/utils/date.utils"
import { useMonitoringData } from "./hooks/use-monitoring-data"
import { useMonitoringStats } from "./hooks/use-monitoring-stats"
import { MonitoringDashboard } from "./monitoring-dashboard"
import { DriverEfficiencyPDFTemplate } from "./driver-efficiency-pdf-template"

// Re-exportado para no romper a quienes lo importan desde este módulo
// (columns.tsx, app/operaciones/pagos-fedex/page.tsx).
export type { MonitoringInfo } from "./monitoring-types"

export default function TrackingPage() {
  const user = useAuthStore((s) => s.user)
  const statsRef = useRef<HTMLDivElement>(null)
  const pdfReportRef = useRef<HTMLDivElement>(null) // Referencia para el PDF de eficiencia

  // Estado y flujos de datos (selección, fetching, cached-first + refresh FedEx)
  const {
    selectedSubsidiaryId, setSelectedSubsidiaryId, effectiveSubsidiaryId,
    selectedConsolidado, selectedDesembarque, selectedRuta,
    isHistoryMode, selectedRepartidores, setSelectedRepartidores,
    dateRangeFilter, setDateRangeFilter,
    manualStartDate, setManualStartDate, manualEndDate, setManualEndDate,
    consolidateds, unloadings, packageDispatchs, packages,
    isLoading, setIsLoading, isRefreshing, lastUpdatedAt,
    handleRefresh, handleFilterChange, clearAllFilters, handleHistorySearch,
  } = useMonitoringData()

  // Indicadores derivados (memoizados)
  const { statsInfo, statusData, destinationData, routePerformanceData } = useMonitoringStats(packages)

  const [isReportsOpen, setIsReportsOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"table" | "stats">("table")
  const [chartType, setChartType] = useState<"bar" | "line" | "area">("bar")
  const [selectedReport, setSelectedReport] = useState<"pending" | "sin67" | "ultimoInventarioSin67" | "">("");
  const [reportStartDate, setReportStartDate] = useState<Date | null>(null)
  const [reportEndDate, setReportEndDate] = useState<Date | null>(null)

  type ReportType = "pending" | "sin67" | "ultimoInventarioSin67";

  const filteredPackages = packages

  // NUEVO: Handler para generar el Excel de Eficiencia desde el backend
  const handleGenerateEfficiencyExcel = async () => {
    setIsLoading(true);
    try {
      let start = new Date();
      let end = new Date();
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      if (dateRangeFilter === 'week') {
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
      } else if (dateRangeFilter === 'month') {
        start = new Date(start.getFullYear(), start.getMonth(), 1);
        end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
      } else if (dateRangeFilter === 'custom') {
        if (!manualStartDate || !manualEndDate) return;
        start = new Date(manualStartDate + "T00:00:00");
        end = new Date(manualEndDate + "T23:59:59");
      }

      const driverId = selectedRepartidores.length > 0 ? selectedRepartidores[0].id : undefined;

      const response: any = await generateEfficientReport(start.toISOString(), end.toISOString(), effectiveSubsidiaryId);

      // Bloque de seguridad en caso de que el backend devuelva un Blob y el servicio no inicie la descarga automáticamente
      if (response && response instanceof Blob) {
         const url = window.URL.createObjectURL(response);
         const link = document.createElement('a');
         link.href = url;
         link.setAttribute('download', `Eficiencia_Repartidores_${new Date().toLocaleDateString('es-MX')}.xlsx`);
         document.body.appendChild(link);
         link.click();
         link.parentNode?.removeChild(link);
      } else if (response && response.data instanceof Blob) {
         const url = window.URL.createObjectURL(response.data);
         const link = document.createElement('a');
         link.href = url;
         link.setAttribute('download', `Eficiencia_Repartidores_${new Date().toLocaleDateString('es-MX')}.xlsx`);
         document.body.appendChild(link);
         link.click();
         link.parentNode?.removeChild(link);
      }

    } catch (error) {
      console.error("Error generando el reporte Excel de eficiencia:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getHistoryOfPackage = async (id: string, status: string, isCharge: boolean) => {
    let lastStatusDate = "", exceptionCode = "";
    try {
      const history = await getHistoryById(id, isCharge);
      if (history && history.history && history.history.length > 0) {
        lastStatusDate = history.history[0].date ?? "";
        if (status.trim() === "no_entregado") exceptionCode = history.history[0].exceptionCode ? `DEX-${history.history[0].exceptionCode}` : "";
      }
    } catch (err) { console.error(`Error fetching history:`, err); }
    return { lastStatusDate, exceptionCode };
  };

  const handleExportToExcel = async () => {
    if (packages.length === 0) return
    setIsLoading(true)
    try {
      const enrichedPackages = packages.map((p) => ({ ...p, shipmentData: { ...p.shipmentData }, packageDispatch: p.packageDispatch ? { ...p.packageDispatch } : undefined }))
      await Promise.all(
        enrichedPackages.map(async (pkg) => {
          try {
            const { lastStatusDate, exceptionCode } = await getHistoryOfPackage(pkg.shipmentData.id, pkg.shipmentData.shipmentStatus, pkg.shipmentData.isCharge)
            pkg.shipmentData.lastEventDate = lastStatusDate; pkg.shipmentData.dexCode = exceptionCode
          } catch (err) {}
        })
      )
      exportToExcel(enrichedPackages)
    } catch (error) { console.error("Error exporting excel:", error) } finally { setIsLoading(false) }
  };

  const handleExportToPDF = async () => {
    if (!statsRef.current) return;
    setIsLoading(true);
    try {
      const canvas = await html2canvas(statsRef.current, { scale: 2, useCORS: true, logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`dashboard-analitico.pdf`);
    } catch (error) { console.error("Error generando el PDF:", error); } finally { setIsLoading(false); }
  };

  // Función dedicada para el PDF de Eficiencia de Repartidores
  const handleExportEfficiencyPDF = async () => {
    if (!pdfReportRef.current || routePerformanceData.length === 0) return;
    setIsLoading(true);
    try {
      const canvas = await html2canvas(pdfReportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#f8fafc" // Fondo claro del reporte
      });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      // Si el contenido es muy largo y pasa de una hoja, jsPDF lo corta.
      // Para un uso simple, una sola página horizontal suele ser suficiente para ~5 choferes.
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Eficiencia_Repartidores_${new Date().toLocaleDateString('es-MX')}.pdf`);
    } catch (error) {
      console.error("Error generando el PDF de eficiencia:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const startTutorial = () => { driverJs({ showProgress: true, steps: [{ element: "#tutorial-button", popover: { title: "Bienvenido", description: "Tutorial", side: "left", align: "start" } }] }).drive() }

    // Reporte: pendientes (no entregados)
  const generatePendingReport = async () => {
    setIsLoading(true);
    try {
      // Función para formatear fecha
      const formatDate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      if (!effectiveSubsidiaryId) {
        alert("Por favor, selecciona una sucursal primero");
        setIsLoading(false);
        return;
      }

      // Convertir fechas
      const startDateStr = reportStartDate ? formatDate(reportStartDate) : undefined;
      const endDateStr = reportEndDate ? formatDate(reportEndDate) : undefined;

      console.log("Generando reporte con:", {
        subsidiaryId: effectiveSubsidiaryId,
        startDate: startDateStr,
        endDate: endDateStr
      });

      // Generar reporte
      const blob = await generateReportPending(
        effectiveSubsidiaryId,
        startDateStr,
        endDateStr
      );

      // Descargar
      const url = window.URL.createObjectURL(
        new Blob([blob], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
      );

      const link = document.createElement('a');
      link.href = url;

      // Nombre del archivo
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      link.download = `pendientes_${effectiveSubsidiaryId}_${timestamp}.xlsx`;

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setIsReportsOpen(false);
    } catch (err) {
      console.error('Error generating pending report:', err);
      alert("Error al generar el reporte");
    } finally {
      setIsLoading(false);
    }
  };

  // Reporte: paquetes sin 67 (no contienen '67' en dexCode)
  const generateSin67Report = async () => {
    setIsLoading(true)
    try {
      const formatDate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // Determinar sucursal
      const subsidiaryIdToUse = selectedSubsidiaryId || user?.subsidiary?.id;

      if (!subsidiaryIdToUse) {
        alert("Por favor, selecciona una sucursal primero");
        setIsLoading(false);
        return;
      }

      // Convertir fechas
      const startDateStr = reportStartDate ? formatDate(reportStartDate) : undefined;
      const endDateStr = reportEndDate ? formatDate(reportEndDate) : undefined;

      console.log("Generando reporte con:", {
        subsidiaryId: subsidiaryIdToUse,
        startDate: startDateStr,
        endDate: endDateStr
      });

      // Generar reporte
      const blob = await generateReportNo67(
        subsidiaryIdToUse
      );

      // Descargar
      const url = window.URL.createObjectURL(
        new Blob([blob], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
      );

      const link = document.createElement('a');
      link.href = url;

      // Nombre del archivo
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      link.download = `sin_67_${subsidiaryIdToUse}_${timestamp}.xlsx`;

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setIsReportsOpen(false)
    } catch (err) {
      console.error("Error generating sin-67 report:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const generateInvetory67Report = async () => {
    setIsLoading(true);
    try {
      if (!effectiveSubsidiaryId) {
        alert("Por favor, selecciona una sucursal primero");
        setIsLoading(false);
        return;
      }

      const blob = await generateReportInventory67(effectiveSubsidiaryId);

      // Descargar
      const url = window.URL.createObjectURL(
        new Blob([blob], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
      );

      const link = document.createElement('a');
      link.href = url;

      // Nombre del archivo
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      link.download = `ultimo_inventario_sin_67${effectiveSubsidiaryId}_${timestamp}.xlsx`;

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  const getReportLabel = (report?: ReportType | "") => {
    switch (report) {
      case "pending":
        return "Reporte de pendientes";
      case "sin67":
        return "Paquetes sin código 67";
      case "ultimoInventarioSin67":
        return "Último inventario sin 67";
      default:
        return "";
    }
  };

  const handleGenerateReport = async () => {
    switch (selectedReport) {
      case "pending":
        await generatePendingReport();
        break;

      case "sin67":
        await generateSin67Report();
        break;

      case "ultimoInventarioSin67":
        await generateInvetory67Report();
        break;

      default:
        console.warn("Reporte no soportado");
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">Seguimiento de Paquetes</h1>
              <p className="text-muted-foreground">Monitorea el estado y ubicación de tus envíos en tiempo real</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Estado de frescura: refuerza que SÍ se está actualizando desde FedEx. */}
              {isRefreshing ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
                  <RefreshCw className="h-3 w-3 animate-spin" /> Actualizando desde FedEx…
                </span>
              ) : lastUpdatedAt ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                  <Activity className="h-3 w-3" /> Actualizado {lastUpdatedAt.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                </span>
              ) : null}
              <Button id="refresh-button" variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing || isLoading}><RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} /></Button>
              <Button id="tutorial-button" variant="outline" size="icon" onClick={startTutorial}><HelpCircle className="h-4 w-4" /></Button>
              <div><SucursalSelector value={effectiveSubsidiaryId || user?.subsidiary?.id || ""} returnObject={true} onValueChange={(val) => { if (typeof val === "string") setSelectedSubsidiaryId(val); else if (Array.isArray(val)) setSelectedSubsidiaryId(val[0]?.id ?? ""); else if (val && typeof val === "object") setSelectedSubsidiaryId((val as any).id); }} /></div>

              <Button
                onClick={handleExportEfficiencyPDF}
                variant="outline"
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                disabled={routePerformanceData.length === 0 || isLoading}
              >
                <FileDown className="mr-2 h-4 w-4" /> PDF de Eficiencia
              </Button>

              <Button onClick={handleExportToExcel} disabled={packages.length === 0 || isLoading}><Download className="mr-2 h-4 w-4" /> Excel</Button>
              <Dialog open={isReportsOpen} onOpenChange={setIsReportsOpen}>
                <DialogTrigger asChild><Button variant="outline" size="sm">Reportes</Button></DialogTrigger>
                <DialogContent className="max-w-xl w-full">
                  <DialogHeader><DialogTitle>Reportes</DialogTitle><DialogDescription>Selecciona el reporte.</DialogDescription></DialogHeader>
                  <div className="grid gap-3 mt-4">
                    <Label>Tipo de reporte</Label>
                    <Select value={selectedReport} onValueChange={(v) => setSelectedReport(v as any)}>
                      <SelectTrigger><SelectValue placeholder="Selecciona un reporte" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Reporte de pendientes</SelectItem>
                        <SelectItem value="sin67">Paquetes sin código 67</SelectItem>
                        <SelectItem value="ultimoInventarioSin67">Último inventario sin 67</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter className="mt-6 flex justify-between"><Button variant="ghost" onClick={() => setIsReportsOpen(false)}>Cerrar</Button><Button onClick={handleGenerateReport} disabled={isLoading || !selectedReport}>Generar reporte</Button></DialogFooter>
                </DialogContent>
              </Dialog>
             </div>
           </div>

           {/* 🛡️ TARJETA DE FILTROS DIVIDIDA */}
           <Card id="filters-section" className="p-4 border-primary/10 shadow-sm overflow-visible">
             <div className="flex flex-col gap-6">

               {/* --- OPERATIVO (EN VIVO) --- */}
               <div>
                 <Label className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                   <Activity className="h-5 w-5 text-primary"/> Filtro Operativo Actual
                 </Label>
                 <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                   <div id="consolidado-filter" className="space-y-2"><Label className="flex items-center gap-2"><FileText className="h-4 w-4" /> Consolidado</Label><ConsolidadoSelect consolidados={consolidateds} value={selectedConsolidado} onValueChange={(value) => handleFilterChange('consolidado', value)} /></div>
                   <div id="desembarque-filter" className="space-y-2"><Label className="flex items-center gap-2"><Ship className="h-4 w-4" /> Desembarque</Label><UnloadingSelect desembarques={unloadings} value={selectedDesembarque} onValueChange={(value) => handleFilterChange('desembarque', value)} /></div>
                   <div id="ruta-filter" className="space-y-2"><Label className="flex items-center gap-2"><Car className="h-4 w-4" /> Ruta</Label><PackageDispatchSelect rutas={packageDispatchs} value={selectedRuta} onValueChange={(value) => handleFilterChange('ruta', value)} /></div>
                 </div>
               </div>

               <div className="h-px bg-border w-full" />

               {/* --- HISTÓRICO POR CHOFER O FECHA --- */}
               <div>
                 <Label className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                   <Search className="h-5 w-5 text-primary"/> Búsqueda Analítica (Historial)
                 </Label>
                 <div className="flex flex-wrap items-end gap-4">

                   <div className="w-full sm:w-64 space-y-2">
                     <Label>Chofer Asignado <span className="text-muted-foreground font-normal">(Opcional)</span></Label>
                     <RepartidorSelector
                        selectedRepartidores={selectedRepartidores}
                        onSelectionChange={(repartidores) => {
                          setSelectedRepartidores(repartidores);
                        }}
                        subsidiaryId={effectiveSubsidiaryId}
                     />
                   </div>

                   <div className="w-full sm:w-48 space-y-2">
                     <Label className="flex items-center gap-2"><CalendarDays className="h-4 w-4"/> Rango de Tiempo</Label>
                     <Select value={dateRangeFilter} onValueChange={(v: any) => setDateRangeFilter(v)}>
                       <SelectTrigger><SelectValue/></SelectTrigger>
                       <SelectContent>
                         <SelectItem value="day">Del Día (Hoy)</SelectItem>
                         <SelectItem value="week">De la Semana</SelectItem>
                         <SelectItem value="month">Del Mes</SelectItem>
                         <SelectItem value="custom">Personalizado...</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>

                   {dateRangeFilter === "custom" && (
                     <>
                       <div className="w-full sm:w-40 space-y-2">
                         <Label>Fecha Inicio</Label>
                         <input type="date" value={manualStartDate} onChange={e => setManualStartDate(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                       </div>
                       <div className="w-full sm:w-40 space-y-2">
                         <Label>Fecha Fin</Label>
                         <input type="date" value={manualEndDate} onChange={e => setManualEndDate(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                       </div>
                     </>
                   )}

                   <div className="flex gap-2">
                     <Button
                       onClick={handleHistorySearch}
                       disabled={isLoading || (dateRangeFilter === 'custom' && (!manualStartDate || !manualEndDate))}
                       className="bg-primary/90 hover:bg-primary"
                     >
                       Buscar Historial
                     </Button>
                     {/* NUEVO BOTÓN: LLAMA AL ENDPOINT DE EXCEL USANDO EL MISMO RANGO */}
                     <Button
                       onClick={handleGenerateEfficiencyExcel}
                       disabled={isLoading || (dateRangeFilter === 'custom' && (!manualStartDate || !manualEndDate))}
                       variant="outline"
                       className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                     >
                       <FileDown className="mr-2 h-4 w-4" /> Generar Excel Eficiencia
                     </Button>
                   </div>
                 </div>
               </div>

             </div>
           </Card>

           {/* CONTENIDO PRINCIPAL */}
           {isLoading ? (
             <div className="flex flex-col justify-center items-center h-64 border rounded-xl bg-muted/20 border-dashed space-y-4"><LoaderWithOverlay overlay text={isHistoryMode ? "Buscando historial..." : "Sincronizando y Analizando..."} className="rounded-lg" /><p className="text-muted-foreground animate-pulse text-sm">Calculando indicadores logísticos...</p></div>
           ) : (
             <>
               {selectedConsolidado && <MonitoringLayout title="Consolidado Seleccionado" icon={FileText} selectionType="consolidado" entityId={selectedConsolidado} selectionData={{ consNumber: consolidateds.find((c) => c.id === selectedConsolidado)?.consNumber || "-", date: "-", estado: "Activo" }} packagesData={filteredPackages} stats={statsInfo} subsidiaryId={effectiveSubsidiaryId} />}
               {selectedDesembarque && <MonitoringLayout title="Desembarque Seleccionado" icon={Ship} selectionType="desembarque" entityId={selectedDesembarque} selectionData={{ trackingNumber: unloadings.find((d) => d.id === selectedDesembarque)?.trackingNumber || "-", date: "-", estado: "Procesado" }} packagesData={filteredPackages} subsidiaryId={effectiveSubsidiaryId} stats={statsInfo} />}
               {selectedRuta && <MonitoringLayout title="Ruta Seleccionada" icon={Car} entityId={selectedRuta} selectionType="ruta" selectionData={{ driver: packageDispatchs.find((r) => r.id === selectedRuta)?.driver?.name || packageDispatchs.find((r) => r.id === selectedRuta)?.driver || "-", vehicle: packageDispatchs.find((r) => r.id === selectedRuta)?.vehicle?.name || "-", estado: packageDispatchs.find((r) => r.id === selectedRuta)?.status || "-", date: formatDateToShortDate(packageDispatchs.find((r) => r.id === selectedRuta)?.createdAt) }} packagesData={filteredPackages} subsidiaryId={effectiveSubsidiaryId} stats={statsInfo} />}

               {isHistoryMode && packages.length > 0 && (
                 <MonitoringLayout
                    title={selectedRepartidores.length > 0 ? "Chofer Seleccionado (Resultados Históricos)" : "Búsqueda por Fechas (Resultados Históricos)"}
                    icon={selectedRepartidores.length > 0 ? Truck : CalendarDays}
                    selectionType="ruta"
                    entityId={selectedRepartidores.length > 0 ? selectedRepartidores[0].id : "all-drivers"}
                    selectionData={{
                      driver: selectedRepartidores.length > 0 ? selectedRepartidores[0].name : "Todos los Choferes",
                      vehicle: "Múltiples unidades",
                      estado: dateRangeFilter === 'day' ? "Operativo Diario" : "Histórico Acumulado"
                    }}
                    packagesData={filteredPackages}
                    subsidiaryId={effectiveSubsidiaryId}
                    stats={statsInfo}
                 />
               )}

               <div id="view-toggle" className="flex justify-end gap-2">
                 {(selectedConsolidado || selectedDesembarque || selectedRuta || isHistoryMode) && <Button variant="outline" size="sm" onClick={clearAllFilters}>Limpiar todos los filtros</Button>}
                 <Button variant={viewMode === "table" ? "default" : "outline"} size="sm" onClick={() => setViewMode("table")}><TableIcon className="mr-2 h-4 w-4" /> Tabla de Paquetes</Button>
                 <Button variant={viewMode === "stats" ? "default" : "outline"} size="sm" onClick={() => setViewMode("stats")}><Activity className="mr-2 h-4 w-4" /> Dashboard Ejecutivo</Button>
               </div>

               {viewMode === "stats" ? (
                 <MonitoringDashboard
                   statsInfo={statsInfo}
                   routePerformanceData={routePerformanceData}
                   statusData={statusData}
                   destinationData={destinationData}
                   chartType={chartType}
                   setChartType={setChartType}
                   statsRef={statsRef}
                   onExportPDF={handleExportToPDF}
                   isLoading={isLoading}
                   packagesCount={packages.length}
                 />
               ) : (
                 <DataTable columns={columns} data={filteredPackages} />
               )}
             </>
           )}
         </div>

         {/* PLANTILLA OCULTA PARA EL PDF DE EFICIENCIA */}
         <DriverEfficiencyPDFTemplate data={routePerformanceData} reportRef={pdfReportRef} />
       </div>
    </AppLayout>
  )
}
