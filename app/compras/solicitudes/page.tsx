"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import { OperationHeader } from "@/components/shared/operation-header";
import { withAuth } from "@/hoc/withAuth";
import { Button } from "@/components/ui/button";
import { ClipboardList, Plus } from "lucide-react";
import { useMyRequests } from "@/hooks/services/maintenance/use-maintenance";
import { RequestsBoard } from "@/components/maintenance/board/requests-board";
import { BOARD_VIEWS } from "@/components/maintenance/board/board-views";
import { RequestFormDialog } from "@/components/maintenance/requests/request-form-dialog";

/** Para quien pide: sus vistas no incluyen "Requieren mi acción" ni órdenes rechazadas (eso lo ve Compras). */
const MY_VIEWS = BOARD_VIEWS.filter((v) => ["activas", "terminadas", "cerradas"].includes(v.key));

function MisSolicitudesContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const { cards, isLoading, mutate } = useMyRequests();

  // Atajo desde Unidades: ?nueva=1&vehicleId=…&subsidiaryId=…
  useEffect(() => { if (params.get("nueva") === "1") setOpen(true); }, [params]);

  return (
    <div className="flex min-h-screen flex-col gap-4 p-4 md:p-5">
      <OperationHeader
        icon={ClipboardList}
        title="Mis solicitudes"
        description="Lo que has pedido a Compras y en qué va"
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Nueva solicitud
          </Button>
        }
      />
      <RequestsBoard
        cards={cards}
        isLoading={isLoading}
        role={{ purchaser: false, authorizer: false }}
        views={MY_VIEWS}
        empty={{
          title: "Aún no has pedido nada",
          text: "Pide una refacción, un servicio, una reparación o cualquier compra; Compras la revisa y te avisa cuando avance.",
          onCreate: () => setOpen(true),
        }}
      />
      <RequestFormDialog
        open={open}
        onOpenChange={setOpen}
        defaultSubsidiaryId={params.get("subsidiaryId") ?? undefined}
        defaultVehicleId={params.get("vehicleId") ?? undefined}
        onSaved={(r) => { mutate(); router.push(`/compras/solicitud?id=${r.id}`); }}
      />
    </div>
  );
}

function MisSolicitudesPage() {
  return (
    <AppLayout>
      <Suspense fallback={null}>
        <MisSolicitudesContent />
      </Suspense>
    </AppLayout>
  );
}

/** Cualquier usuario autenticado puede pedir (sin permiso especial). */
export default withAuth(MisSolicitudesPage);
