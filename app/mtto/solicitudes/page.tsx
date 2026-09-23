"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { AppLayout } from "@/components/app-layout";
import { OperationHeader } from "@/components/shared/operation-header";
import { SucursalSelector } from "@/components/sucursal-selector";
import { DataTable } from "@/components/data-table/data-table";
import { withAuth } from "@/hoc/withAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, PlusCircle } from "lucide-react";
import { useMaintenanceRequests } from "@/hooks/services/maintenance/use-maintenance";
import {
  formatMoney,
  MaintenanceRequest,
  PO_STATUS_LABEL,
  REQUEST_STATUS_LABEL,
  RequestStatus,
  vehicleLabel,
} from "@/lib/types/maintenance";
import { Subsidiary } from "@/lib/types";
import { PriorityBadge, RequestStatusBadge } from "@/components/maintenance/shared/status-badges";
import { RequestFormDialog } from "@/components/maintenance/requests/request-form-dialog";

const STATUS_OPTIONS = (Object.keys(REQUEST_STATUS_LABEL) as RequestStatus[]).map((s) => ({ label: REQUEST_STATUS_LABEL[s], value: s }));

function SolicitudesContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [subsidiaryId, setSubsidiaryId] = useState(params.get("subsidiaryId") ?? "");
  const [open, setOpen] = useState(false);
  const [defaultVehicleId, setDefaultVehicleId] = useState<string | undefined>();
  const { requests, mutate } = useMaintenanceRequests(subsidiaryId);

  // Atajo desde Programación: ?nueva=1&vehicleId=…
  useEffect(() => {
    if (params.get("nueva") === "1" && subsidiaryId) {
      setDefaultVehicleId(params.get("vehicleId") ?? undefined);
      setOpen(true);
    }
  }, [params, subsidiaryId]);

  const columns = useMemo<ColumnDef<MaintenanceRequest>[]>(
    () => [
      {
        accessorKey: "folio",
        header: "Folio",
        cell: ({ row }) => (
          <Link href={`/mtto/solicitudes/detalle?id=${row.original.id}`} className="font-mono text-sm font-medium text-primary hover:underline">
            {row.original.folio}
          </Link>
        ),
      },
      {
        id: "unit",
        accessorFn: (r) => `${r.folio} ${vehicleLabel(r.vehicle)} ${r.description}`,
        header: "Unidad",
        cell: ({ row }) => (
          <div className="max-w-[340px]">
            <p className="font-medium">{vehicleLabel(row.original.vehicle)}</p>
            <p className="truncate text-xs text-muted-foreground">{row.original.description}</p>
          </div>
        ),
      },
      { id: "priority", header: "Prioridad", cell: ({ row }) => <PriorityBadge priority={row.original.priority} /> },
      {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => <RequestStatusBadge status={row.original.status} />,
        filterFn: (row, id, value: string[]) => !value?.length || value.includes(String(row.getValue(id))),
      },
      { id: "quotes", header: "Cotizaciones", cell: ({ row }) => <span className="tabular-nums">{row.original.quotesCount ?? 0}</span> },
      {
        id: "best",
        header: () => <div className="text-right">Mejor precio</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">{row.original.minTotal !== null && row.original.minTotal !== undefined ? formatMoney(row.original.minTotal) : "—"}</div>
        ),
      },
      {
        id: "po",
        header: "Orden",
        cell: ({ row }) =>
          row.original.purchaseOrder ? (
            <div className="text-sm">
              <p className="font-mono">{row.original.purchaseOrder.folio}</p>
              <p className="text-xs text-muted-foreground">{PO_STATUS_LABEL[row.original.purchaseOrder.status]}</p>
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "date",
        header: "Fecha",
        cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString("es-MX", { timeZone: "America/Hermosillo" }),
      },
    ],
    [],
  );

  return (
    <AppLayout>
      <div className="flex min-h-screen flex-col gap-4 p-4 md:p-5">
        <OperationHeader
          icon={ClipboardList}
          title="Solicitudes de mantenimiento"
          description="Lo que necesita cada unidad y sus cotizaciones"
          actions={
            <div className="flex items-center gap-2">
              <SucursalSelector
                value={subsidiaryId}
                onValueChange={(val) => setSubsidiaryId((typeof val === "string" ? val : (val as Subsidiary).id) ?? "")}
              />
              <Button onClick={() => { setDefaultVehicleId(undefined); setOpen(true); }} disabled={!subsidiaryId} className="gap-2">
                <PlusCircle className="h-4 w-4" /> Nueva solicitud
              </Button>
            </div>
          }
        />
        {!subsidiaryId ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Elige una sucursal para ver sus solicitudes.</CardContent></Card>
        ) : (
          <DataTable
            columns={columns}
            data={requests}
            searchKey="unit"
            filters={[{ columnId: "status", title: "Estado", options: STATUS_OPTIONS }]}
          />
        )}
        <RequestFormDialog
          open={open}
          onOpenChange={setOpen}
          subsidiaryId={subsidiaryId}
          defaultVehicleId={defaultVehicleId}
          onSaved={(r) => {
            mutate();
            router.push(`/mtto/solicitudes/detalle?id=${r.id}`);
          }}
        />
      </div>
    </AppLayout>
  );
}

function SolicitudesPage() {
  return (
    <Suspense fallback={null}>
      <SolicitudesContent />
    </Suspense>
  );
}

export default withAuth(SolicitudesPage, "mttoVehiculos.solicitudes");
