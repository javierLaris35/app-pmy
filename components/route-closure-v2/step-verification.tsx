"use client"

import { useMemo, useState } from "react"
import { CheckCheck, X } from "lucide-react"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { UnderlineTabsList, UnderlineTabsTrigger } from "@/components/ui/underline-tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table/data-table"
import { ScanInput } from "@/components/scanner/scan-input"
import { PmySpinner } from "@/components/ui/pmy-loader"
import { cn } from "@/lib/utils"
import type { CatalogItem } from "@/lib/services/catalog"
import type { ClosurePackageVM } from "@/lib/services/route-closure/pre-closure-sheet"
import type { ManualOption, NoVanPackageDetail } from "@/lib/types"
import type { ClosureChanges } from "./closure-changes"
import { systemStatusLabel, toVerificationRows, verificationColumns, type VerificationRow } from "./verification-columns"

export const COLLECTIONS_SCAN_KEY = "scan:dispatch-close-v2-collections"
export const NOVAN_SCAN_KEY = "scan:dispatch-close-v2-novan"

type Tab = "Todos" | "POD" | "DEX" | "Ocurre" | "Otros" | "Recolecciones" | "NoVan"

interface Props {
  packages: ClosurePackageVM[]
  changes: ClosureChanges
  dhlCodes: Record<string, string>
  dhlOptions: CatalogItem[]
  onFedexChange: (pkg: ClosurePackageVM, option: ManualOption | null) => void
  onDhlChange: (pkg: ClosurePackageVM, code: string) => void
  onAllDhlDelivered: () => void
  collections: string[]
  onCollectionsChange: (raw: string) => void
  noVanInput: string
  onNoVanInputChange: (raw: string) => void
  noVanPackages: NoVanPackageDetail[]
  onAddNoVan: () => void
  onRemoveNoVan: (trackingNumber: string) => void
  isValidatingNoVan: boolean
}

export function StepVerification(props: Props) {
  const { packages, changes, dhlCodes } = props
  const [tab, setTab] = useState<Tab>("Todos")
  const [onlyChanged, setOnlyChanged] = useState(false)

  const rows = useMemo(() => toVerificationRows(packages, changes, dhlCodes), [packages, changes, dhlCodes])
  const count = (b: string) => rows.filter((r) => r.bucket === b).length
  const changedCount = rows.filter((r) => r.changed).length
  const dhlPending = rows.filter((r) => r.carrier === "DHL" && !dhlCodes[r.id]).length
  const hasDhl = rows.some((r) => r.carrier === "DHL")

  const visible = rows.filter((r) => (tab === "Todos" || r.bucket === tab) && (!onlyChanged || r.changed))

  const columns = useMemo(
    () =>
      verificationColumns({
        changes,
        dhlCodes,
        dhlOptions: props.dhlOptions,
        onFedexChange: props.onFedexChange,
        onDhlChange: props.onDhlChange,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [changes, dhlCodes, props.dhlOptions],
  )

  const filterOptions = (values: string[]) => [...new Set(values)].sort().map((v) => ({ label: v, value: v }))
  const filters = [
    { columnId: "carrier", title: "Paquetería", options: filterOptions(rows.map((r) => r.carrier)) },
    { columnId: "systemLabel", title: "Estatus", options: filterOptions(rows.map((r) => systemStatusLabel(r.systemStatus, r.systemCode))) },
    { columnId: "ldSignals", title: "Riesgo de LD", options: ["Sin movimiento", "Vence hoy", "Posible LD", "LD"].map((v) => ({ label: v, value: v })) },
  ]

  const isTable = !["Recolecciones", "NoVan"].includes(tab)

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="gap-4">
      <UnderlineTabsList>
        <UnderlineTabsTrigger value="Todos" size="sm" count={rows.length} tone="sky">Todos</UnderlineTabsTrigger>
        <UnderlineTabsTrigger value="POD" size="sm" count={count("POD")} tone="sky">POD</UnderlineTabsTrigger>
        <UnderlineTabsTrigger value="DEX" size="sm" count={count("DEX")}>DEX</UnderlineTabsTrigger>
        <UnderlineTabsTrigger value="Ocurre" size="sm" count={count("Ocurre")} tone="sky">Ocurre</UnderlineTabsTrigger>
        <UnderlineTabsTrigger value="Otros" size="sm" count={count("Otros")} tone="amber">Otros</UnderlineTabsTrigger>
        {/* Recolecciones y No VAN no son estatus: otra captura, separada con una línea. */}
        <span className="mx-1 h-5 self-center border-l border-slate-300" aria-hidden />
        <UnderlineTabsTrigger value="Recolecciones" size="sm" count={props.collections.length} tone="sky">Recolecciones</UnderlineTabsTrigger>
        <UnderlineTabsTrigger value="NoVan" size="sm" count={props.noVanPackages.length} tone="sky">No VAN</UnderlineTabsTrigger>
      </UnderlineTabsList>

      {isTable && (
        <div className="space-y-2">
          <div className="mt-4 rounded-xl border bg-slate-50/70 p-3">
          <DataTable<VerificationRow, unknown>
            toolbarExtra={
              <>
                {hasDhl && dhlPending > 0 && (
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={props.onAllDhlDelivered}>
                    <CheckCheck className="mr-1 h-3.5 w-3.5" /> DHL pendientes como entregados ({dhlPending})
                  </Button>
                )}
                <Button size="sm" variant={onlyChanged ? "default" : "outline"} className="h-8 text-xs" onClick={() => setOnlyChanged((v) => !v)}>
                  Solo cambiadas
                </Button>
                <Badge variant="outline" className={cn("h-8 px-2.5 text-xs", changedCount ? "border-amber-300 bg-amber-50 text-amber-800" : "bg-white text-slate-500")}>
                  {changedCount} {changedCount === 1 ? "cambio" : "cambios"}
                </Badge>
              </>
            }
            columns={columns}
            data={visible}
            filters={filters}
            searchPlaceholder="Buscar guía o destinatario…"
            rowClassName={(r) => (r.changed ? "bg-amber-50 hover:bg-amber-100/70" : r.carrier === "DHL" && !dhlCodes[r.id] ? "bg-orange-50/40" : undefined)}
            autoResetPageIndex={false}
            initialPageSize={50}
            hideSelectionCount
            dense
          />
          </div>
          <p className="text-xs text-slate-500">
            Cambia el estatus según lo que diga el chofer: la guía se pinta en amarillo y se mueve de pestaña. Nada se guarda hasta cerrar la ruta.
          </p>
        </div>
      )}

      <TabsContent value="Recolecciones" className="mt-4">
        <div className="grid gap-4 md:grid-cols-2">
          <ScanInput storageKey={COLLECTIONS_SCAN_KEY} defaultView="simple" onTrackingNumbersChange={props.onCollectionsChange} placeholder="Escanea guías recolectadas…" />
          <div className="rounded-lg border">
            <p className="border-b px-3 py-2 text-xs font-medium text-slate-500">{props.collections.length} recolección(es)</p>
            <div className="max-h-[360px] divide-y overflow-auto">
              {props.collections.map((tn) => (
                <p key={tn} className="px-3 py-1.5 font-mono text-xs">{tn}</p>
              ))}
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="NoVan" className="mt-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <ScanInput
              storageKey={NOVAN_SCAN_KEY}
              defaultView="simple"
              onTrackingNumbersChange={props.onNoVanInputChange}
              placeholder="Escanea guías que no venían en la salida…"
              disabled={props.isValidatingNoVan}
            />
            <Button className="w-full" onClick={props.onAddNoVan} disabled={!props.noVanInput.trim() || props.isValidatingNoVan}>
              {props.isValidatingNoVan ? <PmySpinner className="mr-2 h-4 w-4" /> : null}
              Validar y agregar
            </Button>
          </div>
          <div className="rounded-lg border">
            <p className="border-b px-3 py-2 text-xs font-medium text-slate-500">{props.noVanPackages.length} guía(s) No VAN</p>
            <div className="max-h-[360px] divide-y overflow-auto">
              {props.noVanPackages.map((p) => (
                <div key={p.trackingNumber} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                  <span className="flex-1 font-mono">{p.trackingNumber}</span>
                  <span className="text-slate-500">{systemStatusLabel(p.status, null)}</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Quitar" onClick={() => props.onRemoveNoVan(p.trackingNumber)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}
