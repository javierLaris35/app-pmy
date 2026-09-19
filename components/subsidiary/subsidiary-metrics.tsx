"use client"

import React from "react"
import {
  AlertCircleIcon,
  Banknote,
  EyeIcon,
  MapPinCheckInside,
  Package,
  LayoutGrid,
  Table as TableIcon,
  BarChart3,
  Wallet,
  ChevronDown,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export interface SubsidiaryMetrics {
  subsidiaryId: string
  subsidiaryName: string
  totalPackages: number
  deliveredPackages: number
  undeliveredPackages: number
  undeliveredDetails: {
    total: number
    byExceptionCode: {
      code07: number
      code08: number
      code03: number
      unknown: number
    }
  }
  /** En proceso: guías que aún se mueven (en ruta + en bodega + pendiente). */
  inProcessPackages: number
  /** Residual para cuadrar contra el total declarado (devueltos, ocurre, faltante, etc.). */
  otherPackages: number
  totalCharges: number
  consolidations: {
    ordinary: number
    air: number
    total: number
  }
  averageRevenuePerPackage: number
  totalRevenue: number
  /** Desglose del ingreso contable por tipo (misma regla que la tabla de ingresos). */
  revenueBreakdown?: RevenueBreakdown
  /** Paquetes FACTURADOS (los que explican el dinero; anclados a la fecha de cobro). */
  billed?: BilledStats
  totalExpenses: number
  averageEfficiency: number
  totalProfit: number
  /** Desglose de gastos por categoría (misma prorrateo que totalExpenses). */
  expenseBreakdown?: Record<string, number>
  generalSummary?: {
    totalIncome: number
    totalExpenses: number
    totalProfit: number
    revenueBreakdown?: RevenueBreakdown
    expenseBreakdown?: Record<string, number>
    billed?: BilledStats
  }
}

/** Ingreso contable por tipo EXPLÍCITO (nada agrupado en "otros"). La suma == totalRevenue. */
export interface RevenueBreakdown {
  fedex: number
  dhl: number
  cargas: number
  collections: number
  tyco: number
  aeropuerto: number
  especial: number
}

/** Paquetes facturados (los que suman al ingreso). total = delivered+dex07+dex08+other. */
export interface BilledStats {
  total: number
  delivered: number
  dex07: number
  dex08: number
  other: number
}

/** Moneda MXN — helper a nivel de módulo para reusar en las tarjetas y su desglose. */
const formatMXN = (value: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value)

/** Un renglón de composición: etiqueta, monto y color de su segmento. */
interface CompItem {
  label: string
  value: number
  color: string
}

/** Paleta para categorías de gasto (dinámicas). Se asigna por orden. */
const EXPENSE_PALETTE = ["#ef4444", "#f97316", "#eab308", "#8b5cf6", "#0ea5e9", "#ec4899", "#10b981", "#64748b"]

/**
 * Panel de composición sobre superficie blanca (legible dentro de una tarjeta con
 * degradado). Barra apilada (el TODO) + renglones con % y monto, ordenados de mayor a
 * menor. La suma == total de la tarjeta, así el desglose SIEMPRE cuadra con el número
 * grande de arriba.
 *
 * @param maxRows máximo de renglones antes de agrupar el excedente (default 6). Pasar un
 *   número grande evita cualquier agrupación (p. ej. ingresos: todos los tipos explícitos).
 * @param overflowLabel etiqueta del renglón agrupado cuando hay excedente ("Otras
 *   categorías" en gastos). Nunca se usa para tipos de paquete.
 */
function CompositionPanel({
  items,
  maxRows = 6,
  overflowLabel = "Otras categorías",
}: {
  items: CompItem[]
  maxRows?: number
  overflowLabel?: string
}) {
  const sorted = [...items].filter((i) => i.value !== 0).sort((a, b) => b.value - a.value)
  const shown: CompItem[] =
    sorted.length > maxRows
      ? [...sorted.slice(0, maxRows), { label: overflowLabel, value: sorted.slice(maxRows).reduce((s, i) => s + i.value, 0), color: "#94a3b8" }]
      : sorted
  const total = shown.reduce((s, i) => s + i.value, 0)
  const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0)

  if (shown.length === 0) {
    return <p className="py-2 text-center text-xs text-slate-400">Sin datos en el periodo.</p>
  }

  return (
    <div className="text-slate-700">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
        {shown.filter((i) => i.value > 0).map((i) => (
          <div key={i.label} className="h-full" style={{ width: `${pct(i.value)}%`, background: i.color }} title={`${i.label}: ${pct(i.value).toFixed(1)}%`} />
        ))}
      </div>
      <ul className="mt-3 space-y-2">
        {shown.map((i) => (
          <li key={i.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: i.color }} />
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-600">{i.label}</span>
            <span className="shrink-0 text-xs font-bold tabular-nums text-slate-900">{formatMXN(i.value)}</span>
            <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-slate-400">{pct(i.value).toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Tarjeta KPI con degradado (Ingresos/Gastos/Utilidad). Muestra el número grande y, si
 * recibe `items`, un botón "Ver detalles" que revela su composición dentro de la MISMA
 * tarjeta (sin robar espacio cuando está colapsada). `footer` es contenido extra opcional
 * (p. ej. la barra de margen de Utilidad).
 */
function KpiStatCard({
  label,
  value,
  Icon,
  gradient,
  items,
  footer,
  panelHeader,
  panelMaxRows,
}: {
  label: string
  value: number
  Icon: typeof Banknote
  gradient: string
  items?: CompItem[]
  footer?: React.ReactNode
  /** Contenido opcional arriba del desglose (p. ej. "paquetes facturados"). */
  panelHeader?: React.ReactNode
  /** Máx. renglones antes de agrupar (ingresos: alto → todos los tipos explícitos). */
  panelMaxRows?: number
}) {
  const [open, setOpen] = React.useState(false)
  const hasBreakdown = !!items && items.some((i) => i.value !== 0)

  return (
    // UNA sola envoltura redondeada: degradado arriba + panel blanco flush abajo, para que
    // el desglose se vea PARTE del mismo card. `overflow-hidden` recorta las esquinas.
    <Card className="overflow-hidden rounded-2xl border-none py-0 gap-0 shadow-lg">
      {/* Sección con degradado — min-h fijo → los 3 cards quedan del MISMO tamaño. */}
      <div className={`flex min-h-[176px] flex-col ${gradient} p-5 text-white`}>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-semibold uppercase tracking-wider text-white/85">{label}</span>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/20 backdrop-blur-sm"><Icon className="h-[18px] w-[18px] text-white" /></span>
        </div>
        <p className="mt-3 whitespace-nowrap text-3xl font-extrabold tracking-tight tabular-nums xl:text-2xl 2xl:text-4xl">
          {formatMXN(value)}
        </p>

        {footer}

        {/* Empuja el botón al fondo-DERECHA (posición fija, altura consistente). */}
        <div className="flex-1" />

        {hasBreakdown && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="mt-3 inline-flex items-center gap-1 self-end rounded text-xs font-semibold text-white/90 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            {open ? "Ocultar detalle" : "Ver detalles"}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      {/* Panel de composición: continuo con el card (misma envoltura). Slide-down con el
          truco grid-rows 0fr→1fr, sin agrandar la sección del degradado. */}
      {hasBreakdown && (
        <div
          className="grid transition-all duration-300 ease-out motion-reduce:transition-none"
          style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0 }}
        >
          <div className="overflow-hidden">
            <div className="bg-white p-4">
              {panelHeader}
              <CompositionPanel items={items!} maxRows={panelMaxRows} />
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

interface Props {
  data: SubsidiaryMetrics[]
  /** Si es false, oculta ingresos/utilidad/margen (deja operativo + gastos). */
  canSeeRevenue?: boolean
  /** Control extra que se pinta junto a las pestañas (p.ej. el switch de diseño). */
  headerExtra?: React.ReactNode
}

/** Moneda compacta para las tarjetas (p.ej. $312.4k). La tabla usa el formato completo. */
const fmtCompact = new Intl.NumberFormat("es-MX", {
  style: "currency", currency: "MXN", notation: "compact", maximumFractionDigits: 1,
})

/** Nivel de efectividad → etiqueta, tinte de la franja, chip del header y color del anillo. */
const effLevel = (eff: number) =>
  eff >= 80
    ? { label: "Alta", band: "bg-emerald-50/80", chip: "bg-emerald-100 text-emerald-700", ring: "#16a34a" }
    : eff >= 60
    ? { label: "Media", band: "bg-amber-50/80", chip: "bg-amber-100 text-amber-700", ring: "#d97706" }
    : { label: "Baja", band: "bg-red-50/80", chip: "bg-red-100 text-red-700", ring: "#e11d48" }

/** Tarjeta por sucursal — diseño "cuadre visual": Total = Entregados + DEX + En proceso + Otros,
 *  con barra de composición, anillo de efectividad, desglose DEX, finanzas y consolidados. */
function SubsidiaryCard({ subsidiary, canSeeRevenue }: { subsidiary: SubsidiaryMetrics; canSeeRevenue: boolean }) {
  const total = subsidiary.totalPackages || 0
  const eff = subsidiary.averageEfficiency || 0
  const lvl = effLevel(eff)
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0)
  const margin = subsidiary.totalRevenue > 0 ? (subsidiary.totalProfit / subsidiary.totalRevenue) * 100 : 0
  const dd = subsidiary.undeliveredDetails.byExceptionCode

  const segs = [
    { key: "Entregados", val: subsidiary.deliveredPackages, dot: "bg-emerald-500", color: "#10b981" },
    { key: "Con DEX", val: subsidiary.undeliveredPackages, dot: "bg-amber-500", color: "#f59e0b" },
    { key: "En proceso", val: subsidiary.inProcessPackages, dot: "bg-teal-500", color: "#14b8a6" },
    { key: "Otros", val: subsidiary.otherPackages, dot: "bg-slate-400", color: "#94a3b8" },
  ]

  return (
    <Card className="overflow-hidden rounded-2xl border-none bg-white p-0 shadow-sm ring-1 ring-black/5 transition-shadow hover:shadow-lg">
      {/* Franja de encabezado: sucursal + efectividad */}
      <div className={`flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5 ${lvl.band}`}>
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-blue-100 text-blue-700">
            <MapPinCheckInside className="h-3.5 w-3.5" />
          </span>
          <span className="truncate font-bold text-slate-800">{subsidiary.subsidiaryName}</span>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${lvl.chip}`}>
          {lvl.label}
        </span>
      </div>

      <CardContent className="space-y-3.5 p-4">
        {/* Total + anillo de efectividad */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[30px] font-extrabold leading-none tabular-nums text-slate-900">
              {total.toLocaleString()}
            </div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Paquetes registrados
            </div>
          </div>
          <div
            className="grid h-[60px] w-[60px] shrink-0 place-items-center rounded-full"
            style={{ background: `conic-gradient(${lvl.ring} ${eff}%, #eef2f6 0)` }}
          >
            <div className="grid h-[46px] w-[46px] place-items-center rounded-full bg-white text-center leading-none">
              <span>
                <span className="text-[13px] font-extrabold text-slate-800">{eff.toFixed(0)}%</span>
                <span className="mt-0.5 block text-[8px] font-bold uppercase tracking-wide text-slate-400">Efect.</span>
              </span>
            </div>
          </div>
        </div>

        {/* Barra de composición = el cuadre */}
        <div>
          <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
            {segs.map((s) =>
              s.val > 0 ? <div key={s.key} style={{ width: `${pct(s.val)}%`, background: s.color }} /> : null,
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
            {segs.map((s) => (
              <div key={s.key} className="flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-2 text-slate-500">
                  <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                  {s.key}
                </span>
                <span className="font-bold tabular-nums text-slate-800">{s.val.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Desglose DEX (solo 07/03/08; el resto vive en "Otros") */}
        {subsidiary.undeliveredPackages > 0 && (
          <div className="rounded-xl bg-rose-50/70 p-2.5">
            <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-600">
              <AlertCircleIcon className="h-3.5 w-3.5" /> Desglose DEX
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-rose-900/80">
              {([["07", dd.code07], ["03", dd.code03], ["08", dd.code08]] as const).map(([k, v]) => (
                <div key={k} className="flex justify-between rounded-lg bg-white px-2 py-1 shadow-sm">
                  <span className="text-slate-400">{k}</span>
                  <span className="tabular-nums">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Finanzas (Ingresos/Utilidad solo con permiso; Gastos siempre) */}
        <div className={`grid gap-2.5 ${canSeeRevenue ? "grid-cols-3" : "grid-cols-1"}`}>
          {canSeeRevenue && (
            <div className="rounded-xl bg-slate-50 p-2.5">
              <div className="text-[10px] font-semibold text-slate-400">Ingresos</div>
              <div className="text-[15px] font-extrabold text-slate-800">{fmtCompact.format(subsidiary.totalRevenue)}</div>
            </div>
          )}
          <div className="rounded-xl bg-slate-50 p-2.5">
            <div className="text-[10px] font-semibold text-slate-400">Gastos</div>
            <div className="text-[15px] font-extrabold text-slate-800">{fmtCompact.format(subsidiary.totalExpenses)}</div>
          </div>
          {canSeeRevenue && (
            <div className="rounded-xl bg-slate-50 p-2.5">
              <div className="text-[10px] font-semibold text-slate-400">Utilidad</div>
              <div className="text-[15px] font-extrabold text-indigo-600">{fmtCompact.format(subsidiary.totalProfit)}</div>
              <div className={`text-[11px] font-bold ${margin >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {margin >= 0 ? "+" : ""}{margin.toFixed(1)}%
              </div>
            </div>
          )}
        </div>

        {/* Explicación de facturados: aclara que el ingreso NO sale solo de los entregados
            de arriba, sino de los paquetes cobrados en estas fechas (algunos entraron antes). */}
        {canSeeRevenue && subsidiary.billed && subsidiary.billed.total > 0 && (
          <div className="rounded-xl bg-emerald-50/70 p-3 text-[11px] leading-relaxed text-slate-600">
            <span className="font-bold text-emerald-700">{subsidiary.billed.total.toLocaleString()} paquetes cobrados</span>
            {" "}generan el ingreso ({subsidiary.billed.delivered.toLocaleString()} entregados
            {subsidiary.billed.dex07 > 0 ? ` · ${subsidiary.billed.dex07} DEX07` : ""}
            {subsidiary.billed.dex08 > 0 ? ` · ${subsidiary.billed.dex08} DEX08` : ""}).
            <span className="mt-1 block text-slate-400">
              Arriba se muestran los {total.toLocaleString()} paquetes registrados en el periodo; se cobran los que se entregaron en estas fechas, aunque hayan llegado antes.
            </span>
          </div>
        )}

        {/* Pie: consolidados + cargas + detalles */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[13px]">
          <span className="text-slate-500">
            Consolidados <b className="text-slate-800">{subsidiary.consolidations.total}</b>
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-blue-600 hover:text-blue-700">
                  <EyeIcon className="h-4 w-4" /> Detalles
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ver Detalles de Consolidados</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  )
}

function SubsidiaryMetricsGridImpl({ data, canSeeRevenue = true, headerExtra }: Props) {
  const summary = data.length > 0 ? data[0].generalSummary : null

  // Formateador de moneda
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value)

  // Cálculo del margen global
  const globalMargin = summary && summary.totalIncome > 0
    ? (summary.totalProfit / summary.totalIncome) * 100
    : 0;

  // Ítems de composición. Ingresos: colores fijos por tipo (igual que el Panel de
  // Ingresos). Gastos: categorías dinámicas con paleta por orden. La suma de cada
  // conjunto == su total (cuadra con el número grande de la tarjeta).
  const revenueItems: CompItem[] | undefined = summary?.revenueBreakdown
    ? [
        { label: "FedEx", value: summary.revenueBreakdown.fedex, color: "#3b82f6" },
        { label: "DHL", value: summary.revenueBreakdown.dhl, color: "#f59e0b" },
        { label: "Cargas (F2)", value: summary.revenueBreakdown.cargas, color: "#64748b" },
        { label: "Recolecciones", value: summary.revenueBreakdown.collections, color: "#14b8a6" },
        { label: "Tyco", value: summary.revenueBreakdown.tyco, color: "#6366f1" },
        { label: "Aéreo", value: summary.revenueBreakdown.aeropuerto, color: "#0ea5e9" },
        { label: "Traslados especiales", value: summary.revenueBreakdown.especial, color: "#a855f7" },
      ]
    : undefined
  const expenseItems: CompItem[] = Object.entries(summary?.expenseBreakdown || {})
    .map(([label, value], i) => ({ label, value: Number(value) || 0, color: EXPENSE_PALETTE[i % EXPENSE_PALETTE.length] }))

  // Encabezado "paquetes facturados" del card de Ingresos: explica el dinero (Σ costos de N
  // paquetes anclados a la fecha de COBRO), para que se entienda por qué no cuadra con los
  // "entregados" del conteo operativo por consolidado.
  const billed = summary?.billed
  const billedHeader = billed && billed.total > 0 ? (
    <div className="mb-3 rounded-lg bg-slate-50 px-3 py-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-semibold text-slate-600">Paquetes facturados</span>
        <span className="text-sm font-extrabold tabular-nums text-slate-900">{billed.total.toLocaleString()}</span>
      </div>
      <p className="mt-1 text-[11px] text-slate-500">
        {billed.delivered.toLocaleString()} entregados · {billed.dex07} DEX07 · {billed.dex08} DEX08
        {billed.other ? ` · ${billed.other} otros` : ""}
      </p>
      <p className="mt-1.5 text-[10px] leading-snug text-slate-400">
        Son los paquetes cobrados en estas fechas; puede diferir de los paquetes registrados en el periodo.
      </p>
    </div>
  ) : undefined


  return (
    <div className="space-y-8 w-full">
      {/* 1. SECCIÓN DE RESUMEN GENERAL (GLOBAL KPIs). Cada tarjeta puede abrir su
             composición con "Ver detalles" — el desglose cuadra con su total. */}
      {summary && (
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-3 xl:gap-6">
          {/* Ingresos Totales (solo con permiso) */}
          {canSeeRevenue && (
            <KpiStatCard
              label="Ingresos Totales"
              value={summary.totalIncome}
              Icon={Banknote}
              gradient="bg-gradient-to-br from-green-500 to-emerald-700"
              items={revenueItems}
              panelHeader={billedHeader}
              panelMaxRows={99}
            />
          )}

          {/* Gastos Totales — desglose por categoría */}
          <KpiStatCard
            label="Gastos Totales"
            value={summary.totalExpenses}
            Icon={Wallet}
            gradient="bg-gradient-to-br from-orange-400 to-red-600"
            items={expenseItems}
            footer={
              canSeeRevenue && summary.totalIncome > 0 ? (
                <p className="mt-2 text-xs text-white/80">
                  {((summary.totalExpenses / summary.totalIncome) * 100).toFixed(1)}% de los ingresos
                </p>
              ) : undefined
            }
          />

          {/* Utilidad Neta (solo con permiso) — sin desglose, con barra de margen */}
          {canSeeRevenue && (
            <KpiStatCard
              label="Utilidad Neta"
              value={summary.totalProfit}
              Icon={Banknote}
              gradient="bg-gradient-to-br from-blue-600 to-indigo-800"
              footer={
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-white/80">Margen</span>
                    <span className="text-lg font-extrabold tabular-nums leading-none">
                      {globalMargin > 0 ? "+" : ""}{globalMargin.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
                    <div className="h-full rounded-full bg-white transition-all" style={{ width: `${Math.max(0, Math.min(100, globalMargin))}%` }} />
                  </div>
                </div>
              }
            />
          )}
        </div>
      )}

      {/* 2. CONTROLES DE VISTA Y CONTENIDO ESPECÍFICO POR SUCURSAL */}
      <Tabs defaultValue="cards" className="w-full">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">Métricas por Sucursal</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Los paquetes son los registrados en el periodo; el ingreso corresponde a los paquetes cobrados en estas fechas.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {headerExtra}
            <TabsList className="grid w-full grid-cols-3 border border-slate-200 bg-slate-100/50 backdrop-blur-sm sm:w-[360px]">
              <TabsTrigger value="cards" className="flex items-center gap-1.5">
                <LayoutGrid className="w-4 h-4" /> <span className="hidden sm:inline">Tarjetas</span>
              </TabsTrigger>
              <TabsTrigger value="table" className="flex items-center gap-1.5">
                <TableIcon className="w-4 h-4" /> <span className="hidden sm:inline">Tabla</span>
              </TabsTrigger>
              <TabsTrigger value="charts" className="flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4" /> <span className="hidden sm:inline">Gráficas</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* --- VISTA DE TARJETAS --- */}
        <TabsContent value="cards" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
            {data.map((subsidiary) => (
              <SubsidiaryCard key={subsidiary.subsidiaryId} subsidiary={subsidiary} canSeeRevenue={canSeeRevenue} />
            ))}
          </div>
        </TabsContent>

        {/* --- VISTA DE TABLA --- */}
        <TabsContent value="table" className="mt-0">
          <Card className="border-none shadow-lg bg-white/60 backdrop-blur-xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-100/50">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700">Sucursal</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">Paquetes</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">Entregados</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">DEX</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">En proceso</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">Otros</TableHead>
                    {canSeeRevenue && <TableHead className="text-right font-bold text-slate-700">Ingresos</TableHead>}
                    <TableHead className="text-right font-bold text-slate-700">Gastos</TableHead>
                    {canSeeRevenue && <TableHead className="text-right font-bold text-slate-700">Utilidad</TableHead>}
                    {canSeeRevenue && <TableHead className="text-right font-bold text-slate-700">Margen (%)</TableHead>}
                    <TableHead className="text-center font-bold text-slate-700">Eficiencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((sub) => {
                    const isProfit = sub.totalProfit >= 0
                    const margin = sub.totalRevenue > 0 ? (sub.totalProfit / sub.totalRevenue) * 100 : 0;
                    
                    return (
                      <TableRow key={sub.subsidiaryId} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="font-semibold text-slate-800">{sub.subsidiaryName}</TableCell>
                        <TableCell className="text-right">{sub.totalPackages}</TableCell>
                        <TableCell className="text-right text-emerald-600 font-medium">{sub.deliveredPackages}</TableCell>
                        <TableCell className="text-right text-red-500 font-medium">{sub.undeliveredPackages}</TableCell>
                        <TableCell className="text-right text-teal-600 font-medium">{sub.inProcessPackages}</TableCell>
                        <TableCell className="text-right text-slate-600 font-medium">{sub.otherPackages}</TableCell>
                        {canSeeRevenue && <TableCell className="text-right">{formatCurrency(sub.totalRevenue)}</TableCell>}
                        <TableCell className="text-right">{formatCurrency(sub.totalExpenses)}</TableCell>
                        {canSeeRevenue && (
                          <TableCell className={`text-right font-bold ${isProfit ? 'text-blue-600' : 'text-red-600'}`}>
                            {formatCurrency(sub.totalProfit)}
                          </TableCell>
                        )}
                        {canSeeRevenue && (
                          <TableCell className={`text-right font-medium ${margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {margin.toFixed(1)}%
                          </TableCell>
                        )}
                        <TableCell className="text-center">
                          <Badge 
                            variant={sub.averageEfficiency >= 80 ? "default" : sub.averageEfficiency >= 60 ? "secondary" : "destructive"}
                            className={sub.averageEfficiency >= 80 ? "bg-emerald-500 hover:bg-emerald-600" : ""}
                          >
                            {sub.averageEfficiency.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* --- VISTA DE GRÁFICAS --- */}
        <TabsContent value="charts" className="mt-0 space-y-6">
          {/* Gráfica Financiera (solo con permiso de ingresos) */}
          {canSeeRevenue && (
          <Card className="border-none shadow-lg bg-white/60 backdrop-blur-xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Banknote className="w-5 h-5 text-indigo-600" />
              Desempeño Financiero por Sucursal
            </h3>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 400 }}>
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="subsidiaryName"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                  />
                  <RechartsTooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="totalRevenue" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalExpenses" name="Gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalProfit" name="Utilidad" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          )}

          {/* Gráfica Operativa — barras apiladas: la altura total = Total declarado */}
          <Card className="border-none shadow-lg bg-white/60 backdrop-blur-xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600" />
              Composición del volumen (Total = Entregados + DEX + En proceso + Otros)
            </h3>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 350 }}>
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="subsidiaryName" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <RechartsTooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="deliveredPackages" stackId="vol" name="Entregados" fill="#10b981" />
                  <Bar dataKey="undeliveredPackages" stackId="vol" name="Con DEX" fill="#f59e0b" />
                  <Bar dataKey="inProcessPackages" stackId="vol" name="En proceso" fill="#14b8a6" />
                  <Bar dataKey="otherPackages" stackId="vol" name="Otros" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

/** Memoizado: solo re-renderiza si cambia `data` (ref estable vía SWR keepPreviousData). */
const SubsidiaryMetricsGridNew = React.memo(SubsidiaryMetricsGridImpl)

export function SubsidiaryMetricsGrid(props: Props) {
  return <SubsidiaryMetricsGridNew {...props} />
}