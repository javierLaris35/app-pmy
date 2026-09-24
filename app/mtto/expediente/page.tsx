"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import { OperationHeader } from "@/components/shared/operation-header";
import { withAuth } from "@/hoc/withAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Ban, ClipboardList, Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/lib/toast";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/access/permissions";
import { useMaintenanceRequest, usePendingAuthorizations, usePurchaseOrder } from "@/hooks/services/maintenance/use-maintenance";
import { cancelPurchaseOrder, cancelRequest, convertQuote, deleteRequest } from "@/lib/services/maintenance";
import { ExpedienteProgress, formatKms, formatMoney, MaintenanceQuote, PRIORITY_LABEL, vehicleLabel } from "@/lib/types/maintenance";
import { apiError } from "@/components/maintenance/shared/confirm-action";
import { StageBadge } from "@/components/maintenance/board/board-views";
import { ExpedienteStepper } from "@/components/maintenance/expediente/expediente-stepper";
import { QuotesStep } from "@/components/maintenance/expediente/quotes-step";
import { OrderStep } from "@/components/maintenance/expediente/order-step";
import { ExpedienteActivity } from "@/components/maintenance/expediente/expediente-activity";
import { RequestFormDialog } from "@/components/maintenance/requests/request-form-dialog";
import { ReasonDialog } from "@/components/maintenance/orders/order-dialogs";

function ExpedienteContent() {
  const router = useRouter();
  const id = useSearchParams().get("id");
  const user = useAuthStore((s) => s.user);
  const canAuthorize = hasPermission(user, "mttoVehiculos.autorizar");
  const { request, isLoading, isError, mutate } = useMaintenanceRequest(id);
  const { order, mutate: mutateOrder } = usePurchaseOrder(request?.purchaseOrder?.id);
  const { mutate: mutateTray } = usePendingAuthorizations(canAuthorize);
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (isError || !request) {
    return <Card className="m-5"><CardContent className="p-8 text-center text-sm text-muted-foreground">No se encontró el mantenimiento.</CardContent></Card>;
  }

  const progress: ExpedienteProgress = {
    stage: request.stage ?? "cotizando",
    step: request.step ?? "cotizaciones",
    nextStep: request.nextStep ?? "",
    waitingOn: request.waitingOn ?? null,
    rejected: !!request.rejected,
  };
  const refresh = async () => { await Promise.all([mutate(), mutateOrder()]); mutateTray(); };
  const hasOrder = !!request.purchaseOrder;
  const closed = progress.stage === "terminado" || progress.stage === "cancelado";
  const canCancel = !closed && (!order || ["borrador", "autorizada", "enviada"].includes(order.status));

  const choose = async (q: MaintenanceQuote) => {
    try {
      await convertQuote(q.id, true);
      toast.success("Mandada a autorización");
      await refresh();
    } catch (e) {
      toast.error(apiError(e, "No se pudo mandar a autorización"));
    }
  };

  const cancelAll = async (reason: string, notify: boolean) => {
    try {
      if (order && (order.status === "autorizada" || order.status === "enviada")) await cancelPurchaseOrder(order.id, reason, notify);
      else await cancelRequest(request.id);
      toast.success("Mantenimiento cancelado");
      await refresh();
    } catch (e) {
      toast.error(apiError(e, "No se pudo cancelar"));
      throw e;
    }
  };

  return (
    <div className="flex min-h-screen flex-col gap-4 p-4 md:p-5">
      <OperationHeader
        icon={ClipboardList}
        title={`Mantenimiento ${request.folio}`}
        description={vehicleLabel(request.vehicle)}
        titleAccessory={<StageBadge stage={progress.stage} />}
      />

      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push("/mtto/tablero")}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Volver al tablero
        </Button>
        {(canCancel || (!hasOrder && !closed)) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="mr-1.5 h-4 w-4" /> Más acciones
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {canCancel && (
                <DropdownMenuItem onSelect={() => setCancelOpen(true)}>
                  <Ban className="mr-2 h-4 w-4" /> Cancelar mantenimiento
                </DropdownMenuItem>
              )}
              {!hasOrder && !closed && (
                <>
                  {canCancel && <DropdownMenuSeparator />}
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeleteOpen(true)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar (capturado por error)
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <ExpedienteStepper progress={progress} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          {hasOrder && order && progress.stage !== "cancelado" && (
            <OrderStep order={order} progress={progress} canAuthorize={canAuthorize} onChanged={refresh} />
          )}
          {hasOrder && !order && <Card><CardContent className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></CardContent></Card>}
          <QuotesStep request={request} editable={!hasOrder && !closed} onChanged={refresh} onChoose={choose} />
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">Solicitud</CardTitle>
              {!hasOrder && !closed && (
                <Button size="sm" variant="ghost" className="h-7 gap-1 px-2" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="whitespace-pre-wrap">{request.description}</p>
              <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1.5 border-t pt-3">
                <dt className="text-muted-foreground">Unidad</dt><dd>{vehicleLabel(request.vehicle)}</dd>
                <dt className="text-muted-foreground">Km actuales</dt><dd className="tabular-nums">{formatKms(request.kmsAtRequest ?? request.vehicle?.kms)}</dd>
                <dt className="text-muted-foreground">Prioridad</dt><dd>{PRIORITY_LABEL[request.priority]}</dd>
                {order && (
                  <>
                    <dt className="text-muted-foreground">Proveedor</dt><dd>{order.supplier?.name}</dd>
                    <dt className="text-muted-foreground">Monto</dt><dd className="font-semibold tabular-nums">{formatMoney(order.finalAmount ?? order.total)}</dd>
                  </>
                )}
              </dl>
            </CardContent>
          </Card>
          <ExpedienteActivity request={request} order={order} />
        </aside>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este mantenimiento?</AlertDialogTitle>
            <AlertDialogDescription>Se elimina junto con sus cotizaciones. Úsalo solo si se capturó por error.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                try { await deleteRequest(request.id); toast.success("Mantenimiento eliminado"); router.push("/mtto/tablero"); }
                catch (e) { toast.error(apiError(e, "No se pudo eliminar")); }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <RequestFormDialog open={editOpen} onOpenChange={setEditOpen} subsidiaryId={request.subsidiaryId} request={request} onSaved={() => refresh()} />
      <ReasonDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={`Cancelar ${request.folio}`}
        description="El mantenimiento queda cancelado y ya no se puede continuar."
        confirmLabel="Cancelar mantenimiento"
        destructive
        withNotifySupplier={order?.status === "enviada"}
        onConfirm={cancelAll}
      />
    </div>
  );
}

function ExpedientePage() {
  return (
    <AppLayout>
      <Suspense fallback={null}>
        <ExpedienteContent />
      </Suspense>
    </AppLayout>
  );
}

export default withAuth(ExpedientePage, "mttoVehiculos.solicitudes");
