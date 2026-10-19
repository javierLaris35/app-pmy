"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { PmyLoader, PmySpinner } from "@/components/ui/pmy-loader"
import { Panel, PanelContent, PanelDescription, PanelHeader, PanelTitle } from "@/components/ui/panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Eye,
  Pencil,
  Play,
  RefreshCw,
  Rocket,
  RotateCcw,
  X,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/lib/toast"
import {
  getDeployLog,
  getDeployPreview,
  getDeployRuns,
  getDeployStatus,
  startDeploy,
} from "@/lib/services/server-deploy"
import type { Bump, DeployEvent, DeployPreview, DeployRun, ReleaseNote } from "@/lib/types/deploy"
import { NOTE_KIND } from "@/components/release-notes/note-kind"
import { WhatsNewDialog } from "@/components/release-notes/whats-new-dialog"
import { DeployConsole, type ConsoleLine } from "./deploy-console"
import { DeployNoteDialog } from "./deploy-note-dialog"

const STEPS: { key: string; label: string }[] = [
  { key: "fetch", label: "Traer main" },
  { key: "deps", label: "Dependencias" },
  { key: "migrate", label: "Migraciones" },
  { key: "build", label: "Compilar" },
  { key: "restart", label: "Reiniciar" },
  { key: "verify", label: "Verificar" },
]

const BUMPS: { key: Bump; label: string; hint: string }[] = [
  { key: "patch", label: "Menor", hint: "Correcciones y ajustes" },
  { key: "minor", label: "Mayor", hint: "Algo nuevo para usar" },
  { key: "major", label: "Muy grande", hint: "Cambia casi todo" },
]

const POLL_MS = 1500
const RECONNECT_GIVE_UP_MS = 3 * 60 * 1000

const fmtClock = (secs: number) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true })

function eventToLine(ev: DeployEvent): ConsoleLine | null {
  switch (ev.type) {
    case "phase": return { type: "phase", line: `▶ [${ev.step}/${ev.total}] ${ev.label}` }
    case "skip": return { type: "skip", line: `  ✓ ${ev.line}` }
    case "log": case "warn": return { type: ev.type, line: ev.line }
    case "heartbeat": return { type: "heartbeat", line: `  · sigue trabajando (${fmtClock(Math.round((ev.elapsedMs ?? 0) / 1000))})` }
    case "error": return { type: "error", line: `✗ ${ev.message}` }
    case "done": return { type: "done", line: `✓ Actualización terminada en ${fmtClock(Math.round(ev.durationMs / 1000))}` }
  }
}

/** Configuración → Servidor → Actualizar (solo superadmin). */
export function ServerDeployPanel() {
  const [preview, setPreview] = useState<DeployPreview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(true)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [notes, setNotes] = useState<ReleaseNote[]>([])
  const [removed, setRemoved] = useState<ReleaseNote[]>([])
  const [bump, setBump] = useState<Bump>("patch")
  const [editing, setEditing] = useState<ReleaseNote | null>(null)
  const [showAsUser, setShowAsUser] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [starting, setStarting] = useState(false)

  const [runs, setRuns] = useState<DeployRun[]>([])
  const [activeRun, setActiveRun] = useState<DeployRun | null>(null)
  const [lines, setLines] = useState<ConsoleLine[]>([])
  const [stepKey, setStepKey] = useState<string | null>(null)
  const [skipped, setSkipped] = useState<Set<string>>(new Set())
  const [reconnecting, setReconnecting] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  const offsetRef = useRef(0)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastOkRef = useRef(Date.now())

  const loadPreview = useCallback(async () => {
    setLoadingPreview(true)
    setPreviewError(null)
    try {
      const p = await getDeployPreview()
      setPreview(p)
      setNotes(p.notes)
      setRemoved([])
      setBump(p.suggestedBump)
    } catch (e: any) {
      setPreviewError(e?.response?.status === 403 ? "Solo un superadmin puede usar esta función." : "No se pudo revisar qué hay nuevo en main.")
    } finally {
      setLoadingPreview(false)
    }
  }, [])

  const loadRuns = useCallback(() => getDeployRuns().then(setRuns).catch(() => undefined), [])

  const stopPolling = () => {
    if (pollRef.current) clearTimeout(pollRef.current)
    pollRef.current = null
  }

  const follow = useCallback((run: DeployRun) => {
    stopPolling()
    setActiveRun(run)
    setLines([])
    setStepKey(null)
    setSkipped(new Set())
    setReconnecting(false)
    offsetRef.current = 0
    lastOkRef.current = Date.now()
    setElapsed(Math.max(0, Math.round((Date.now() - new Date(run.startedAt).getTime()) / 1000)))
    // Solo avisamos "Listo" si se estaba siguiendo en vivo (no al abrir una del historial).
    const live = run.status === "running"

    const tick = async () => {
      try {
        const chunk = await getDeployLog(run.id, offsetRef.current)
        lastOkRef.current = Date.now()
        setReconnecting(false)
        offsetRef.current = chunk.nextOffset
        if (chunk.events.length) {
          const newLines = chunk.events.map(eventToLine).filter(Boolean) as ConsoleLine[]
          setLines((l) => [...l, ...newLines].slice(-500))
          for (const ev of chunk.events) {
            if (ev.type === "phase") setStepKey(ev.key)
            if (ev.type === "skip") setSkipped((s) => new Set(s).add(ev.key))
          }
        }
        setActiveRun(chunk.run)
        if (chunk.run.status !== "running" && chunk.events.length === 0) {
          stopPolling()
          void loadRuns()
          if (live && chunk.run.status === "success") {
            toast.success(`Listo: el sistema ya está en la versión ${chunk.run.targetVersion}.`)
            void loadPreview()
          }
          return
        }
      } catch {
        // Durante el reinicio la API no responde: seguimos intentando en silencio.
        setReconnecting(true)
        if (Date.now() - lastOkRef.current > RECONNECT_GIVE_UP_MS) {
          stopPolling()
          setLines((l) => [...l, { type: "error", line: "✗ El sistema no ha vuelto en 3 minutos. Revisa la bitácora en el servidor." }])
          return
        }
      }
      pollRef.current = setTimeout(tick, POLL_MS)
    }
    void tick()
  }, [loadPreview, loadRuns])

  useEffect(() => {
    void loadPreview()
    void loadRuns()
    getDeployStatus()
      .then((s) => { if (s.running) follow(s.running) })
      .catch(() => undefined)
    return stopPolling
  }, [loadPreview, loadRuns, follow])

  const isRunning = activeRun?.status === "running"
  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [isRunning])

  const counts = useMemo(() => {
    if (!preview) return { commits: 0, systems: 0 }
    const api = preview.api.commits.length
    const web = preview.web?.commits.length ?? 0
    return { commits: api + web, systems: (api > 0 ? 1 : 0) + (web > 0 ? 1 : 0) }
  }, [preview])

  const targetVersion = preview?.nextVersions[bump] ?? ""

  const run = async () => {
    setConfirmOpen(false)
    setStarting(true)
    try {
      const { runId } = await startDeploy(bump, notes)
      const s = await getDeployStatus()
      follow(s.running ?? ({ id: runId, status: "running", startedAt: new Date().toISOString(), targetVersion } as DeployRun))
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo iniciar la actualización.")
    } finally {
      setStarting(false)
    }
  }

  const stepIndex = stepKey ? STEPS.findIndex((s) => s.key === stepKey) : -1
  const percent = !activeRun ? 0
    : activeRun.status === "success" ? 100
    : Math.round((Math.max(0, stepIndex) / STEPS.length) * 100)

  const removeNote = (n: ReleaseNote) => {
    setNotes((ns) => ns.filter((x) => x.id !== n.id))
    setRemoved((r) => [...r, n])
  }

  return (
    <Panel>
      <PanelHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <PanelTitle className="flex items-center gap-2"><Rocket className="h-4 w-4" /> Actualizar el sistema</PanelTitle>
            <PanelDescription>Trae lo último de main, corre migraciones, compila y reinicia.</PanelDescription>
          </div>
          {isRunning ? (
            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">Actualizando</Badge>
          ) : (
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">En línea</Badge>
          )}
        </div>
      </PanelHeader>

      <PanelContent className="space-y-5">
        {loadingPreview && !preview ? (
          <PmyLoader size="sm" text="Revisando qué hay nuevo en main…" className="py-10" />
        ) : previewError && !preview ? (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {previewError}
          </div>
        ) : preview ? (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Metric label="Versión actual" value={preview.currentVersion} />
              <Metric
                label="Cambios nuevos en main"
                value={String(counts.commits)}
                hint={counts.systems ? `· ${counts.systems} ${counts.systems === 1 ? "sistema" : "sistemas"}` : undefined}
              />
              <Metric label="Migraciones nuevas" value={String(preview.migrations.length)} />
            </div>

            {(preview.cannotRunReason || preview.noteErrors.length > 0 || preview.api.warnings.length > 0 || (preview.web?.warnings.length ?? 0) > 0) && (
              <div className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                {[preview.cannotRunReason, ...preview.noteErrors, ...preview.api.warnings, ...(preview.web?.warnings ?? [])]
                  .filter(Boolean)
                  .map((m, i) => (
                    <p key={i} className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {m}</p>
                  ))}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">Tipo de cambio</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {BUMPS.map((b) => (
                  <button
                    key={b.key}
                    type="button"
                    disabled={isRunning}
                    onClick={() => setBump(b.key)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left transition-colors disabled:opacity-60",
                      bump === b.key ? "border-primary ring-1 ring-primary" : "hover:bg-muted/50",
                    )}
                  >
                    <p className="text-sm font-medium">{b.label} → {preview.nextVersions[b.key]}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.hint}{preview.suggestedBump === b.key ? " · sugerido" : ""}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Lo que verán los usuarios</p>
                <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-primary" disabled={!notes.some((n) => n.kind !== "correccion")} onClick={() => setShowAsUser(true)}>
                  <Eye className="h-4 w-4" /> Ver como usuario
                </Button>
              </div>
              {notes.length === 0 ? (
                <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                  No hay novedades pendientes. Los usuarios no verán ningún aviso.
                </p>
              ) : (
                <div className="divide-y rounded-lg border">
                  {notes.map((n) => {
                    const k = NOTE_KIND[n.kind]
                    return (
                      <div key={n.id} className={cn("flex items-center gap-2 px-3 py-1.5 text-sm", n.fromCommit && "bg-amber-50")}>
                        {n.fromCommit ? (
                          <Badge variant="outline" className="shrink-0 border-amber-300 bg-white text-amber-700">Sin nota</Badge>
                        ) : (
                          <Badge variant="outline" className={cn("shrink-0", k.badge)}>{k.label}</Badge>
                        )}
                        <span className={cn("min-w-0 flex-1 truncate", n.fromCommit && "text-amber-800")}>{n.title}</span>
                        {n.audience === "superadmin" && <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:inline">Solo superadmin</span>}
                        <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:inline">{n.source === "web" ? "Pantallas" : "Servidor"}</span>
                        {n.fromCommit ? (
                          <>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-amber-800" disabled={isRunning} onClick={() => setEditing(n)}>Redactar</Button>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-amber-800" disabled={isRunning} onClick={() => removeNote(n)}>Quitar</Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isRunning} onClick={() => setEditing(n)} aria-label="Editar">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isRunning} onClick={() => removeNote(n)} aria-label="Quitar">
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              {removed.length > 0 && (
                <button type="button" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" onClick={() => { setNotes((n) => [...n, ...removed]); setRemoved([]) }}>
                  <RotateCcw className="h-3 w-3" /> Quitaste {removed.length}; regresarlas
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button className="gap-2" disabled={!preview.canRun || isRunning || starting} onClick={() => setConfirmOpen(true)}>
                {starting ? <PmySpinner className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                Actualizar a {targetVersion}
              </Button>
              <Button variant="outline" className="gap-2" disabled={loadingPreview || isRunning} onClick={() => void loadPreview()}>
                {loadingPreview ? <PmySpinner className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
                Revisar sin desplegar
              </Button>
            </div>
          </>
        ) : null}

        {activeRun && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="truncate">
                {activeRun.status === "running"
                  ? reconnecting
                    ? "Reiniciando… esperando a que el sistema vuelva"
                    : stepIndex >= 0 ? `Paso ${stepIndex + 1} de ${STEPS.length} · ${STEPS[stepIndex].label}` : "Iniciando…"
                  : `${activeRun.fromVersion ?? ""} → ${activeRun.targetVersion}`}
              </span>
              {isRunning && <span className="tabular-nums">{fmtClock(elapsed)}</span>}
            </div>
            <Progress
              value={percent}
              className={cn("h-2", activeRun.status === "success" ? "[&>div]:bg-emerald-500" : activeRun.status === "failed" ? "[&>div]:bg-red-500" : "[&>div]:bg-primary")}
            />
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
              {STEPS.map((s, i) => {
                const failedHere = activeRun.status === "failed" && activeRun.step === s.key
                const done = activeRun.status === "success" || i < stepIndex || (i === stepIndex && activeRun.status !== "running" && !failedHere)
                const current = i === stepIndex && activeRun.status === "running"
                return (
                  <span key={s.key} className={cn("inline-flex items-center gap-1",
                    failedHere ? "text-red-600" : done ? "text-emerald-600" : current ? "text-primary" : "text-muted-foreground/60")}>
                    {failedHere ? <XCircle className="h-3.5 w-3.5" /> : done ? <CheckCircle2 className="h-3.5 w-3.5" /> : current ? <PmySpinner className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                    {s.label}{skipped.has(s.key) ? " (sin cambios)" : ""}
                  </span>
                )
              })}
            </div>
            {activeRun.status === "failed" && activeRun.error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {activeRun.error}
              </div>
            )}
            <DeployConsole lines={lines} />
          </div>
        )}

        {runs.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Historial</p>
            <div className="divide-y rounded-lg border text-sm">
              {runs.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => follow(r)}
                  className={cn("flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left hover:bg-muted/40", activeRun?.id === r.id && "bg-muted/40")}
                >
                  <span className="truncate">{r.targetVersion} · {fmtDate(r.startedAt)}</span>
                  <span className={cn("shrink-0 text-xs",
                    r.status === "success" ? "text-emerald-600" : r.status === "failed" ? "text-red-600" : "text-primary")}>
                    {r.status === "success"
                      ? `Correcto${r.durationMs ? ` · ${fmtClock(Math.round(r.durationMs / 1000))}` : ""}`
                      : r.status === "failed"
                        ? `Falló${r.step ? ` en ${STEPS.find((s) => s.key === r.step)?.label.toLowerCase() ?? r.step}` : ""} · ver consola`
                        : "En curso"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </PanelContent>

      <DeployNoteDialog
        note={editing}
        onClose={() => setEditing(null)}
        onSave={(n) => { setNotes((ns) => ns.map((x) => (x.id === n.id ? n : x))); setEditing(null) }}
      />

      <WhatsNewDialog
        open={showAsUser}
        onClose={() => setShowAsUser(false)}
        releases={[{ version: targetVersion, publishedAt: new Date().toISOString(), notes: notes.filter((n) => n.audience !== "superadmin") }]}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Actualizar a la versión {targetVersion}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se traerá main, se correrán {preview?.migrations.length ?? 0} migraciones y se reiniciará el sistema
              unos segundos. Los usuarios verán {notes.filter((n) => n.kind !== "correccion").length} novedades la próxima vez que entren.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void run()}>Actualizar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Panel>
  )
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums">
        {value} {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
      </p>
    </div>
  )
}
