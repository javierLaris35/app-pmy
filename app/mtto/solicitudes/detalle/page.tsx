"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import { OperationHeader } from "@/components/shared/operation-header";
import { withAuth } from "@/hoc/withAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Ban, ClipboardList, FileText, Loader2, Paperclip, Pencil, PlusCircle, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { useMaintenanceRequest } from "@/hooks/services/maintenance/use-maintenance";
import { cancelRequest, convertQuote, deleteQuote, deleteRequest, getQuoteAttachmentBlob, openBlob } from "@/lib/services/maintenance";
import { formatKms, formatMoney, MaintenanceQuote, PO_STATUS_LABEL, vehicleLabel } from "@/lib/types/maintenance";
import { PriorityBadge, RequestStatusBadge } from "@/components/maintenance/shared/status-badges";
import { apiError, ConfirmAction } from "@/components/maintenance/shared/confirm-action";
import { QuoteFormDialog } from "@/components/maintenance/requests/quote-form-dialog";
import { QuoteComparison } from "@/components/maintenance/requests/quote-comparison";
import { RequestFormDialog } from "@/components/maintenance/requests/request-form-dialog";

const fmtDate = (d?: string | null) => (d ? new Date(`${d.slice(0, 10)}T12:00:00Z`).toLocaleDateString("es-MX") : "—");

function DetalleContent() {
  const router = useRouter();
  const id = useSearchParams().get("id");
  const { request, isLoading, isError, mutate } = useMaintenanceRequest(id);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<MaintenanceQuote | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) {
    return <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (isError || !request) {
    return <Card className="m-5"><CardContent className="p-8 text-center text-sm text-muted-foreground">No se encontró la solicitud.</CardContent></Card>;
  }

  const locked = !!request.purchaseOrder || request.status === "cancelada" || request.status === "completada";
  const quotes = request.quotes ?? [];

  const choose = async (q: MaintenanceQuote) => {
    try {
      const po = await convertQuote(q.id);
      toast.success(`Orden ${po.folio} creada en borrador`);
      router.push(`/mtto/ordenes/detalle?id=${po.id}`);
    } catch (e) {
      toast.error(apiError(e, "No se pudo crear la orden"));
    }
  };

  return (
    <div className="flex min-h-screen flex-col gap-4 p-4 md:p-5">
      <OperationHeader
        icon={ClipboardList}
        title={`Solicitud ${request.folio}`}
        description={vehicleLabel(request.vehicle)}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" className="gap-1" onClick={() => router.push("/mtto/solicitudes")}>
              <ArrowLeft className="h-4 w-4" /> Solicitudes
            </Button>
            {!locked && (
              <>
                <Button variant="outline" className="gap-1" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4" /> Editar
                </Button>
                <ConfirmAction
                  title="¿Cancelar la solicitud?"
                  description="Quedará cerrada sin orden de compra. Las cotizaciones se conservan como consulta."
                  confirmLabel="Cancelar solicitud"
                  destructive
                  onConfirm={async () => {
                    try { await cancelRequest(request.id); toast.success("Solicitud cancelada"); mutate(); }
                    catch (e) { toast.error(apiError(e, "No se pudo cancelar")); }
                  }}
                  trigger={<Button variant="outline" className="gap-1"><Ban className="h-4 w-4" /> Cancelar</Button>}
                />
                <ConfirmAction
                  title="¿Eliminar la solicitud?"
                  description="Se eliminará junto con sus cotizaciones."
                  confirmLabel="Eliminar"
                  destructive
                  onConfirm={async () => {
                    try { await deleteRequest(request.id); toast.success("Solicitud eliminada"); router.push("/mtto/solicitudes"); }
                    catch (e) { toast.error(apiError(e, "No se pudo eliminar")); }
                  }}
                  trigger={<Button variant="outline" className="gap-1 text-destructive"><Trash2 className="h-4 w-4" /> Eliminar</Button>}
                />
              </>
            )}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">¿Qué necesita?</CardTitle></CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{request.description}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="grid grid-cols-2 gap-3 p-4 text-sm">
            <span className="text-muted-foreground">Estado</span><span><RequestStatusBadge status={request.status} /></span>
            <span className="text-muted-foreground">Prioridad</span><span><PriorityBadge priority={request.priority} /></span>
            <span className="text-muted-foreground">Km al solicitar</span><span className="tabular-nums">{formatKms(request.kmsAtRequest)}</span>
            <span className="text-muted-foreground">Creada</span>
            <span>{new Date(request.createdAt).toLocaleDateString("es-MX", { timeZone: "America/Hermosillo" })}</span>
            <span className="text-muted-foreground">Por</span>
            <span>{[request.createdBy?.name, request.createdBy?.lastName].filter(Boolean).join(" ") || "—"}</span>
            {request.purchaseOrder && (
              <>
                <span className="text-muted-foreground">Orden de compra</span>
                <Link href={`/mtto/ordenes/detalle?id=${request.purchaseOrder.id}`} className="font-mono text-primary hover:underline">
                  {request.purchaseOrder.folio} · {PO_STATUS_LABEL[request.purchaseOrder.status]}
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Cotizaciones ({quotes.length})</CardTitle>
          {!locked && (
            <Button size="sm" className="gap-1" onClick={() => { setEditingQuote(null); setQuoteOpen(true); }}>
              <PlusCircle className="h-4 w-4" /> Agregar cotización
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {quotes.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aún no hay cotizaciones. Captura las de los proveedores para compararlas.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Partidas</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium">
                      {q.supplier?.name}
                      {q.status === "ganadora" && <Badge className="ml-2">Elegida</Badge>}
                      {q.status === "descartada" && <Badge variant="outline" className="ml-2 text-muted-foreground">Descartada</Badge>}
                    </TableCell>
                    <TableCell>{fmtDate(q.quoteDate)}</TableCell>
                    <TableCell>{fmtDate(q.validUntil)}</TableCell>
                    <TableCell className="tabular-nums">{q.items.length}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatMoney(q.total)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {q.attachmentName && (
                          <Button size="icon" variant="ghost" title={q.attachmentName} aria-label="Ver archivo"
                            onClick={async () => {
                              try { openBlob(await getQuoteAttachmentBlob(q.id)); }
                              catch (e) { toast.error(apiError(e, "No se pudo abrir el archivo")); }
                            }}>
                            <Paperclip className="h-4 w-4" />
                          </Button>
                        )}
                        {!locked && (
                          <>
                            <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => { setEditingQuote(q); setQuoteOpen(true); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <ConfirmAction
                              destructive
                              title="¿Eliminar cotización?"
                              description={`Se eliminará la cotización de ${q.supplier?.name}.`}
                              confirmLabel="Eliminar"
                              onConfirm={async () => {
                                try { await deleteQuote(q.id); toast.success("Cotización eliminada"); mutate(); }
                                catch (e) { toast.error(apiError(e, "No se pudo eliminar")); }
                              }}
                              trigger={<Button size="icon" variant="ghost" className="text-destructive" aria-label="Eliminar"><Trash2 className="h-4 w-4" /></Button>}
                            />
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {quotes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4" /> Comparativo</CardTitle>
          </CardHeader>
          <CardContent>
            <QuoteComparison quotes={quotes} onChoose={locked ? undefined : choose} />
          </CardContent>
        </Card>
      )}

      <QuoteFormDialog open={quoteOpen} onOpenChange={setQuoteOpen} request={request} quote={editingQuote} onSaved={() => mutate()} />
      <RequestFormDialog open={editOpen} onOpenChange={setEditOpen} subsidiaryId={request.subsidiaryId} request={request} onSaved={() => mutate()} />
    </div>
  );
}

function SolicitudDetallePage() {
  return (
    <AppLayout>
      <Suspense fallback={null}>
        <DetalleContent />
      </Suspense>
    </AppLayout>
  );
}

export default withAuth(SolicitudDetallePage, "mttoVehiculos.solicitudes");
