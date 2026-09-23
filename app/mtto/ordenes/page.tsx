"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { AppLayout } from "@/components/app-layout";
import { OperationHeader } from "@/components/shared/operation-header";
import { SucursalSelector } from "@/components/sucursal-selector";
import { DataTable } from "@/components/data-table/data-table";
import { withAuth } from "@/hoc/withAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText } from "lucide-react";
import { usePurchaseOrders } from "@/hooks/services/maintenance/use-maintenance";
import { formatMoney, PO_STATUS_LABEL, PoStatus, PurchaseOrder, vehicleLabel } from "@/lib/types/maintenance";
import { Subsidiary } from "@/lib/types";
import { PoStatusBadge } from "@/components/maintenance/shared/status-badges";

type TabKey = PoStatus | "todas";
const TABS: TabKey[] = ["todas", "borrador", "pendiente", "autorizada", "enviada", "completada", "cancelada"];
const tabLabel = (t: TabKey) => (t === "todas" ? "Todas" : PO_STATUS_LABEL[t]);

function OrdenesPage() {
  const [subsidiaryId, setSubsidiaryId] = useState("");
  const [tab, setTab] = useState<TabKey>("todas");
  const { orders } = usePurchaseOrders(subsidiaryId);

  const counts = useMemo(() => {
    const c = {} as Record<TabKey, number>;
    TABS.forEach((t) => (c[t] = 0));
    orders.forEach((o) => { c[o.status]++; c.todas++; });
    // Las rechazadas vuelven a borrador; se cuentan ahí.
    return c;
  }, [orders]);

  const data = useMemo(() => (tab === "todas" ? orders : orders.filter((o) => o.status === tab)), [orders, tab]);

  const columns = useMemo<ColumnDef<PurchaseOrder>[]>(
    () => [
      {
        accessorKey: "folio",
        header: "Folio",
        cell: ({ row }) => (
          <Link href={`/mtto/ordenes/detalle?id=${row.original.id}`} className="font-mono text-sm font-medium text-primary hover:underline">
            {row.original.folio}
          </Link>
        ),
      },
      {
        id: "search",
        accessorFn: (o) => `${o.folio} ${vehicleLabel(o.vehicle)} ${o.supplier?.name ?? ""}`,
        header: "Unidad / proveedor",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{vehicleLabel(row.original.vehicle)}</p>
            <p className="text-xs text-muted-foreground">{row.original.supplier?.name}</p>
          </div>
        ),
      },
      {
        id: "total",
        header: () => <div className="text-right">Total</div>,
        cell: ({ row }) => <div className="text-right font-medium tabular-nums">{formatMoney(row.original.finalAmount ?? row.original.total)}</div>,
      },
      {
        id: "status",
        header: "Estado",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <PoStatusBadge status={row.original.status} />
            {row.original.status === "borrador" && row.original.rejectionReason && (
              <Badge variant="outline" className="border-rose-200 text-rose-700">Rechazada</Badge>
            )}
          </div>
        ),
      },
      {
        id: "authorized",
        header: "Autorizó",
        cell: ({ row }) => [row.original.authorizedBy?.name, row.original.authorizedBy?.lastName].filter(Boolean).join(" ") || "—",
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
          icon={FileText}
          title="Órdenes de compra"
          description="Autorización y envío a proveedores"
          actions={
            <SucursalSelector
              value={subsidiaryId}
              onValueChange={(val) => setSubsidiaryId((typeof val === "string" ? val : (val as Subsidiary).id) ?? "")}
            />
          }
        />
        {!subsidiaryId ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Elige una sucursal para ver sus órdenes.</CardContent></Card>
        ) : (
          <>
            <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
              <TabsList className="h-auto flex-wrap">
                {TABS.map((t) => (
                  <TabsTrigger key={t} value={t} className="gap-2">
                    {tabLabel(t)}
                    <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums">{counts[t]}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <DataTable columns={columns} data={data} searchKey="search" />
          </>
        )}
      </div>
    </AppLayout>
  );
}

export default withAuth(OrdenesPage, "mttoVehiculos.ordenes");
