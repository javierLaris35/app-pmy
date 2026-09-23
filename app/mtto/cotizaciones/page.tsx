"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import { OperationHeader } from "@/components/shared/operation-header";
import { SucursalSelector } from "@/components/sucursal-selector";
import { withAuth } from "@/hoc/withAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Scale } from "lucide-react";
import { toast } from "@/lib/toast";
import { useQuoteInbox } from "@/hooks/services/maintenance/use-maintenance";
import { convertQuote } from "@/lib/services/maintenance";
import { MaintenanceQuote, vehicleLabel } from "@/lib/types/maintenance";
import { Subsidiary } from "@/lib/types";
import { PriorityBadge } from "@/components/maintenance/shared/status-badges";
import { QuoteComparison } from "@/components/maintenance/requests/quote-comparison";
import { apiError } from "@/components/maintenance/shared/confirm-action";

/** Bandeja: solicitudes con cotizaciones por decidir; la elegida se convierte en orden de compra. */
function BandejaCotizacionesPage() {
  const router = useRouter();
  const [subsidiaryId, setSubsidiaryId] = useState("");
  const { requests, isLoading, mutate } = useQuoteInbox(subsidiaryId);

  const choose = async (q: MaintenanceQuote) => {
    try {
      const po = await convertQuote(q.id);
      toast.success(`Orden ${po.folio} creada en borrador`);
      mutate();
      router.push(`/mtto/ordenes/detalle?id=${po.id}`);
    } catch (e) {
      toast.error(apiError(e, "No se pudo crear la orden"));
    }
  };

  return (
    <AppLayout>
      <div className="flex min-h-screen flex-col gap-4 p-4 md:p-5">
        <OperationHeader
          icon={Scale}
          title="Bandeja de cotizaciones"
          description="Compara proveedores y convierte la mejor opción en orden de compra"
          actions={
            <SucursalSelector
              value={subsidiaryId}
              onValueChange={(val) => setSubsidiaryId((typeof val === "string" ? val : (val as Subsidiary).id) ?? "")}
            />
          }
        />

        {!subsidiaryId ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Elige una sucursal.</CardContent></Card>
        ) : isLoading ? (
          <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : requests.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No hay cotizaciones pendientes de decidir.</CardContent></Card>
        ) : (
          requests.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">
                      <Link href={`/mtto/solicitudes/detalle?id=${r.id}`} className="font-mono text-primary hover:underline">{r.folio}</Link>
                      <span className="ml-2">{vehicleLabel(r.vehicle)}</span>
                    </CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">{r.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <PriorityBadge priority={r.priority} />
                    <span>{r.quotes?.length ?? 0} cotizaciones</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <QuoteComparison quotes={r.quotes ?? []} onChoose={choose} />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AppLayout>
  );
}

export default withAuth(BandejaCotizacionesPage, "mttoVehiculos.solicitudes");
