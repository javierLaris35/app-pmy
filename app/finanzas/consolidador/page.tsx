"use client";

import React, { useMemo, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OperationHeader } from "@/components/shared/operation-header";
import { withAuth } from "@/hoc/withAuth";
import { useConsolidadorWeek } from "@/hooks/services/consolidador/use-consolidador";
import { ConsolidadorToolbar } from "@/components/consolidador/consolidador-toolbar";
import { ConsolidadorKpis } from "@/components/consolidador/consolidador-kpis";
import { ConsolidadorTable } from "@/components/consolidador/consolidador-table";
import { getWeekRange, shiftWeek, formatWeekLabel, isCurrentWeek } from "@/lib/week";
import { SlidersHorizontal, Loader2 } from "lucide-react";

function ConsolidadorPage() {
  const [subsidiaryId, setSubsidiaryId] = useState<string>("");
  const [week, setWeek] = useState(() => getWeekRange());
  const [consNumber, setConsNumber] = useState("");
  const [routeId, setRouteId] = useState("");

  // Consulta filtrada → tabla + KPIs.
  const { data, isLoading } = useConsolidadorWeek(subsidiaryId, week.from, week.to, { consNumber, routeId });
  // Consulta base (sin filtros) → opciones de los popovers (SWR deduplica si no hay filtros).
  const { data: base } = useConsolidadorWeek(subsidiaryId, week.from, week.to, {});

  const consOptions = useMemo(() => {
    const set = new Set<string>();
    base?.rows.forEach((r) => r.consNumber && set.add(r.consNumber));
    return [...set].sort();
  }, [base]);

  const routeOptions = useMemo(() => {
    const set = new Set<string>();
    base?.rows.forEach((r) => r.routeId && set.add(r.routeId));
    return [...set].map((id) => ({ id, label: `Ruta …${id.slice(-6)}` }));
  }, [base]);

  return (
    <AppLayout>
      <div className="relative flex flex-col gap-5 p-6 bg-slate-50/30 min-h-screen">
        {isLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-2 bg-white p-6 rounded-xl shadow-xl border border-slate-100">
              <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
              <p className="text-sm font-medium text-slate-600">Cargando consolidado...</p>
            </div>
          </div>
        )}

        <OperationHeader
          icon={SlidersHorizontal}
          title="Consolidador de Finanzas"
          description="Concilia ingresos por sucursal y semana: costos, altas manuales y estatus"
        />

        <Card className="shadow-sm border-none bg-white">
          <CardContent className="pt-5">
            <ConsolidadorToolbar
              subsidiaryId={subsidiaryId}
              onSubsidiary={setSubsidiaryId}
              weekLabel={formatWeekLabel(week)}
              isCurrentWeek={isCurrentWeek(week)}
              onPrevWeek={() => setWeek((w) => shiftWeek(w, -1))}
              onNextWeek={() => setWeek((w) => shiftWeek(w, 1))}
              consNumber={consNumber}
              routeId={routeId}
              onConsChange={setConsNumber}
              onRouteChange={setRouteId}
              consOptions={consOptions}
              routeOptions={routeOptions}
            />
          </CardContent>
        </Card>

        <ConsolidadorKpis buckets={data?.buckets} />

        <Card className="shadow-md border-none overflow-hidden bg-white">
          <CardHeader className="border-b border-slate-50">
            <CardTitle className="text-base font-semibold text-slate-800">Ingresos de la semana</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!subsidiaryId ? (
              <div className="py-16 text-center text-sm text-slate-400">Selecciona una sucursal para comenzar</div>
            ) : (
              <ConsolidadorTable rows={data?.rows ?? []} />
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

export default withAuth(ConsolidadorPage, "finanzas.consolidador");
