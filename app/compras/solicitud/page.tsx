"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import { OperationHeader } from "@/components/shared/operation-header";
import { withAuth } from "@/hoc/withAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Ban, CheckCircle2, ClipboardList, Loader2, MoreHorizontal, Pencil, Plus, RotateCcw, Send, ShieldCheck, Trash2, XCircle,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/access/permissions";
import { useMaintenanceRequest, usePendingAuthorizations, usePurchaseOrder } from "@/hooks/services/maintenance/use-maintenance";
import {
  approveRequest, authorizePurchaseOrder, cancelPurchaseOrder, cancelRequest, completePurchaseOrder, convertQuote, deletePurchaseOrder,
  deleteRequest, rejectPurchaseOrder, rejectRequest, sendPurchaseOrder, submitPurchaseOrder, updatePurchaseOrder,
} from "@/lib/services/maintenance";
import {
  ExpedienteProgress, formatKms, formatMoney, MaintenanceQuote, PRIORITY_LABEL, REQUEST_TYPE_LABEL, vehicleLabel,
} from "@/lib/types/maintenance";
import { apiError } from "@/components/maintenance/shared/confirm-action";
import { StageBadge } from "@/components/maintenance/board/board-views";
import { ExpedienteStepper } from "@/components/maintenance/expediente/expediente-stepper";
import { QuotesStep } from "@/components/maintenance/expediente/quotes-step";
import { OrderStep, orderPhase } from "@/components/maintenance/expediente/order-step";
import { ExpedienteActivity } from "@/components/maintenance/expediente/expediente-activity";
import { RequestItemsCard } from "@/components/maintenance/expediente/request-items-card";
import { useOrderDraft } from "@/components/maintenance/expediente/use-order-draft";
import { RequestFormDialog } from "@/components/maintenance/requests/request-form-dialog";
import { QuoteFormDialog } from "@/components/maintenance/requests/quote-form-dialog";
import { CompleteOrderDialog, ReasonDialog, SendOrderDialog } from "@/components/maintenance/orders/order-dialogs";

type DialogKey = null | "quote" | "edit" | "cancel" | "delete" | "reject" | "rejectRequest" | "send" | "complete" | "requote";
const personName = (p?: { name?: string; lastName?: string } | null) => [p?.name, p?.lastName].filter(Boolean).join(" ") || "—";

function SolicitudContent() {
  const router = useRouter();
  const id = useSearchParams().get("id");
  const user = useAuthStore((s) => s.user);
  const canAuthorize = hasPermission(user, "mttoVehiculos.autorizar");
  const isPurchaser = hasPermission(user, "mttoVehiculos.revisar");
  const { request, isLoading, isError, mutate } = useMaintenanceRequest(id);
  const { order, mutate: mutateOrder } = usePurchaseOrder(request?.purchaseOrder?.id);
  const { mutate: mutateTray } = usePendingAuthorizations(canAuthorize);
  const draft = useOrderDraft(order);
  const [dialog, setDialog] = useState<DialogKey>(null);
  const [editingQuote, setEditingQuote] = useState<MaintenanceQuote | null>(null);
  const [busy, setBusy] = useState(false);

  if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (isError || !request) {
    return <Card className="m-5"><CardContent className="p-8 text-center text-sm text-muted-foreground">No se encontró la solicitud o no tienes acceso.</CardContent></Card>;
  }

  const progress: ExpedienteProgress = {
    stage: request.stage ?? "por_revisar",
    step: request.step ?? "revision",
    nextStep: request.nextStep ?? "",
    waitingOn: request.waitingOn ?? null,
    rejected: !!request.rejected,
  };
  const isOwner = !!user?.id && (request.createdBy?.id === user.id);
  const hasOrder = !!request.purchaseOrder;
  const closed = ["terminado", "cancelado", "rechazada"].includes(progress.stage);
  const reviewing = progress.stage === "por_revisar";
  const phase = order ? orderPhase(order.status) : null;
  const rejectedDraft = order?.status === "borrador" && !!order.rejectionReason;
  const authorizing = phase === "autorizacion" && canAuthorize;
  const quotesEditable = isPurchaser && !hasOrder && !closed && !reviewing;
  const canEdit = !closed && !hasOrder && (isPurchaser || (isOwner && reviewing));
  const canCancel = !closed && (isPurchaser || (isOwner && reviewing)) && (!order || ["borrador", "autorizada", "enviada"].includes(order.status));
  const canDelete = !hasOrder && !closed && (isPurchaser || (isOwner && reviewing));

  const refresh = async () => { await Promise.all([mutate(), mutateOrder()]); mutateTray(); };
  const run = async (fn: () => Promise<unknown>, ok: string, fallback: string) => {
    try { await fn(); toast.success(ok); await refresh(); } catch (e) { toast.error(apiError(e, fallback)); throw e; }
  };
  const guarded = async (fn: () => Promise<unknown>) => { setBusy(true); try { await fn(); } catch { /* toast ya mostrado */ } finally { setBusy(false); } };

  const choose = (q: MaintenanceQuote) => run(() => convertQuote(q.id, true), "Orden mandada a autorización", "No se pudo generar la orden").catch(() => undefined);
  const authorize = () => guarded(async () => {
    if (draft.metaChanged) await updatePurchaseOrder(order!.id, { notes: draft.notes.trim() || null, contactId: draft.contactId || null });
    await run(
      () => authorizePurchaseOrder(order!.id, draft.items.filter((i) => i.id).map((i) => ({ id: i.id, approved: i.approved, quantity: i.quantity, unitPrice: i.unitPrice }))),
      `Orden ${order!.folio} autorizada`, "No se pudo autorizar",
    );
  });
  const resubmit = () => guarded(async () => {
    await updatePurchaseOrder(order!.id, { items: draft.items, notes: draft.notes.trim() || null, contactId: draft.contactId || null });
    await run(() => submitPurchaseOrder(order!.id), "Mandada otra vez a autorización", "No se pudo mandar");
  });
  const cancelAll = (reason: string, notify: boolean) => run(
    () => (order && (order.status === "autorizada" || order.status === "enviada") ? cancelPurchaseOrder(order.id, reason, notify) : cancelRequest(request.id)),
    "Solicitud cancelada", "No se pudo cancelar",
  );

  // ---- Barra de tareas: acción del paso activo + "Más acciones" ----
  let primary: React.ReactNode = null;
  if (reviewing && isPurchaser) {
    primary = (
      <>
        <Button size="sm" variant="outline" onClick={() => setDialog("rejectRequest")}><XCircle className="mr-1.5 h-4 w-4" /> Rechazar</Button>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={busy}
          onClick={() => guarded(() => run(() => approveRequest(request.id), "Solicitud autorizada: ya puedes cotizar", "No se pudo autorizar"))}>
          {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-1.5 h-4 w-4" />} Autorizar solicitud
        </Button>
      </>
    );
  } else if (quotesEditable) {
    primary = <Button size="sm" onClick={() => { setEditingQuote(null); setDialog("quote"); }}><Plus className="mr-1.5 h-4 w-4" /> Agregar cotización</Button>;
  } else if (rejectedDraft && isPurchaser) {
    primary = (
      <Button size="sm" onClick={resubmit} disabled={busy}>
        {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />} Mandar otra vez a autorizar
      </Button>
    );
  } else if (authorizing) {
    primary = (
      <>
        <Button size="sm" variant="outline" onClick={() => setDialog("reject")} disabled={busy}><XCircle className="mr-1.5 h-4 w-4" /> Rechazar orden</Button>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={authorize} disabled={busy || !draft.items.some((i) => i.approved)}>
          {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-1.5 h-4 w-4" />} Autorizar orden
        </Button>
      </>
    );
  } else if (phase === "envio" && isPurchaser) {
    primary = <Button size="sm" onClick={() => setDialog("send")}><Send className="mr-1.5 h-4 w-4" /> Enviar al proveedor</Button>;
  } else if (phase === "cierre" && isPurchaser) {
    primary = (
      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setDialog("complete")}>
        <CheckCircle2 className="mr-1.5 h-4 w-4" /> Recibir y cerrar
      </Button>
    );
  }

  const moreItems = [
    canEdit && { key: "edit", label: "Editar solicitud", icon: Pencil, onSelect: () => setDialog("edit") },
    rejectedDraft && isPurchaser && { key: "requote", label: "Elegir otra cotización", icon: RotateCcw, onSelect: () => setDialog("requote") },
    phase === "cierre" && isPurchaser && { key: "resend", label: "Reenviar al proveedor", icon: Send, onSelect: () => setDialog("send") },
  ].filter(Boolean) as Array<{ key: string; label: string; icon: React.ComponentType<{ className?: string }>; onSelect: () => void }>;
  const hasMore = moreItems.length > 0 || canCancel || canDelete;

  const headerActions = primary || hasMore ? (
    <div className="flex items-center gap-2">
      {primary}
      {hasMore && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline"><MoreHorizontal className="mr-1.5 h-4 w-4" /> Más acciones</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {moreItems.map((m) => <DropdownMenuItem key={m.key} onSelect={m.onSelect}><m.icon className="mr-2 h-4 w-4" /> {m.label}</DropdownMenuItem>)}
            {(canCancel || canDelete) && moreItems.length > 0 && <DropdownMenuSeparator />}
            {canCancel && <DropdownMenuItem onSelect={() => setDialog("cancel")}><Ban className="mr-2 h-4 w-4" /> Cancelar solicitud</DropdownMenuItem>}
            {canDelete && (
              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDialog("delete")}>
                <Trash2 className="mr-2 h-4 w-4" /> Eliminar (capturada por error)
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  ) : undefined;

  const close = (o: boolean) => { if (!o) setDialog(null); };

  return (
    <div className="flex min-h-screen flex-col gap-4 p-4 md:p-5">
      <OperationHeader
        icon={ClipboardList}
        title={`Solicitud ${request.folio}`}
        description={[REQUEST_TYPE_LABEL[request.type], request.vehicle ? vehicleLabel(request.vehicle) : null].filter(Boolean).join(" · ")}
        titleAccessory={<StageBadge stage={progress.stage} />}
        actions={headerActions}
      />

      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push(isPurchaser ? "/compras/tablero" : "/compras/solicitudes")}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> {isPurchaser ? "Volver al tablero" : "Mis solicitudes"}
        </Button>
      </div>

      <ExpedienteStepper progress={progress} />

      {progress.stage === "rechazada" && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Compras rechazó la solicitud</AlertTitle>
          <AlertDescription>{request.rejectionReason}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          {hasOrder && order && progress.stage !== "cancelado" && <OrderStep order={order} canAuthorize={canAuthorize} draft={draft} />}
          {hasOrder && !order && <Card><CardContent className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></CardContent></Card>}
          <RequestItemsCard items={request.items ?? []} />
          {!reviewing && progress.stage !== "rechazada" && (isPurchaser || (request.quotes?.length ?? 0) > 0) && (
            <QuotesStep request={request} editable={quotesEditable} onChanged={refresh} onChoose={choose}
              onEdit={(q) => { setEditingQuote(q); setDialog("quote"); }} />
          )}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Solicitud</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="whitespace-pre-wrap">{request.description}</p>
              <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1.5 border-t pt-3">
                <dt className="text-muted-foreground">Tipo</dt><dd>{REQUEST_TYPE_LABEL[request.type]}</dd>
                <dt className="text-muted-foreground">Sucursal</dt><dd>{request.subsidiary?.name ?? "—"}</dd>
                {request.vehicle && (
                  <>
                    <dt className="text-muted-foreground">Unidad</dt><dd>{vehicleLabel(request.vehicle)}</dd>
                    <dt className="text-muted-foreground">Km</dt><dd className="tabular-nums">{formatKms(request.kmsAtRequest ?? request.vehicle?.kms)}</dd>
                  </>
                )}
                <dt className="text-muted-foreground">Prioridad</dt><dd>{PRIORITY_LABEL[request.priority]}</dd>
                <dt className="text-muted-foreground">Pidió</dt><dd>{personName(request.createdBy)}</dd>
                {request.reviewedBy && <><dt className="text-muted-foreground">Revisó</dt><dd>{personName(request.reviewedBy)}</dd></>}
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

      <QuoteFormDialog open={dialog === "quote"} onOpenChange={close} request={request} quote={editingQuote} onSaved={() => refresh()} />
      <RequestFormDialog open={dialog === "edit"} onOpenChange={close} request={request} onSaved={() => refresh()} />
      <ReasonDialog
        open={dialog === "rejectRequest"} onOpenChange={close}
        title={`Rechazar ${request.folio}`} description="Se le avisa a quien la pidió con tu motivo."
        confirmLabel="Rechazar solicitud" destructive
        onConfirm={(reason) => run(() => rejectRequest(request.id, reason), "Solicitud rechazada", "No se pudo rechazar")}
      />
      <ReasonDialog
        open={dialog === "cancel"} onOpenChange={close}
        title={`Cancelar ${request.folio}`} description="La solicitud queda cancelada y ya no se puede continuar."
        confirmLabel="Cancelar solicitud" destructive withNotifySupplier={order?.status === "enviada"}
        onConfirm={cancelAll}
      />
      {order && (
        <>
          <ReasonDialog
            open={dialog === "reject"} onOpenChange={close}
            title={`Rechazar ${order.folio}`} description="Regresa a Compras con tu motivo para que la corrija."
            confirmLabel="Rechazar orden" destructive
            onConfirm={(reason) => run(() => rejectPurchaseOrder(order.id, reason), "Orden rechazada", "No se pudo rechazar")}
          />
          <SendOrderDialog open={dialog === "send"} onOpenChange={close} order={order}
            onSend={(body) => run(() => sendPurchaseOrder(order.id, body), "Orden enviada al proveedor", "No se pudo enviar")} />
          <CompleteOrderDialog open={dialog === "complete"} onOpenChange={close} order={order}
            onComplete={(body) => run(() => completePurchaseOrder(order.id, body), "Recibido: se registró el gasto", "No se pudo cerrar")} />
        </>
      )}
      <AlertDialog open={dialog === "requote" || dialog === "delete"} onOpenChange={close}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialog === "requote" ? "¿Regresar a cotizaciones?" : "¿Eliminar esta solicitud?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {dialog === "requote" ? "Se descarta esta orden para elegir otra cotización." : "Se elimina junto con sus cotizaciones. Úsalo solo si se capturó por error."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              className={dialog === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
              onClick={async () => {
                if (dialog === "requote" && order) {
                  await run(() => deletePurchaseOrder(order.id), "Puedes elegir otra cotización", "No se pudo regresar").catch(() => undefined);
                } else {
                  try { await deleteRequest(request.id); toast.success("Solicitud eliminada"); router.push(isPurchaser ? "/compras/tablero" : "/compras/solicitudes"); }
                  catch (e) { toast.error(apiError(e, "No se pudo eliminar")); }
                }
              }}
            >
              {dialog === "requote" ? "Regresar a cotizaciones" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SolicitudPage() {
  return (
    <AppLayout>
      <Suspense fallback={null}>
        <SolicitudContent />
      </Suspense>
    </AppLayout>
  );
}

/** Cualquier usuario autenticado; el backend valida que pueda verla (quien pidió, Compras, autorizador, admins). */
export default withAuth(SolicitudPage);
