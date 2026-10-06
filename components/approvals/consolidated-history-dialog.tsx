"use client";

import { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { History, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table/data-table";
import { useSubsidiaries } from "@/hooks/services/subsidiaries/use-subsidiaries";
import {
  APPROVAL_TYPE_LABEL,
  ApprovalRequestItem,
  ConsolidatedChangeLogItem,
  getConsolidatedHistory,
} from "@/lib/services/approvals";

const ENTITY_LABEL: Record<ConsolidatedChangeLogItem["entityType"], string> = {
  consolidated: "Consolidado",
  shipment: "Guía",
  charge_shipment: "Guía de carga",
  charge: "Carga F2",
  income: "Ingreso",
  devolution: "Devolución",
};

const FIELD_LABEL: Record<string, string> = {
  active: "Activo",
  subsidiaryId: "Sucursal",
  date: "Fecha",
  chargeDate: "Fecha de carga",
  cost: "Monto",
  originalCost: "Monto original",
  secondAbordApplied: "2º a bordo",
  chargeNotChargedSameDay: "No cobra (2ª carga del día)",
};

const STATUS_STYLE: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-800",
  aprobado: "bg-emerald-100 text-emerald-800",
  rechazado: "bg-rose-100 text-rose-800",
};

const fmtDateTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("es-MX", { timeZone: "America/Hermosillo", dateStyle: "short", timeStyle: "short" }) : "—";

/** Historial de un consolidado: quién pidió qué, por qué, quién autorizó y cada registro cambiado. */
export function ConsolidatedHistoryDialog({
  open,
  onOpenChange,
  consNumber,
  subsidiaryId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  consNumber: string;
  subsidiaryId: string;
}) {
  const { subsidiaries } = useSubsidiaries();
  const [requests, setRequests] = useState<ApprovalRequestItem[]>([]);
  const [changes, setChanges] = useState<ConsolidatedChangeLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    getConsolidatedHistory(consNumber, subsidiaryId)
      .then((r) => { setRequests(r.requests); setChanges(r.changes); })
      .catch((e) => setError(e?.response?.data?.message || "No se pudo cargar el historial."))
      .finally(() => setLoading(false));
  }, [open, consNumber, subsidiaryId]);

  const subName = useMemo(() => new Map(subsidiaries.map((s: any) => [s.id, s.name])), [subsidiaries]);

  const value = (field: string, v: string | null) => {
    if (v == null) return "—";
    if (field === "subsidiaryId") return subName.get(v) ?? v;
    if (field === "active" || field === "secondAbordApplied" || field === "chargeNotChargedSameDay") return v === "1" ? "Sí" : "No";
    if (field === "date" || field === "chargeDate") return v.slice(0, 10);
    if (field === "cost" || field === "originalCost") return Number(v).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
    return v;
  };

  const columns: ColumnDef<ConsolidatedChangeLogItem>[] = [
    { accessorKey: "createdAt", header: "Cuándo", cell: ({ row }) => <span className="whitespace-nowrap">{fmtDateTime(row.original.createdAt)}</span> },
    { accessorKey: "entityType", header: "Registro", cell: ({ row }) => ENTITY_LABEL[row.original.entityType] ?? row.original.entityType },
    { accessorKey: "trackingNumber", header: "Guía", cell: ({ row }) => row.original.trackingNumber ?? "—" },
    { accessorKey: "field", header: "Dato", cell: ({ row }) => FIELD_LABEL[row.original.field] ?? row.original.field },
    { accessorKey: "oldValue", header: "Antes", cell: ({ row }) => value(row.original.field, row.original.oldValue) },
    { accessorKey: "newValue", header: "Después", cell: ({ row }) => value(row.original.field, row.original.newValue) },
    { accessorKey: "userName", header: "Aplicó", cell: ({ row }) => row.original.userName ?? "—" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Historial del consolidado {consNumber}</DialogTitle>
          <DialogDescription>Solicitudes de eliminar o cambiar sucursal/fecha, y cada registro que cambió.</DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center gap-2 py-8 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Cargando…</div>
        )}
        {error && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        {!loading && !error && (
          <div className="space-y-4">
            {requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">Este consolidado no tiene solicitudes.</p>
            ) : (
              <div className="divide-y rounded-lg border text-sm">
                {requests.map((r) => (
                  <div key={r.id} className="space-y-1 px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{APPROVAL_TYPE_LABEL[r.type]}</span>
                      {r.impactSnapshot?.change && (
                        <span className="text-muted-foreground">{r.impactSnapshot.change.from} → {r.impactSnapshot.change.to}</span>
                      )}
                      <Badge className={`${STATUS_STYLE[r.status] ?? ""} border-0`}>{r.status}</Badge>
                    </div>
                    <p className="text-muted-foreground">
                      Pidió <span className="text-foreground">{r.requestedByName ?? "—"}</span> el {fmtDateTime(r.createdAt)}
                      {r.status !== "pendiente" && (
                        <> · {r.status === "aprobado" ? "Autorizó" : "Rechazó"} <span className="text-foreground">{r.approverName ?? "—"}</span> el {fmtDateTime(r.resolvedAt)}</>
                      )}
                    </p>
                    {r.justification && <p>Motivo: {r.justification}</p>}
                    {r.status === "rechazado" && r.reason && <p className="text-rose-700">Motivo del rechazo: {r.reason}</p>}
                    {r.executionError && <p className="text-rose-700">No se pudo aplicar: {r.executionError}</p>}
                  </div>
                ))}
              </div>
            )}

            {changes.length > 0 && <DataTable columns={columns} data={changes} searchKey="trackingNumber" />}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
