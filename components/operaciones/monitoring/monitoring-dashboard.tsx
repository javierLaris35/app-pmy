"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Package,
  Truck,
  BarChart3,
  MapPin,
  AlertTriangle,
  CircleDollarSign,
  FileDown,
  Layers,
} from "lucide-react"
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine, ComposedChart,
  LineChart, Line, AreaChart, Area
} from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CustomTooltip, CustomizedDot } from "./monitoring-charts"
import { PackageStats } from "./monitoring-types"

const getEfficiencyColor = (val: number) => val >= 90 ? "text-emerald-500" : val >= 75 ? "text-amber-500" : "text-rose-500";
const getEfficiencyBg = (val: number) => val >= 90 ? "bg-emerald-500" : val >= 75 ? "bg-amber-500" : "bg-rose-500";
const getDexColor = (val: number) => val <= 5 ? "text-emerald-500" : val <= 15 ? "text-amber-500" : "text-rose-500";
const getDexBg = (val: number) => val <= 5 ? "bg-emerald-500" : val <= 15 ? "bg-amber-500" : "bg-rose-500";

interface MonitoringDashboardProps {
  statsInfo: PackageStats
  routePerformanceData: any[]
  statusData: { name: string; value: number; color: string }[]
  destinationData: { name: string; value: number }[]
  chartType: "bar" | "line" | "area"
  setChartType: (v: "bar" | "line" | "area") => void
  statsRef: React.RefObject<HTMLDivElement | null>
  onExportPDF: () => void
  isLoading: boolean
  packagesCount: number
}

export function MonitoringDashboard({
  statsInfo,
  routePerformanceData,
  statusData,
  destinationData,
  chartType,
  setChartType,
  statsRef,
  onExportPDF,
  isLoading,
  packagesCount,
}: MonitoringDashboardProps) {
  return (
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
        <Button variant="outline" onClick={onExportPDF} disabled={isLoading || packagesCount === 0} className="border-primary/20 hover:bg-primary/5">
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
  )
}
