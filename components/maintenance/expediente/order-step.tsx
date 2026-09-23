"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, FileDown, Loader2, Mail, MessageCircle, RotateCcw, Send, ShieldCheck, Undo2, XCircle } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  authorizePurchaseOrder, completePurchaseOrder, deletePurchaseOrder, getPurchaseOrderPdf, openBlob, rejectPurchaseOrder,
  sendPurchaseOrder, submitPurchaseOrder, updatePurchaseOrder,
} from "@/lib/services/maintenance";
import { ExpedienteProgress, formatKms, formatMoney, PurchaseOrder, PurchaseOrderItem } from "@/lib/types/maintenance";
import { apiError, ConfirmAction } from "../shared/confirm-action";
import { ItemsMode, OrderItemsTable } from "../orders/order-items-table";
import { CompleteOrderDialog, ReasonDialog, SendOrderDialog } from "../orders/order-dialogs";

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("es-MX", { timeZone: "America/Hermosillo", dateStyle: "long" }) : "—");

interface Props {
  order: PurchaseOrder;
  progress: ExpedienteProgress;
  canAuthorize: boolean;
  onChanged: () => Promise<unknown> | void;
}

/** Pasos 3–5 (y el regreso por rechazo): la orden de compra dentro del expediente. */
export function OrderStep({ order, progress, canAuthorize, onChanged }: Props) {
  const [items, setItems] = useState<PurchaseOrderItem[]>([]);
  const [notes, setNotes] = useState("");
  const [contactId, setContactId] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<null | "reject" | "send" | "complete">(null);

  useEffect(() => {
    setItems(order.items.map((i) => ({ ...i, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })));
    setNotes(order.notes ?? "");
    setContactId(order.contactId ?? "");
  }, [order]);

  const run = async (fn: () => Promise<unknown>, ok: string, fallback: string) => {
    try { await fn(); toast.success(ok); await onChanged(); } catch (e) { toast.error(apiError(e, fallback)); throw e; }
  };
  const guarded = async (fn: () => Promise<unknown>) => { setBusy(true); try { await fn(); } catch { /* toast ya mostrado */ } finally { setBusy(false); } };

  const rejectedDraft = progress.rejected && order.status === "borrador";
  const authorizing = progress.step === "autorizacion" && canAuthorize;
  const mode: ItemsMode = authorizing ? "authorize" : rejectedDraft ? "edit" : "view";
  const contacts = order.supplier?.contacts ?? [];
  const contact = contacts.find((c) => c.id === order.contactId);
  const pdf = async () => { try { openBlob(await getPurchaseOrderPdf(order.id)); } catch (e) { toast.error(apiError(e, "No se pudo generar el PDF")); } };

  const title = rejectedDraft ? "Corregir la orden"
    : progress.step === "autorizacion" ? (canAuthorize ? "Autorizar la orden" : "Orden en autorización")
    : progress.step === "envio" ? "Enviar la orden al proveedor"
    : progress.step === "cierre" ? "Orden en el taller"
    : `Orden ${order.folio}`;

  const description = rejectedDraft ? "Ajusta los conceptos y vuelve a mandarla, o regresa a cotizaciones para elegir otra opción."
    : authorizing ? "Palomea lo que apruebas. Al proveedor solo le llega lo aprobado."
    : progress.step === "autorizacion" ? "Quien autoriza puede aprobar todo o solo algunos conceptos."
    : progress.step === "envio" ? "Se manda el PDF solo con lo autorizado, por el medio que prefiera el proveedor."
    : progress.step === "cierre" ? "Cuando la unidad salga del taller, cierra el servicio para registrar el gasto."
    : "Resumen de lo autorizado.";

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button size="sm" variant="outline" className="shrink-0 gap-1" onClick={pdf}>
          <FileDown className="h-4 w-4" /> Ver PDF
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {rejectedDraft && (
          <Alert variant="destructive">
            <Undo2 className="h-4 w-4" />
            <AlertTitle>Rechazada por quien autoriza</AlertTitle>
            <AlertDescription>{order.rejectionReason}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-3 rounded-lg bg-muted/40 p-3 text-sm sm:grid-cols-3">
          <div><p className="text-xs text-muted-foreground">Orden</p><p className="font-mono font-medium">{order.folio}</p></div>
          <div><p className="text-xs text-muted-foreground">Proveedor</p><p className="font-medium">{order.supplier?.name}</p></div>
          <div>
            <p className="text-xs text-muted-foreground">Se envía a</p>
            {(rejectedDraft || authorizing) && contacts.length > 0 ? (
              <Select value={contactId} onValueChange={setContactId}>
                <SelectTrigger className="h-8"><SelectValue placeholder="Contacto" /></SelectTrigger>
                <SelectContent>{contacts.map((c) => <SelectItem key={c.id} value={c.id!}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            ) : (
              <p className="flex items-center gap-1 font-medium">
                {contact?.preferredChannel === "whatsapp" ? <MessageCircle className="h-4 w-4 text-emerald-600" /> : <Mail className="h-4 w-4 text-sky-600" />}
                {contact?.name ?? "—"}
              </p>
            )}
          </div>
        </div>

        <OrderItemsTable items={items} mode={mode} onChange={setItems} />

        <div className="grid gap-1.5">
          <p className="text-sm font-medium">Observaciones para el proveedor</p>
          {rejectedDraft || authorizing ? (
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Tiempo de entrega, garantía, indicaciones…" />
          ) : (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{order.notes || "Sin observaciones"}</p>
          )}
        </div>

        {progress.stage === "terminado" && (
          <div className="grid gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-sm sm:grid-cols-3">
            <div><p className="text-xs text-emerald-800/70">Servicio realizado</p><p className="font-medium">{fmtDate(order.completedAt)}</p></div>
            <div><p className="text-xs text-emerald-800/70">Km</p><p className="font-medium tabular-nums">{formatKms(order.completedKms)}</p></div>
            <div><p className="text-xs text-emerald-800/70">Pagado (registrado en gastos)</p><p className="font-semibold tabular-nums">{formatMoney(order.finalAmount ?? order.total)}</p></div>
          </div>
        )}

        {/* Acciones del paso — un solo botón principal */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          {rejectedDraft && (
            <>
              <ConfirmAction
                title="¿Regresar a cotizaciones?"
                description="Se descarta esta orden para que puedas elegir otra cotización o capturar nuevas."
                confirmLabel="Regresar a cotizaciones"
                onConfirm={() => guarded(() => run(() => deletePurchaseOrder(order.id), "Puedes elegir otra cotización", "No se pudo regresar"))}
                trigger={<Button variant="outline" className="gap-1" disabled={busy}><RotateCcw className="h-4 w-4" /> Elegir otra cotización</Button>}
              />
              <Button
                className="gap-1"
                disabled={busy}
                onClick={() => guarded(async () => {
                  await updatePurchaseOrder(order.id, { items, notes: notes.trim() || null, contactId: contactId || null });
                  await run(() => submitPurchaseOrder(order.id), "Mandada otra vez a autorización", "No se pudo mandar");
                })}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Mandar otra vez a autorización
              </Button>
            </>
          )}

          {authorizing && (
            <>
              <Button variant="outline" className="gap-1 text-destructive" onClick={() => setDialog("reject")} disabled={busy}>
                <XCircle className="h-4 w-4" /> Rechazar
              </Button>
              <Button
                className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                disabled={busy || !items.some((i) => i.approved)}
                onClick={() => guarded(async () => {
                  if (notes !== (order.notes ?? "") || contactId !== (order.contactId ?? "")) {
                    await updatePurchaseOrder(order.id, { notes: notes.trim() || null, contactId: contactId || null });
                  }
                  await run(
                    () => authorizePurchaseOrder(order.id, items.filter((i) => i.id).map((i) => ({ id: i.id, approved: i.approved, quantity: i.quantity, unitPrice: i.unitPrice }))),
                    `Orden ${order.folio} autorizada`, "No se pudo autorizar",
                  );
                })}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Autorizar
              </Button>
            </>
          )}

          {progress.step === "envio" && (
            <Button className="gap-1" onClick={() => setDialog("send")}><Send className="h-4 w-4" /> Enviar al proveedor</Button>
          )}

          {progress.step === "cierre" && (
            <>
              <Button variant="outline" className="gap-1" onClick={() => setDialog("send")}><Send className="h-4 w-4" /> Reenviar</Button>
              <Button className="gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => setDialog("complete")}>
                <CheckCircle2 className="h-4 w-4" /> Cerrar servicio
              </Button>
            </>
          )}

          {progress.step === "autorizacion" && !canAuthorize && (
            <p className="mr-auto text-sm text-muted-foreground">Te avisaremos cuando la autoricen.</p>
          )}
        </div>
      </CardContent>

      <ReasonDialog
        open={dialog === "reject"} onOpenChange={(o) => !o && setDialog(null)}
        title={`Rechazar ${order.folio}`} description="Regresa a quien la capturó con tu motivo para que la corrija."
        confirmLabel="Rechazar" destructive
        onConfirm={(reason) => run(() => rejectPurchaseOrder(order.id, reason), "Orden rechazada", "No se pudo rechazar")}
      />
      <SendOrderDialog
        open={dialog === "send"} onOpenChange={(o) => !o && setDialog(null)} order={order}
        onSend={(body) => run(() => sendPurchaseOrder(order.id, body), "Orden enviada al proveedor", "No se pudo enviar")}
      />
      <CompleteOrderDialog
        open={dialog === "complete"} onOpenChange={(o) => !o && setDialog(null)} order={order}
        onComplete={(body) => run(() => completePurchaseOrder(order.id, body), "Servicio cerrado y gasto registrado", "No se pudo cerrar")}
      />
    </Card>
  );
}
