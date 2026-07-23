"use client";

import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { getWarehouseOperationDetails, type WarehouseOpKind } from "@/lib/services/warehouse/warehouse";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opKind: WarehouseOpKind;
  operationId: string | null;
}

/** Detalle de una operación de bodega (metadata + paquetes hidratados). */
export function OperationDetailsDialog({ open, onOpenChange, opKind, operationId }: Props) {
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!open || !operationId) return;
    let cancelled = false;
    setIsLoading(true);
    setIsError(false);
    setData(null);
    getWarehouseOperationDetails(opKind, operationId)
      .then((res) => !cancelled && setData(res))
      .catch(() => !cancelled && setIsError(true))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, opKind, operationId]);

  const fmtDate = (v: any) =>
    v ? new Date(v).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Detalle de la {opKind === "outbound" ? "salida" : "entrada"}
          </DialogTitle>
          <DialogDescription>
            {data?.subsidiaryName ?? ""}
            {data?.rolledBack ? " · Revertida" : ""}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : isError ? (
          <div className="flex h-40 items-center justify-center text-red-600 text-sm">Error al cargar el detalle</div>
        ) : data ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
              <Meta label="Fecha" value={fmtDate(data.createdAt)} />
              {opKind === "outbound" && (
                <Meta label="Tipo" value={data.type === "transfer" ? "Traspaso" : "Salida a ruta"} />
              )}
              {data.destinationName && <Meta label="Destino" value={data.destinationName} />}
              {data.routeNames && <Meta label="Rutas" value={data.routeNames} />}
              <Meta label="Vehículo" value={data.vehicleName || "—"} />
              <Meta label="Chofer(es)" value={data.driverNames || "—"} />
              {data.trackingNumber && <Meta label="Seguimiento" value={data.trackingNumber} />}
              <Meta label="Paquetes" value={String(data.totalPackages)} />
            </div>

            <div className="flex-1 overflow-y-auto rounded-md border mt-2">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/60 backdrop-blur-sm text-left">
                  <tr className="border-b">
                    <th className="px-3 py-2 font-medium">Guía</th>
                    <th className="px-3 py-2 font-medium">Recibe</th>
                    <th className="px-3 py-2 font-medium">Dirección</th>
                    <th className="px-3 py-2 font-medium">CP</th>
                    <th className="px-3 py-2 font-medium">Cobro</th>
                    <th className="px-3 py-2 font-medium">Compromiso</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data.packages ?? []).map((p: any, i: number) => (
                    <tr key={`${p.trackingNumber}-${i}`} className="hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium">
                        {p.trackingNumber}
                        {p.isCharge && <Badge variant="secondary" className="ml-1 text-[10px]">Carga</Badge>}
                        {p.isHighValue && <Badge variant="secondary" className="ml-1 text-[10px] bg-amber-100 text-amber-700">Alto valor</Badge>}
                      </td>
                      <td className="px-3 py-2 truncate max-w-[160px]">{p.recipientName || "—"}</td>
                      <td className="px-3 py-2 truncate max-w-[220px]">{p.recipientAddress || "—"}</td>
                      <td className="px-3 py-2">{p.recipientZip || "—"}</td>
                      <td className="px-3 py-2">{p.paymentAmount != null ? `$${p.paymentAmount}` : "N/A"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{fmtDate(p.commitDateTime)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/40 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-medium truncate">{value}</div>
    </div>
  );
}
