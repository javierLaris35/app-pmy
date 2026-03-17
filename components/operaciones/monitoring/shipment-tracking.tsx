"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Package,
  Truck,
  Warehouse,
  Ship,
  FileText,
  TableIcon,
  Car,
  BarChart3,
  MapPin,
  RefreshCw,
  HelpCircle,
  Download,
  AlertTriangle,
  CircleDollarSign,
  Activity,
  FileDown,
  Layers,
  Search,
  CalendarDays
} from "lucide-react"
import { AppLayout } from "../../app-layout"
import { DataTable } from "../../data-table/data-table"
import { columns } from "./columns"
import { type Consolidado, ConsolidadoSelect } from "../consolidated/consolidated-select"
import { type Desembarque, UnloadingSelect } from "../unloading/unloading-select"
import { PackageDispatchSelect, type Ruta } from "@/components/package-dispatch/package-dispatch-select"
import { Label } from "@/components/ui/label"
import {
  getConsolidateds,
  getInfoFromPackageDispatch,
  getPackageDispatchs,
  getUnloadings,
  getInfoFromConsolidated,
  getInfoFromUnloading,
  updateDataFromFedexByPackageDispatchId,
  updateDataFromFedexByConsolidatedId,
  updateDataFromFedexByUnloadingId,
  getPackageDispatchsByDriverAndDateRange,
  getPackageDispatchsByDateRange
} from "@/lib/services/monitoring/monitoring"
import { useAuthStore } from "@/store/auth.store"
import { LoaderWithOverlay } from "@/components/loader"
import { 
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, ReferenceLine, ComposedChart,
  LineChart, Line, AreaChart, Area 
} from "recharts"
import { driver as driverJs } from "driver.js"
import "driver.js/dist/driver.css"
import { exportToExcel } from "./export-to-excel"
import { SucursalSelector } from "@/components/sucursal-selector"
import { MonitoringLayout } from "./monitoring-layout"
import { ShipmentType, Driver } from "@/lib/types" 
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"
import { RepartidorSelector } from "@/components/selectors/repartidor-selector"

export interface MonitoringInfo {
  shipmentData: {
    id: string
    trackingNumber: string
    ubication: string
    warehouse?: string
    unloading?: { trackingNumber: string; date: string }
    consolidated?: { consNumber: string; date: string }
    destination: string
    isCharge: boolean
    shipmentStatus: string
    createdDate: string
    commitDateTime: string
    payment: { type: string; amount: number } | null
    recipientName: string
    recipientAddress: string
    recipientPhone: string
    recipientZip: string
    shipmentType: ShipmentType
    daysInWarehouse: string
    lastEventDate: string
    dexCode: string
  }
  packageDispatch?: {
    id: string
    trackingNumber: string
    createdAt: string
    status: string
    driver: any 
    route?: string
    vehicle: { name: string; plateNumber: string }
    subsidiary: { id: string; name: string }
  }
}

interface PackageStats {
  total: number
  enRuta: number
  enBodega: number
  entregados: number
  noEntregados: number
  porcentajeEntrega: number
  porcentajeNoEntrega: number
  eficiencia: number
  packagesWithPayment: number
  totalPaymentAmount: number
  packagesToSettle: number
  totalAmountToSettle: number
  rendimientoReal: number
  entregasEfectivas: number
  dex: number
  sinIntento: number
  tasaDex: number
}

// =====================================================================
// COMPONENTE PLANTILLA PARA EL REPORTE PDF (OCULTO EN PANTALLA)
// =====================================================================
const DriverEfficiencyPDFTemplate = ({ data, reportRef }: { data: any[], reportRef: any }) => {
  return (
    <div className="absolute top-[-9999px] left-[-9999px]">
      <div ref={reportRef} className="w-[1100px] bg-[#f8fafc] p-8 font-sans text-sm">
        <div className="flex justify-between items-end mb-6 border-b pb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Eficiencia Operativa de Repartidores</h2>
            <p className="text-slate-500">Reporte de Desempeño Logístico y Liquidaciones</p>
          </div>
          <div className="text-right text-slate-400 text-xs">
            Generado: {new Date().toLocaleString('es-MX')}
          </div>
        </div>
        
        <div className="space-y-4">
          {data.map((route, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-between">
              
              {/* BLOQUE 1: Info del Chofer */}
              <div className="w-[220px] space-y-3">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Chofer</p>
                  <p className="font-bold text-slate-800 text-base leading-tight">{route.driver}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2">Vehículo</p>
                  <p className="font-semibold text-slate-700">{route.plates !== "N/A" ? route.plates : route.vehicle}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2">Estado de Ruta</p>
                  <span className="inline-flex items-center gap-1.5 py-0.5 px-2 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                    En Progreso / Histórico
                  </span>
                </div>
              </div>

              {/* BLOQUE 2: Eficiencia y Cobros */}
              <div className="w-[180px] space-y-6">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Eficiencia</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Activity className={`h-5 w-5 ${route.efectividad >= 90 ? 'text-emerald-500' : route.efectividad >= 75 ? 'text-amber-500' : 'text-rose-500'}`} />
                    <span className="text-2xl font-bold text-slate-800">{route.efectividad}%</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Rendimiento general</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Cobros a Liquidar</p>
                  <p className="text-2xl font-bold text-blue-600">${route.cobrosALiquidar.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                </div>
              </div>

              {/* BLOQUE 3: Entregas y Fallos */}
              <div className="w-[180px] space-y-6">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Entrega</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="bg-emerald-100 p-1.5 rounded-md"><Package className="h-4 w-4 text-emerald-600" /></div>
                    <span className="text-2xl font-bold text-slate-800">{route.entregado}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Paquetes entregados</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">No Entrega (DEX)</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="bg-rose-100 p-1.5 rounded-md"><AlertTriangle className="h-4 w-4 text-rose-600" /></div>
                    <span className="text-2xl font-bold text-slate-800">{route.devuelto}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Paquetes devueltos</p>
                </div>
              </div>

              {/* BLOQUE 4: Gráfica de Dona */}
              <div className="w-[320px] flex items-center justify-end gap-6">
                <div className="text-xs space-y-2.5 text-slate-500">
                  <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm bg-blue-500"></div> En Ruta <span className="font-medium text-slate-700 ml-auto">{route.enRuta}</span></div>
                  <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm bg-amber-400"></div> En Bodega <span className="font-medium text-slate-700 ml-auto">{route.pendiente}</span></div>
                  <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></div> Entregados <span className="font-medium text-slate-700 ml-auto">{route.entregado}</span></div>
                  <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm bg-rose-500"></div> No Entregados <span className="font-medium text-slate-700 ml-auto">{route.devuelto}</span></div>
                </div>
                
                <div className="relative w-[130px] h-[130px] flex items-center justify-center">
                  <div className="absolute inset-0">
                    <PieChart width={130} height={130}>
                      <Pie
                        data={[
                          { value: route.enRuta || 0, color: "#3b82f6" },
                          { value: route.pendiente || 0, color: "#fbbf24" },
                          { value: route.entregado || 0, color: "#10b981" },
                          { value: route.devuelto || 0, color: "#f43f5e" }
                        ]}
                        innerRadius={50}
                        outerRadius={60}
                        paddingAngle={2}
                        dataKey="value"
                        isAnimationActive={false} // IMPORTANTE PARA EL PDF
                        stroke="none"
                      >
                        {[
                          { value: route.enRuta || 0, color: "#3b82f6" },
                          { value: route.pendiente || 0, color: "#fbbf24" },
                          { value: route.entregado || 0, color: "#10b981" },
                          { value: route.devuelto || 0, color: "#f43f5e" }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </div>
                  <div className="flex flex-col items-center justify-center z-10">
                    <span className="text-[10px] text-slate-400 text-center leading-tight">Total de<br/>paquetes</span>
                    <span className="text-2xl font-bold text-slate-800 mt-0.5">{route.total}</span>
                  </div>
                </div>
              </div>

            </div>
          ))}
          
          {data.length === 0 && (
            <div className="text-center py-10 text-slate-500">No hay datos para generar el reporte en este rango.</div>
          )}
        </div>
      </div>
    </div>
  )
}
// =====================================================================

// Tooltip Profesional para las gráficas web
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border p-3 rounded-lg shadow-xl ring-1 ring-black/5 z-50">
        <p className="font-semibold text-foreground mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => {
            const itemColor = entry.dataKey === 'efectividad' && entry.payload.efectividad 
              ? (entry.payload.efectividad >= 90 ? '#10b981' : entry.payload.efectividad >= 75 ? '#f59e0b' : '#f43f5e') 
              : entry.color;
              
            return (
              <div key={index} className="flex items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: itemColor }} />
                  <span className="text-muted-foreground">{entry.name}:</span>
                </div>
                <span className="font-medium text-foreground">
                  {entry.value}{entry.name.includes('%') || entry.dataKey === 'efectividad' ? '%' : ''}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    );
  }
  return null;
};

const CustomizedDot = (props: any) => {
  const { cx, cy, payload } = props;
  let color = "#10b981";
  if (payload.efectividad < 90 && payload.efectividad >= 75) color = "#f59e0b";
  if (payload.efectividad < 75) color = "#f43f5e";
  return <circle cx={cx} cy={cy} r={5} stroke="hsl(var(--background))" strokeWidth={2} fill={color} />;
};

export default function TrackingPage() {
  const user = useAuthStore((s) => s.user)
  const statsRef = useRef<HTMLDivElement>(null)
  const pdfReportRef = useRef<HTMLDivElement>(null) // Referencia para el PDF de eficiencia

  const [isReportsOpen, setIsReportsOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"table" | "stats">("table")
  const [chartType, setChartType] = useState<"bar" | "line" | "area">("bar")
  
  // Estado para separar búsqueda En Vivo vs Histórica
  const [isHistoryMode, setIsHistoryMode] = useState(false)

  // Filtros Operativos (En vivo)
  const [selectedConsolidado, setSelectedConsolidado] = useState<string>("")
  const [selectedDesembarque, setSelectedDesembarque] = useState<string>("")
  const [selectedRuta, setSelectedRuta] = useState<string>("")
  
  // Filtros Históricos (Analítica)
  const [selectedRepartidores, setSelectedRepartidores] = useState<Driver[]>([])
  const [dateRangeFilter, setDateRangeFilter] = useState<"day" | "week" | "month" | "custom">("day")
  const [manualStartDate, setManualStartDate] = useState<string>("")
  const [manualEndDate, setManualEndDate] = useState<string>("")

  const [consolidateds, setConsolidateds] = useState<Consolidado[]>([])
  const [unloadings, setUnloadings] = useState<Desembarque[]>([])
  const [packageDispatchs, setPackageDispatchs] = useState<Ruta[]>([])
  const [packages, setPackages] = useState<MonitoringInfo[]>([])
  
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedSubsidiaryId, setSelectedSubsidiaryId] = useState<string | null>(null)
  const [selectedReport, setSelectedReport] = useState<"pending" | "sin67" | "ultimoInventarioSin67" | "">("");
  
  const effectiveSubsidiaryId = selectedSubsidiaryId || user?.subsidiary?.id

  const calculateStats = (packages: MonitoringInfo[]): PackageStats => {
    const statusIgnorados = ["entregado_por_fedex", "estacion_fedex", "recoleccion", "retorno_abandono_fedex", "acargo_de_fedex"];
    const statusNoEntregados = ["no_entregado", "rechazado", "cliente_no_disponible", "cambio_fecha_solicitado", "direccion_incorrecta", "cliente_no_encontrado", "devuelto_a_fedex"];

    const packagesFiltrados = packages.filter((p) => !statusIgnorados.includes(p.shipmentData?.shipmentStatus?.toLowerCase().trim() || ""));
    const total = packagesFiltrados.length;
    
    const enRuta = packagesFiltrados.filter(p => p.shipmentData?.shipmentStatus?.toLowerCase().trim() === "en_ruta").length;
    const entregados = packagesFiltrados.filter(p => p.shipmentData?.shipmentStatus?.toLowerCase().trim() === "entregado").length;
    const enBodega = packagesFiltrados.filter(p => ["en_bodega", "pendiente"].includes(p.shipmentData?.shipmentStatus?.toLowerCase().trim())).length;
    const noEntregados = packagesFiltrados.filter((p) => statusNoEntregados.includes(p.shipmentData?.shipmentStatus?.toLowerCase().trim() || "")).length;
  
    const porcentajeEntrega = total > 0 ? (entregados / total) * 100 : 0;
    const porcentajeNoEntrega = total > 0 ? (noEntregados / total) * 100 : 0;
    
    const totalIntentos = entregados + noEntregados;
    const rendimientoReal = totalIntentos > 0 ? (entregados / totalIntentos) * 100 : 0;
    const tasaDex = totalIntentos > 0 ? (noEntregados / totalIntentos) * 100 : 0;

    const packagesToSettle = packagesFiltrados.filter(p => p.shipmentData?.shipmentStatus?.toLowerCase().trim() === "entregado" && (p.shipmentData?.payment?.amount ?? 0) > 0);
    const totalAmountToSettle = packagesToSettle.reduce((sum, p) => sum + (Number(p.shipmentData.payment?.amount) || 0), 0);

    return {
      total, enRuta, enBodega, entregados, noEntregados, porcentajeEntrega, porcentajeNoEntrega, eficiencia: porcentajeEntrega,
      packagesWithPayment: packagesFiltrados.filter(p => (p.shipmentData?.payment?.amount ?? 0) > 0).length,
      totalPaymentAmount: packagesFiltrados.reduce((sum, p) => sum + (Number(p.shipmentData?.payment?.amount) || 0), 0),
      packagesToSettle: packagesToSettle.length, totalAmountToSettle, rendimientoReal, entregasEfectivas: entregados, dex: noEntregados, sinIntento: enBodega, tasaDex
    };
  };

  const statsInfo = calculateStats(packages)

  const fetchInitialData = async () => {
    setIsLoading(true)
    try {
      const [consolidatedData, unloadingsData, packageDispathData] = await Promise.all([
        getConsolidateds(effectiveSubsidiaryId),
        getUnloadings(effectiveSubsidiaryId),
        getPackageDispatchs(effectiveSubsidiaryId),
      ])
      setConsolidateds(consolidatedData || [])
      setUnloadings(unloadingsData || [])
      setPackageDispatchs(packageDispathData || [])
    } catch (error) { console.error("Error fetching initial data:", error) } finally { setIsLoading(false) }
  }

  // Fetch para Filtros Operativos (En Vivo)
  const fetchPackagesData = async () => {
    // Si estamos en modo historia o no hay filtros vivos, limpiar y salir.
    if (isHistoryMode || (!selectedRuta && !selectedConsolidado && !selectedDesembarque)) { 
      if (!isHistoryMode) setPackages([]); 
      return 
    }

    setIsLoading(true)
    try {
      if (selectedRuta) await updateDataFromFedexByPackageDispatchId(selectedRuta)
      else if (selectedConsolidado) await updateDataFromFedexByConsolidatedId(selectedConsolidado)
      else if (selectedDesembarque) await updateDataFromFedexByUnloadingId(selectedDesembarque)

      let packagesInfo: MonitoringInfo[] = []
      if (selectedRuta) packagesInfo = await getInfoFromPackageDispatch(selectedRuta)
      else if (selectedConsolidado) packagesInfo = await getInfoFromConsolidated(selectedConsolidado)
      else if (selectedDesembarque) packagesInfo = await getInfoFromUnloading(selectedDesembarque)
      
      setPackages(packagesInfo)
    } catch (error) { console.error("Error fetching packages:", error); setPackages([]) } finally { setIsLoading(false) }
  }

  // Motor Unificado Analítico (Chofer y/o Fecha)
  const handleHistorySearch = async () => {
    setIsHistoryMode(true);
    setSelectedConsolidado("");
    setSelectedDesembarque("");
    setSelectedRuta("");
    
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

      // 1. Determinar qué API usar dependiendo de si hay Chofer o no
      let rawResponse: any;
      if (selectedRepartidores.length > 0) {
        rawResponse = await getPackageDispatchsByDriverAndDateRange(selectedRepartidores[0].id, start.toISOString(), end.toISOString());
      } else {
        rawResponse = await getPackageDispatchsByDateRange(start.toISOString(), end.toISOString());
      }

      setPackages(rawResponse || []);

      /*const routesArray = Array.isArray(rawResponse) ? rawResponse : (rawResponse?.data || rawResponse?.packageDispatchs || rawResponse?.rutas || []);
      
      if (routesArray.length > 0) {
        
        if (dateRangeFilter === 'day') {
          await Promise.allSettled(routesArray.map((r: any) => {
            const rid = r?.id || r?._id;
            return rid ? updateDataFromFedexByPackageDispatchId(rid) : Promise.resolve();
          }));
        }

        const infosPromises = routesArray.map(async (r: any) => {
          const routeId = r?.id || r?._id;
          if (!routeId) return []; 
          
          try {
            const rawPkgs: any = await getInfoFromPackageDispatch(routeId);
            const pkgsArray = Array.isArray(rawPkgs) ? rawPkgs : (rawPkgs?.data || []);
            
            return pkgsArray.map((p: any) => ({
              ...p,
              packageDispatch: p.packageDispatch || r 
            }));
          } catch (err) {
            console.warn(`Silencioso: Fallo al obtener paquetes para ruta ${routeId}`, err);
            return []; 
          }
        });

        const infos = await Promise.all(infosPromises);
        const flattenedPackages = infos.flat();
        
        setPackages(flattenedPackages);
        if (flattenedPackages.length > 0) setViewMode("stats");

      } else {
        setPackages([]); // Sin resultados
      }*/
    } catch (error) {
      console.error("Error crítico en búsqueda histórica:", error);
      setPackages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => { 
    setIsRefreshing(true); 
    await fetchInitialData(); 
    if (isHistoryMode) await handleHistorySearch(); else await fetchPackagesData(); 
    setIsRefreshing(false) 
  }

  const handleFilterChange = (type: 'consolidado' | 'desembarque' | 'ruta', value: string) => {
    setIsHistoryMode(false); 
    setSelectedConsolidado(type === 'consolidado' ? value : ''); 
    setSelectedDesembarque(type === 'desembarque' ? value : ''); 
    setSelectedRuta(type === 'ruta' ? value : '');
    setSelectedRepartidores([]);
  }

  const clearAllFilters = () => { 
    setIsHistoryMode(false);
    setSelectedConsolidado(""); setSelectedDesembarque(""); setSelectedRuta(""); setSelectedRepartidores([]); setPackages([]) 
  }

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

  useEffect(() => { if (user?.subsidiary?.id) fetchInitialData() }, [user?.subsidiary?.id])
  useEffect(() => { if (!isHistoryMode) fetchPackagesData() }, [selectedRuta, selectedConsolidado, selectedDesembarque, isHistoryMode])
  useEffect(() => { if (effectiveSubsidiaryId) fetchInitialData() }, [effectiveSubsidiaryId])

  const filteredPackages = packages

  const statusData = [
    { name: "En Ruta", value: statsInfo.enRuta, color: "#3b82f6" }, 
    { name: "En Bodega", value: statsInfo.enBodega, color: "#eab308" }, 
    { name: "Entregados", value: statsInfo.entregados, color: "#10b981" }, 
    { name: "DEX", value: statsInfo.dex, color: "#f43f5e" },
  ]

  const destinationData = filteredPackages.reduce((acc, pkg) => {
    const dest = pkg.shipmentData?.destination || "Sin destino"
    const existing = acc.find((item) => item.name === dest)
    if (existing) existing.value += 1; else acc.push({ name: dest, value: 1 })
    return acc
  }, [] as { name: string; value: number }[]).sort((a, b) => b.value - a.value).slice(0, 10);

  // NUEVO USEMEMO QUE INCLUYE LOS COBROS A LIQUIDAR
  const routePerformanceData = useMemo(() => {
    const routeMap = new Map<string, any>();
    const statusIgnorados = ["entregado_por_fedex", "estacion_fedex", "recoleccion", "retorno_abandono_fedex", "acargo_de_fedex"];
    const statusNoEntregados = ["no_entregado", "rechazado", "cliente_no_disponible", "cambio_fecha_solicitado", "direccion_incorrecta", "cliente_no_encontrado", "devuelto_a_fedex"];

    filteredPackages.forEach((pkg) => {
      const status = pkg.shipmentData?.shipmentStatus?.toLowerCase().trim() || "";
      if (statusIgnorados.includes(status)) return;
      const routeId = pkg.packageDispatch?.id || "unassigned";
      
      if (!routeMap.has(routeId)) {
        const driverName = (pkg.packageDispatch?.driver as any)?.name || pkg.packageDispatch?.driver || (pkg.packageDispatch?.id ? `Chofer (${pkg.packageDispatch.id.slice(0,4)})` : "Sin chofer asignado");
        routeMap.set(routeId, { 
          id: routeId, 
          routeName: typeof driverName === 'string' ? driverName : "Chofer", 
          dispatchTrackingNumber: pkg.packageDispatch?.trackingNumber || "N/A", 
          driver: typeof driverName === 'string' ? driverName : "Chofer", 
          route: pkg.packageDispatch?.route || "-", 
          vehicle: pkg.packageDispatch?.vehicle?.name || "N/A", 
          plates: pkg.packageDispatch?.vehicle?.plateNumber || "N/A", 
          total: 0, entregado: 0, pendiente: 0, devuelto: 0, enRuta: 0,
          cobrosALiquidar: 0 // Campo para el PDF
        });
      }

      const routeStats = routeMap.get(routeId)!;
      routeStats.total += 1;
      
      if (status === "entregado") {
        routeStats.entregado += 1;
        if (pkg.shipmentData?.payment?.amount) {
          routeStats.cobrosALiquidar += Number(pkg.shipmentData.payment.amount);
        }
      }
      else if (statusNoEntregados.includes(status)) routeStats.devuelto += 1;
      else if (status === "en_ruta") routeStats.enRuta += 1;
      else routeStats.pendiente += 1;
    });

    return Array.from(routeMap.values()).map(r => {
      const totalIntentos = r.entregado + r.devuelto;
      return { 
        ...r, 
        efectividad: totalIntentos > 0 ? parseFloat(((r.entregado / totalIntentos) * 100).toFixed(1)) : 0,
        pctEntregado: r.total > 0 ? ((r.entregado / r.total) * 100).toFixed(1) : "0.0",
        pctDevuelto: r.total > 0 ? ((r.devuelto / r.total) * 100).toFixed(1) : "0.0"
      };
    }).sort((a, b) => a.driver.localeCompare(b.driver)); 
  }, [filteredPackages]);

  const handleGenerateReport = async () => { /* ... */ };  
  const getEfficiencyColor = (val: number) => val >= 90 ? "text-emerald-500" : val >= 75 ? "text-amber-500" : "text-rose-500";
  const getEfficiencyBg = (val: number) => val >= 90 ? "bg-emerald-500" : val >= 75 ? "bg-amber-500" : "bg-rose-500";
  const getDexColor = (val: number) => val <= 5 ? "text-emerald-500" : val <= 15 ? "text-amber-500" : "text-rose-500";
  const getDexBg = (val: number) => val <= 5 ? "bg-emerald-500" : val <= 15 ? "bg-amber-500" : "bg-rose-500";

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
              <Button id="refresh-button" variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing || isLoading}><RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} /></Button>
              <Button id="tutorial-button" variant="outline" size="icon" onClick={startTutorial}><HelpCircle className="h-4 w-4" /></Button>
              <div><SucursalSelector value={effectiveSubsidiaryId || user?.subsidiary?.id || ""} returnObject={true} onValueChange={(val) => { if (typeof val === "string") setSelectedSubsidiaryId(val); else if (Array.isArray(val)) setSelectedSubsidiaryId(val[0]?.id ?? ""); else if (val && typeof val === "object") setSelectedSubsidiaryId((val as any).id); }} /></div>
              
              {/* NUEVO BOTON PDF EFICIENCIA */}
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
                      <SelectContent><SelectItem value="pending">Reporte de pendientes</SelectItem><SelectItem value="sin67">Paquetes sin código 67</SelectItem><SelectItem value="ultimoInventarioSin67">Último inventario sin 67</SelectItem></SelectContent>
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
                   
                   <Button 
                     onClick={handleHistorySearch} 
                     disabled={isLoading || (dateRangeFilter === 'custom' && (!manualStartDate || !manualEndDate))}
                     className="bg-primary/90 hover:bg-primary"
                   >
                     Buscar Historial
                   </Button>
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
               {selectedRuta && <MonitoringLayout title="Ruta Seleccionada" icon={Car} entityId={selectedRuta} selectionType="ruta" selectionData={{ driver: packageDispatchs.find((r) => r.id === selectedRuta)?.driver?.name || packageDispatchs.find((r) => r.id === selectedRuta)?.driver || "-", vehicle: "-", estado: "En Progreso" }} packagesData={filteredPackages} subsidiaryId={effectiveSubsidiaryId} stats={statsInfo} />}
               
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
                 <div id="stats-section" className="space-y-6 animate-in fade-in duration-500">
                   
                   <div className="flex justify-between items-center bg-muted/30 p-2 rounded-lg border border-border">
                     <div className="flex items-center gap-3 px-2">
                        <Layers className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Estilo Visual:</span>
                        <Select value={chartType} onValueChange={(v: any) => setChartType(v)}>
                          <SelectTrigger className="w-[180px] bg-background"><SelectValue placeholder="Estilo de gráfica" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bar">Gráfica Analítica (Barras)</SelectItem>
                            <SelectItem value="line">Gráfica de Puntos (Líneas)</SelectItem>
                            <SelectItem value="area">Gráfica de Áreas (Volumen)</SelectItem>
                          </SelectContent>
                        </Select>
                     </div>
                     <Button variant="outline" onClick={handleExportToPDF} disabled={isLoading || packages.length === 0} className="border-primary/20 hover:bg-primary/5">
                       <FileDown className="mr-2 h-4 w-4 text-primary" /> Exportar Dashboard Visual a PDF
                     </Button>
                   </div>

                   <div ref={statsRef} className="bg-background p-2 rounded-lg space-y-6">
                     <div className="grid gap-4 md:grid-cols-3">
                       <Card><CardHeader className="pb-2"><CardDescription>Rendimiento Real (Entregas vs DEX)</CardDescription><CardTitle className={`text-4xl ${getEfficiencyColor(statsInfo.rendimientoReal)}`}>{Math.round(statsInfo.rendimientoReal)}%</CardTitle></CardHeader><CardContent><div className="h-2 w-full bg-secondary overflow-hidden rounded-full mt-2"><div className={`h-full transition-all duration-1000 ${getEfficiencyBg(statsInfo.rendimientoReal)}`} style={{ width: `${statsInfo.rendimientoReal}%` }} /></div><p className="text-xs text-muted-foreground mt-2">{statsInfo.entregasEfectivas} exitosos de {statsInfo.entregasEfectivas + statsInfo.dex} intentados</p></CardContent></Card>
                       <Card><CardHeader className="pb-2"><CardDescription>Índice de Excepciones (DEX)</CardDescription><CardTitle className={`text-4xl flex items-center gap-2 ${getDexColor(statsInfo.tasaDex)}`}>{Math.round(statsInfo.tasaDex)}%{statsInfo.tasaDex > 15 && <AlertTriangle className="h-6 w-6" />}</CardTitle></CardHeader><CardContent><div className="h-2 w-full bg-secondary overflow-hidden rounded-full mt-2"><div className={`h-full transition-all duration-1000 ${getDexBg(statsInfo.tasaDex)}`} style={{ width: `${statsInfo.tasaDex}%` }} /></div><p className="text-xs text-muted-foreground mt-2">{statsInfo.dex} devueltos o rechazados</p></CardContent></Card>
                       <Card className="bg-emerald-500/5 border-emerald-500/20"><CardHeader className="pb-2"><CardDescription className="text-emerald-700 font-medium">Liquidación Pendiente</CardDescription><CardTitle className="text-4xl text-emerald-600 flex items-center gap-2"><CircleDollarSign className="h-8 w-8" />${statsInfo.totalAmountToSettle.toLocaleString()}</CardTitle></CardHeader><CardContent><div className="mt-4 flex items-center gap-2"><Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200">{statsInfo.packagesToSettle} entregas cobradas</Badge></div></CardContent></Card>
                     </div>

                     {routePerformanceData.length > 0 && (
                       <>
                         <div className="grid gap-6 md:grid-cols-2">
                           <Card className="overflow-hidden">
                             <CardHeader className="bg-muted/10 border-b pb-4">
                               <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5 text-primary" /> Efectividad por Ruta</CardTitle>
                               <CardDescription>Rendimiento porcentual sobre volumen intentado</CardDescription>
                             </CardHeader>
                             <CardContent className="pt-6">
                               <ResponsiveContainer width="100%" height={320}>
                                 <ComposedChart data={routePerformanceData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                                   <XAxis dataKey="routeName" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} dy={10} />
                                   <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} dx={-10} />
                                   <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.4)', radius: 4 }} />
                                   
                                   {chartType === 'bar' && (
                                     <Bar dataKey="efectividad" radius={[4, 4, 0, 0]} name="Efectividad" maxBarSize={45}>
                                       {routePerformanceData.map((entry, index) => (
                                         <Cell key={`cell-${index}`} fill={entry.efectividad >= 90 ? '#10b981' : entry.efectividad >= 75 ? '#f59e0b' : '#f43f5e'} />
                                       ))}
                                     </Bar>
                                   )}
                                   {chartType === 'line' && (
                                     <Line type="monotone" dataKey="efectividad" stroke="hsl(var(--border))" name="Efectividad" strokeWidth={2} dot={<CustomizedDot />} activeDot={{ r: 7, strokeWidth: 0 }} />
                                   )}
                                   {chartType === 'area' && (
                                     <Area type="monotone" dataKey="efectividad" fill="hsl(var(--primary))" stroke="hsl(var(--primary))" name="Efectividad" fillOpacity={0.1} strokeWidth={2} dot={<CustomizedDot />} activeDot={{ r: 7 }} />
                                   )}
                                   
                                   <ReferenceLine y={90} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ position: 'insideTopLeft', value: 'Meta (90%)', fill: 'hsl(var(--destructive))', fontSize: 11, fontWeight: 500 }} opacity={0.7} />
                                 </ComposedChart>
                               </ResponsiveContainer>
                             </CardContent>
                           </Card>

                           <Card>
                             <CardHeader className="bg-muted/10 border-b pb-4">
                               <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-primary" /> Inventario Operativo</CardTitle>
                               <CardDescription>Estatus logístico de la carga asignada</CardDescription>
                             </CardHeader>
                             <CardContent className="pt-6">
                               <ResponsiveContainer width="100%" height={320}>
                                 {chartType === 'bar' ? (
                                   <BarChart data={routePerformanceData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                                     <XAxis dataKey="routeName" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} dy={10} />
                                     <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} dx={-10} />
                                     <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.4)', radius: 4 }} />
                                     <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }} iconType="circle" />
                                     <Bar dataKey="entregado" stackId="a" fill="#10b981" name="Entregados" radius={[0, 0, 4, 4]} maxBarSize={45} />
                                     <Bar dataKey="enRuta" stackId="a" fill="#3b82f6" name="En Ruta" maxBarSize={45} />
                                     <Bar dataKey="pendiente" stackId="a" fill="#eab308" name="En Bodega" maxBarSize={45} />
                                     <Bar dataKey="devuelto" stackId="a" fill="#f43f5e" name="DEX" radius={[4, 4, 0, 0]} maxBarSize={45} />
                                   </BarChart>
                                 ) : chartType === 'line' ? (
                                   <LineChart data={routePerformanceData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                                     <XAxis dataKey="routeName" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} dy={10} />
                                     <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} dx={-10} />
                                     <Tooltip content={<CustomTooltip />} />
                                     <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }} iconType="circle" />
                                     <Line type="monotone" dataKey="entregado" stroke="#10b981" name="Entregados" strokeWidth={2} dot={{ r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                                     <Line type="monotone" dataKey="enRuta" stroke="#3b82f6" name="En Ruta" strokeWidth={2} dot={{ r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                                     <Line type="monotone" dataKey="pendiente" stroke="#eab308" name="En Bodega" strokeWidth={2} dot={{ r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                                     <Line type="monotone" dataKey="devuelto" stroke="#f43f5e" name="DEX" strokeWidth={2} dot={{ r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                                   </LineChart>
                                 ) : (
                                   <AreaChart data={routePerformanceData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                                     <XAxis dataKey="routeName" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} dy={10} />
                                     <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} dx={-10} />
                                     <Tooltip content={<CustomTooltip />} />
                                     <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }} iconType="circle" />
                                     <Area type="monotone" dataKey="entregado" stackId="a" fill="#10b981" stroke="#10b981" name="Entregados" fillOpacity={0.6} />
                                     <Area type="monotone" dataKey="enRuta" stackId="a" fill="#3b82f6" stroke="#3b82f6" name="En Ruta" fillOpacity={0.6} />
                                     <Area type="monotone" dataKey="pendiente" stackId="a" fill="#eab308" stroke="#eab308" name="En Bodega" fillOpacity={0.6} />
                                     <Area type="monotone" dataKey="devuelto" stackId="a" fill="#f43f5e" stroke="#f43f5e" name="DEX" fillOpacity={0.6} />
                                   </AreaChart>
                                 )}
                               </ResponsiveContainer>
                             </CardContent>
                           </Card>
                         </div>

                         <Card>
                           <CardHeader>
                             <CardTitle>Detalle Operativo</CardTitle>
                             <CardDescription>Información detallada sobre el desempeño analizado.</CardDescription>
                           </CardHeader>
                           <CardContent>
                             <Table>
                               <TableHeader>
                                 <TableRow>
                                   <TableHead>Tracking de Despacho</TableHead>
                                   <TableHead>Ruta / Nombre</TableHead>
                                   <TableHead>Chofer</TableHead>
                                   <TableHead>Vehículo</TableHead>
                                   <TableHead className="text-right">Total</TableHead>
                                   <TableHead className="text-right">Entregados</TableHead>
                                   <TableHead className="text-right">DEX</TableHead>
                                   <TableHead className="text-right">Efectividad</TableHead>
                                 </TableRow>
                               </TableHeader>
                               <TableBody>
                                 {routePerformanceData.map((route) => (
                                   <TableRow key={route.id} className="hover:bg-muted/50 transition-colors">
                                     <TableCell>
                                       {route.dispatchTrackingNumber !== "N/A" ? (
                                         <Badge variant="secondary" className="font-mono text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all" onClick={() => navigator.clipboard.writeText(route.dispatchTrackingNumber)} title="Clic para copiar">
                                           {route.dispatchTrackingNumber}
                                         </Badge>
                                       ) : ( <span className="text-muted-foreground">-</span> )}
                                     </TableCell>
                                     <TableCell className="font-semibold text-primary">{route.route}</TableCell>
                                     <TableCell className="text-muted-foreground">{route.driver}</TableCell>
                                     <TableCell>
                                       <div className="flex flex-col">
                                         <span className="text-sm font-medium">{route.vehicle}</span>
                                         {route.plates !== "N/A" && <span className="text-xs text-muted-foreground uppercase">{route.plates}</span>}
                                       </div>
                                     </TableCell>
                                     <TableCell className="text-right font-medium">{route.total}</TableCell>
                                     <TableCell className="text-right text-emerald-600 font-semibold">{route.entregado} <span className="text-xs text-muted-foreground font-normal ml-1">({route.pctEntregado}%)</span></TableCell>
                                     <TableCell className="text-right text-rose-600 font-semibold">{route.devuelto} <span className="text-xs text-muted-foreground font-normal ml-1">({route.pctDevuelto}%)</span></TableCell>
                                     <TableCell className="text-right">
                                       <Badge className={route.efectividad >= 90 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200 hover:bg-emerald-500/20' : route.efectividad >= 75 ? 'bg-amber-500/10 text-amber-600 border-amber-200 hover:bg-amber-500/20' : 'bg-rose-500/10 text-rose-600 border-rose-200 hover:bg-rose-500/20'} variant="outline">
                                         {route.efectividad}%
                                       </Badge>
                                     </TableCell>
                                   </TableRow>
                                 ))}
                               </TableBody>
                             </Table>
                           </CardContent>
                         </Card>
                       </>
                     )}

                     <div className="grid gap-6 lg:grid-cols-2">
                       <Card>
                         <CardHeader>
                           <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Distribución General</CardTitle>
                         </CardHeader>
                         <CardContent>
                           <ResponsiveContainer width="100%" height={300}>
                             <PieChart>
                               <Pie data={statusData} cx="50%" cy="45%" innerRadius={70} outerRadius={110} paddingAngle={2} dataKey="value">
                                 {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                               </Pie>
                               <Tooltip content={<CustomTooltip />} />
                               <Legend verticalAlign="bottom" height={36} iconType="circle" />
                             </PieChart>
                           </ResponsiveContainer>
                         </CardContent>
                       </Card>

                       <Card><CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> Top 10 Destinos</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><BarChart data={destinationData} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" opacity={0.5} /><XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} /><YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} /><Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.4)', radius: 4 }} /><Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Paquetes" maxBarSize={25} /></BarChart></ResponsiveContainer></CardContent></Card>
                     </div>
                     
                   </div>
                 </div>
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