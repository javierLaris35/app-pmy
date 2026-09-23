"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { AppLayout } from "@/components/app-layout";
import { OperationHeader } from "@/components/shared/operation-header";
import { SucursalSelector } from "@/components/sucursal-selector";
import { DataTable } from "@/components/data-table/data-table";
import { withAuth } from "@/hoc/withAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CalendarClock, CheckCircle2, CircleHelp, ClipboardPlus, FileSearch, Gauge, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSchedule } from "@/hooks/services/maintenance/use-maintenance";
import { formatKms, LIGHT_LABEL, MaintenanceLight, MaintenanceVehicle, ScheduleRow } from "@/lib/types/maintenance";
import { Subsidiary } from "@/lib/types";
import { LightBadge } from "@/components/maintenance/shared/light-badge";
import { ScheduleDialog } from "@/components/maintenance/schedule/schedule-dialog";

const KPI: Array<{ light: MaintenanceLight; icon: React.ComponentType<{ className?: string }>; tone: string }> = [
  { light: "vencido", icon: AlertTriangle, tone: "text-rose-600 bg-rose-50" },
  { light: "proximo", icon: CalendarClock, tone: "text-amber-600 bg-amber-50" },
  { light: "al_dia", icon: CheckCircle2, tone: "text-emerald-600 bg-emerald-50" },
  { light: "sin_datos", icon: CircleHelp, tone: "text-slate-500 bg-slate-100" },
];

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("es-MX", { timeZone: "America/Hermosillo" }) : "—");

function ProgramacionMttoPage() {
  const router = useRouter();
  const [subsidiaryId, setSubsidiaryId] = useState("");
  const [filter, setFilter] = useState<MaintenanceLight | null>(null);
  const [editing, setEditing] = useState<MaintenanceVehicle | null>(null);
  const { rows, isLoading, mutate } = useSchedule(subsidiaryId);

  const counts = useMemo(() => {
    const c: Record<MaintenanceLight, number> = { vencido: 0, proximo: 0, al_dia: 0, sin_datos: 0 };
    rows.forEach((r) => c[r.status.light]++);
    return c;
  }, [rows]);

  const data = useMemo(() => (filter ? rows.filter((r) => r.status.light === filter) : rows), [rows, filter]);

  const columns = useMemo<ColumnDef<ScheduleRow>[]>(
    () => [
      {
        id: "unit",
        accessorFn: (r) => `${r.vehicle.code ?? ""} ${r.vehicle.name ?? ""} ${r.vehicle.plateNumber}`,
        header: "Unidad",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.vehicle.name || row.original.vehicle.code || "Sin nombre"}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.vehicle.plateNumber} · {[row.original.vehicle.brand, row.original.vehicle.model].filter(Boolean).join(" ")}
            </p>
          </div>
        ),
      },
      { id: "kms", header: "Km actual", cell: ({ row }) => <span className="tabular-nums">{formatKms(row.original.vehicle.kms)}</span> },
      {
        id: "last",
        header: "Último servicio",
        cell: ({ row }) => (
          <div className="text-sm">
            <p>{fmtDate(row.original.vehicle.lastMaintenanceDate)}</p>
            <p className="text-xs text-muted-foreground tabular-nums">{formatKms(row.original.vehicle.lastMaintenanceKms)}</p>
          </div>
        ),
      },
      {
        id: "interval",
        header: "Cada",
        cell: ({ row }) => <span className="tabular-nums">{formatKms(row.original.vehicle.maintenanceIntervalKms ?? 5000)}</span>,
      },
      {
        id: "next",
        header: "Próximo servicio",
        cell: ({ row }) => (
          <div className="text-sm">
            <p className="tabular-nums">{formatKms(row.original.status.nextKms)}</p>
            <p className="text-xs text-muted-foreground">{fmtDate(row.original.vehicle.nextMaintenanceDate)}</p>
          </div>
        ),
      },
      {
        id: "remaining",
        header: "Faltan",
        cell: ({ row }) => {
          const { kmsRemaining, daysRemaining } = row.original.status;
          const parts = [
            kmsRemaining !== null ? (kmsRemaining < 0 ? `${formatKms(-kmsRemaining)} de más` : formatKms(kmsRemaining)) : null,
            daysRemaining !== null ? (daysRemaining < 0 ? `${-daysRemaining} días tarde` : `${daysRemaining} días`) : null,
          ].filter(Boolean);
          return <span className="text-sm tabular-nums">{parts.length ? parts.join(" · ") : "—"}</span>;
        },
      },
      {
        id: "light",
        accessorFn: (r) => r.status.light,
        header: "Estado",
        cell: ({ row }) => <LightBadge light={row.original.status.light} />,
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const { vehicle, openRequest } = row.original;
          return (
            <div className="flex justify-end gap-1">
              <Button size="sm" variant="ghost" className="gap-1" onClick={() => setEditing(vehicle)}>
                <Settings2 className="h-4 w-4" /> Programar
              </Button>
              {openRequest ? (
                <Button size="sm" variant="outline" className="gap-1" onClick={() => router.push(`/mtto/expediente?id=${openRequest.id}`)}>
                  <FileSearch className="h-4 w-4" /> {openRequest.folio}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => router.push(`/mtto/tablero?nuevo=1&vehicleId=${vehicle.id}&subsidiaryId=${subsidiaryId}`)}
                >
                  <ClipboardPlus className="h-4 w-4" /> Iniciar mantenimiento
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [router, subsidiaryId],
  );

  return (
    <AppLayout>
      <div className="flex min-h-screen flex-col gap-4 p-4 md:p-5">
        <OperationHeader
          icon={Gauge}
          title="Unidades"
          description="Cuándo le toca servicio a cada unidad, por kilómetros recorridos o por fecha"
          actions={
            <SucursalSelector
              value={subsidiaryId}
              onValueChange={(val) => setSubsidiaryId((typeof val === "string" ? val : (val as Subsidiary).id) ?? "")}
            />
          }
        />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {KPI.map(({ light, icon: Icon, tone }) => (
            <Card
              key={light}
              role="button"
              onClick={() => setFilter((f) => (f === light ? null : light))}
              className={cn("cursor-pointer rounded-xl shadow-sm transition hover:-translate-y-0.5 hover:shadow-md", filter === light && "ring-2 ring-primary")}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <div className={cn("rounded-lg p-2", tone)}><Icon className="h-5 w-5" /></div>
                <div>
                  <p className="text-2xl font-semibold tabular-nums">{isLoading ? "…" : counts[light]}</p>
                  <p className="text-xs text-muted-foreground">{LIGHT_LABEL[light]}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {!subsidiaryId ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Elige una sucursal para ver sus unidades.</CardContent></Card>
        ) : (
          <DataTable columns={columns} data={data} searchKey="unit" />
        )}

        <ScheduleDialog vehicle={editing} onOpenChange={(o) => !o && setEditing(null)} onSaved={() => mutate()} />
      </div>
    </AppLayout>
  );
}

export default withAuth(ProgramacionMttoPage, "mttoVehiculos.programacion");
