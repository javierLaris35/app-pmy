"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, Mail, MessageCircle, Undo2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { getPurchaseOrderPdf, openBlob } from "@/lib/services/maintenance";
import { ExpedienteProgress, formatKms, formatMoney, PurchaseOrder } from "@/lib/types/maintenance";
import { apiError } from "../shared/confirm-action";
import { ItemsMode, OrderItemsTable } from "../orders/order-items-table";
import type { OrderDraft } from "./use-order-draft";

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("es-MX", { timeZone: "America/Hermosillo", dateStyle: "long" }) : "—");

interface Props {
  order: PurchaseOrder;
  progress: ExpedienteProgress;
  canAuthorize: boolean;
  draft: OrderDraft;
}

/**
 * Pasos 3–5 (y el regreso por rechazo): la orden de compra dentro del expediente.
 * Solo contenido; las acciones (autorizar, enviar, cerrar…) viven en el header de la pantalla.
 */
export function OrderStep({ order, progress, canAuthorize, draft }: Props) {
  const rejectedDraft = progress.rejected && order.status === "borrador";
  const authorizing = progress.step === "autorizacion" && canAuthorize;
  const editable = rejectedDraft || authorizing;
  const mode: ItemsMode = authorizing ? "authorize" : rejectedDraft ? "edit" : "view";
  const contacts = order.supplier?.contacts ?? [];
  const contact = contacts.find((c) => c.id === order.contactId);
  const pdf = async () => { try { openBlob(await getPurchaseOrderPdf(order.id)); } catch (e) { toast.error(apiError(e, "No se pudo generar el PDF")); } };

  const title = rejectedDraft ? "Corregir la orden"
    : progress.step === "autorizacion" ? (canAuthorize ? "Autorizar la orden" : "Orden en autorización")
    : progress.step === "envio" ? "Orden autorizada, lista para enviar"
    : progress.step === "cierre" ? "Orden en el taller"
    : `Orden ${order.folio}`;

  const description = rejectedDraft ? "Ajusta los conceptos y vuelve a mandarla desde la barra de arriba, o elige otra cotización."
    : authorizing ? "Palomea lo que apruebas y usa Autorizar arriba. Al proveedor solo le llega lo aprobado."
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
        <Button size="sm" variant="outline" className="shrink-0" onClick={pdf}>
          <FileDown className="mr-1.5 h-4 w-4" /> Ver PDF
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
            {editable && contacts.length > 0 ? (
              <Select value={draft.contactId} onValueChange={draft.setContactId}>
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

        <OrderItemsTable items={draft.items} mode={mode} onChange={draft.setItems} />

        <div className="grid gap-1.5">
          <p className="text-sm font-medium">Observaciones para el proveedor</p>
          {editable ? (
            <Textarea value={draft.notes} onChange={(e) => draft.setNotes(e.target.value)} rows={2} placeholder="Tiempo de entrega, garantía, indicaciones…" />
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
      </CardContent>
    </Card>
  );
}
