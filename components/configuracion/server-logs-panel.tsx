"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Panel, PanelContent, PanelHeader, PanelTitle, PanelDescription } from "@/components/ui/panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Terminal, Copy, Trash2, ArrowDown, CalendarIcon, Search, X } from "lucide-react"
import { format, isToday as isTodayFns } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { streamServerLogs, type ServerLogEntry } from "@/lib/services/server-logs"
import { toast } from "@/lib/toast"

const MAX_ENTRIES = 2000
const RECONNECT_MS = 3000
const SCROLL_BOTTOM_THRESHOLD = 40

type LevelFilter = "all" | "info" | "warn" | "error" | "debug"

const LEVEL_OPTIONS: { value: LevelFilter; label: string }[] = [
  { value: "all", label: "Todos los niveles" },
  { value: "info", label: "Info" },
  { value: "warn", label: "Warnings" },
  { value: "error", label: "Errores" },
  { value: "debug", label: "Debug" },
]

const LEVEL_COLOR: Record<string, string> = {
  error: "text-red-400",
  warn: "text-amber-400",
  info: "text-sky-300",
  debug: "text-zinc-500",
}

const fmtTime = (iso: string) => {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleTimeString('es-MX', { hour12: false })
}

const toIsoDate = (d: Date) => format(d, "yyyy-MM-dd")

export function ServerLogsPanel() {
  const [date, setDate] = useState<Date>(new Date())
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all")
  const [search, setSearch] = useState("")
  const [entries, setEntries] = useState<ServerLogEntry[]>([])
  const [connected, setConnected] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)

  const containerRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef(true)
  const isLive = isTodayFns(date)

  useEffect(() => {
    let cancelled = false
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    const controller = new AbortController()
    const dateIso = toIsoDate(date)
    const live = isTodayFns(date)

    const connect = () => {
      if (cancelled) return
      setConnected(false)
      streamServerLogs(
        { source: "combined", date: dateIso },
        (entry) => {
          if (cancelled) return
          setConnected(true)
          setEntries((prev) => [...prev, entry].slice(-MAX_ENTRIES))
        },
        () => {
          if (cancelled) return
          setConnected(false)
          // Una fecha pasada termina normalmente (carga histórica); solo "hoy" reintenta.
          if (live) reconnectTimer = setTimeout(connect, RECONNECT_MS)
        },
        controller.signal,
      )
    }

    setEntries([])
    connect()

    return () => {
      cancelled = true
      controller.abort()
      if (reconnectTimer) clearTimeout(reconnectTimer)
    }
  }, [date])

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries.filter((e) => {
      if (levelFilter !== "all" && e.level !== levelFilter) return false
      if (q && !e.message.toLowerCase().includes(q)) return false
      return true
    })
  }, [entries, levelFilter, search])

  // Auto-scroll al fondo salvo que el usuario haya subido manualmente.
  useEffect(() => {
    if (autoScrollRef.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [filteredEntries])

  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_BOTTOM_THRESHOLD
    autoScrollRef.current = atBottom
    setAutoScroll(atBottom)
  }, [])

  const scrollToBottom = () => {
    autoScrollRef.current = true
    setAutoScroll(true)
    if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight
  }

  const handleCopy = async () => {
    const text = filteredEntries.map((e) => `[${fmtTime(e.timestamp)}] ${e.level.toUpperCase()}: ${e.message}`).join("\n")
    await navigator.clipboard.writeText(text)
    toast.success("Logs copiados al portapapeles.")
  }

  const handleClear = () => setEntries([])

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>
          <Terminal className="h-4 w-4 text-primary" /> Logs en vivo
          <span className="ml-auto flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
            {isLive ? (
              <>
                <span className="relative flex h-2 w-2">
                  {connected && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
                  <span className={cn("relative inline-flex h-2 w-2 rounded-full", connected ? "bg-emerald-500" : "bg-amber-500")} />
                </span>
                {connected ? "en vivo" : "reconectando…"}
              </>
            ) : (
              <>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-slate-400" />
                histórico
              </>
            )}
          </span>
        </PanelTitle>
        <PanelDescription>Tail casi en tiempo real de los logs del servidor (Winston).</PanelDescription>
      </PanelHeader>

      <PanelContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-[160px] justify-start font-normal">
                <CalendarIcon className="h-3.5 w-3.5" />
                {isLive ? "Hoy" : format(date, "d MMM yyyy", { locale: es })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => { if (d) { setDate(d); setDatePickerOpen(false) } }}
                disabled={{ after: new Date() }}
                locale={es}
              />
            </PopoverContent>
          </Popover>

          <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v as LevelFilter)}>
            <SelectTrigger className="h-8 w-[170px] text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {LEVEL_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <div className="relative w-[200px]">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar en los logs…"
              className="h-8 pl-8 pr-7 text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <Button variant="outline" size="sm" onClick={handleCopy} disabled={filteredEntries.length === 0}>
            <Copy className="h-3.5 w-3.5" /> Copiar
          </Button>
          <Button variant="outline" size="sm" onClick={handleClear} disabled={entries.length === 0}>
            <Trash2 className="h-3.5 w-3.5" /> Limpiar
          </Button>

          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {filteredEntries.length === entries.length ? `${entries.length} línea(s)` : `${filteredEntries.length} de ${entries.length} línea(s)`}
          </span>
        </div>

        <div className="relative">
          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="h-[520px] overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs leading-relaxed sm:text-[13px]"
          >
            {entries.length === 0 ? (
              <p className="text-zinc-500">{isLive ? "Esperando actividad del servidor…" : "Cargando historial…"}</p>
            ) : filteredEntries.length === 0 ? (
              <p className="text-zinc-500">Sin resultados para este filtro.</p>
            ) : (
              filteredEntries.map((e, i) => (
                <div key={i} className="whitespace-pre-wrap break-all">
                  <span className="text-zinc-600">[{fmtTime(e.timestamp)}]</span>{" "}
                  <span className={cn("font-semibold", LEVEL_COLOR[e.level] || "text-zinc-100")}>{e.level.toUpperCase()}:</span>{" "}
                  <span className="text-zinc-100">{e.message}</span>
                </div>
              ))
            )}
          </div>

          {!autoScroll && (
            <Button
              size="sm"
              className="absolute bottom-3 right-3 shadow-lg"
              onClick={scrollToBottom}
            >
              <ArrowDown className="h-3.5 w-3.5" /> Nuevos logs
            </Button>
          )}
        </div>
      </PanelContent>
    </Panel>
  )
}
