"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import type { DateRange } from "react-day-picker";
import { AppLayout } from "@/components/app-layout";
import { OperationHeader } from "@/components/shared/operation-header";
import { SucursalSelector } from "@/components/sucursal-selector";
import { DataTable } from "@/components/data-table/data-table";
import { DateRangePicker } from "@/components/date-range-picker";
import { withAuth } from "@/hoc/withAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HistoryIcon, Receipt, Truck, Wrench } from "lucide-react";
import { useMaintenanceHistory } from "@/hooks/services/maintenance/use-maintenance";
import { useVehiclesBySubsidiary } from "@/hooks/services/vehicles/use-vehicles";
import { formatKms, formatMoney, HistoryByVehicle, HistoryRow, MaintenanceVehicle, vehicleLabel } from "@/lib/types/maintenance";
import { Subsidiary } from "@/lib/types";

const ALL = "__all__";
const toDay = (d?: Date) => (d ? d.toLocaleDateString("en-CA", { timeZone: "America/Hermosillo" }) : undefined);
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("es-MX", { timeZone: "America/Hermosillo" }) : "—");

type UnitRow = HistoryByVehicle & { legacy?: boolean };

function HistorialMttoPage() {
  const [subsidiaryId, setSubsidiaryId] = useState("");
  const [range, setRange] = useState<DateRange | undefined>();
  const [vehicleId, setVehicleId] = useState(ALL);
  const { vehicles } = useVehiclesBySubsidiary(subsidiaryId);
  const { history, isLoading } = useMaintenanceHistory(subsidiaryId, {
    from: toDay(range?.from),
    to: toDay(range?.to ?? range?.from),
    vehicleId: vehicleId === ALL ? undefined : vehicleId,
  });

  const rows = history?.rows ?? [];
  const units: UnitRow[] = useMemo(
    () => [
      ...(history?.byVehicle ?? []),
      ...(history?.legacy ?? []).map((l) => ({
        vehicle: l.vehicle, count: 0, total: 0, lastMaintenanceDate: l.lastMaintenanceDate, lastMaintenanceKms: l.vehicle.lastMaintenanceKms ?? null, legacy: true,
      })),
    ],
    [history],
  );
  const total = rows.reduce((a, r) => a + Number(r.amount), 0);
  const top = history?.byVehicle?.[0];

  const serviceColumns = useMemo<ColumnDef<HistoryRow>[]>(
    () => [
      { id: "date", header: "Fecha", cell: ({ row }) => fmtDate(row.original.completedAt) },
      {
        id: "search",
        accessorFn: (r) => `${r.folio} ${vehicleLabel(r.vehicle)} ${r.supplierName} ${r.services.join(" ")}`,
        header: "Unidad",
        cell: ({ row }) => <span className="font-medium">{vehicleLabel(row.original.vehicle)}</span>,
      },
      { id: "kms", header: "Km", cell: ({ row }) => <span className="tabular-nums">{formatKms(row.original.completedKms)}</span> },
      {
        id: "services",
        header: "Servicios",
        cell: ({ row }) => <p className="max-w-[360px] text-sm text-muted-foreground">{row.original.services.join(" · ") || "—"}</p>,
      },
      { id: "supplier", header: "Proveedor", cell: ({ row }) => row.original.supplierName },
      {
        id: "folio",
        header: "Orden",
        cell: ({ row }) => (
          <Link href={`/mtto/ordenes/detalle?id=${row.original.poId}`} className="font-mono text-sm text-primary hover:underline">{row.original.folio}</Link>
        ),
      },
      {
        id: "amount",
        header: () => <div className="text-right">Monto</div>,
        cell: ({ row }) => <div className="text-right font-medium tabular-nums">{formatMoney(row.original.amount)}</div>,
      },
    ],
    [],
  );

  const unitColumns = useMemo<ColumnDef<UnitRow>[]>(
    () => [
      {
        id: "search",
        accessorFn: (r) => vehicleLabel(r.vehicle),
        header: "Unidad",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">{vehicleLabel(row.original.vehicle as MaintenanceVehicle)}</span>
            {row.original.legacy && <Badge variant="outline" className="text-muted-foreground">Registro previo</Badge>}
          </div>
        ),
      },
      { id: "count", header: "Servicios", cell: ({ row }) => <span className="tabular-nums">{row.original.count}</span> },
      { id: "last", header: "Último servicio", cell: ({ row }) => fmtDate(row.original.lastMaintenanceDate) },
      { id: "lastKms", header: "Km último servicio", cell: ({ row }) => <span className="tabular-nums">{formatKms(row.original.lastMaintenanceKms)}</span> },
      {
        id: "total",
        header: () => <div className="text-right">Gasto</div>,
        cell: ({ row }) => <div className="text-right font-medium tabular-nums">{row.original.legacy ? "—" : formatMoney(row.original.total)}</div>,
      },
    ],
    [],
  );

  const kpis = [
    { label: "Servicios realizados", value: String(rows.length), icon: Wrench, tone: "text-sky-600 bg-sky-50" },
    { label: "Gasto en mantenimiento", value: formatMoney(total), icon: Receipt, tone: "text-emerald-600 bg-emerald-50" },
    { label: "Unidad con más gasto", value: top ? `${vehicleLabel(top.vehicle)} · ${formatMoney(top.total)}` : "—", icon: Truck, tone: "text-amber-600 bg-amber-50" },
  ];

  return (
    <AppLayout>
      <div className="flex min-h-screen flex-col gap-4 p-4 md:p-5">
        <OperationHeader
          icon={HistoryIcon}
          title="Historial de mantenimiento"
          description="Servicios realizados por unidad y lo que se ha gastado"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <SucursalSelector
                value={subsidiaryId}
                onValueChange={(val) => { setSubsidiaryId((typeof val === "string" ? val : (val as Subsidiary).id) ?? ""); setVehicleId(ALL); }}
              />
              <Select value={vehicleId} onValueChange={setVehicleId} disabled={!subsidiaryId}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas las unidades</SelectItem>
                  {vehicles.map((v) => <SelectItem key={v.id} value={v.id!}>{[v.name || v.code, v.plateNumber].filter(Boolean).join(" · ")}</SelectItem>)}
                </SelectContent>
              </Select>
              <DateRangePicker value={range} onChange={setRange} />
            </div>
          }
        />

        {!subsidiaryId ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Elige una sucursal para ver su historial.</CardContent></Card>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              {kpis.map(({ label, value, icon: Icon, tone }) => (
                <Card key={label}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className={`rounded-lg p-2 ${tone}`}><Icon className="h-5 w-5" /></div>
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold tabular-nums">{isLoading ? "…" : value}</p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Tabs defaultValue="servicios">
              <TabsList>
                <TabsTrigger value="servicios">Servicios</TabsTrigger>
                <TabsTrigger value="unidades">Por unidad</TabsTrigger>
              </TabsList>
              <TabsContent value="servicios" className="mt-4"><DataTable columns={serviceColumns} data={rows} searchKey="search" /></TabsContent>
              <TabsContent value="unidades" className="mt-4"><DataTable columns={unitColumns} data={units} searchKey="search" /></TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AppLayout>
  );
}

export default withAuth(HistorialMttoPage, "mttoVehiculos.historial");
