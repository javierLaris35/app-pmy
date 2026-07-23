"use client";

import { useEffect, useState } from "react";
import { Eye, FileSpreadsheet, FileText, History, Package, Undo2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WeekRangePicker } from "@/components/shared/week-range-picker";
import { getWeekRange, WeekRange } from "@/lib/week";
import {
  downloadWarehouseFile,
  getInboundHistory,
  getOutboundHistory,
  rollbackWarehouseOperation,
} from "@/lib/services/warehouse/warehouse";
import { OperationDetailsDialog } from "@/components/warehouse/shared/operation-details-dialog";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const SUPER_ROLES = ["superadmin", "superamin"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: "inbound" | "outbound";
  subsidiaryId?: string | null;
  subsidiaryName?: string | null;
}

/** Historial paginado de entradas/salidas de bodega (semana + paginado). */
export function WarehouseHistoryDialog({ open, onOpenChange, kind, subsidiaryId, subsidiaryName }: Props) {
  const [week, setWeek] = useState<WeekRange>(() => getWeekRange());
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const limit = 50;

  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = SUPER_ROLES.includes((user?.role || "").toString().toLowerCase());
  const [reloadKey, setReloadKey] = useState(0);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleDownload = async (id: string, fileKind: "pdf" | "excel") => {
    try {
      setBusyId(id);
      await downloadWarehouseFile(kind, id, fileKind);
    } catch {
      toast({ title: "Error al generar", description: "No se pudo generar el archivo.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const handleRollback = async (id: string) => {
    if (!window.confirm("¿Revertir esta operación? Regresará los paquetes a su estado anterior. La acción queda registrada.")) return;
    try {
      setBusyId(id);
      const res = await rollbackWarehouseOperation(kind, id);
      const skipped = res?.skipped?.length ?? 0;
      toast({
        title: "Operación revertida",
        description: `${res?.reverted ?? 0} paquete(s) revertido(s)${skipped ? `, ${skipped} omitido(s) porque ya avanzaron.` : "."}`,
      });
      setReloadKey((k) => k + 1);
    } catch (e: any) {
      toast({ title: "No se pudo revertir", description: e?.response?.data?.message ?? "Error en el servidor.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  useEffect(() => {
    if (open) setPage(1);
  }, [open, week.from, week.to]);

  useEffect(() => {
    if (!open || !subsidiaryId) return;
    let cancelled = false;
    setIsLoading(true);
    setIsError(false);
    const fetcher = kind === "inbound" ? getInboundHistory : getOutboundHistory;
    fetcher(subsidiaryId, { page, limit, from: week.from, to: week.to })
      .then((res) => {
        if (cancelled) return;
        setRows(res.data ?? []);
        setTotal(res.total ?? 0);
        setTotalPages(res.totalPages ?? 1);
      })
      .catch(() => !cancelled && setIsError(true))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, subsidiaryId, kind, page, week.from, week.to, reloadKey]);

  const isOutbound = kind === "outbound";
  const title = isOutbound ? "Historial de salidas" : "Historial de entradas";

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {subsidiaryName ? `${subsidiaryName} · ` : ""}semana seleccionada
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-sm text-muted-foreground">{total} registro(s)</span>
          <WeekRangePicker value={week} onChange={setWeek} disabled={isLoading} />
        </div>

        <div className="flex-1 overflow-y-auto rounded-md border">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : isError ? (
            <div className="flex h-40 items-center justify-center text-red-600 text-sm">Error al cargar el historial</div>
          ) : rows.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-muted-foreground">
              <Package className="h-8 w-8 opacity-40 mb-2" />
              <p className="text-sm">Sin registros en la semana seleccionada</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60 backdrop-blur-sm text-left">
                <tr className="border-b">
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  {isOutbound && <th className="px-3 py-2 font-medium">Tipo</th>}
                  {isOutbound && <th className="px-3 py-2 font-medium">Destino / Rutas</th>}
                  <th className="px-3 py-2 font-medium">Vehículo</th>
                  <th className="px-3 py-2 font-medium">Chofer</th>
                  <th className="px-3 py-2 font-medium text-right">Paq. / Pzas.</th>
                  <th className="px-3 py-2 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.id} className={cn("hover:bg-muted/30", r.rolledBack && "opacity-60")}>
                    <td className="px-3 py-2 text-muted-foreground">
                      {r.createdAt ? new Date(r.createdAt).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                    {isOutbound && (
                      <td className="px-3 py-2">
                        <Badge variant="secondary" className={cn("text-[11px]", r.type === "transfer" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700")}>
                          {r.type === "transfer" ? "Traspaso" : "Salida a ruta"}
                        </Badge>
                      </td>
                    )}
                    {isOutbound && (
                      <td className="px-3 py-2 truncate max-w-[220px]">{r.destinationName || r.routeNames || "—"}</td>
                    )}
                    <td className="px-3 py-2 truncate max-w-[140px]">{r.vehicleName || "—"}</td>
                    <td className="px-3 py-2 truncate max-w-[160px]">{r.driverNames || "—"}</td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">
                      {r.totalPackages}
                      <span className="text-muted-foreground"> / {r.totalPieces}</span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {r.rolledBack && (
                          <Badge variant="secondary" className="mr-1 text-[11px] bg-red-100 text-red-700">Revertido</Badge>
                        )}
                        <Button variant="ghost" size="icon" title="Ver detalles" className="h-8 w-8" disabled={busyId === r.id} onClick={() => setDetailsId(r.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!r.rolledBack && (
                          <>
                            <Button variant="ghost" size="icon" title="Regenerar Excel" className="h-8 w-8 text-green-700" disabled={busyId === r.id} onClick={() => handleDownload(r.id, "excel")}>
                              <FileSpreadsheet className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Regenerar PDF" className="h-8 w-8" disabled={busyId === r.id} onClick={() => handleDownload(r.id, "pdf")}>
                              <FileText className="h-4 w-4" />
                            </Button>
                            {isSuperAdmin && (
                              <Button variant="ghost" size="icon" title="Rollback (revertir)" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" disabled={busyId === r.id} onClick={() => handleRollback(r.id)}>
                                <Undo2 className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1 || isLoading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages || isLoading} onClick={() => setPage((p) => p + 1)}>
              Siguiente
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <OperationDetailsDialog
      open={!!detailsId}
      onOpenChange={(v) => !v && setDetailsId(null)}
      opKind={kind}
      operationId={detailsId}
    />
    </>
  );
}
