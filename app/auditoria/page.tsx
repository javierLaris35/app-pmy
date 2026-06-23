"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColumnDef, PaginationState, Row } from "@tanstack/react-table";
import { format } from "date-fns";
import { saveAs } from "file-saver";
import {
  Activity, AlertTriangle, Clock, Download, Loader2, ShieldAlert, Users, Search, X, RefreshCw, Monitor, MapPin, Eye, Zap,
} from "lucide-react";
import { runDevTracking } from "@/lib/services/shipments";
import { EventDetailDialog } from "@/components/auditoria/event-detail-dialog";
import { UsersPanel } from "@/components/auditoria/users-panel";
import { SubsidiariesPanel } from "@/components/auditoria/subsidiaries-panel";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid } from "recharts";

import { AppLayout } from "@/components/app-layout";
import { withAuth } from "@/hoc/withAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { DataTable } from "@/components/data-table/data-table";
import { toast } from "@/lib/toast";

import { useAuditLogs, useAuditDashboard, useSuspicious, useActiveUsers } from "@/hooks/services/audit/use-audit";
import { useSubsidiaries } from "@/hooks/services/subsidiaries/use-subsidiaries";
import { exportAuditExcel, AuditQuery } from "@/lib/services/audit";
import { formatModule, formatAction, fmtDateTime, fmtRelative } from "@/lib/audit-format";

const MODULES = [
  "auth","usuarios","consolidados","desembarques","devoluciones","recolecciones","salidas_ruta",
  "gastos","ingresos","sucursales","vehiculos","zonas","rutas","choferes","bodega_entrada",
  "bodega_salida","recepcion_bodega","inventarios","monitoreo","traslados","envios","cierre_ruta","reportes","otro",
];
const ACTIONS = [
  "login","logout","login_failed","create","read","update","delete","export","import",
  "validate","status_change","assign","transfer","print","other",
];

const CHART_COLORS = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#06b6d4","#ef4444","#84cc16","#f97316","#14b8a6"];
const AVATAR_COLORS = ["bg-indigo-500","bg-violet-500","bg-pink-500","bg-amber-500","bg-emerald-500","bg-cyan-500","bg-rose-500","bg-lime-500"];

const num = (v: any) => Number(v) || 0;
const fmtDate = (d?: string) => fmtDateTime(d, "dd/MM/yyyy HH:mm:ss");
const relativeTime = (d?: string) => fmtRelative(d);
const initials = (s?: string) =>
  (s || "?").split(/[\s@.]/).filter(Boolean).slice(0, 2).map((x) => x[0]?.toUpperCase()).join("") || "?";
const colorFor = (s?: string) => AVATAR_COLORS[(s || "").length % AVATAR_COLORS.length];

const resultBadge = (r: string) =>
  r === "error"
    ? <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">Error</Badge>
    : <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Éxito</Badge>;

const timelineConfig = { count: { label: "Eventos", color: "#6366f1" } } satisfies ChartConfig;
const modulesConfig = { count: { label: "Eventos" } } satisfies ChartConfig;
const actionsConfig = { count: { label: "Acciones" } } satisfies ChartConfig;

function UserAvatar({ name, online }: { name?: string; online?: boolean }) {
  return (
    <div className="relative shrink-0">
      <Avatar className="h-10 w-10">
        <AvatarFallback className={`text-white text-xs font-bold ${colorFor(name)}`}>{initials(name)}</AvatarFallback>
      </Avatar>
      {online && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" />}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, gradient, loading }: { icon: any; label: string; value: React.ReactNode; gradient: string; loading?: boolean }) {
  return (
    <Card className={`relative overflow-hidden border-0 text-white shadow-lg ${gradient}`}>
      <CardContent className="p-4 sm:p-5">
        <Icon className="absolute -right-3 -top-3 h-20 w-20 opacity-15" />
        <p className="text-xs font-medium uppercase tracking-wide text-white/80">{label}</p>
        {loading ? <Skeleton className="mt-2 h-8 w-16 bg-white/30" /> : <p className="mt-1 text-2xl sm:text-3xl font-bold">{value}</p>}
      </CardContent>
    </Card>
  );
}

const RANGES: Record<string, number> = { hoy: 0, "7d": 7, "30d": 30, "90d": 90 };

function AuditoriaPage() {
  const [range, setRange] = useState<string>("7d");
  const computeRange = (key: string) => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - (RANGES[key] ?? 7));
    return { from: format(from, "yyyy-MM-dd"), to: format(to, "yyyy-MM-dd") };
  };
  const [dateFrom, setDateFrom] = useState(computeRange("7d").from);
  const [dateTo, setDateTo] = useState(computeRange("7d").to);

  const onRangeChange = (key: string) => {
    if (!key) return;
    setRange(key);
    const r = computeRange(key);
    setDateFrom(r.from); setDateTo(r.to);
  };

  const [search, setSearch] = useState("");
  const [module, setModule] = useState("");
  const [action, setAction] = useState("");
  const [result, setResult] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });
  const [exporting, setExporting] = useState(false);
  const [devRunning, setDevRunning] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  // 🔧 DEV: dispara el tracking de FedEx on-demand (prueba rápida de 60 guías).
  const handleDevTracking = async () => {
    try {
      setDevRunning(true);
      toast.info("Ejecutando tracking FedEx (60 guías)…");
      const res = await runDevTracking({ limit: 60, phase: "master" });
      const s = res.master?.summary;
      toast.success(
        `Tracking listo en ${res.durationSec}s · OK ${s?.ok ?? 0} · sin datos ${s?.noData ?? 0} · fallidas ${s?.failed ?? 0}`,
        { duration: 8000 },
      );
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo ejecutar el tracking");
    } finally {
      setDevRunning(false);
    }
  };

  const fromISO = `${dateFrom}T00:00:00`;
  const toISO = `${dateTo}T23:59:59`;

  const query: AuditQuery = useMemo(() => ({
    search: search || undefined, module: module || undefined, action: action || undefined,
    result: result || undefined, dateFrom: fromISO, dateTo: toISO,
    page: pagination.pageIndex + 1, limit: pagination.pageSize,
  }), [search, module, action, result, fromISO, toISO, pagination]);

  useEffect(() => { setPagination((p) => ({ ...p, pageIndex: 0 })); }, [search, module, action, result, dateFrom, dateTo]);

  const { logs, total, totalPages, isLoading, mutate: mLogs } = useAuditLogs(query);
  const { dashboard, isLoading: dashLoading, mutate: mDash } = useAuditDashboard(fromISO, toISO);
  const { suspicious, mutate: mSusp } = useSuspicious(fromISO, toISO);
  const { active, mutate: mActive } = useActiveUsers(15);
  const { subsidiaries } = useSubsidiaries();
  const subMap = useMemo(() => new Map((subsidiaries || []).map((s: any) => [s.id, s.name])), [subsidiaries]);

  const refreshAll = () => { mLogs(); mDash(); mSusp(); mActive(); };

  const timelineData = (dashboard?.timeline || []).map((t: any) => ({ day: String(t.day).slice(5), count: num(t.count) }));
  const modulesData = (dashboard?.topModules || []).slice(0, 8).map((m: any) => ({ name: formatModule(m.module), count: num(m.count) }));
  const actionsData = (dashboard?.byAction || []).map((a: any) => ({ name: formatAction(a.action), count: num(a.count) }));
  const usersData = (dashboard?.topUsers || []).slice(0, 8).map((u: any) => ({ email: u.email || u.userId, count: num(u.count) }));
  const maxUser = Math.max(1, ...usersData.map((u: any) => u.count));
  const devicesData = (dashboard?.topDevices || []).slice(0, 8).map((d: any) => ({ name: d.device || "—", count: num(d.count) }));
  const maxDevice = Math.max(1, ...devicesData.map((d: any) => d.count));
  const locationsData = (dashboard?.topLocations || []).slice(0, 8).map((l: any) => ({ name: [l.city, l.country].filter(Boolean).join(", ") || "—", count: num(l.count) }));
  const maxLoc = Math.max(1, ...locationsData.map((l: any) => l.count));
  const suspiciousCount = suspicious ? Object.values(suspicious).reduce((acc: number, arr: any) => acc + (arr?.length || 0), 0) : 0;

  const columns: ColumnDef<any>[] = useMemo(() => [
    { accessorKey: "createdAt", header: "Fecha", cell: ({ row }) => <span className="text-xs whitespace-nowrap">{fmtDate(row.original.createdAt)}</span> },
    { accessorKey: "userEmail", header: "Usuario", cell: ({ row }) => (
      <div className="flex items-center gap-2 min-w-[160px]"><UserAvatar name={row.original.userName || row.original.userEmail} />
        <div className="flex flex-col"><span className="text-sm font-medium leading-tight">{row.original.userEmail || "—"}</span>
        {row.original.userName && <span className="text-[11px] text-muted-foreground">{row.original.userName}</span>}</div></div>
    )},
    { accessorKey: "role", header: "Rol", cell: ({ row }) => <Badge variant="outline" className="text-[10px] uppercase">{row.original.role || "—"}</Badge> },
    { accessorKey: "module", header: "Módulo", cell: ({ row }) => <span className="text-xs font-medium">{formatModule(row.original.module)}</span> },
    { accessorKey: "subsidiaryName", header: "Sucursal", cell: ({ row }) => <span className="text-xs whitespace-nowrap">{row.original.subsidiaryName || subMap.get(row.original.subsidiaryId) || "—"}</span> },
    { accessorKey: "action", header: "Acción", cell: ({ row }) => <Badge variant="secondary" className="text-[10px] whitespace-nowrap">{formatAction(row.original.action)}</Badge> },
    { accessorKey: "description", header: "Detalle", cell: ({ row }) => (
      <span className="block text-xs font-medium leading-snug max-w-[280px] truncate" title={row.original.description || ""}>
        {row.original.description || <span className="text-muted-foreground">—</span>}
      </span>
    )},
    { accessorKey: "entityId", header: "Registro", cell: ({ row }) => <span className="font-mono text-[11px] text-muted-foreground">{row.original.entityId || "—"}</span> },
    { accessorKey: "result", header: "Resultado", cell: ({ row }) => resultBadge(row.original.result) },
    { accessorKey: "device", header: "Dispositivo", cell: ({ row }) => (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground max-w-[170px] truncate" title={row.original.device}>
        <Monitor className="h-3 w-3 shrink-0" /> {row.original.device || "—"}
      </span>
    )},
    { id: "location", header: "Ubicación", cell: ({ row }) => {
      const r = row.original; const loc = [r.geoCity, r.geoCountry].filter(Boolean).join(", ");
      return <span className="inline-flex items-center gap-1 text-[11px]"><MapPin className="h-3 w-3 shrink-0 text-muted-foreground" /> {loc || "—"}</span>;
    }},
    { accessorKey: "ip", header: "IP", cell: ({ row }) => <span className="font-mono text-[11px]">{row.original.publicIp || row.original.ip || "—"}</span> },
    { id: "ver", header: "", cell: ({ row }) => (
      <Button variant="ghost" size="icon" className="h-7 w-7" title="Ver detalle" onClick={() => setSelectedEvent(row.original)}><Eye className="h-4 w-4" /></Button>
    )},
  ], [subMap]);

  const renderDetail = ({ row }: { row: Row<any> }) => {
    const r = row.original;
    return (
      <div className="p-4 bg-muted/40 text-xs space-y-2">
        {r.description && <div><b>Descripción:</b> {r.description}</div>}
        {r.errorMessage && <div className="text-red-600"><b>Error:</b> {r.errorMessage}</div>}
        <div className="grid md:grid-cols-2 gap-3">
          {r.changes && <div><b>Cambios</b><pre className="mt-1 p-2 bg-background rounded border overflow-auto max-h-48">{JSON.stringify(r.changes, null, 2)}</pre></div>}
          {(r.beforeState || r.afterState) && (
            <div><b>Antes / Después</b><pre className="mt-1 p-2 bg-background rounded border overflow-auto max-h-48">{JSON.stringify({ before: r.beforeState, after: r.afterState }, null, 2)}</pre></div>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-lg border bg-background p-2">
          <div><span className="text-[10px] uppercase text-muted-foreground">Dispositivo</span><div className="font-medium">{r.device || "—"}</div></div>
          <div><span className="text-[10px] uppercase text-muted-foreground">Ubicación</span><div className="font-medium">{[r.geoCity, r.geoRegion, r.geoCountry].filter(Boolean).join(", ") || "—"}</div></div>
          <div><span className="text-[10px] uppercase text-muted-foreground">IP pública</span><div className="font-mono">{r.publicIp || "—"}</div></div>
          <div><span className="text-[10px] uppercase text-muted-foreground">IP origen</span><div className="font-mono">{r.ip || "—"}</div></div>
        </div>
        <div className="text-[11px] text-muted-foreground break-all">{r.method} {r.path} · {r.userAgent}</div>
      </div>
    );
  };

  const handleExport = async () => {
    try { setExporting(true); const blob = await exportAuditExcel({ ...query, page: undefined, limit: undefined }); saveAs(blob, `auditoria_${dateFrom}_${dateTo}.xlsx`); }
    catch { toast.error("No se pudo exportar la auditoría"); } finally { setExporting(false); }
  };
  const clearFilters = () => { setSearch(""); setModule(""); setAction(""); setResult(""); };

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 p-5 sm:p-6 text-white shadow-lg">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/20 backdrop-blur"><ShieldAlert className="h-6 w-6" /></div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Auditoría</h2>
                <p className="text-sm text-white/80">Historial de actividad del sistema · solo superadmin</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ToggleGroup type="single" value={range} onValueChange={onRangeChange} className="rounded-lg bg-white/15 p-0.5">
                {Object.keys(RANGES).map((k) => (
                  <ToggleGroupItem key={k} value={k} className="h-8 px-3 text-xs text-white data-[state=on]:bg-white data-[state=on]:text-indigo-700">
                    {k === "hoy" ? "Hoy" : k}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <Button size="sm" variant="secondary" onClick={handleDevTracking} disabled={devRunning} title="Probar tracking FedEx (dev · 60 guías)" className="bg-white/20 text-white hover:bg-white/30 border-0">
                {devRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}<span className="ml-1 hidden sm:inline">Tracking</span>
              </Button>
              <Button size="sm" variant="secondary" onClick={refreshAll} className="bg-white/20 text-white hover:bg-white/30 border-0"><RefreshCw className="h-4 w-4" /></Button>
              <Button size="sm" variant="secondary" onClick={handleExport} disabled={exporting} className="bg-white text-indigo-700 hover:bg-white/90">
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}<span className="ml-1 hidden sm:inline">Excel</span>
              </Button>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-white/80">
            <Input type="date" value={dateFrom} onChange={(e) => { setRange(""); setDateFrom(e.target.value); }} className="h-8 w-[46%] sm:w-[150px] bg-white/90 text-foreground border-0" />
            <span>→</span>
            <Input type="date" value={dateTo} onChange={(e) => { setRange(""); setDateTo(e.target.value); }} className="h-8 w-[46%] sm:w-[150px] bg-white/90 text-foreground border-0" />
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard icon={Activity} label="Eventos" value={dashboard?.totals?.total ?? 0} gradient="bg-gradient-to-br from-blue-500 to-blue-600" loading={dashLoading} />
          <KpiCard icon={Users} label="Activos (15m)" value={active?.count ?? 0} gradient="bg-gradient-to-br from-emerald-500 to-green-600" />
          <KpiCard icon={AlertTriangle} label="% Error" value={`${dashboard?.totals?.errorRate ?? 0}%`} gradient="bg-gradient-to-br from-amber-500 to-orange-600" loading={dashLoading} />
          <KpiCard icon={ShieldAlert} label="Alertas" value={suspiciousCount} gradient="bg-gradient-to-br from-rose-500 to-red-600" />
        </div>

        <Tabs defaultValue="resumen" className="space-y-4">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
            <TabsTrigger value="sucursales">Sucursales</TabsTrigger>
            <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
            <TabsTrigger value="activos">Usuarios activos{active?.count ? <Badge className="ml-2 bg-emerald-500 text-white hover:bg-emerald-500">{active.count}</Badge> : null}</TabsTrigger>
            <TabsTrigger value="historial">Historial</TabsTrigger>
            <TabsTrigger value="sospechosos">Sospechosos{suspiciousCount ? <Badge variant="destructive" className="ml-2">{suspiciousCount}</Badge> : null}</TabsTrigger>
          </TabsList>

          <TabsContent value="sucursales"><SubsidiariesPanel /></TabsContent>

          <TabsContent value="usuarios"><UsersPanel /></TabsContent>

          {/* RESUMEN */}
          <TabsContent value="resumen" className="space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-indigo-500" /> Actividad por día</CardTitle></CardHeader>
              <CardContent>
                {dashLoading ? <Skeleton className="h-[260px] w-full" /> : (
                  <ChartContainer config={timelineConfig} className="aspect-auto h-[260px] w-full">
                    <AreaChart data={timelineData} margin={{ left: -16, right: 8, top: 4 }}>
                      <defs><linearGradient id="fillCount" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.45} /><stop offset="95%" stopColor="var(--color-count)" stopOpacity={0.05} /></linearGradient></defs>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} tick={{ fontSize: 11 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area dataKey="count" type="monotone" stroke="var(--color-count)" strokeWidth={2} fill="url(#fillCount)" />
                    </AreaChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Distribución por acción</CardTitle></CardHeader>
                <CardContent>
                  {dashLoading ? <Skeleton className="h-[240px] w-full" /> : (
                    <ChartContainer config={actionsConfig} className="aspect-auto h-[240px] w-full">
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                        <Pie data={actionsData} dataKey="count" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2} strokeWidth={3}>
                          {actionsData.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                  )}
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 justify-center">
                    {actionsData.slice(0, 8).map((a: any, i: number) => (
                      <span key={a.name} className="inline-flex items-center gap-1 text-[11px]"><span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />{a.name} ({a.count})</span>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Módulos más usados</CardTitle></CardHeader>
                <CardContent>
                  {dashLoading ? <Skeleton className="h-[280px] w-full" /> : (
                    <ChartContainer config={modulesConfig} className="aspect-auto h-[280px] w-full">
                      <BarChart data={modulesData} layout="vertical" margin={{ left: 12, right: 16 }}>
                        <CartesianGrid horizontal={false} />
                        <XAxis type="number" allowDecimals={false} hide />
                        <YAxis type="category" dataKey="name" width={92} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" radius={[0, 5, 5, 0]}>
                          {modulesData.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-blue-500" /> Usuarios más activos</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {dashLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)
                  : usersData.length === 0 ? <p className="text-sm text-muted-foreground">Sin datos en el rango.</p>
                  : usersData.map((u: any, i: number) => (
                    <div key={u.email} className="flex items-center gap-3">
                      <UserAvatar name={u.email} />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs mb-1"><span className="truncate font-medium">{u.email}</span><span className="font-semibold tabular-nums">{u.count}</span></div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${(u.count / maxUser) * 100}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} /></div>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Monitor className="h-4 w-4 text-cyan-500" /> Top dispositivos</CardTitle></CardHeader>
                <CardContent className="space-y-2.5">
                  {devicesData.length === 0 ? <p className="text-sm text-muted-foreground">Sin datos.</p>
                    : devicesData.map((dv: any, i: number) => (
                      <div key={dv.name}>
                        <div className="flex justify-between text-xs mb-0.5"><span className="truncate">{dv.name}</span><span className="font-semibold tabular-nums">{dv.count}</span></div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(dv.count / maxDevice) * 100}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} /></div>
                      </div>
                    ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4 text-emerald-500" /> Top ubicaciones</CardTitle></CardHeader>
                <CardContent className="space-y-2.5">
                  {locationsData.length === 0 ? <p className="text-sm text-muted-foreground">Sin datos (requiere geo/IP pública).</p>
                    : locationsData.map((l: any, i: number) => (
                      <div key={l.name}>
                        <div className="flex justify-between text-xs mb-0.5"><span className="truncate">{l.name}</span><span className="font-semibold tabular-nums">{l.count}</span></div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(l.count / maxLoc) * 100}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} /></div>
                      </div>
                    ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* USUARIOS ACTIVOS */}
          <TabsContent value="activos" className="space-y-3">
            <p className="text-sm text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4" /> Actividad en los últimos 15 minutos · se actualiza solo.</p>
            {active && active.users.length === 0 && (
              <Card><CardContent className="py-14 text-center text-muted-foreground"><Users className="h-10 w-10 mx-auto mb-2 opacity-40" />No hay usuarios activos ahora mismo.</CardContent></Card>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {active?.users.map((u) => (
                <Card key={u.userId} className="overflow-hidden border-l-4 border-l-emerald-500 transition-shadow hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <UserAvatar name={u.userName || u.userEmail} online />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold truncate">{u.userName || u.userEmail}</span>
                          <Badge variant="outline" className="text-[10px] uppercase shrink-0">{u.role}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{u.userEmail}</p>
                        <Separator className="my-2" />
                        <div className="space-y-1 text-[11px] text-muted-foreground">
                          <div className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Conectado desde <b className="text-foreground">{u.loginAt ? format(new Date(u.loginAt), "dd/MM HH:mm") : "—"}</b></div>
                          <div>Última actividad: <b className="text-foreground">{relativeTime(u.lastActivityAt)}</b> · {u.eventsInWindow} acciones</div>
                          {u.device && <div className="flex items-center gap-1"><Monitor className="h-3 w-3" /> {u.device}</div>}
                          <div className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {u.location || "Ubicación desconocida"}</div>
                          <div className="font-mono break-all">IP {u.publicIp || u.ip || "—"}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* HISTORIAL */}
          <TabsContent value="historial" className="space-y-4">
            <Card>
              <CardContent className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-2">
                <div className="relative sm:col-span-2 lg:flex-1 lg:min-w-[220px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar usuario, registro, ruta..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
                </div>
                <select className="h-9 rounded-md border bg-background px-2 text-sm" value={module} onChange={(e) => setModule(e.target.value)}>
                  <option value="">Módulo: todos</option>{MODULES.map((m) => <option key={m} value={m}>{formatModule(m)}</option>)}
                </select>
                <select className="h-9 rounded-md border bg-background px-2 text-sm" value={action} onChange={(e) => setAction(e.target.value)}>
                  <option value="">Acción: todas</option>{ACTIONS.map((a) => <option key={a} value={a}>{formatAction(a)}</option>)}
                </select>
                <select className="h-9 rounded-md border bg-background px-2 text-sm" value={result} onChange={(e) => setResult(e.target.value)}>
                  <option value="">Resultado: todos</option><option value="success">Éxito</option><option value="error">Error</option>
                </select>
                {(search || module || action || result) && <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-4 w-4" /> Limpiar</Button>}
                <span className="text-xs text-muted-foreground lg:ml-auto">{total} eventos</span>
              </CardContent>
            </Card>

            {isLoading ? (
              <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : (
              <div className="overflow-x-auto">
                <DataTable columns={columns} data={logs} manualPagination pageCount={totalPages} pagination={pagination} onPaginationChange={setPagination} renderSubComponent={renderDetail} />
              </div>
            )}
          </TabsContent>

          {/* SOSPECHOSOS */}
          <TabsContent value="sospechosos" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[
              { key: "failedLogins", title: "Logins fallidos repetidos", desc: "≥5 intentos por usuario/IP", color: "border-l-red-500", icon: ShieldAlert },
              { key: "bulkDeletes", title: "Borrados masivos", desc: "≥20 eliminaciones por usuario", color: "border-l-orange-500", icon: AlertTriangle },
              { key: "offHours", title: "Actividad fuera de horario", desc: "≥10 acciones entre 00:00–05:00", color: "border-l-amber-500", icon: Clock },
              { key: "highErrorUsers", title: "Alta tasa de errores", desc: "≥30 errores por usuario", color: "border-l-rose-500", icon: AlertTriangle },
              { key: "massExports", title: "Exportaciones masivas", desc: "≥10 exportaciones por usuario", color: "border-l-fuchsia-500", icon: Download },
              { key: "multiIp", title: "Múltiples IPs", desc: "≥4 IPs distintas por usuario", color: "border-l-violet-500", icon: Users },
            ].map((rule) => {
              const rows: any[] = (suspicious as any)?.[rule.key] || [];
              const Icon = rule.icon;
              return (
                <Card key={rule.key} className={`border-l-4 ${rule.color}`}>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center justify-between">
                    <span className="flex items-center gap-2"><Icon className="h-4 w-4" /> {rule.title}</span>
                    <Badge variant={rows.length ? "destructive" : "secondary"}>{rows.length}</Badge></CardTitle>
                    <p className="text-xs text-muted-foreground">{rule.desc}</p></CardHeader>
                  <CardContent>
                    {rows.length === 0 ? <p className="text-xs text-muted-foreground">Sin hallazgos. ✅</p> : (
                      <div className="space-y-1">{rows.map((r, i) => (
                        <div key={i} className="flex justify-between text-xs border-b py-1 last:border-0">
                          <span className="truncate">{r.email || "—"}{r.ip ? ` · ${r.ip}` : ""}</span>
                          <span className="font-semibold tabular-nums">{r.count ?? r.errors ?? r.ips}</span>
                        </div>
                      ))}</div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>

        <EventDetailDialog event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      </div>
    </AppLayout>
  );
}

export default withAuth(AuditoriaPage, "auditoria");
