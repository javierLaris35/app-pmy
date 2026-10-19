"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  AlertCircle,
  Building2,
  Check,
  Copy,
  CalendarClock,
  ClipboardList,
  Diamond,
  FilePlus2,
  Globe,
  Layers,
  Loader2,
  Package,
  PackageSearch,
  Phone,
  Receipt,
  Route,
  Search,
  Truck,
  Undo2,
  User,
  Warehouse,
  Wallet,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getPackageDossier } from "@/lib/services/package-dossier"
import type {
  DossierEventTone,
  DossierInternalKind,
  DossierRecord,
  PackageDossier,
} from "@/lib/types/package-dossier"
import {
  carrierLabel,
  formatDay,
  formatInstant,
  formatMoney,
  formatPhone,
  groupByPiece,
  overdueDays,
  statusLabel,
} from "@/lib/package-dossier"

const TONE_BADGE: Record<DossierEventTone, string> = {
  neutral: "bg-slate-100 text-slate-700 hover:bg-slate-100",
  info: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  success: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  warning: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  danger: "bg-red-100 text-red-800 hover:bg-red-100",
}

const statusTone = (status: string): DossierEventTone => {
  const s = status.toLowerCase()
  if (s.includes("devuelto") || s.includes("rechazado") || s.includes("no_entregado")) return "danger"
  if (s.includes("entregado")) return "success"
  if (s.includes("ruta")) return "info"
  if (s === "pendiente" || s.includes("bodega")) return "neutral"
  return "warning"
}

const INTERNAL_ICON: Record<DossierInternalKind, typeof Package> = {
  registro: FilePlus2,
  desembarque: Warehouse,
  salida_ruta: Route,
  ingreso: Receipt,
  inventario: ClipboardList,
  devolucion: Undo2,
}

/** Los 6 movimientos internos; los que no han pasado se muestran en gris. */
const INTERNAL_STEPS: { kind: DossierInternalKind; label: string }[] = [
  { kind: "registro", label: "Registro en el sistema" },
  { kind: "desembarque", label: "Desembarque" },
  { kind: "salida_ruta", label: "Salida a ruta" },
  { kind: "ingreso", label: "Ingreso" },
  { kind: "inventario", label: "Inventario" },
  { kind: "devolucion", label: "Devolución" },
]

export function PackageDossierView() {
  const [search, setSearch] = useState("")
  const [dossier, setDossier] = useState<PackageDossier | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pieceKey, setPieceKey] = useState<string | null>(null)
  const [recordId, setRecordId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Cada búsqueda o cambio de pieza/registro arranca el expediente desde arriba.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [dossier, pieceKey, recordId])

  useEffect(() => {
    const q = search.trim()
    if (q.length < 5) {
      setDossier(null)
      setError(null)
      return
    }
    let cancelled = false
    const handler = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getPackageDossier(q)
        if (cancelled) return
        setDossier(data)
        setPieceKey(data.selectedPieceKey)
        setRecordId(null)
      } catch {
        if (!cancelled) {
          setDossier(null)
          setError("No pudimos consultar la guía. Intenta de nuevo en un momento.")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 500)
    return () => {
      cancelled = true
      clearTimeout(handler)
    }
  }, [search])

  const pieces = useMemo(() => groupByPiece(dossier?.records ?? []), [dossier])
  const currentPiece = pieces.find((p) => p.key === pieceKey) ?? pieces[0]
  const pieceRecords = currentPiece?.records ?? []
  const record = pieceRecords.find((r) => r.id === recordId) ?? pieceRecords[0]
  const isDhlMulti = pieces.length > 1 && pieces.some((p) => p.records[0]?.dhlUniqueId)

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-slate-100 bg-white shrink-0 relative">
        <Search className="absolute left-7 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
        <Input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Guía FedEx, guía DHL o JD de la pieza"
          className="pl-12 h-12 text-base bg-slate-50 border-transparent focus-visible:bg-white transition-all"
        />
        {/* El centrado va en el contenedor: animate-spin usa transform y pisaría el -translate-y del ícono. */}
        {loading && (
          <span className="absolute right-7 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </span>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-slate-50 p-4">
        {error ? (
          <EmptyState icon={AlertCircle} text={error} />
        ) : !dossier ? (
          <EmptyState icon={Search} text="Escribe una guía o un JD para ver su expediente completo" />
        ) : dossier.records.length === 0 ? (
          <EmptyState icon={PackageSearch} text={`No encontramos la guía ${dossier.query} en el sistema`} />
        ) : (
          <div className="space-y-3">
            {dossier.matchedBy === "dhlPiece" && pieces.length > 1 && (
              <p className="text-xs text-slate-600">
                Se encontró como pieza DHL de la guía {record?.trackingNumber} ({pieces.length} piezas). Mostrando esta pieza.
              </p>
            )}

            {isDhlMulti && dossier.matchedBy !== "dhlPiece" && (
              <p className="text-xs text-slate-600">La guía DHL tiene {pieces.length} piezas. Elige cuál ver.</p>
            )}

            {isDhlMulti && (
              <div className="flex flex-wrap gap-1.5">
                {pieces.map((p) => (
                  <Button
                    key={p.key}
                    size="sm"
                    variant={p.key === currentPiece?.key ? "default" : "outline"}
                    className="h-7 px-2.5 font-mono text-xs"
                    onClick={() => {
                      setPieceKey(p.key)
                      setRecordId(null)
                    }}
                  >
                    {p.key} · {statusLabel(p.records[0]?.status)}
                  </Button>
                ))}
              </div>
            )}

            {pieceRecords.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {pieceRecords.map((r, i) => (
                  <Button
                    key={r.id}
                    size="sm"
                    variant={r.id === record?.id ? "default" : "outline"}
                    className="h-7 px-2.5 text-xs"
                    onClick={() => setRecordId(r.id)}
                  >
                    Registro {i + 1} de {pieceRecords.length} · {formatInstant(r.createdAt)?.split(",")[0]} ·{" "}
                    {r.kind === "charge" ? "carga" : "paquete"}
                    {i === 0 ? " · actual" : ` · ${statusLabel(r.status)}`}
                    {!r.active && " · dado de baja"}
                  </Button>
                ))}
              </div>
            )}

            {record && <RecordDossier record={record} />}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ icon: Icon, text }: { icon: typeof Search; text: string }) {
  return (
    <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-slate-400 gap-4">
      <div className="bg-white p-4 rounded-full border border-slate-100">
        <Icon className="h-10 w-10 text-slate-300" />
      </div>
      <p className="text-sm font-medium text-center">{text}</p>
    </div>
  )
}

function RecordDossier({ record }: { record: DossierRecord }) {
  const overdue = overdueDays(record)
  const isDhl = record.carrier?.toLowerCase() === "dhl"
  const activeIncomes = record.incomes.filter((i) => i.active)
  const incomeTotal = activeIncomes.reduce((acc, i) => acc + i.cost, 0)

  return (
    <div className="space-y-3">
      {/* Encabezado */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {record.dhlUniqueId && (
              <p className="text-xs text-slate-500">Guía DHL {record.trackingNumber}</p>
            )}
            <h3 className="text-2xl font-bold tracking-tight text-slate-900 font-mono break-all">
              {record.dhlUniqueId || record.trackingNumber}
            </h3>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Badge className={isDhl ? "bg-amber-100 text-amber-800 hover:bg-amber-100" : "bg-violet-100 text-violet-800 hover:bg-violet-100"}>
                {carrierLabel(record.carrier)}
              </Badge>
              {record.kind === "charge" ? (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                  Tipo: carga F2{record.charge?.isHalfTon ? " · 1.5 ton" : ""}
                </Badge>
              ) : (
                <Badge variant="outline">Tipo: paquete</Badge>
              )}
              {record.isHighValue && (
                <Badge className="bg-red-100 text-red-800 hover:bg-red-100 gap-1">
                  <Diamond className="h-3 w-3" /> Alto valor
                </Badge>
              )}
              {record.priority === "alta" && <Badge variant="outline">Prioridad alta</Badge>}
              {record.subsidiary && (
                <Badge variant="outline" className="gap-1">
                  <Building2 className="h-3 w-3" /> {record.subsidiary.name}
                </Badge>
              )}
              {!record.active && <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Dado de baja</Badge>}
            </div>
          </div>
          <div className="text-right space-y-1.5">
            <Badge className={cn("text-sm px-3 py-1", TONE_BADGE[statusTone(record.status)])}>
              {statusLabel(record.status)}
            </Badge>
            <p className="text-xs text-slate-600 flex items-center justify-end gap-1">
              <CalendarClock className="h-3.5 w-3.5" />
              Vence {formatInstant(record.commitDateTime) ?? "sin fecha"}
            </p>
            {overdue !== null && (
              <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                {overdue === 0 ? "Vencida hoy" : `Vencida hace ${overdue} ${overdue === 1 ? "día" : "días"}`}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Datos clave */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <InfoCard icon={CalendarClock} label="Llegó">
          <Value>{formatInstant(record.createdAt) ?? "—"}</Value>
          <Sub>Alta: {record.createdBy ?? "sin registro"}</Sub>
        </InfoCard>

        {record.kind === "charge" ? (
          <InfoCard icon={Layers} label="Carga">
            <Value mono>{record.charge?.consNumber ?? "—"}</Value>
            <Sub>
              {[formatDay(record.charge?.day), record.charge && `${record.charge.numberOfPackages} guías`, record.charge?.createdBy]
                .filter(Boolean)
                .join(" · ") || "Sin datos de la carga"}
            </Sub>
          </InfoCard>
        ) : (
          <InfoCard icon={Layers} label="Consolidado">
            <Value mono>{record.consolidated?.consNumber ?? "Sin consolidado"}</Value>
            {record.consolidated && (
              <Sub>
                {[statusLabel(record.consolidated.type), formatDay(record.consolidated.day), `${record.consolidated.numberOfPackages} guías`]
                  .filter(Boolean)
                  .join(" · ")}
              </Sub>
            )}
          </InfoCard>
        )}

        <InfoCard icon={Warehouse} label="Desembarque">
          <Value mono>{record.unloading?.folio ?? "Sin desembarque"}</Value>
          {record.unloading && (
            <Sub>{[formatInstant(record.unloading.date), record.unloading.createdBy].filter(Boolean).join(" · ")}</Sub>
          )}
        </InfoCard>

        <InfoCard icon={Wallet} label="Cobro">
          {record.payment && record.payment.amount > 0 ? (
            <>
              <Value>{formatMoney(record.payment.amount)}</Value>
              <Sub>
                {record.payment.type} · {record.payment.status === "paid" ? "pagado" : "por cobrar"}
              </Sub>
            </>
          ) : (
            <Value muted>Sin cobro</Value>
          )}
        </InfoCard>

        <InfoCard icon={Receipt} label="Ingreso">
          {record.incomes.length ? (
            <>
              <Value>{formatMoney(incomeTotal)}</Value>
              <Sub>
                {activeIncomes.length
                  ? activeIncomes.map((i) => formatDay(i.day)).join(", ")
                  : "Todos los ingresos están anulados"}
                {record.incomes.some((i) => i.isGrouped) && " · agrupado por carga"}
              </Sub>
            </>
          ) : (
            <>
              <Value muted>Sin ingreso aún</Value>
              <Sub>Se genera al cerrar la ruta</Sub>
            </>
          )}
        </InfoCard>

        <InfoCard icon={User} label="Destinatario" action={<RecipientPhone phone={record.recipient.phone} />}>
          <Value>{record.recipient.name ?? "Sin nombre"}</Value>
          <Sub>
            {[record.recipient.zip && `CP ${record.recipient.zip}`, record.recipient.city]
              .filter(Boolean)
              .join(" · ") || "Sin datos de contacto"}
          </Sub>
          {record.recipient.address && <Sub>{record.recipient.address}</Sub>}
          {record.receivedByName && <Sub>Recibió: {record.receivedByName}</Sub>}
        </InfoCard>
      </div>

      {/* Historiales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-2">
            <Warehouse className="h-4 w-4 text-primary" /> Movimientos internos
          </h4>
          <div className="divide-y divide-slate-100">
            {record.internalEvents.map((e, i) => {
              const Icon = INTERNAL_ICON[e.kind]
              return (
                <div key={i} className="grid grid-cols-[20px_minmax(0,1fr)_auto] gap-2 py-2">
                  <Icon className="h-4 w-4 text-slate-500 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{e.title}</p>
                    {e.detail && <p className="text-xs text-slate-600 break-words">{e.detail}</p>}
                    {e.tag && <Badge className={cn("mt-1 text-[11px]", TONE_BADGE[e.tone])}>{e.tag}</Badge>}
                  </div>
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {e.day ? formatDay(e.day) : formatInstant(e.date) ?? "Sin fecha"}
                  </span>
                </div>
              )
            })}
            {INTERNAL_STEPS.filter((s) => !record.internalEvents.some((e) => e.kind === s.kind)).map((s) => {
              const Icon = INTERNAL_ICON[s.kind]
              return (
                <div key={s.kind} className="grid grid-cols-[20px_minmax(0,1fr)_auto] gap-2 py-2 text-slate-400">
                  <Icon className="h-4 w-4 mt-0.5" />
                  <div>
                    <p className="text-sm">{s.kind === "devolucion" ? `Devolución a ${carrierLabel(record.carrier)}` : s.label}</p>
                    <p className="text-xs">{s.kind === "devolucion" ? "No aplica" : "Pendiente"}</p>
                  </div>
                  <span className="text-xs">—</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-2">
            <Globe className="h-4 w-4 text-primary" /> Historial {carrierLabel(record.carrier)}
          </h4>
          {record.carrierEvents.length ? (
            <div className="divide-y divide-slate-100">
              {record.carrierEvents.map((e, i) => (
                <div key={i} className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2 py-2 items-start">
                  <Badge variant="outline" className={cn("font-mono text-[11px] min-w-9 justify-center", e.code && "border-amber-300 bg-amber-50 text-amber-800")}>
                    {e.code ?? "—"}
                  </Badge>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-900">{statusLabel(e.status)}</p>
                    {e.description && <p className="text-xs text-slate-600 break-words">{e.description}</p>}
                  </div>
                  <span className="text-xs text-slate-500 whitespace-nowrap">{formatInstant(e.date) ?? "Sin fecha"}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 py-2">Todavía no hay eventos de {carrierLabel(record.carrier)} para esta guía.</p>
          )}
        </div>
      </div>
    </div>
  )
}

/** Teléfono del destinatario (esquina de su tarjeta): es de lo que más se busca. Se puede marcar o copiar. */
function RecipientPhone({ phone }: { phone: string | null }) {
  const [copied, setCopied] = useState(false)
  const pretty = formatPhone(phone)
  if (!pretty) {
    return <span className="text-xs text-slate-400">Sin teléfono</span>
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText((phone ?? "").replace(/\D/g, "") || pretty)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <a
        href={`tel:${(phone ?? "").replace(/[^\d+]/g, "")}`}
        className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-2 py-0.5 text-primary hover:bg-primary/10 transition-colors"
      >
        <Phone className="h-3.5 w-3.5" />
        <span className="text-sm font-bold tracking-wide whitespace-nowrap">{pretty}</span>
      </a>
      <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={copy} aria-label="Copiar teléfono">
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  )
}

function InfoCard({
  icon: Icon,
  label,
  action,
  children,
}: {
  icon: typeof Truck
  label: string
  /** Algo a la vista en la esquina superior derecha (p. ej. el teléfono del destinatario). */
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-3 py-2.5 min-w-0">
      <div className="flex items-start justify-between gap-2 mb-0.5">
        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5" /> {label}
        </p>
        {action}
      </div>
      {children}
    </div>
  )
}

const Value = ({ children, mono, muted }: { children: React.ReactNode; mono?: boolean; muted?: boolean }) => (
  <p className={cn("text-sm font-semibold break-all", mono && "font-mono", muted ? "text-slate-400 font-medium" : "text-slate-900")}>{children}</p>
)

const Sub = ({ children }: { children: React.ReactNode }) => <p className="text-xs text-slate-600 break-words">{children}</p>
