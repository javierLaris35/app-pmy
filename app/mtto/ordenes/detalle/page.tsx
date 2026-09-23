"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import { OperationHeader } from "@/components/shared/operation-header";
import { withAuth } from "@/hoc/withAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Ban, CheckCircle2, ClipboardCheck, FileDown, FileText, Loader2, Mail, MessageCircle, Pencil, Save, Send,
  ShieldCheck, Trash2, X, XCircle,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/access/permissions";
import { usePendingAuthorizations, usePurchaseOrder } from "@/hooks/services/maintenance/use-maintenance";
import {
  authorizePurchaseOrder, cancelPurchaseOrder, completePurchaseOrder, deletePurchaseOrder, getPurchaseOrderPdf, openBlob,
  rejectPurchaseOrder, sendPurchaseOrder, submitPurchaseOrder, updatePurchaseOrder,
} from "@/lib/services/maintenance";
import { formatKms, formatMoney, PurchaseOrderItem, vehicleLabel } from "@/lib/types/maintenance";
import { PoStatusBadge } from "@/components/maintenance/shared/status-badges";
import { apiError, ConfirmAction } from "@/components/maintenance/shared/confirm-action";
import { ItemsMode, OrderItemsTable } from "@/components/maintenance/orders/order-items-table";
import { CompleteOrderDialog, ReasonDialog, SendOrderDialog } from "@/components/maintenance/orders/order-dialogs";

const fmtDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString("es-MX", { timeZone: "America/Hermosillo", dateStyle: "medium", timeStyle: "short" }) : "—";
const personName = (p?: { name?: string; lastName?: string } | null) => [p?.name, p?.lastName].filter(Boolean).join(" ") || "—";

function DetalleOrdenContent() {
  const router = useRouter();
  const id = useSearchParams().get("id");
  const user = useAuthStore((s) => s.user);
  const canAuthorize = hasPermission(user, "mttoVehiculos.autorizar");
  const { order, isLoading, isError, mutate } = usePurchaseOrder(id);
  const { mutate: mutateTray } = usePendingAuthorizations(canAuthorize);

  const [editing, setEditing] = useState(false);
  const [items, setItems] = useState<PurchaseOrderItem[]>([]);
  const [notes, setNotes] = useState("");
  const [contactId, setContactId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState<null | "reject" | "cancel" | "send" | "complete">(null);

  useEffect(() => {
    if (!order) return;
    setItems(order.items.map((i) => ({ ...i, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })));
    setNotes(order.notes ?? "");
    setContactId(order.contactId ?? "");
  }, [order]);

  if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (isError || !order) return <Card className="m-5"><CardContent className="p-8 text-center text-sm text-muted-foreground">No se encontró la orden.</CardContent></Card>;

  const s = order.status;
  const isPendingForMe = s === "pendiente" && canAuthorize;
  const canEdit = s === "borrador" || (canAuthorize && (s === "pendiente" || s === "autorizada"));
  const mode: ItemsMode = isPendingForMe ? "authorize" : editing ? "edit" : "view";

  const refresh = async () => { await mutate(); mutateTray(); };
  const run = async (fn: () => Promise<unknown>, ok: string, fallback: string) => {
    try { await fn(); toast.success(ok); await refresh(); } catch (e) { toast.error(apiError(e, fallback)); throw e; }
  };

  const saveEdits = async () => {
    setSaving(true);
    try {
      await run(() => updatePurchaseOrder(order.id, { items, notes: notes.trim() || null, contactId: contactId || null }), "Orden actualizada", "No se pudo guardar");
      setEditing(false);
    } catch { /* toast ya mostrado */ } finally { setSaving(false); }
  };

  const authorize = async () => {
    setSaving(true);
    try {
      if (notes !== (order.notes ?? "") || contactId !== (order.contactId ?? "")) {
        await updatePurchaseOrder(order.id, { notes: notes.trim() || null, contactId: contactId || null });
      }
      await run(
        () => authorizePurchaseOrder(order.id, items.filter((i) => i.id).map((i) => ({ id: i.id, approved: i.approved, quantity: i.quantity, unitPrice: i.unitPrice }))),
        `Orden ${order.folio} autorizada`, "No se pudo autorizar",
      );
    } catch { /* toast ya mostrado */ } finally { setSaving(false); }
  };

  const contacts = order.supplier?.contacts ?? [];
  const currentContact = contacts.find((c) => c.id === order.contactId);

  return (
    <div className="flex min-h-screen flex-col gap-4 p-4 md:p-5">
      <OperationHeader
        icon={FileText}
        title={`Orden de compra ${order.folio}`}
        description={`${vehicleLabel(order.vehicle)} · ${order.supplier?.name ?? ""}`}
        titleAccessory={<PoStatusBadge status={s} />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" className="gap-1" onClick={() => router.push("/mtto/ordenes")}>
              <ArrowLeft className="h-4 w-4" /> Órdenes
            </Button>
            <Button variant="outline" className="gap-1"
              onClick={async () => { try { openBlob(await getPurchaseOrderPdf(order.id)); } catch (e) { toast.error(apiError(e, "No se pudo generar el PDF")); } }}>
              <FileDown className="h-4 w-4" /> Ver PDF
            </Button>

            {s === "borrador" && !editing && (
              <>
                <Button variant="outline" className="gap-1" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Editar</Button>
                <ConfirmAction
                  title="¿Enviar a autorización?"
                  description="Se avisará a quien autoriza. Mientras esté pendiente ya no podrás modificarla."
                  confirmLabel="Enviar a autorización"
                  onConfirm={() => run(() => submitPurchaseOrder(order.id), "Enviada a autorización", "No se pudo enviar").catch(() => undefined)}
                  trigger={<Button className="gap-1"><ClipboardCheck className="h-4 w-4" /> Enviar a autorización</Button>}
                />
              </>
            )}
            {(s === "borrador" || s === "rechazada") && !editing && (
              <ConfirmAction
                destructive
                title="¿Eliminar la orden?"
                description="La solicitud regresa a cotización para elegir otra opción."
                confirmLabel="Eliminar"
                onConfirm={async () => {
                  try { await deletePurchaseOrder(order.id); toast.success("Orden eliminada"); router.push(`/mtto/solicitudes/detalle?id=${order.requestId}`); }
                  catch (e) { toast.error(apiError(e, "No se pudo eliminar")); }
                }}
                trigger={<Button variant="outline" className="gap-1 text-destructive"><Trash2 className="h-4 w-4" /> Eliminar</Button>}
              />
            )}

            {isPendingForMe && (
              <>
                <Button variant="outline" className="gap-1 text-destructive" onClick={() => setDialog("reject")}><XCircle className="h-4 w-4" /> Rechazar</Button>
                <Button className="gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={authorize} disabled={saving || !items.some((i) => i.approved)}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Autorizar
                </Button>
              </>
            )}

            {s === "autorizada" && canAuthorize && !editing && (
              <Button variant="outline" className="gap-1" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Editar</Button>
            )}
            {(s === "autorizada" || s === "enviada") && !editing && (
              <>
                <Button className="gap-1" variant={s === "enviada" ? "outline" : "default"} onClick={() => setDialog("send")}>
                  <Send className="h-4 w-4" /> {s === "enviada" ? "Reenviar" : "Enviar al proveedor"}
                </Button>
                {s === "enviada" && (
                  <Button className="gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => setDialog("complete")}>
                    <CheckCircle2 className="h-4 w-4" /> Completar
                  </Button>
                )}
                <Button variant="outline" className="gap-1 text-destructive" onClick={() => setDialog("cancel")}><Ban className="h-4 w-4" /> Cancelar</Button>
              </>
            )}

            {editing && (
              <>
                <Button variant="ghost" className="gap-1" onClick={() => { setEditing(false); mutate(); }}><X className="h-4 w-4" /> Descartar</Button>
                <Button className="gap-1" onClick={saveEdits} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
                </Button>
              </>
            )}
          </div>
        }
      />

      {s === "borrador" && order.rejectionReason && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>La orden fue rechazada</AlertTitle>
          <AlertDescription>{order.rejectionReason}. Corrígela y vuelve a enviarla a autorización.</AlertDescription>
        </Alert>
      )}
      {s === "pendiente" && !canAuthorize && (
        <Alert><ClipboardCheck className="h-4 w-4" /><AlertTitle>Esperando autorización</AlertTitle>
          <AlertDescription>Quien autoriza revisará las partidas; puede aprobar solo algunas.</AlertDescription></Alert>
      )}
      {isPendingForMe && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-900"><ShieldCheck className="h-4 w-4" /><AlertTitle>Pendiente de tu autorización</AlertTitle>
          <AlertDescription>Palomea las partidas que apruebas y ajusta cantidades o precios si hace falta. Al proveedor solo le llega lo aprobado.</AlertDescription></Alert>
      )}
      {s === "cancelada" && order.cancelReason && (
        <Alert><Ban className="h-4 w-4" /><AlertTitle>Orden cancelada</AlertTitle><AlertDescription>{order.cancelReason}</AlertDescription></Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">Partidas</CardTitle></CardHeader>
          <CardContent>
            <OrderItemsTable items={items} mode={mode} onChange={setItems} />
            <div className="mt-4 grid gap-1.5">
              <p className="text-sm font-medium">Observaciones para el proveedor</p>
              {editing || isPendingForMe ? (
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              ) : (
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{order.notes || "—"}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Datos</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-sm">
              <span className="text-muted-foreground">Unidad</span><span>{vehicleLabel(order.vehicle)}</span>
              <span className="text-muted-foreground">Km</span><span className="tabular-nums">{formatKms(order.vehicle?.kms)}</span>
              <span className="text-muted-foreground">Sucursal</span><span>{order.subsidiary?.name ?? "—"}</span>
              <span className="text-muted-foreground">Solicitud</span>
              <Link href={`/mtto/solicitudes/detalle?id=${order.requestId}`} className="font-mono text-primary hover:underline">{order.request?.folio ?? "Ver"}</Link>
              <span className="text-muted-foreground">Proveedor</span><span>{order.supplier?.name}</span>
              <span className="text-muted-foreground">Enviar a</span>
              {(editing || isPendingForMe) && contacts.length > 0 ? (
                <Select value={contactId} onValueChange={setContactId}>
                  <SelectTrigger className="h-8"><SelectValue placeholder="Contacto" /></SelectTrigger>
                  <SelectContent>{contacts.map((c) => <SelectItem key={c.id} value={c.id!}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <span className="flex items-center gap-1">
                  {currentContact?.preferredChannel === "whatsapp" ? <MessageCircle className="h-4 w-4 text-emerald-600" /> : <Mail className="h-4 w-4 text-sky-600" />}
                  {currentContact?.name ?? "—"}
                </span>
              )}
              <span className="text-muted-foreground">Total</span><span className="font-semibold tabular-nums">{formatMoney(order.total)}</span>
              {order.finalAmount !== null && order.finalAmount !== undefined && (
                <><span className="text-muted-foreground">Pagado</span><span className="font-semibold tabular-nums">{formatMoney(order.finalAmount)}</span></>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Seguimiento</CardTitle></CardHeader>
            <CardContent>
              <ol className="relative space-y-3 border-l pl-4 text-sm">
                <li><p className="font-medium">Creada</p><p className="text-xs text-muted-foreground">{fmtDateTime(order.createdAt)} · {personName(order.createdBy)}</p></li>
                {order.authorizedAt && (
                  <li><p className="font-medium text-emerald-700">Autorizada</p><p className="text-xs text-muted-foreground">{fmtDateTime(order.authorizedAt)} · {personName(order.authorizedBy)}</p></li>
                )}
                {(order.dispatches ?? []).slice().reverse().map((d) => (
                  <li key={d.id}>
                    <p className={d.status === "enviado" ? "font-medium" : "font-medium text-destructive"}>
                      {d.kind === "cancelacion" ? "Aviso de cancelación" : "Envío al proveedor"} por {d.channel === "email" ? "correo" : "WhatsApp"}
                      {d.status === "error" && " — falló"}
                    </p>
                    <p className="text-xs text-muted-foreground">{fmtDateTime(d.sentAt)} · {d.destination} · {d.sentByName}</p>
                    {d.error && <p className="text-xs text-destructive">{d.error}</p>}
                  </li>
                ))}
                {order.completedAt && (
                  <li><p className="font-medium text-emerald-700">Completada</p><p className="text-xs text-muted-foreground">{fmtDateTime(order.completedAt)} · {formatKms(order.completedKms)}</p></li>
                )}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>

      <ReasonDialog
        open={dialog === "reject"} onOpenChange={(o) => !o && setDialog(null)}
        title={`Rechazar ${order.folio}`} description="La orden regresa a borrador para que la corrijan."
        confirmLabel="Rechazar" destructive
        onConfirm={(reason) => run(() => rejectPurchaseOrder(order.id, reason), "Orden rechazada", "No se pudo rechazar")}
      />
      <ReasonDialog
        open={dialog === "cancel"} onOpenChange={(o) => !o && setDialog(null)}
        title={`Cancelar ${order.folio}`} description="La orden queda cancelada y ya no se puede usar."
        confirmLabel="Cancelar orden" destructive withNotifySupplier={s === "enviada"}
        onConfirm={(reason, notify) => run(() => cancelPurchaseOrder(order.id, reason, notify), "Orden cancelada", "No se pudo cancelar")}
      />
      <SendOrderDialog
        open={dialog === "send"} onOpenChange={(o) => !o && setDialog(null)} order={order}
        onSend={(body) => run(() => sendPurchaseOrder(order.id, body), "Orden enviada al proveedor", "No se pudo enviar")}
      />
      <CompleteOrderDialog
        open={dialog === "complete"} onOpenChange={(o) => !o && setDialog(null)} order={order}
        onComplete={(body) => run(() => completePurchaseOrder(order.id, body), "Orden completada y gasto registrado", "No se pudo completar")}
      />
    </div>
  );
}

function OrdenDetallePage() {
  return (
    <AppLayout>
      <Suspense fallback={null}>
        <DetalleOrdenContent />
      </Suspense>
    </AppLayout>
  );
}

export default withAuth(OrdenDetallePage, "mttoVehiculos.ordenes");
