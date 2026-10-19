"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { PmyLoader, PmySpinner } from "@/components/ui/pmy-loader"
import { Button } from "@/components/ui/button"
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
import { AlertTriangle, CheckCircle2, CircleCheckBig, Megaphone, Play, RefreshCw, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/lib/toast"
import { getDeployLog, getDeployPreview, getDeployRuns, getDeployStatus, startDeploy } from "@/lib/services/server-deploy"
import type { Bump, DeployEvent, DeployPreview, DeployRun, ReleaseNote } from "@/lib/types/deploy"
import { WhatsNewDialog } from "@/components/release-notes/whats-new-dialog"
import { DeployConsole, type ConsoleLine } from "./deploy-console"
import { DeployNoteDialog } from "./deploy-note-dialog"
import { DeployNotes, isPublishable } from "./deploy-notes"
import { DEPLOY_STEPS, DeployRoute, type RouteState } from "./deploy-route"

const BUMPS: { key: Bump; label: string; hint: string }[] = [
  { key: "patch", label: "Menor", hint: "Correcciones y ajustes" },
  { key: "minor", label: "Mayor", hint: "Algo nuevo para usar" },
  { key: "major", label: "Muy grande", hint: "Cambia casi todo" },
]

const POLL_MS = 1500
const RECONNECT_GIVE_UP_MS = 3 * 60 * 1000

const fmtClock = (secs: number) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit", hour12: true })

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
  /** Solo la lectura más reciente sigue viva (evita lecturas duplicadas). */
  const genRef = useRef(0)

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
    const gen = ++genRef.current
    setActiveRun(run)
    setLines([])
    setStepKey(null)
    setSkipped(new Set())
    setReconnecting(false)
    offsetRef.current = 0
    lastOkRef.current = Date.now()
    // El reloj sale de la propia bitácora (elapsedMs del script): no depende de zonas horarias.
    setElapsed(0)
    // Solo avisamos "Listo" si se estaba siguiendo en vivo (no al abrir una del historial).
    const live = run.status === "running"

    const tick = async () => {
      if (gen !== genRef.current) return
      try {
        const chunk = await getDeployLog(run.id, offsetRef.current)
        if (gen !== genRef.current) return
        lastOkRef.current = Date.now()
        setReconnecting(false)
        offsetRef.current = chunk.nextOffset
        if (chunk.events.length) {
          const newLines = chunk.events.map(eventToLine).filter(Boolean) as ConsoleLine[]
          setLines((l) => [...l, ...newLines].slice(-500))
          const lastMs = Math.max(0, ...chunk.events.map((e) => ("elapsedMs" in e && e.elapsedMs ? e.elapsedMs : 0)))
          if (lastMs) setElapsed((s) => Math.max(s, Math.round(lastMs / 1000)))
          for (const ev of chunk.events) {
            if (ev.type === "phase") setStepKey(ev.key)
            if (ev.type === "skip") setSkipped((s) => new Set(s).add(ev.key))
          }
        }
        setActiveRun(chunk.run)
        if (chunk.run.status !== "running" && chunk.events.length === 0) {
          stopPolling()
          if (live) {
            void loadRuns()
            if (chunk.run.status === "success") {
              toast.success(`Listo: el sistema ya está en la versión ${chunk.run.targetVersion}.`)
              void loadPreview()
            }
          }
          return
        }
      } catch {
        if (gen !== genRef.current) return
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
    return () => {
      genRef.current++
      stopPolling()
    }
  }, [loadPreview, loadRuns, follow])

  const isRunning = activeRun?.status === "running"
  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [isRunning])

  const publishable = useMemo(() => notes.filter(isPublishable), [notes])
  const newsCount = publishable.filter((n) => n.kind !== "correccion").length
  const serverChanges = preview ? preview.api.pendingCount : 0
  const onlyNews = !!preview && preview.serverUpToDate && !preview.upToDate
  const targetVersion = preview?.nextVersions[bump] ?? ""

  const stepIndex = stepKey ? DEPLOY_STEPS.findIndex((s) => s.key === stepKey) : -1
  const failedIndex = activeRun?.status === "failed" ? Math.max(0, DEPLOY_STEPS.findIndex((s) => s.key === activeRun.step)) : stepIndex
  const routeState: RouteState = activeRun?.status === "running" ? "running"
    : activeRun?.status === "failed" ? "failed"
    : activeRun?.status === "success" ? "success"
    : preview?.upToDate ? "uptodate" : "idle"

  const run = async () => {
    setConfirmOpen(false)
    setStarting(true)
    try {
      const { runId } = await startDeploy(bump, publishable)
      const s = await getDeployStatus()
      follow(s.running ?? ({ id: runId, status: "running", startedAt: new Date().toISOString(), targetVersion } as DeployRun))
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo iniciar la actualización.")
    } finally {
      setStarting(false)
    }
  }

  const removeNote = (n: ReleaseNote) => {
    setNotes((ns) => ns.filter((x) => x.id !== n.id))
    setRemoved((r) => [...r, n])
  }

  if (loadingPreview && !preview) return <PmyLoader size="sm" text="Revisando qué hay nuevo en main…" className="py-16" />
  if (previewError && !preview) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <AlertTriangle className="h-4 w-4 shrink-0" /> {previewError}
      </div>
    )
  }
  if (!preview) return null

  const blocked = !preview.canRun && !preview.upToDate && !isRunning && !preview.running

  return (
    <div className="space-y-4">
      {/* ── Ruta de la actualización ── */}
      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between">
          <Headline
            state={routeState}
            preview={preview}
            run={activeRun}
            targetVersion={targetVersion}
            stepLabel={stepIndex >= 0 ? DEPLOY_STEPS[stepIndex].label : null}
            reconnecting={reconnecting}
            elapsed={elapsed}
            onlyNews={onlyNews}
          />
          <div className="flex shrink-0 flex-col items-stretch gap-2 md:items-end">
            {preview.upToDate && !isRunning ? (
              <Button variant="outline" className="gap-2" disabled={loadingPreview} onClick={() => void loadPreview()}>
                {loadingPreview ? <PmySpinner className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />} Revisar de nuevo
              </Button>
            ) : (
              <>
                <Button size="lg" className="gap-2" disabled={!preview.canRun || isRunning || starting} onClick={() => setConfirmOpen(true)}>
                  {starting || isRunning ? <PmySpinner className="h-4 w-4" /> : onlyNews ? <Megaphone className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {isRunning ? "Actualizando…" : onlyNews ? `Publicar novedades ${targetVersion}` : `Actualizar a ${targetVersion}`}
                </Button>
                <button type="button" className="inline-flex items-center justify-end gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50" disabled={loadingPreview || isRunning} onClick={() => void loadPreview()}>
                  <RefreshCw className={cn("h-3 w-3", loadingPreview && "animate-spin")} /> Revisar de nuevo
                </button>
              </>
            )}
          </div>
        </div>

        <div className="border-t bg-muted/20 px-5 pb-4">
          <DeployRoute state={routeState} stepIndex={routeState === "failed" ? failedIndex : stepIndex} skipped={skipped} />
        </div>

        {!preview.upToDate && (
          <div className="grid grid-cols-3 divide-x border-t text-center">
            <Fact value={serverChanges} label={serverChanges === 1 ? "cambio en el servidor" : "cambios en el servidor"} />
            <Fact value={preview.migrations.length} label={preview.migrations.length === 1 ? "migración" : "migraciones"} />
            <Fact value={newsCount} label={newsCount === 1 ? "novedad para usuarios" : "novedades para usuarios"} />
          </div>
        )}
      </section>

      {blocked && preview.cannotRunReason && (
        <p className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {preview.cannotRunReason}
        </p>
      )}
      {[...preview.noteErrors, ...preview.api.warnings, ...(preview.web?.warnings ?? [])].map((m, i) => (
        <p key={i} className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {m}
        </p>
      ))}

      {/* ── Consola en vivo ── */}
      {activeRun && (
        <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-2 text-xs">
            <span className="flex items-center gap-2 text-zinc-300">
              <span className={cn("h-2 w-2 rounded-full",
                activeRun.status === "running" ? (reconnecting ? "bg-amber-400" : "bg-sky-400 motion-safe:animate-pulse")
                : activeRun.status === "success" ? "bg-emerald-400" : "bg-red-400")} />
              {activeRun.status === "running"
                ? reconnecting ? "Reiniciando… esperando a que el sistema vuelva" : "En vivo"
                : `${activeRun.fromVersion ?? ""} → ${activeRun.targetVersion}${activeRun.startedAt ? ` · ${fmtDate(activeRun.startedAt)}` : ""}`}
            </span>
            <span className="tabular-nums text-zinc-500">
              {activeRun.status === "running" ? fmtClock(elapsed) : activeRun.durationMs ? fmtClock(Math.round(activeRun.durationMs / 1000)) : ""}
            </span>
          </div>
          {lines.length > 0
            ? <DeployConsole lines={lines} className="max-h-80 rounded-none border-0" />
            : <p className="px-4 py-6 font-mono text-[11px] text-zinc-500">Esperando la primera línea…</p>}
        </section>
      )}

      {/* ── Qué se va a publicar ── */}
      {!preview.upToDate && (
        <section className="grid gap-4 rounded-2xl border bg-card p-5 shadow-sm lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="space-y-2">
            <p className="text-sm font-medium">Tamaño del cambio</p>
            <div className="space-y-1.5" role="radiogroup" aria-label="Tamaño del cambio">
              {BUMPS.map((b) => {
                const on = bump === b.key
                return (
                  <button
                    key={b.key}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={isRunning}
                    onClick={() => setBump(b.key)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:opacity-60",
                      on ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                    )}
                  >
                    <span className={cn("grid h-4 w-4 shrink-0 place-items-center rounded-full border-2", on ? "border-primary" : "border-muted-foreground/30")}>
                      {on && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{b.label}</span>
                      <span className="block text-xs text-muted-foreground">
                        {b.hint}{preview.suggestedBump === b.key ? " · sugerido" : ""}
                      </span>
                    </span>
                    <span className={cn("font-mono text-sm tabular-nums", on ? "font-semibold text-primary" : "text-muted-foreground")}>
                      {preview.nextVersions[b.key]}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <DeployNotes
            notes={notes}
            removed={removed}
            disabled={isRunning}
            onEdit={setEditing}
            onRemove={removeNote}
            onRestore={() => { setNotes((n) => [...n, ...removed]); setRemoved([]) }}
            onPreview={() => setShowAsUser(true)}
          />
        </section>
      )}

      {/* ── Historial ── */}
      {runs.length > 0 && (
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="mb-2 text-sm font-medium">Historial</p>
          <ul className="divide-y">
            {runs.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => follow(r)}
                  className={cn("flex w-full items-center gap-3 px-1 py-2 text-left text-sm hover:bg-muted/40", activeRun?.id === r.id && "bg-muted/40")}
                >
                  {r.status === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    : r.status === "failed" ? <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                    : <PmySpinner className="h-4 w-4 shrink-0" />}
                  <span className="w-16 shrink-0 font-mono font-medium tabular-nums">{r.targetVersion}</span>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{fmtDate(r.startedAt)}</span>
                  <span className={cn("shrink-0 text-xs", r.status === "failed" ? "text-red-600" : "text-muted-foreground")}>
                    {r.status === "success"
                      ? r.durationMs ? `en ${fmtClock(Math.round(r.durationMs / 1000))}` : "Correcto"
                      : r.status === "failed"
                        ? `Falló en ${DEPLOY_STEPS.find((s) => s.key === r.step)?.label.toLowerCase() ?? "un paso"}`
                        : "En curso"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <DeployNoteDialog
        note={editing}
        onClose={() => setEditing(null)}
        onSave={(n) => { setNotes((ns) => ns.map((x) => (x.id === n.id ? n : x))); setEditing(null) }}
      />

      <WhatsNewDialog
        open={showAsUser}
        onClose={() => setShowAsUser(false)}
        releases={[{ version: targetVersion, publishedAt: new Date().toISOString(), notes: publishable.filter((n) => n.audience !== "superadmin") }]}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{onlyNews ? `¿Publicar las novedades como ${targetVersion}?` : `¿Actualizar a la versión ${targetVersion}?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {onlyNews
                ? "El servidor no cambia: solo se sube la versión y se publica el aviso."
                : `Se traerán ${serverChanges} cambios, se correrán ${preview.migrations.length} migraciones y el sistema se reiniciará unos segundos.`}
              {" "}
              {newsCount > 0
                ? `Los usuarios verán ${newsCount} ${newsCount === 1 ? "novedad" : "novedades"} la próxima vez que entren.`
                : "Los usuarios no verán ningún aviso."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void run()}>{onlyNews ? "Publicar" : "Actualizar"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function Fact({ value, label }: { value: number; label: string }) {
  return (
    <div className="px-3 py-3">
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function Headline(props: {
  state: RouteState
  preview: DeployPreview
  run: DeployRun | null
  targetVersion: string
  stepLabel: string | null
  reconnecting: boolean
  elapsed: number
  onlyNews: boolean
}) {
  const { state, preview, run, targetVersion, stepLabel, reconnecting, elapsed, onlyNews } = props
  const from = run?.fromVersion ?? preview.currentVersion
  const to = run?.targetVersion ?? targetVersion

  if (state === "uptodate") {
    return (
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
          <CircleCheckBig className="h-6 w-6" />
        </span>
        <div>
          <h3 className="text-xl font-semibold tracking-tight">Todo está al día</h3>
          <p className="text-sm text-muted-foreground">
            El servidor tiene lo último de main y no hay novedades pendientes. Versión en línea: <span className="font-mono font-medium text-foreground">{preview.currentVersion}</span>
          </p>
        </div>
      </div>
    )
  }

  const title =
    state === "running" ? (reconnecting ? "Reiniciando el sistema…" : `Actualizando · ${stepLabel ?? "iniciando"}`)
    : state === "success" ? "Actualización terminada"
    : state === "failed" ? "La actualización se detuvo"
    : onlyNews ? "Hay novedades por publicar" : "Hay una actualización lista"

  const subtitle =
    state === "running" ? `Lleva ${fmtClock(elapsed)}. Los usuarios pueden seguir trabajando.`
    : state === "success" ? "El sistema ya está en la versión nueva."
    : state === "failed" ? run?.error ?? "Revisa la consola para ver qué pasó."
    : onlyNews ? "El servidor ya está al día; solo se publicará el aviso para los usuarios."
    : "Revisa lo que verán los usuarios y elige el tamaño del cambio."

  return (
    <div className="min-w-0">
      <div className="flex items-baseline gap-3 font-mono tabular-nums">
        <span className="text-2xl text-muted-foreground">{from}</span>
        <span className="text-muted-foreground/60" aria-hidden>›</span>
        <span className={cn("text-4xl font-semibold tracking-tight",
          state === "failed" ? "text-red-600" : state === "success" ? "text-emerald-600" : "text-primary")}>{to}</span>
      </div>
      <h3 className="mt-1 text-base font-semibold">{title}</h3>
      <p className={cn("text-sm", state === "failed" ? "text-red-700" : "text-muted-foreground")}>{subtitle}</p>
    </div>
  )
}
