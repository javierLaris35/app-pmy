"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import { OperationHeader } from "@/components/shared/operation-header";
import { withAuth } from "@/hoc/withAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  authorizePurchaseOrder, cancelPurchaseOrder, cancelRequest, completePurchaseOrder, convertQuote, deletePurchaseOrder,
  deleteRequest, rejectPurchaseOrder, sendPurchaseOrder, submitPurchaseOrder, updatePurchaseOrder,
} from "@/lib/services/maintenance";
import { ExpedienteProgress, formatKms, formatMoney, MaintenanceQuote, PRIORITY_LABEL, vehicleLabel } from "@/lib/types/maintenance";
import { apiError } from "@/components/maintenance/shared/confirm-action";
import { StageBadge } from "@/components/maintenance/board/board-views";
import { ExpedienteStepper } from "@/components/maintenance/expediente/expediente-stepper";
import { QuotesStep } from "@/components/maintenance/expediente/quotes-step";
import { OrderStep } from "@/components/maintenance/expediente/order-step";
import { ExpedienteActivity } from "@/components/maintenance/expediente/expediente-activity";
import { useOrderDraft } from "@/components/maintenance/expediente/use-order-draft";
import { RequestFormDialog } from "@/components/maintenance/requests/request-form-dialog";
import { QuoteFormDialog } from "@/components/maintenance/requests/quote-form-dialog";
import { CompleteOrderDialog, ReasonDialog, SendOrderDialog } from "@/components/maintenance/orders/order-dialogs";

type DialogKey = null | "quote" | "edit" | "cancel" | "delete" | "reject" | "send" | "complete" | "requote";

function ExpedienteContent() {
  const router = useRouter();
  const id = useSearchParams().get("id");
  const user = useAuthStore((s) => s.user);
  const canAuthorize = hasPermission(user, "mttoVehiculos.autorizar");
  const { request, isLoading, isError, mutate } = useMaintenanceRequest(id);
  const { order, mutate: mutateOrder } = usePurchaseOrder(request?.purchaseOrder?.id);
  const { mutate: mutateTray } = usePendingAuthorizations(canAuthorize);
  const draft = useOrderDraft(order);
  const [dialog, setDialog] = useState<DialogKey>(null);
  const [editingQuote, setEditingQuote] = useState<MaintenanceQuote | null>(null);
  const [busy, setBusy] = useState(false);

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
  const hasOrder = !!request.purchaseOrder;
  const closed = progress.stage === "terminado" || progress.stage === "cancelado";
  const rejectedDraft = progress.rejected && order?.status === "borrador";
  const authorizing = progress.step === "autorizacion" && canAuthorize && order?.status === "pendiente";
  const quotesEditable = !hasOrder && !closed;
  const canCancel = !closed && (!order || ["borrador", "autorizada", "enviada"].includes(order.status));
  const canDelete = !hasOrder && !closed;

  const refresh = async () => { await Promise.all([mutate(), mutateOrder()]); mutateTray(); };
  /** Acción con toast de éxito/error; relanza para que los diálogos se queden abiertos si falla. */
  const run = async (fn: () => Promise<unknown>, ok: string, fallback: string) => {
    try { await fn(); toast.success(ok); await refresh(); } catch (e) { toast.error(apiError(e, fallback)); throw e; }
  };
  const guarded = async (fn: () => Promise<unknown>) => { setBusy(true); try { await fn(); } catch { /* toast ya mostrado */ } finally { setBusy(false); } };

  const choose = (q: MaintenanceQuote) => run(() => convertQuote(q.id, true), "Mandada a autorización", "No se pudo mandar a autorización").catch(() => undefined);

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
    "Mantenimiento cancelado", "No se pudo cancelar",
  );

  // ---- Barra de tareas: acción principal del paso activo + "Más acciones" ----
  let primary: React.ReactNode = null;
  if (quotesEditable) {
    primary = (
      <Button size="sm" onClick={() => { setEditingQuote(null); setDialog("quote"); }}>
        <Plus className="mr-1.5 h-4 w-4" /> Agregar cotización
      </Button>
    );
  } else if (rejectedDraft) {
    primary = (
      <Button size="sm" onClick={resubmit} disabled={busy}>
        {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />} Mandar otra vez a autorizar
      </Button>
    );
  } else if (authorizing) {
    primary = (
      <>
        <Button size="sm" variant="outline" onClick={() => setDialog("reject")} disabled={busy}>
          <XCircle className="mr-1.5 h-4 w-4" /> Rechazar
        </Button>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={authorize} disabled={busy || !draft.items.some((i) => i.approved)}>
          {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-1.5 h-4 w-4" />} Autorizar
        </Button>
      </>
    );
  } else if (progress.step === "envio" && order) {
    primary = <Button size="sm" onClick={() => setDialog("send")}><Send className="mr-1.5 h-4 w-4" /> Enviar al proveedor</Button>;
  } else if (progress.step === "cierre" && order) {
    primary = (
      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setDialog("complete")}>
        <CheckCircle2 className="mr-1.5 h-4 w-4" /> Cerrar servicio
      </Button>
    );
  }

  const moreItems = [
    quotesEditable && { key: "edit", label: "Editar solicitud", icon: Pencil, onSelect: () => setDialog("edit") },
    rejectedDraft && { key: "requote", label: "Elegir otra cotización", icon: RotateCcw, onSelect: () => setDialog("requote") },
    progress.step === "cierre" && { key: "resend", label: "Reenviar al proveedor", icon: Send, onSelect: () => setDialog("send") },
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
            {moreItems.map((m) => (
              <DropdownMenuItem key={m.key} onSelect={m.onSelect}><m.icon className="mr-2 h-4 w-4" /> {m.label}</DropdownMenuItem>
            ))}
            {(canCancel || canDelete) && moreItems.length > 0 && <DropdownMenuSeparator />}
            {canCancel && (
              <DropdownMenuItem onSelect={() => setDialog("cancel")}><Ban className="mr-2 h-4 w-4" /> Cancelar mantenimiento</DropdownMenuItem>
            )}
            {canDelete && (
              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDialog("delete")}>
                <Trash2 className="mr-2 h-4 w-4" /> Eliminar (capturado por error)
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
        title={`Mantenimiento ${request.folio}`}
        description={vehicleLabel(request.vehicle)}
        titleAccessory={<StageBadge stage={progress.stage} />}
        actions={headerActions}
      />

      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push("/mtto/tablero")}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Volver al tablero
        </Button>
      </div>

      <ExpedienteStepper progress={progress} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          {hasOrder && order && progress.stage !== "cancelado" && (
            <OrderStep order={order} progress={progress} canAuthorize={canAuthorize} draft={draft} />
          )}
          {hasOrder && !order && <Card><CardContent className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></CardContent></Card>}
          <QuotesStep
            request={request}
            editable={quotesEditable}
            onChanged={refresh}
            onChoose={choose}
            onEdit={(q) => { setEditingQuote(q); setDialog("quote"); }}
          />
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Solicitud</CardTitle></CardHeader>
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

      {/* ---- Diálogos de las acciones del header ---- */}
      <QuoteFormDialog open={dialog === "quote"} onOpenChange={close} request={request} quote={editingQuote} onSaved={() => refresh()} />
      <RequestFormDialog open={dialog === "edit"} onOpenChange={close} subsidiaryId={request.subsidiaryId} request={request} onSaved={() => refresh()} />
      <ReasonDialog
        open={dialog === "cancel"} onOpenChange={close}
        title={`Cancelar ${request.folio}`} description="El mantenimiento queda cancelado y ya no se puede continuar."
        confirmLabel="Cancelar mantenimiento" destructive withNotifySupplier={order?.status === "enviada"}
        onConfirm={cancelAll}
      />
      {order && (
        <>
          <ReasonDialog
            open={dialog === "reject"} onOpenChange={close}
            title={`Rechazar ${order.folio}`} description="Regresa a quien la capturó con tu motivo para que la corrija."
            confirmLabel="Rechazar" destructive
            onConfirm={(reason) => run(() => rejectPurchaseOrder(order.id, reason), "Orden rechazada", "No se pudo rechazar")}
          />
          <SendOrderDialog
            open={dialog === "send"} onOpenChange={close} order={order}
            onSend={(body) => run(() => sendPurchaseOrder(order.id, body), "Orden enviada al proveedor", "No se pudo enviar")}
          />
          <CompleteOrderDialog
            open={dialog === "complete"} onOpenChange={close} order={order}
            onComplete={(body) => run(() => completePurchaseOrder(order.id, body), "Servicio cerrado y gasto registrado", "No se pudo cerrar")}
          />
        </>
      )}
      <AlertDialog open={dialog === "requote" || dialog === "delete"} onOpenChange={close}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialog === "requote" ? "¿Regresar a cotizaciones?" : "¿Eliminar este mantenimiento?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {dialog === "requote"
                ? "Se descarta esta orden para que puedas elegir otra cotización o capturar nuevas."
                : "Se elimina junto con sus cotizaciones. Úsalo solo si se capturó por error."}
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
                  try { await deleteRequest(request.id); toast.success("Mantenimiento eliminado"); router.push("/mtto/tablero"); }
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
