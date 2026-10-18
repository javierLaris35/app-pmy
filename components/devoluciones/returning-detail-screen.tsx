"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRightLeft, FileSpreadsheet, FileText, Loader2, Package, RotateCcw } from "lucide-react"
import { AppLayout } from "@/components/app-layout"
import { OperationHeader } from "@/components/shared/operation-header"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "@/lib/toast"
import { EmailStatus } from "@/lib/types"
import { getReturningDetail, ReturningBatchDetail } from "@/lib/services/returning"
import { downloadReturningExcel, downloadReturningPdf } from "@/lib/services/returning/download-files"
import { ReturningDevolutionsTable } from "./returning-devolutions-table"
import { UndoDevolutionDialog } from "./undo-devolution-dialog"

function formatDate(value?: string) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" })
}

/**
 * Detalle de una salida de devoluciones y recolecciones, en pantalla propia (antes era un diálogo
 * y "Deshacer" abría un segundo diálogo encima sin espacio). Desde aquí se pide deshacer una
 * devolución, que sí abre su diálogo.
 */
export default function ReturningDetailScreen({ id }: { id: string }) {
  const [detail, setDetail] = useState<ReturningBatchDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [undoTarget, setUndoTarget] = useState<{ id: string; trackingNumber: string } | null>(null)
  const [downloading, setDownloading] = useState<"pdf" | "excel" | null>(null)

  const load = useCallback(async () => {
    setError(null)
    if (!id) {
      setError("No se indicó qué salida abrir. Regresa a la lista y elígela de nuevo.")
      setLoading(false)
      return
    }
    try {
      setDetail(await getReturningDetail(id))
    } catch (e: any) {
      setError(e?.response?.data?.message || "No se pudo cargar la salida. Intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const download = async (kind: "pdf" | "excel") => {
    setDownloading(kind)
    try {
      if (kind === "pdf") await downloadReturningPdf(id)
      else await downloadReturningExcel(id)
    } catch (e: any) {
      toast.error(e?.message || `No se pudo descargar el ${kind === "pdf" ? "PDF" : "Excel"}`)
    } finally {
      setDownloading(null)
    }
  }

  const alreadySent = detail?.emailStatus === EmailStatus.SENT

  return (
    <AppLayout>
      <OperationHeader
        icon={ArrowRightLeft}
        title={detail ? `Salida ${detail.trackingNumber}` : "Salida"}
        description={detail ? `Devoluciones y recolecciones del ${formatDate(detail.date)}` : "Cargando…"}
        subsidiaryName={detail?.subsidiary?.name ?? null}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/operaciones/devoluciones">
                <ArrowLeft className="mr-1 h-4 w-4" /> Volver
              </Link>
            </Button>
            {alreadySent && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => download("pdf")} disabled={!!downloading} aria-label="Descargar PDF">
                      {downloading === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Descargar PDF</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => download("excel")} disabled={!!downloading} aria-label="Descargar Excel">
                      {downloading === "excel" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Descargar Excel</TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        }
      />

      {loading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando salida…
        </div>
      ) : error ? (
        <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : detail ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-lg border bg-card px-4 py-2.5 text-sm">
            <span>
              <span className="text-muted-foreground">Fecha:</span> <span className="font-medium">{formatDate(detail.date)}</span>
            </span>
            <span>
              <span className="text-muted-foreground">Sucursal:</span> <span className="font-medium">{detail.subsidiary?.name ?? "—"}</span>
            </span>
            <span>
              <span className="text-muted-foreground">Chofer(es):</span>{" "}
              <span className="font-medium">{detail.drivers?.map((d) => d.name).join(", ") || "—"}</span>
            </span>
            <span>
              <span className="text-muted-foreground">Unidad:</span>{" "}
              <span className="font-medium">{detail.vehicle?.name || detail.vehicle?.code || detail.vehicle?.plateNumber || "—"}</span>
            </span>
          </div>

          <Tabs defaultValue="devoluciones">
            <TabsList>
              <TabsTrigger value="devoluciones" className="gap-1.5">
                <RotateCcw className="h-4 w-4" /> Devoluciones ({detail.devolutions.length})
              </TabsTrigger>
              <TabsTrigger value="recolecciones" className="gap-1.5">
                <Package className="h-4 w-4" /> Recolecciones ({detail.collections.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="devoluciones" className="mt-3">
              <ReturningDevolutionsTable devolutions={detail.devolutions} onUndo={setUndoTarget} />
            </TabsContent>

            <TabsContent value="recolecciones" className="mt-3">
              <div className="overflow-x-auto rounded-lg border">
                <Table className="text-[13px]">
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="h-8 px-3">Guía</TableHead>
                      <TableHead className="h-8 px-3">Estatus</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.collections.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="px-3 py-6 text-center text-muted-foreground">
                          Sin recolecciones.
                        </TableCell>
                      </TableRow>
                    ) : (
                      detail.collections.map((c) => (
                        <TableRow key={c.trackingNumber}>
                          <TableCell className="px-3 py-1.5 font-mono">{c.trackingNumber}</TableCell>
                          <TableCell className="px-3 py-1.5">{c.isPickUp ? "Pick Up" : c.status || "—"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      ) : null}

      {undoTarget && (
        <UndoDevolutionDialog
          open={!!undoTarget}
          onOpenChange={(o) => !o && setUndoTarget(null)}
          devolutionId={undoTarget.id}
          trackingNumber={undoTarget.trackingNumber}
          onRequested={load}
        />
      )}
    </AppLayout>
  )
}
