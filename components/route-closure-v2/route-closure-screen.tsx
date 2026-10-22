"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { pdf } from "@react-pdf/renderer"
import { ArrowLeft, ArrowRight, FileText, Lock, Stethoscope, XCircle } from "lucide-react"
import { AppLayout } from "@/components/app-layout"
import { OperationHeader } from "@/components/shared/operation-header"
import { Button } from "@/components/ui/button"
import { PmyLoader, PmySpinner } from "@/components/ui/pmy-loader"
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
import { useToast } from "@/components/ui/use-toast"
import { clearScanBuffer } from "@/components/scanner/use-scan-buffer"
import { apiError } from "@/components/maintenance/shared/confirm-action"
import { ClosureDoctorPanel } from "@/components/package-dispatch/closure-doctor-panel"
import { cn, mapToPackageInfoComplete } from "@/lib/utils"
import { useAuthStore } from "@/store/auth.store"
import { getShipmensByDispatchId } from "@/lib/services/package-dispatchs"
import { getPreClosureContext, reconcile, save, uploadFiles, validateTrackinNumberNoVan } from "@/lib/services/route-closure"
import { getCatalogOptions, type CatalogItem } from "@/lib/services/catalog"
import { getCompanySettings } from "@/lib/services/company-settings"
import { RouteClosurePDF } from "@/lib/services/route-closure/route-closure-pdf-generator"
import { generateRouteClosureExcel } from "@/lib/services/route-closure/route-closure-excel-generator"
import { PreClosurePDF } from "@/lib/services/route-closure/pre-closure-pdf"
import { buildPreClosureSheet } from "@/lib/services/route-closure/pre-closure-sheet"
import { classifyClosureBucket, isClosureBlockedByOtherStatus, isDueOnRouteDay, routeDayKey } from "@/lib/tracking/closure-status"
import { PackageDispatchStatus, Priority, type ManualOption, type NoVanPackageDetail, type PackageDispatch, type PackageInfo, type PreClosureContext, type RouteClosure } from "@/lib/types"
import { applyChange, changeKey, effectiveBucket, effectiveStatus, needsIncomeWarning, toClosureVMs, toPayload, type ClosureChanges } from "./closure-changes"
import type { ClosurePackageVM } from "@/lib/services/route-closure/pre-closure-sheet"
import { StepPreClosure } from "./step-pre-closure"
import { ClosureStepper } from "./closure-stepper"
import { COLLECTIONS_SCAN_KEY, NOVAN_SCAN_KEY, StepVerification } from "./step-verification"
import { StepFinish } from "./step-finish"

const FALLBACK_COMPANY = "Paquetería y Mensajería Delyaqui SA de CV"

const splitLines = (raw: string) => raw.split("\n").map((l) => l.trim()).filter(Boolean)
const fileStamp = () => new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-")

/**
 * Cierre de ruta en pantalla completa con pre-cierre (sucursales con `routeClosureWithPreClosure`,
 * hoy Cabo San Lucas). 1) Pre-cierre obligatorio (PDF igual a la hoja del chofer), 2) comprobación
 * guía por guía contra lo que entrega el chofer, 3) kilometraje y cierre. Los estatus corregidos se
 * guardan solo al cerrar, con auditoría. El diálogo de siempre sigue para las demás sucursales.
 */
export function RouteClosureScreen({ dispatchId }: { dispatchId: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const user = useAuthStore((s) => s.user)
  const isSuperAdmin = ["superadmin", "superamin"].includes(((user?.role as string) || "").toLowerCase())

  const [step, setStep] = useState(1)
  const [loadingText, setLoadingText] = useState<string | null>("Reconciliando estatus con FedEx…")
  const [loadError, setLoadError] = useState(false)
  const [dispatch, setDispatch] = useState<PackageDispatch | null>(null)
  const [context, setContext] = useState<PreClosureContext | null>(null)
  const [companyName, setCompanyName] = useState(FALLBACK_COMPANY)
  const [dhlOptions, setDhlOptions] = useState<CatalogItem[]>([])

  const [preClosureAt, setPreClosureAt] = useState<string | null>(null)
  const [lockHighlighted, setLockHighlighted] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [changes, setChanges] = useState<ClosureChanges>({})
  const [dhlCodes, setDhlCodes] = useState<Record<string, string>>({})
  const [pendingWarning, setPendingWarning] = useState<{ pkg: ClosurePackageVM; option: ManualOption } | null>(null)
  const [collectionsRaw, setCollectionsRaw] = useState("")
  const [noVanInput, setNoVanInput] = useState("")
  const [noVanPackages, setNoVanPackages] = useState<NoVanPackageDetail[]>([])
  const [isValidatingNoVan, setIsValidatingNoVan] = useState(false)
  const [actualKms, setActualKms] = useState("")
  const [kmsError, setKmsError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [doctorOpen, setDoctorOpen] = useState(false)

  const toastRef = useRef(toast)
  toastRef.current = toast

  const loadPackages = useCallback(async () => {
    const d = await getShipmensByDispatchId(dispatchId)
    // El LD se mide con el estatus del día de la ruta (el mismo con el que el cierre ve cada guía).
    const closureStatuses = mapToPackageInfoComplete(d.shipments, d.chargeShipments)
      .filter((p) => p.id)
      .map((p) => ({ id: p.id!, isCharge: !!p.isCharge, status: String(p.status ?? "") }))
    const ctx = await getPreClosureContext(dispatchId, closureStatuses)
    setDispatch(d)
    setContext(ctx)
  }, [dispatchId])

  // Al abrir: reconciliar con FedEx (igual que el diálogo) y luego traer guías + contexto.
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        try {
          await reconcile(dispatchId)
        } catch {
          toastRef.current({ title: "Sincronización FedEx incompleta", description: "Se muestran los últimos estatus guardados." })
        }
        if (!alive) return
        setLoadingText("Cargando guías de la ruta…")
        await loadPackages()
      } catch {
        if (alive) setLoadError(true)
      } finally {
        if (alive) setLoadingText(null)
      }
    })()
    getCatalogOptions("dhl_status").then(setDhlOptions).catch(() => setDhlOptions([]))
    getCompanySettings().then((c) => c?.name && setCompanyName(c.name)).catch(() => undefined)
    return () => {
      alive = false
    }
  }, [dispatchId, loadPackages])

  // Guías del cierre (estatus del día de la ruta) + estatus vivo + contexto del back.
  const { packageInfos, vms } = useMemo(() => {
    if (!dispatch || !context) return { packageInfos: [] as PackageInfo[], vms: [] as ClosurePackageVM[] }
    const infos = mapToPackageInfoComplete(dispatch.shipments, dispatch.chargeShipments)
    const live: Record<string, string> = {}
    for (const s of (dispatch.shipments ?? []) as any[]) live[s.id] = s.status
    for (const c of (dispatch.chargeShipments ?? []) as any[]) live[`c:${c.id}`] = c.status
    return { packageInfos: infos, vms: toClosureVMs(infos, live, context.packages) }
  }, [dispatch, context])

  const fedexVms = vms.filter((p) => p.carrier === "FedEx")
  const dhlVms = vms.filter((p) => p.carrier === "DHL")
  const is315 = !!context?.is315
  const routeDay = context?.routeDay ?? routeDayKey(dispatch?.routeDate, dispatch?.createdAt)
  const collections = splitLines(collectionsRaw)

  const bucketCounts = useMemo(() => {
    const c = { pod: 0, dex: 0, ocurre: 0, otros: 0 }
    for (const p of fedexVms) {
      const b = effectiveBucket(p, changes)
      if (b === "POD") c.pod++
      else if (b === "DEX") c.dex++
      else if (b === "Ocurre") c.ocurre++
      else c.otros++
    }
    for (const p of dhlVms) {
      const code = dhlCodes[p.id]
      if (!code) c.otros++
      else if (code === "OK") c.pod++
      else c.dex++
    }
    for (const n of noVanPackages) {
      const b = classifyClosureBucket(n.status)
      if (b === "delivered") c.pod++
      else if (b === "not_delivered") c.dex++
      else if (b === "ocurre") c.ocurre++
      else c.otros++
    }
    return c
  }, [fedexVms, dhlVms, changes, dhlCodes, noVanPackages])

  const otherDueToday = fedexVms.filter((p) => {
    const info = packageInfos.find((i) => i.id === p.id && !!i.isCharge === p.isCharge)
    return effectiveBucket(p, changes) === "Otros" && !info?.movedToAnotherRoute && isDueOnRouteDay(p.commitDateTime ?? undefined, routeDay)
  })
  const blockedByOther = isClosureBlockedByOtherStatus(otherDueToday.length > 0, dispatch?.subsidiary?.allowRouteClosureWithOtherStatus)
  const dhlPending = dhlVms.filter((p) => !dhlCodes[p.id]).length

  const blockers = [
    ...(blockedByOther
      ? [
          `${otherDueToday.length} guía(s) siguen sin resultado y vencen el día de la ruta (${otherDueToday
            .slice(0, 5)
            .map((p) => p.trackingNumber)
            .join(", ")}${otherDueToday.length > 5 ? "…" : ""}). Corrígelas en la comprobación con lo que diga el chofer.`,
        ]
      : []),
    ...(dhlPending ? [`Faltan ${dhlPending} guía(s) DHL por confirmar en la comprobación.`] : []),
  ]

  // ---- Paso 1: pre-cierre --------------------------------------------------------------------
  const generatePreClosure = async () => {
    if (!dispatch) return
    setGenerating(true)
    try {
      const sheet = buildPreClosureSheet({
        companyName,
        city: dispatch.subsidiary?.name ?? "",
        driver: dispatch.drivers?.map((d) => d.name).join(", ") ?? "",
        routeDay: routeDay ?? "",
        vehicle: dispatch.vehicle?.code || dispatch.vehicle?.name || dispatch.vehicle?.plateNumber,
        kmOut: dispatch.kms ? Number(dispatch.kms) : undefined,
        packages: vms,
        codPackages: packageInfos
          .filter((p) => p.payment && Number(p.payment.amount) > 0)
          .map((p) => ({ tc: String(p.payment!.type ?? ""), amount: Number(p.payment!.amount), trackingNumber: p.trackingNumber })),
      })
      const blob = await pdf(<PreClosurePDF sheet={sheet} />).toBlob()
      const url = URL.createObjectURL(blob)
      // Si el navegador bloquea la ventana nueva, se descarga.
      if (!window.open(url, "_blank")) {
        const a = document.createElement("a")
        a.href = url
        a.download = `PRE-CIERRE--${dispatch.trackingNumber}--${fileStamp()}.pdf`
        a.click()
      }
      setPreClosureAt(new Date().toISOString())
      setLockHighlighted(false)
    } catch {
      toast({ title: "No se pudo generar el pre-cierre", description: "Intenta de nuevo.", variant: "destructive" })
    } finally {
      setGenerating(false)
    }
  }

  // ---- Paso 2: comprobación --------------------------------------------------------------------
  const onFedexChange = (pkg: ClosurePackageVM, option: ManualOption | null) => {
    if (option && needsIncomeWarning(pkg, option, is315) && !changes[changeKey(pkg)]) {
      setPendingWarning({ pkg, option })
      return
    }
    setChanges((prev) => applyChange(prev, pkg, option))
  }
  const onDhlChange = (pkg: ClosurePackageVM, code: string) => setDhlCodes((prev) => ({ ...prev, [pkg.id]: code }))
  const onAllDhlDelivered = () =>
    setDhlCodes((prev) => Object.fromEntries([...dhlVms.map((p) => [p.id, prev[p.id] ?? "OK"])]))

  const addNoVan = async () => {
    const trackings = splitLines(noVanInput).filter((t) => !noVanPackages.some((p) => p.trackingNumber === t))
    if (!trackings.length) return setNoVanInput("")
    setIsValidatingNoVan(true)
    try {
      const results = await validateTrackinNumberNoVan(trackings)
      const valid = results.filter((r) => r.isValid)
      if (valid.length) {
        setNoVanPackages((prev) => [...prev, ...valid])
        setNoVanInput("")
        clearScanBuffer(NOVAN_SCAN_KEY)
      }
      if (results.length - valid.length > 0) {
        toast({ title: "Guías no válidas", description: `${results.length - valid.length} guía(s) no se pudieron validar.`, variant: "destructive" })
      }
    } catch (e) {
      toast({ title: "No se pudieron validar las guías", description: apiError(e, "Revisa tu conexión e intenta de nuevo."), variant: "destructive" })
    } finally {
      setIsValidatingNoVan(false)
    }
  }

  // ---- Navegación ------------------------------------------------------------------------------
  const next = () => {
    if (step === 1 && !preClosureAt) {
      setLockHighlighted(true)
      toast({ title: "Falta el pre-cierre", description: "Genera el pre-cierre antes de pasar a la comprobación.", variant: "destructive" })
      return
    }
    if (step === 2 && dhlPending > 0) {
      toast({ title: "Faltan guías DHL", description: `Confirma las ${dhlPending} guía(s) DHL pendientes.`, variant: "destructive" })
      return
    }
    setStep((s) => Math.min(3, s + 1))
  }
  const back = () => (step === 1 ? router.push("/operaciones/salidas-a-ruta") : setStep((s) => s - 1))

  // ---- Paso 3: cerrar --------------------------------------------------------------------------
  /** Copia del paquete con el estatus con el que cierra (corregido a mano o el del sistema). */
  const withEffective = (vm: ClosurePackageVM): PackageInfo => {
    const info = packageInfos.find((i) => i.id === vm.id && !!i.isCharge === vm.isCharge)!
    const { status, code } = effectiveStatus(vm, changes)
    if (!changes[changeKey(vm)]) return info
    return {
      ...info,
      status: status as PackageInfo["status"],
      exceptionCode: code ?? undefined,
      lastHistory: info.lastHistory ? { ...info.lastHistory, exceptionCode: code ?? "" } : info.lastHistory,
    }
  }

  const closeRoute = async () => {
    if (!dispatch || !user?.subsidiary) {
      toast({ title: "Sesión no válida", description: "Vuelve a iniciar sesión.", variant: "destructive" })
      return
    }
    const kms = Number(actualKms)
    const kmsOut = Number(dispatch.kms || 0)
    if (!actualKms.trim()) return setKmsError("Escribe el kilometraje de llegada.")
    if (kms < kmsOut) return setKmsError(`No puede ser menor al de salida (${kmsOut}).`)
    setKmsError(null)
    if (blockers.length) {
      toast({ title: "Todavía no se puede cerrar", description: blockers[0], variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      const pod: any[] = []
      const returned: any[] = []
      const podInfos: PackageInfo[] = []
      const returnedInfos: PackageInfo[] = []
      for (const vm of fedexVms) {
        const b = effectiveBucket(vm, changes)
        const info = withEffective(vm)
        const entry = { id: vm.id, status: info.status, isCharge: vm.isCharge }
        if (b === "POD") (pod.push(entry), podInfos.push(info))
        else if (b === "DEX") (returned.push(entry), returnedInfos.push({ ...info, isValid: true }))
      }
      for (const vm of dhlVms) {
        const code = dhlCodes[vm.id] ?? "OK"
        const entry = { id: vm.id, code, isCharge: vm.isCharge }
        if (code === "OK") pod.push(entry)
        else returned.push(entry)
      }
      for (const n of noVanPackages) {
        const info: PackageInfo = { id: `novan-${n.trackingNumber}`, trackingNumber: n.trackingNumber, status: n.status as PackageInfo["status"], isCharge: n.isCharge, isValid: true, priority: Priority.BAJA, shipmentType: "FEDEX", recipientName: "Paquete No VAN" }
        const b = classifyClosureBucket(n.status)
        const entry = { id: info.id, status: n.status, isCharge: n.isCharge }
        if (b === "delivered") (pod.push(entry), podInfos.push(info))
        else if (b === "not_delivered") (returned.push(entry), returnedInfos.push(info))
      }

      const payload: RouteClosure = {
        packageDispatch: { id: dispatch.id },
        closeDate: new Date().toISOString(),
        returnedPackages: returned,
        podPackages: pod,
        actualKms,
        subsidiary: user.subsidiary,
        createdBy: user,
        collections,
        noVanPackages: noVanPackages.map((p) => p.trackingNumber),
        manualStatusChanges: toPayload(changes, fedexVms),
        preClosureGeneratedAt: preClosureAt,
      }
      const saved = await save(payload)
      clearScanBuffer(COLLECTIONS_SCAN_KEY)
      clearScanBuffer(NOVAN_SCAN_KEY)
      toast({ title: "Ruta cerrada", description: "El cierre se guardó con sus cambios." })

      // Documentos del correo (igual que el diálogo), con los estatus ya corregidos.
      try {
        if (saved?.id) {
          const driver = dispatch.drivers?.[0]?.name?.toUpperCase() || "SIN_REPARTIDOR"
          const base = `CIERRE--${driver}--${dispatch.subsidiary?.name || "SIN_SUCURSAL"}--Devoluciones--${fileStamp()}`
          const blob = await pdf(
            <RouteClosurePDF returnedPackages={returnedInfos} packageDispatch={dispatch} actualKms={actualKms} collections={collections} podPackages={podInfos} noVanPackages={noVanPackages} />,
          ).toBlob()
          const excel = await generateRouteClosureExcel(returnedInfos, dispatch, actualKms, collections, [], false)
          await uploadFiles(
            new File([blob], `${base}.pdf`, { type: "application/pdf" }),
            new File([new Blob([excel])], `${base}.xlsx`, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
            saved.id,
          )
        }
      } catch {
        toast({ title: "La ruta se cerró, pero falló el correo", description: "Reenvíalo desde Salidas a ruta.", variant: "destructive" })
      }
      router.push("/operaciones/salidas-a-ruta")
    } catch (e) {
      toast({ title: "No se pudo cerrar la ruta", description: apiError(e, "Intenta de nuevo."), variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  // ---- Render ----------------------------------------------------------------------------------
  const changeCount = Object.keys(changes).length
  const printedAt = preClosureAt
    ? new Date(preClosureAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Hermosillo" })
    : null
  const stepCards = [
    { title: "Pre-cierre", detail: printedAt ? `Hoja impresa ${printedAt}` : "Imprimir la hoja del chofer" },
    {
      title: "Comprobación",
      detail: `${changeCount} ${changeCount === 1 ? "cambio" : "cambios"}${dhlVms.length ? ` · ${dhlPending} DHL pendientes` : ""}${
        collections.length ? ` · ${collections.length} recolecc.` : ""
      }`,
    },
    { title: "Finalizar", detail: blockers.length ? `${blockers.length} pendiente(s) para cerrar` : "Kilometraje y cierre" },
  ]
  const folio = dispatch?.trackingNumber ?? ""
  const description = dispatch ? `Salida ${folio} · ${dispatch.drivers?.map((d) => d.name).join(", ") || "Sin chofer"} · Ruta del ${routeDay ?? "—"}` : undefined

  const actions = (
    <div className="flex items-center gap-2">
      {isSuperAdmin && dispatch && (
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label="Paquetes con problema" onClick={() => setDoctorOpen(true)}>
          <Stethoscope className="h-4 w-4" />
        </Button>
      )}
      <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={back} disabled={submitting} aria-label={step === 1 ? "Volver a Salidas a ruta" : "Paso anterior"} title={step === 1 ? "Volver a Salidas a ruta" : "Paso anterior"}>
        <ArrowLeft className="h-4 w-4" />
      </Button>
      {step === 1 && (
        <Button size="sm" variant="outline" onClick={generatePreClosure} disabled={!dispatch || generating}>
          {generating ? <PmySpinner className="mr-1 h-4 w-4" /> : <FileText className="mr-1 h-4 w-4" />}
          {preClosureAt ? "Regenerar pre-cierre" : "Generar pre-cierre"}
        </Button>
      )}
      {step < 3 ? (
        <Button size="sm" onClick={next} disabled={!dispatch}>
          Siguiente <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      ) : (
        <Button size="sm" className="bg-red-900 hover:bg-red-950" onClick={closeRoute} disabled={submitting}>
          {submitting ? <PmySpinner className="mr-1 h-4 w-4" /> : <Lock className="mr-1 h-4 w-4" />} Cerrar ruta
        </Button>
      )}
    </div>
  )

  const notAllowed = dispatch && !dispatch.subsidiary?.routeClosureWithPreClosure
  const alreadyClosed = dispatch?.status === PackageDispatchStatus.COMPLETED

  return (
    <AppLayout>
      <OperationHeader icon={Lock} title="Cierre de ruta" description={description} subsidiaryName={dispatch?.subsidiary?.name} actions={notAllowed || alreadyClosed ? undefined : actions} />
      {isSuperAdmin && dispatch && (
        <ClosureDoctorPanel dispatchId={dispatchId} open={doctorOpen} onOpenChange={setDoctorOpen} onApplied={() => loadPackages().catch(() => undefined)} />
      )}

      {loadingText ? (
        <PmyLoader size="sm" text={loadingText} className="h-64 py-0" />
      ) : loadError || !dispatch ? (
        <Message text="No se pudieron cargar las guías de la ruta." onBack={() => router.push("/operaciones/salidas-a-ruta")} />
      ) : alreadyClosed ? (
        <Message text="Esta salida a ruta ya está cerrada." onBack={() => router.push("/operaciones/salidas-a-ruta")} />
      ) : notAllowed ? (
        <Message text="Esta sucursal usa el cierre de siempre. Ciérrala desde Salidas a ruta." onBack={() => router.push("/operaciones/salidas-a-ruta")} />
      ) : (
        <div className="space-y-5">
          <ClosureStepper steps={stepCards} current={step} onGoTo={setStep} />

          {step === 1 && (
            <StepPreClosure
              packages={vms}
              counts={{ total: vms.length + noVanPackages.length, ...bucketCounts }}
              preClosureAt={preClosureAt}
              otherDueToday={otherDueToday}
              blockedByOther={blockedByOther}
              lockHighlighted={lockHighlighted}
            />
          )}
          {/* El paso 2 se queda montado para no perder los escáneres al ir y volver. */}
          <div className={cn(step !== 2 && "hidden")}>
            <StepVerification
              packages={vms}
              changes={changes}
              dhlCodes={dhlCodes}
              dhlOptions={dhlOptions}
              onFedexChange={onFedexChange}
              onDhlChange={onDhlChange}
              onAllDhlDelivered={onAllDhlDelivered}
              collections={collections}
              onCollectionsChange={setCollectionsRaw}
              noVanInput={noVanInput}
              onNoVanInputChange={setNoVanInput}
              noVanPackages={noVanPackages}
              onAddNoVan={addNoVan}
              onRemoveNoVan={(tn) => setNoVanPackages((prev) => prev.filter((p) => p.trackingNumber !== tn))}
              isValidatingNoVan={isValidatingNoVan}
            />
          </div>
          {step === 3 && (
            <StepFinish
              packages={fedexVms}
              changes={changes}
              kmsOut={dispatch.kms ?? ""}
              actualKms={actualKms}
              onKmsChange={(v) => (setActualKms(v), setKmsError(null))}
              kmsError={kmsError}
              counts={{ ...bucketCounts, collections: collections.length, noVan: noVanPackages.length }}
              blockers={blockers}
            />
          )}
        </div>
      )}

      <AlertDialog open={!!pendingWarning} onOpenChange={(o) => !o && setPendingWarning(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Esta guía ya tiene un ingreso</AlertDialogTitle>
            <AlertDialogDescription>
              La guía {pendingWarning?.pkg.trackingNumber} ya tiene un ingreso generado como entregada. Si continúas, al cerrar la ruta ese ingreso se anula.
              ¿Realmente quieres cambiarla?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Dejarla como entregada</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingWarning) setChanges((prev) => applyChange(prev, pendingWarning.pkg, pendingWarning.option))
                setPendingWarning(null)
              }}
            >
              Sí, cambiarla
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  )
}

function Message({ text, onBack }: { text: string; onBack: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <XCircle className="h-10 w-10 text-slate-400" />
      <p className="text-sm text-slate-600">{text}</p>
      <Button size="sm" variant="outline" onClick={onBack}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Volver a Salidas a ruta
      </Button>
    </div>
  )
}
