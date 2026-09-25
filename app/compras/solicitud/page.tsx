"use client";

import { Suspense, useEffect, useState } from "react";
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
  ArrowLeft, Ban, CheckCircle2, ClipboardList, FilePlus2, Loader2, MailQuestion, MoreHorizontal, Pencil, Plus, RotateCcw, Send,
  ShieldCheck, Trash2, XCircle,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/access/permissions";
import {
  useComparison, useMaintenanceRequest, usePendingAuthorizations, usePurchaseOrder, useRequestDispatches,
} from "@/hooks/services/maintenance/use-maintenance";
import {
  approveRequest, authorizePurchaseOrder, cancelPurchaseOrder, cancelRequest, completePurchaseOrder, deletePurchaseOrder,
  deleteRequest, generateOrders, rejectPurchaseOrder, rejectRequest, sendPurchaseOrder, submitPurchaseOrder, updatePurchaseOrder,
} from "@/lib/services/maintenance";
import {
  ExpedienteProgress, formatKms, formatMoney, MaintenanceQuote, PRIORITY_LABEL, REQUEST_TYPE_LABEL, vehicleLabel,
} from "@/lib/types/maintenance";
import { selectionSummary } from "@/lib/compras-comparison";
import { activeOrders, pickActiveOrder } from "@/lib/compras-orders";
import { apiError } from "@/components/maintenance/shared/confirm-action";
import { StageBadge } from "@/components/maintenance/board/board-views";
import { ExpedienteStepper } from "@/components/maintenance/expediente/expediente-stepper";
import { QuotesStep } from "@/components/maintenance/expediente/quotes-step";
import { OrderStep, orderPhase } from "@/components/maintenance/expediente/order-step";
import { OrdersStrip } from "@/components/maintenance/expediente/orders-strip";
import { ExpedienteActivity } from "@/components/maintenance/expediente/expediente-activity";
import { RequestItemsCard } from "@/components/maintenance/expediente/request-items-card";
import { useOrderDraft } from "@/components/maintenance/expediente/use-order-draft";
import { RequestFormDialog } from "@/components/maintenance/requests/request-form-dialog";
import { QuoteFormDialog } from "@/components/maintenance/requests/quote-form-dialog";
import { RfqDialog } from "@/components/maintenance/requests/rfq-dialog";
import { CompleteOrderDialog, ReasonDialog, SendOrderDialog } from "@/components/maintenance/orders/order-dialogs";

type DialogKey = null | "quote" | "rfq" | "generate" | "edit" | "cancel" | "cancelOrder" | "delete" | "reject" | "rejectRequest" | "send" | "complete" | "discard";
const personName = (p?: { name?: string; lastName?: string } | null) => [p?.name, p?.lastName].filter(Boolean).join(" ") || "—";

function SolicitudContent() {
  const router = useRouter();
  const id = useSearchParams().get("id");
  const user = useAuthStore((s) => s.user);
  const canAuthorize = hasPermission(user, "mttoVehiculos.autorizar");
  const isPurchaser = hasPermission(user, "mttoVehiculos.revisar");
  const { request, isLoading, isError, mutate } = useMaintenanceRequest(id);

  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const orders = request?.orders ?? [];
  useEffect(() => {
    if (!request) return;
    if (!activeOrderId || !orders.some((o) => o.id === activeOrderId)) setActiveOrderId(pickActiveOrder(orders, { canAuthorize, isPurchaser }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  const { order, mutate: mutateOrder } = usePurchaseOrder(activeOrderId);
  const { mutate: mutateTray } = usePendingAuthorizations(canAuthorize);
  const stageNow = request?.stage ?? "por_revisar";
  const hasQuotes = (request?.quotes?.length ?? 0) > 0;
  const { comparison, mutate: mutateComparison } = useComparison(request?.id, hasQuotes && !["por_revisar", "rechazada"].includes(stageNow));
  const { dispatches, mutate: mutateDispatches } = useRequestDispatches(request?.id, (isPurchaser || canAuthorize) && stageNow !== "por_revisar");
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
  const live = activeOrders(orders);
  const hasOrder = live.length > 0;
  const multi = orders.length > 1;
  const closed = ["terminado", "cancelado", "rechazada"].includes(progress.stage);
  const reviewing = progress.stage === "por_revisar";
  const phase = order ? orderPhase(order.status) : null;
  const rejectedDraft = order?.status === "borrador" && !!order.rejectionReason;
  const authorizing = phase === "autorizacion" && canAuthorize;
  const quotesEditable = isPurchaser && !hasOrder && !closed && !reviewing;
  const canEdit = !closed && !hasOrder && (isPurchaser || (isOwner && reviewing));
  const canCancel = !closed && !hasOrder && (isPurchaser || (isOwner && reviewing));
  const canCancelOrder = isPurchaser && !!order && (order.status === "autorizada" || order.status === "enviada");
  const canDelete = !hasOrder && !closed && (isPurchaser || (isOwner && reviewing));
  const summary = selectionSummary(comparison);
  const of = order && multi ? ` ${order.folio}` : "";

  const refresh = async () => { await Promise.all([mutate(), mutateOrder(), mutateComparison(), mutateDispatches()]); mutateTray(); };
  const run = async (fn: () => Promise<unknown>, ok: string, fallback: string) => {
    try { await fn(); toast.success(ok); await refresh(); } catch (e) { toast.error(apiError(e, fallback)); throw e; }
  };
  const guarded = async (fn: () => Promise<unknown>) => { setBusy(true); try { await fn(); } catch { /* toast ya mostrado */ } finally { setBusy(false); } };

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
    primary = (
      <>
        <Button size="sm" variant="outline" onClick={() => setDialog("rfq")}><MailQuestion className="mr-1.5 h-4 w-4" /> Pedir cotización</Button>
        <Button size="sm" variant={summary.groups.length ? "outline" : "default"} onClick={() => { setEditingQuote(null); setDialog("quote"); }}>
          <Plus className="mr-1.5 h-4 w-4" /> Agregar cotización
        </Button>
        {summary.groups.length > 0 && (
          <Button size="sm" onClick={() => setDialog("generate")}>
            <FilePlus2 className="mr-1.5 h-4 w-4" /> Generar {summary.groups.length === 1 ? "orden" : `${summary.groups.length} órdenes`}
          </Button>
        )}
      </>
    );
  } else if (rejectedDraft && isPurchaser) {
    primary = (
      <Button size="sm" onClick={resubmit} disabled={busy}>
        {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />} Mandar otra vez a autorizar{of}
      </Button>
    );
  } else if (authorizing) {
    primary = (
      <>
        <Button size="sm" variant="outline" onClick={() => setDialog("reject")} disabled={busy}><XCircle className="mr-1.5 h-4 w-4" /> Rechazar{of}</Button>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={authorize} disabled={busy || !draft.items.some((i) => i.approved)}>
          {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-1.5 h-4 w-4" />} Autorizar{of || " orden"}
        </Button>
      </>
    );
  } else if (phase === "envio" && isPurchaser) {
    primary = <Button size="sm" onClick={() => setDialog("send")}><Send className="mr-1.5 h-4 w-4" /> Enviar{of} al proveedor</Button>;
  } else if (phase === "cierre" && isPurchaser) {
    primary = (
      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setDialog("complete")}>
        <CheckCircle2 className="mr-1.5 h-4 w-4" /> Recibir y cerrar{of}
      </Button>
    );
  }

  const moreItems = [
    canEdit && { key: "edit", label: "Editar solicitud", icon: Pencil, onSelect: () => setDialog("edit") },
    rejectedDraft && isPurchaser && { key: "discard", label: `Descartar${of || " la orden"} y volver a elegir`, icon: RotateCcw, onSelect: () => setDialog("discard") },
    phase === "cierre" && isPurchaser && { key: "resend", label: `Reenviar${of} al proveedor`, icon: Send, onSelect: () => setDialog("send") },
  ].filter(Boolean) as Array<{ key: string; label: string; icon: React.ComponentType<{ className?: string }>; onSelect: () => void }>;
  const hasDanger = canCancel || canCancelOrder || canDelete;
  const hasMore = moreItems.length > 0 || hasDanger;

  const headerActions = primary || hasMore ? (
    <div className="flex items-center gap-2">
      {primary}
      {hasMore && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline"><MoreHorizontal className="mr-1.5 h-4 w-4" /> Más acciones</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {moreItems.map((m) => <DropdownMenuItem key={m.key} onSelect={m.onSelect}><m.icon className="mr-2 h-4 w-4" /> {m.label}</DropdownMenuItem>)}
            {hasDanger && moreItems.length > 0 && <DropdownMenuSeparator />}
            {canCancelOrder && <DropdownMenuItem onSelect={() => setDialog("cancelOrder")}><Ban className="mr-2 h-4 w-4" /> Cancelar{of || " la orden"}</DropdownMenuItem>}
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
  const liveTotal = live.reduce((a, o) => a + Number(o.total), 0);

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
          {orders.length > 0 && <OrdersStrip orders={orders} activeId={activeOrderId} onSelect={setActiveOrderId} />}
          {order && <OrderStep order={order} canAuthorize={canAuthorize} draft={draft} />}
          {activeOrderId && !order && <Card><CardContent className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></CardContent></Card>}
          <RequestItemsCard items={request.items ?? []} />
          {!reviewing && progress.stage !== "rechazada" && (isPurchaser || hasQuotes) && (
            <QuotesStep
              request={request}
              comparison={comparison}
              onComparisonChange={(c) => mutateComparison(c, false)}
              editable={quotesEditable}
              onChanged={refresh}
              onEdit={(q) => { setEditingQuote(q); setDialog("quote"); }}
              dispatches={isPurchaser ? dispatches : undefined}
            />
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
                {hasOrder && (
                  <>
                    <dt className="text-muted-foreground">{live.length === 1 ? "Proveedor" : "Proveedores"}</dt>
                    <dd>{[...new Set(live.map((o) => o.supplierName).filter(Boolean))].join(", ")}</dd>
                    <dt className="text-muted-foreground">Monto</dt><dd className="font-semibold tabular-nums">{formatMoney(liveTotal)}</dd>
                  </>
                )}
              </dl>
            </CardContent>
          </Card>
          <ExpedienteActivity request={request} order={order} dispatches={isPurchaser || canAuthorize ? dispatches : undefined} />
        </aside>
      </div>

      <QuoteFormDialog open={dialog === "quote"} onOpenChange={close} request={request} quote={editingQuote} onSaved={() => refresh()} />
      <RfqDialog open={dialog === "rfq"} onOpenChange={close} request={request} onSent={() => mutateDispatches()} />
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
        confirmLabel="Cancelar solicitud" destructive
        onConfirm={() => run(() => cancelRequest(request.id), "Solicitud cancelada", "No se pudo cancelar")}
      />

      <AlertDialog open={dialog === "generate"} onOpenChange={close}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Generar {summary.groups.length === 1 ? "la orden" : `${summary.groups.length} órdenes`} de compra?</AlertDialogTitle>
            <AlertDialogDescription>Se crea una orden por proveedor con lo que elegiste en el comparativo y se mandan a autorización.</AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="divide-y rounded-lg border text-sm">
            {summary.groups.map((g) => (
              <li key={g.quoteId} className="flex items-center justify-between gap-3 px-3 py-2">
                <span><span className="font-medium">{g.supplierName}</span> · {g.count} {g.count === 1 ? "concepto" : "conceptos"}</span>
                <span className="font-semibold tabular-nums">{formatMoney(g.total)}</span>
              </li>
            ))}
            <li className="flex items-center justify-between px-3 py-2 font-semibold"><span>Total</span><span className="tabular-nums">{formatMoney(summary.total)}</span></li>
          </ul>
          {summary.skipped > 0 && (
            <p className="text-xs text-muted-foreground">{summary.skipped} {summary.skipped === 1 ? "renglón no se va" : "renglones no se van"} a comprar.</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => guarded(() => run(
                async () => { const out = await generateOrders(request.id); setActiveOrderId(out[0]?.id ?? null); },
                summary.groups.length === 1 ? "Orden mandada a autorización" : "Órdenes mandadas a autorización", "No se pudieron generar las órdenes",
              ))}
            >
              Generar y mandar a autorizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {order && (
        <>
          <ReasonDialog
            open={dialog === "reject"} onOpenChange={close}
            title={`Rechazar ${order.folio}`} description="Regresa a Compras con tu motivo para que la corrija."
            confirmLabel="Rechazar orden" destructive
            onConfirm={(reason) => run(() => rejectPurchaseOrder(order.id, reason), "Orden rechazada", "No se pudo rechazar")}
          />
          <ReasonDialog
            open={dialog === "cancelOrder"} onOpenChange={close}
            title={`Cancelar ${order.folio}`}
            description={live.length > 1 ? "Solo se cancela esta orden; las demás siguen su curso." : "Si no quedan órdenes, la solicitud regresa a cotizaciones."}
            confirmLabel="Cancelar orden" destructive withNotifySupplier={order.status === "enviada"}
            onConfirm={(reason, notify) => run(() => cancelPurchaseOrder(order.id, reason, notify), "Orden cancelada", "No se pudo cancelar")}
          />
          <SendOrderDialog open={dialog === "send"} onOpenChange={close} order={order}
            onSend={(body) => run(() => sendPurchaseOrder(order.id, body), "Orden enviada al proveedor", "No se pudo enviar")} />
          <CompleteOrderDialog open={dialog === "complete"} onOpenChange={close} order={order}
            onComplete={(body) => run(() => completePurchaseOrder(order.id, body), "Recibido: se registró el gasto", "No se pudo cerrar")} />
        </>
      )}
      <AlertDialog open={dialog === "discard" || dialog === "delete"} onOpenChange={close}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialog === "discard" ? `¿Descartar ${order?.folio ?? "la orden"}?` : "¿Eliminar esta solicitud?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {dialog === "discard"
                ? live.length > 1 ? "Se descarta solo esta orden; las demás siguen su curso." : "Se descarta la orden y la solicitud regresa a cotizaciones para elegir de nuevo."
                : "Se elimina junto con sus cotizaciones. Úsalo solo si se capturó por error."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              className={dialog === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
              onClick={async () => {
                if (dialog === "discard" && order) {
                  await run(() => deletePurchaseOrder(order.id), "Orden descartada", "No se pudo descartar").catch(() => undefined);
                } else {
                  try { await deleteRequest(request.id); toast.success("Solicitud eliminada"); router.push(isPurchaser ? "/compras/tablero" : "/compras/solicitudes"); }
                  catch (e) { toast.error(apiError(e, "No se pudo eliminar")); }
                }
              }}
            >
              {dialog === "discard" ? "Descartar orden" : "Eliminar"}
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
