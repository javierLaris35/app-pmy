"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Panel, PanelContent, PanelHeader, PanelTitle, PanelDescription } from "@/components/ui/panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { DatabaseBackup, Download, Loader2, AlertTriangle, CheckCircle2, XCircle, ShieldAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getBackupStatus,
  streamRestoreFromProd,
  type BackupStatus,
  type BackupEvent,
} from "@/lib/services/server-backup"

const PHASE_LABEL: Record<string, string> = {
  connect: "Conectando a producción",
  download: "Descargando respaldo",
  prepare: "Preparando base local",
  restore: "Restaurando en local",
}

const fmtBytes = (n?: number) => {
  if (n == null) return ""
  if (n < 1024) return `${n} B`
  const u = ["KB", "MB", "GB", "TB"]
  let v = n / 1024, i = 0
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++ }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${u[i]}`
}

interface LogLine { stream: "stdout" | "stderr"; line: string }

export function ServerBackupPanel() {
  const [status, setStatus] = useState<BackupStatus | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)

  const [running, setRunning] = useState(false)
  const [percent, setPercent] = useState(0)
  const [phase, setPhase] = useState<string>("")
  const [bytes, setBytes] = useState<{ done?: number; total?: number }>({})
  const [logs, setLogs] = useState<LogLine[]>([])
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const logEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let alive = true
    getBackupStatus()
      .then((s) => { if (alive) { setStatus(s); setStatusError(null) } })
      .catch((err: any) => {
        if (!alive) return
        const code = err?.response?.status
        setStatusError(code === 403 ? "Solo un superadmin puede usar esta función." : "No se pudo leer el estado del respaldo.")
      })
      .finally(() => alive && setLoadingStatus(false))
    return () => { alive = false }
  }, [])

  useEffect(() => { logEndRef.current?.scrollIntoView({ block: "end" }) }, [logs])

  useEffect(() => () => abortRef.current?.abort(), [])

  const onEvent = useCallback((ev: BackupEvent) => {
    switch (ev.type) {
      case "step":
        setPhase(PHASE_LABEL[ev.key] ?? ev.key)
        setPercent(ev.percent)
        break
      case "progress":
        setPercent(ev.percent)
        setBytes({ done: ev.bytes, total: ev.totalBytes })
        break
      case "log":
        setLogs((l) => [...l.slice(-499), { stream: ev.stream, line: ev.line }])
        break
      case "done":
        setPercent(100)
        setResult({ ok: true, message: ev.message })
        break
      case "error":
        setResult({ ok: false, message: ev.message })
        break
    }
  }, [])

  const start = useCallback(() => {
    setRunning(true)
    setPercent(0)
    setPhase("")
    setBytes({})
    setLogs([])
    setResult(null)
    const controller = new AbortController()
    abortRef.current = controller
    streamRestoreFromProd(onEvent, () => { setRunning(false); abortRef.current = null }, controller.signal)
  }, [onEvent])

  const cancel = useCallback(() => abortRef.current?.abort(), [])

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>
          <DatabaseBackup className="h-4 w-4 text-primary" /> Respaldo de producción
          <Badge variant="outline" className="ml-auto border-amber-300 bg-amber-50 text-amber-700">Solo desarrollo</Badge>
        </PanelTitle>
        <PanelDescription>
          Trae un respaldo completo de la base de producción y lo restaura en tu MySQL local.
        </PanelDescription>
      </PanelHeader>

      <PanelContent className="space-y-4">
        {loadingStatus ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Verificando disponibilidad…
          </div>
        ) : statusError ? (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {statusError}
          </div>
        ) : status && !status.canRestore ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Deshabilitado en este entorno.</p>
              <p className="text-xs mt-0.5">
                El restore solo corre en desarrollo con <code className="rounded bg-amber-100 px-1">BACKUP_ALLOW_RESTORE=1</code>.
                Este backend apunta a otra base y nunca sobrescribe producción.
              </p>
            </div>
          </div>
        ) : status ? (
          <>
            <div className="rounded-xl border bg-background p-4 text-sm">
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                <span className="text-muted-foreground">Origen</span>
                <span className="truncate font-medium">{status.prodApiUrl}</span>
                <span className="text-muted-foreground">Destino local</span>
                <span className="font-medium">{status.targetDatabase}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={start} disabled={running} className="gap-2">
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {running ? "Respaldando…" : "Traer producción → local"}
              </Button>
              {running && (
                <Button variant="outline" onClick={cancel}>Cancelar</Button>
              )}
            </div>

            {(running || result || percent > 0) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-muted-foreground">{phase || (result?.ok ? "Completado" : "")}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {bytes.done != null && `${fmtBytes(bytes.done)}${bytes.total ? ` / ${fmtBytes(bytes.total)}` : ""} · `}{percent}%
                  </span>
                </div>
                <Progress
                  value={percent}
                  className={cn("h-2", result?.ok ? "[&>div]:bg-emerald-500" : result && !result.ok ? "[&>div]:bg-red-500" : "[&>div]:bg-primary")}
                />
              </div>
            )}

            {result && (
              <div className={cn(
                "flex items-start gap-2 rounded-xl border p-3 text-sm",
                result.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800",
              )}>
                {result.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                <span>{result.message}</span>
              </div>
            )}

            {logs.length > 0 && (
              <div className="rounded-xl border bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed text-zinc-200 max-h-64 overflow-auto">
                {logs.map((l, i) => (
                  <div key={i} className={cn("whitespace-pre-wrap break-all", l.stream === "stderr" ? "text-amber-300" : "text-zinc-300")}>
                    {l.line}
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            )}
          </>
        ) : null}
      </PanelContent>
    </Panel>
  )
}
