"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Panel, PanelContent, PanelHeader, PanelTitle, PanelDescription } from "@/components/ui/panel"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Cpu, MemoryStick, HardDrive, Network, Server, ArrowDown, ArrowUp, Clock, Activity, Loader2, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { getServerStats, type ServerStats } from "@/lib/services/server-stats"

const REFRESH_MS = 2500

const fmtBytes = (n?: number | null) => {
  if (n == null) return "—"
  if (n < 1024) return `${n} B`
  const u = ["KB", "MB", "GB", "TB"]
  let v = n / 1024, i = 0
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++ }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${u[i]}`
}
const fmtRate = (n?: number | null) => (n == null ? "—" : `${fmtBytes(n)}/s`)
const fmtUptime = (s?: number) => {
  if (!s) return "—"
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60)
  return [d ? `${d}d` : "", h ? `${h}h` : "", `${m}m`].filter(Boolean).join(" ")
}
const barColor = (pct: number) =>
  pct >= 90 ? "[&>div]:bg-red-500" : pct >= 70 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500"
const pctText = (pct: number) =>
  pct >= 90 ? "text-red-600" : pct >= 70 ? "text-amber-600" : "text-emerald-600"

/** Sparkline SVG ligero (sin libs). `max` por defecto autoescala a la serie. */
function Sparkline({ values, max, className }: { values: number[]; max?: number; className?: string }) {
  if (!values || values.length < 2) return <div className="h-8" />
  const W = 100, H = 28
  const hi = max ?? Math.max(...values, 1)
  const lo = 0
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W
    const y = H - ((Math.min(Math.max(v, lo), hi) - lo) / (hi - lo || 1)) * H
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const area = `0,${H} ${pts.join(" ")} ${W},${H}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={cn("h-8 w-full", className)}>
      <polygon points={area} fill="currentColor" opacity={0.12} />
      <polyline points={pts.join(" ")} fill="none" stroke="currentColor" strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function Gauge({ icon, label, pct, sub, series }: { icon: React.ReactNode; label: string; pct: number; sub: string; series?: number[] }) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">{icon}{label}</span>
        <span className={cn("text-lg font-bold tabular-nums", pctText(pct))}>{pct.toFixed(0)}%</span>
      </div>
      <Progress value={Math.min(100, pct)} className={cn("mt-3 h-2", barColor(pct))} />
      {series && series.length >= 2 && (
        <Sparkline values={series} max={100} className={cn("mt-2", pctText(pct))} />
      )}
      <p className={cn("text-xs text-muted-foreground", series && series.length >= 2 ? "mt-1" : "mt-2")}>{sub}</p>
    </div>
  )
}

export function ServerStatsPanel() {
  const [stats, setStats] = useState<ServerStats | null>(null)
  const [history, setHistory] = useState<{ cpu: number; mem: number; rx: number; tx: number }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loadingFirst, setLoadingFirst] = useState(true)
  const inFlight = useRef(false)

  const tick = useCallback(async () => {
    if (inFlight.current || (typeof document !== "undefined" && document.hidden)) return
    inFlight.current = true
    try {
      const s = await getServerStats()
      setStats(s); setError(null)
      // Historial para sparklines (~últimos 40 puntos ≈ 100s).
      setHistory((h) => [...h, {
        cpu: s.cpu.usagePct,
        mem: s.memory.pct,
        rx: s.network?.rxBytesPerSec ?? 0,
        tx: s.network?.txBytesPerSec ?? 0,
      }].slice(-40))
    } catch (err: any) {
      const status = err?.response?.status
      setError(status === 403 ? "Solo un superadmin puede ver las métricas del servidor." : "No se pudieron obtener las métricas del servidor.")
    } finally {
      inFlight.current = false
      setLoadingFirst(false)
    }
  }, [])

  useEffect(() => {
    tick()
    const id = setInterval(tick, REFRESH_MS)
    return () => clearInterval(id)
  }, [tick])

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>
          <Server className="h-4 w-4 text-primary" /> Servidor
          {stats && (
            <span className="ml-auto flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              en vivo · cada {REFRESH_MS / 1000}s
            </span>
          )}
        </PanelTitle>
        <PanelDescription>
          {stats ? <>{stats.hostname} · {stats.platform} · {stats.cpu.cores} núcleos</> : "Uso de recursos casi en tiempo real."}
        </PanelDescription>
      </PanelHeader>

      <PanelContent className="space-y-4">
        {error ? (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
          </div>
        ) : loadingFirst || !stats ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Leyendo métricas del servidor…
          </div>
        ) : (
          <>
            {/* Gauges principales */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Gauge
                icon={<Cpu className="h-4 w-4" />}
                label="CPU"
                pct={stats.cpu.usagePct}
                sub={`${stats.cpu.cores} núcleos · carga ${stats.cpu.loadAvg["1m"].toFixed(2)}`}
                series={history.map((h) => h.cpu)}
              />
              <Gauge
                icon={<MemoryStick className="h-4 w-4" />}
                label="Memoria"
                pct={stats.memory.pct}
                sub={`${fmtBytes(stats.memory.used)} / ${fmtBytes(stats.memory.total)}`}
                series={history.map((h) => h.mem)}
              />
              {stats.disk ? (
                <Gauge
                  icon={<HardDrive className="h-4 w-4" />}
                  label="Disco"
                  pct={stats.disk.pct}
                  sub={`${fmtBytes(stats.disk.used)} / ${fmtBytes(stats.disk.total)} · libre ${fmtBytes(stats.disk.free)}`}
                />
              ) : (
                <div className="rounded-xl border bg-background p-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2 font-medium"><HardDrive className="h-4 w-4" /> Disco</span>
                  <p className="mt-3 text-xs">No disponible en este sistema.</p>
                </div>
              )}
            </div>

            {/* Red + info */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border bg-background p-4">
                <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Network className="h-4 w-4" /> Red</span>
                {stats.network ? (
                  <>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="flex items-center gap-1.5 text-emerald-600"><ArrowDown className="h-4 w-4" /><span className="font-bold tabular-nums">{fmtRate(stats.network.rxBytesPerSec)}</span></div>
                        <p className="text-[11px] text-muted-foreground">Descarga · total {fmtBytes(stats.network.rxTotal)}</p>
                        <Sparkline values={history.map((h) => h.rx)} className="mt-1 text-emerald-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 text-blue-600"><ArrowUp className="h-4 w-4" /><span className="font-bold tabular-nums">{fmtRate(stats.network.txBytesPerSec)}</span></div>
                        <p className="text-[11px] text-muted-foreground">Subida · total {fmtBytes(stats.network.txTotal)}</p>
                        <Sparkline values={history.map((h) => h.tx)} className="mt-1 text-blue-500" />
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">No disponible en este sistema.</p>
                )}
              </div>

              <div className="rounded-xl border bg-background p-4">
                <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Activity className="h-4 w-4" /> Sistema</span>
                <div className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Uptime</span>
                  <span className="text-right font-medium tabular-nums">{fmtUptime(stats.uptimeSec)}</span>
                  <span className="text-muted-foreground">Carga 1/5/15m</span>
                  <span className="text-right font-medium tabular-nums">
                    {stats.cpu.loadAvg["1m"].toFixed(2)} / {stats.cpu.loadAvg["5m"].toFixed(2)} / {stats.cpu.loadAvg["15m"].toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {stats.cpu.model && (
              <p className="text-center text-[11px] text-muted-foreground">{stats.cpu.model}</p>
            )}
          </>
        )}
      </PanelContent>
    </Panel>
  )
}
