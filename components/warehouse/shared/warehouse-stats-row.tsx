"use client"

import { Box, Clock, DollarSign, GemIcon, Package } from "lucide-react"

import { Separator } from "@/components/ui/separator"
import { StatCard } from "@/components/shared/stat-card"
import type { WarehouseShipment } from "@/components/warehouse/shared/use-warehouse-session"

/**
 * Forma de `stats` consumida por `WarehouseStatsRow`. Coincide estructuralmente
 * con `UseWarehouseSession["stats"]` (hook de Task 6) para que los screens de
 * Entrada/Salida puedan pasar `hook.stats` directamente.
 */
export interface WarehouseStatsRowStats {
  total: number
  fedex: number
  dhl: number
  expiringToday: WarehouseShipment[]
  highValue: WarehouseShipment[]
  cargo: WarehouseShipment[]
  withCharges: WarehouseShipment[]
  totalCharges: number
}

export interface WarehouseStatsRowProps {
  stats: WarehouseStatsRowStats
  onOpenExpiring: () => void
  onOpenHighValue: () => void
  onOpenCharges: () => void
}

/** Fila de 6 tarjetas de estadísticas (look unificado) para Entrada/Salida a Bodega. */
export function WarehouseStatsRow({ stats, onOpenExpiring, onOpenHighValue, onOpenCharges }: WarehouseStatsRowProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 pt-4">
      <StatCard title="Total" value={stats.total} icon={Package} isTotal />

      <div className="rounded-lg border border-slate-200 bg-white p-3 flex flex-col justify-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-[12px] font-bold text-[#4d148c]">FEDEX</p>
            <p className="text-2xl font-black tracking-tight text-slate-800">{stats.fedex}</p>
          </div>
          <Separator orientation="vertical" className="h-10 bg-slate-200" />
          <div className="flex-1 text-right">
            <p className="text-[12px] font-bold text-[#d40511]">DHL</p>
            <p className="text-2xl font-black tracking-tight text-slate-800">{stats.dhl}</p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-[12px] font-bold uppercase tracking-widest truncate text-slate-500">Carrier</span>
        </div>
      </div>

      <StatCard
        title="Vencen Hoy"
        value={stats.expiringToday.length}
        icon={Clock}
        alert={stats.expiringToday.length > 0}
        onClick={() => stats.expiringToday.length > 0 && onOpenExpiring()}
      />
      <StatCard
        title="Alto Valor"
        value={stats.highValue.length}
        icon={GemIcon}
        alert={stats.highValue.length > 0}
        onClick={() => stats.highValue.length > 0 && onOpenHighValue()}
      />
      <StatCard title="Carga" value={stats.cargo.length} icon={Box} />
      <StatCard
        title="Cobros"
        value={stats.withCharges.length}
        subValue={`$${stats.totalCharges.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`}
        icon={DollarSign}
        alert={stats.withCharges.length > 0}
        onClick={() => stats.withCharges.length > 0 && onOpenCharges()}
      />
    </div>
  )
}
