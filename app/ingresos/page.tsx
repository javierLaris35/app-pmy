"use client"

import { PmyLoader } from "@/components/ui/pmy-loader";
import React, { useEffect, useMemo, useState } from "react"
import { AppLayout } from "@/components/app-layout"
import { DataTable } from "@/components/data-table/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SucursalSelector } from "@/components/sucursal-selector"
import { OperationHeader } from "@/components/shared/operation-header"
import { DateRangeFilter } from "@/components/shared/date-range-filter"
import { useIncomesByMonthAndSucursal } from "@/hooks/services/incomes/use-income"
import { cn, formatCurrency, parseCurrency } from "@/lib/utils"
import {
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PencilLine,
  Calendar as CalendarIcon,
} from "lucide-react"
import { columns } from "./columns"
import { exportIncomesToExcel } from "@/lib/export-utils"
import { withAuth } from "@/hoc/withAuth"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { BilledOps, Subsidiary } from "@/lib/types"
import { formatWeekLabel, getWeekRange } from "@/lib/week"

const EMPTY_BILLED: BilledOps = {
  fedexPod: 0, fedexDex07: 0, fedexDex08: 0, dhlBa: 0, dhlNe: 0,
  collections: 0, cargas: 0, transfers: 0, otros: 0, total: 0,
}

/** Bloque del resumen: etiqueta chica arriba, valor grande y detalle abajo. Sin borde propio. */
function SummaryBlock({ label, value, children }: { label: string; value?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 px-4 py-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {value != null && <span className="text-xl font-bold leading-tight tabular-nums">{value}</span>}
      {children}
    </div>
  )
}

/** Renglón "etiqueta ........ valor" del detalle de un bloque. */
function DetailRow({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs leading-5">
      <span className="truncate text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  )
}

function IngresosPage() {
  // 1. ESTADOS DE FILTRO
  const [selectedSucursalId, setSelectedSucursalId] = useState<string>("")
  // Por defecto: semana calendario lun–dom en curso (no los últimos 7 días).
  const [range, setRange] = useState(() => getWeekRange())

  // "Ver en Ingresos" desde el Consolidador: ?subsidiaryId=…&from=YYYY-MM-DD&to=YYYY-MM-DD
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sub = params.get("subsidiaryId")
    const from = params.get("from")
    const to = params.get("to")
    if (sub) setSelectedSucursalId(sub)
    if (from && to) setRange({ from, to })
  }, [])

  // 2. CONSUMO DE DATOS
  // Pasamos los strings directamente para evitar desfases de Date()
  const { data, isLoading } = useIncomesByMonthAndSucursal(
    selectedSucursalId,
    range.from,
    range.to
  )

  // Unimos los datos de la semana pasada con los ingresos actuales para la tabla
  const incomes = useMemo(() => {
    if (!data?.current) return [];

    return data.current.map(income => {
      // Buscamos en chartData el valor de la semana 'pasada' para esa misma fecha (name)
      const history = data.chartData?.find(d => d.name === income.date);
      return {
        ...income,
        lastWeekValue: history?.pasada || 0 // Agregamos el valor para que la columna lo vea
      };
    });
  }, [data]);

  // 3. MÉTRICAS CALCULADAS
  const stats = useMemo(() => {
    const billed = { ...EMPTY_BILLED }
    const money = { fedex: 0, dhl: 0, cargas: 0, collections: 0, transfers: 0, otros: 0 }
    let corrections = 0
    let correctionsTotal = 0
    let notBilled = 0
    for (const day of incomes) {
      for (const k of Object.keys(billed) as (keyof BilledOps)[]) billed[k] += day.billed?.[k] ?? 0
      money.fedex += parseCurrency(day.fedex?.totalIncome ?? 0)
      money.dhl += parseCurrency(day.dhl?.totalIncome ?? 0)
      money.cargas += parseCurrency(day.cargasIncome ?? 0)
      money.collections += parseCurrency(day.collectionsIncome ?? 0)
      money.transfers += parseCurrency(day.transfers?.totalIncome ?? 0)
      money.otros += parseCurrency(day.otros?.totalIncome ?? 0)
      corrections += day.corrections?.count ?? 0
      correctionsTotal += parseCurrency(day.corrections?.totalIncome ?? 0)
      notBilled += day.notBilled ?? 0
    }

    const currentTotal = incomes.reduce((acc, i) => acc + parseCurrency(i.totalIncome), 0)
    const lastTotal = data?.lastWeekTotal || 0
    const diff = lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal) * 100 : 0

    return {
      total: currentTotal,
      lastTotal,
      percent: diff.toFixed(1),
      isPositive: diff >= 0,
      billed,
      money,
      corrections,
      correctionsTotal,
      notBilled,
    }
  }, [incomes, data])

  const hasData = incomes.length > 0

  return (
    <AppLayout>
      {/* Sin padding propio: AppLayout ya alinea el contenido con el header. */}
      <div className="relative flex flex-col gap-3">

        {/* LOADER OVERLAY: Aparece cuando está cargando para dar feedback visual */}
        {isLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
            <div className="rounded-xl border bg-background px-8 py-2 shadow-xl">
              <PmyLoader size="sm" text="Actualizando datos…" className="py-4" />
            </div>
          </div>
        )}

        {/* HEADER estándar: sucursal, periodo y exportar viven en la barra */}
        <OperationHeader
          icon={DollarSign}
          title="Panel de Ingresos"
          description={`Monitoreo financiero y comparativa operativa · ${formatWeekLabel(range)}`}
          actions={
            <div className="flex items-center gap-2">
              <div className="w-56">
                <SucursalSelector
                  value={selectedSucursalId}
                  onValueChange={(val) => {
                    const id = typeof val === "string" ? val : (val as Subsidiary).id;
                    setSelectedSucursalId(id ?? "")
                  }}
                />
              </div>
              <DateRangeFilter value={range} onChange={setRange} />
              <Button
                variant="outline"
                className="font-normal"
                onClick={() => exportIncomesToExcel(incomes)}
                disabled={!hasData || isLoading}
              >
                <Download className="mr-2 h-4 w-4" /> Exportar
              </Button>
            </div>
          }
        />

        {/* RESUMEN: un solo contenedor, bloques separados por líneas finas */}
        <div className="grid grid-cols-1 divide-y rounded-lg border md:grid-cols-3 md:divide-x md:divide-y-0">
          <SummaryBlock label="Ingreso total" value={formatCurrency(stats.total)}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className={cn("flex items-center font-semibold", stats.isPositive ? "text-emerald-600" : "text-rose-600")}>
                {stats.isPositive ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                {Math.abs(Number(stats.percent))}% vs sem. anterior
              </span>
              <span className="text-muted-foreground">Sem. anterior {formatCurrency(stats.lastTotal)}</span>
            </div>
            {stats.corrections > 0 && (
              <Badge variant="outline" className="w-fit gap-1 border-violet-300 py-0 text-violet-700">
                <PencilLine className="h-3 w-3" />
                Incluye {stats.corrections} {stats.corrections === 1 ? "corrección" : "correcciones"} · {formatCurrency(stats.correctionsTotal)}
              </Badge>
            )}
          </SummaryBlock>

          <SummaryBlock label="Ingreso por tipo">
            <DetailRow label="FedEx" value={formatCurrency(stats.money.fedex)} />
            <DetailRow label="DHL" value={formatCurrency(stats.money.dhl)} />
            <DetailRow label="Cargas" value={formatCurrency(stats.money.cargas)} />
            <DetailRow label="Recolecciones" value={formatCurrency(stats.money.collections)} />
            <DetailRow label="Traslados" value={formatCurrency(stats.money.transfers)} />
            {stats.money.otros > 0 && <DetailRow label="Otros (Consolidador)" value={formatCurrency(stats.money.otros)} />}
          </SummaryBlock>

          <SummaryBlock label="Operaciones cobradas" value={stats.billed.total}>
            <DetailRow
              label={<>FedEx <span className="text-green-700">POD</span> / <span className="text-orange-600">DEX07</span> / <span className="text-orange-800">DEX08</span></>}
              value={<><span className="text-green-700">{stats.billed.fedexPod}</span> / <span className="text-orange-600">{stats.billed.fedexDex07}</span> / <span className="text-orange-800">{stats.billed.fedexDex08}</span></>}
            />
            <DetailRow
              label={<>DHL <span className="text-blue-700">BA</span> / <span className="text-red-600">NE</span></>}
              value={<><span className="text-blue-700">{stats.billed.dhlBa}</span> / <span className="text-red-600">{stats.billed.dhlNe}</span></>}
            />
            <DetailRow
              label="Recol. · Cargas · Traslados"
              value={`${stats.billed.collections} · ${stats.billed.cargas} · ${stats.billed.transfers}`}
            />
            {stats.notBilled > 0 && (
              <DetailRow
                label="Registradas sin cobro"
                value={<span className="text-amber-700" title="Se registraron, pero la regla de cobro de la sucursal no las cobra (p. ej. DEX03)">{stats.notBilled}</span>}
              />
            )}
          </SummaryBlock>
        </div>

        {/* GRÁFICA */}
        <section className="rounded-lg border px-4 pb-1 pt-2">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Tendencia de ingresos diarios</h2>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-emerald-500" /> Este periodo</span>
              <span className="flex items-center gap-1.5"><span className="h-0 w-4 border-t-2 border-dashed border-slate-400" /> Semana pasada</span>
            </div>
          </div>
          <div className="h-[180px]">
            {data?.chartData && data.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 180 }}>
                <AreaChart data={data.chartData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(str) => str.includes('-') ? `${str.split('-')[2]}/${str.split('-')[1]}` : str}
                  />
                  <YAxis
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                    tickFormatter={(val) => `$${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    formatter={(val, name) => [formatCurrency(Number(val)), name === "pasada" ? "Semana pasada" : "Este periodo"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#colorActual)"
                    animationDuration={1000}
                  />
                  <Area
                    type="monotone"
                    dataKey="pasada"
                    stroke="#94a3b8"
                    strokeDasharray="5 5"
                    fill="transparent"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : !isLoading && (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <CalendarIcon className="h-8 w-8 opacity-20" />
                <p className="text-sm font-medium">
                  {selectedSucursalId ? "No hay datos para el rango seleccionado" : "Elige una sucursal en la barra de arriba"}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* TABLA: el DataTable ya trae su propio borde */}
        <section className="space-y-1.5">
          <h2 className="text-sm font-semibold">Desglose operativo por día</h2>
          <DataTable columns={columns} data={incomes} dense />
        </section>

      </div>
    </AppLayout>
  )
}

export default withAuth(IngresosPage, "finanzas.ingresos")
