"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileDown, Mail, MessageCircle, Paperclip, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { deleteQuote, getComparisonPdf, getQuoteAttachmentBlob, openBlob } from "@/lib/services/maintenance";
import { Comparison, formatMoney, MaintenanceQuote, MaintenanceRequest, RequestDispatch } from "@/lib/types/maintenance";
import { apiError, ConfirmAction } from "../shared/confirm-action";
import { ComparisonMatrix } from "../requests/comparison-matrix";

const fmtDate = (d?: string | null) => (d ? new Date(`${d.slice(0, 10)}T12:00:00Z`).toLocaleDateString("es-MX") : "—");
const fmtDateTime = (d: string) => new Date(d).toLocaleString("es-MX", { timeZone: "America/Hermosillo", dateStyle: "short", timeStyle: "short" });

/**
 * Cotizaciones y comparativo por partida. "Pedir cotización", "Agregar cotización" y "Generar órdenes"
 * viven en la barra de arriba; aquí quedan la consulta, la elección por renglón y las acciones por fila.
 */
export function QuotesStep({ request, comparison, onComparisonChange, editable, onChanged, onEdit, dispatches }: {
  request: MaintenanceRequest;
  comparison?: Comparison;
  onComparisonChange: (c: Comparison) => void;
  /** false cuando ya hay órdenes (solo consulta). */
  editable: boolean;
  onChanged: () => void;
  onEdit: (q: MaintenanceQuote) => void;
  /** Envíos de "Pedir cotización" (solo Compras). */
  dispatches?: RequestDispatch[];
}) {
  const quotes = request.quotes ?? [];
  const pdf = async () => { try { openBlob(await getComparisonPdf(request.id)); } catch (e) { toast.error(apiError(e, "No se pudo generar el PDF")); } };

  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 p-4 pb-3">
        <div>
          <CardTitle className="text-sm font-semibold">Cotizaciones y comparativo</CardTitle>
          <CardDescription className="text-xs">
            {editable
              ? "Elige en cada renglón a qué proveedor se le compra; de inicio se propone el mejor precio con existencia."
              : "Cotizaciones capturadas y lo que se eligió en cada renglón."}
          </CardDescription>
        </div>
        {quotes.length > 0 && (
          <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={pdf}>
            <FileDown className="mr-1.5 h-4 w-4" /> PDF del comparativo
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        {quotes.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Aún no hay cotizaciones. Usa &quot;Pedir cotización&quot; para mandarle la lista a tus proveedores y luego captura lo que te respondan
            con &quot;Agregar cotización&quot;.
          </div>
        ) : (
          <>
            {comparison && comparison.rows.length > 0 && (
              <ComparisonMatrix requestId={request.id} comparison={comparison} editable={editable} onChange={onComparisonChange} />
            )}

            <ul className="divide-y rounded-lg border">
              {quotes.map((q) => (
                <li key={q.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-medium">
                      {q.supplier?.name}
                      {q.status === "ganadora" && <Badge className="h-5 text-[10px]">Con orden</Badge>}
                      {q.status === "descartada" && <Badge variant="outline" className="h-5 text-[10px] text-muted-foreground">No elegida</Badge>}
                      {q.fromCatalog && (
                        <Badge variant="outline" className="h-5 border-amber-300 bg-amber-50 text-[10px] text-amber-800">Precio del catálogo: confírmalo con el proveedor</Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {q.items.length} {q.items.length === 1 ? "concepto" : "conceptos"} · {fmtDate(q.quoteDate)}
                      {q.validUntil && ` · vigente al ${fmtDate(q.validUntil)}`}
                      {Number(q.ieps ?? 0) > 0 && ` · IEPS ${formatMoney(q.ieps)}`}
                    </p>
                  </div>
                  <span className="font-semibold tabular-nums">{formatMoney(q.total)}</span>
                  <div className="flex gap-1">
                    {q.attachmentName && (
                      <Button size="icon" variant="ghost" title={q.attachmentName} aria-label="Ver archivo del proveedor"
                        onClick={async () => { try { openBlob(await getQuoteAttachmentBlob(q.id)); } catch (e) { toast.error(apiError(e, "No se pudo abrir el archivo")); } }}>
                        <Paperclip className="h-4 w-4" />
                      </Button>
                    )}
                    {editable && (
                      <>
                        <Button size="icon" variant="ghost" aria-label="Editar cotización" onClick={() => onEdit(q)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <ConfirmAction
                          destructive
                          title="¿Eliminar cotización?"
                          description={`Se eliminará la cotización de ${q.supplier?.name}.`}
                          confirmLabel="Eliminar"
                          onConfirm={async () => {
                            try { await deleteQuote(q.id); toast.success("Cotización eliminada"); onChanged(); }
                            catch (e) { toast.error(apiError(e, "No se pudo eliminar")); }
                          }}
                          trigger={<Button size="icon" variant="ghost" className="text-destructive" aria-label="Eliminar cotización"><Trash2 className="h-4 w-4" /></Button>}
                        />
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {dispatches && dispatches.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium">Cotizaciones pedidas</p>
            <ul className="divide-y rounded-lg border text-sm">
              {dispatches.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2">
                  {d.channel === "whatsapp" ? <MessageCircle className="h-4 w-4 text-emerald-600" /> : <Mail className="h-4 w-4 text-sky-600" />}
                  <span className="font-medium">{d.supplier?.name ?? "Proveedor"}</span>
                  <span className="text-muted-foreground">{d.destination}</span>
                  {d.status === "error"
                    ? <Badge variant="outline" className="h-5 border-red-200 bg-red-50 text-[10px] text-red-700">No se envió</Badge>
                    : <Badge variant="outline" className="h-5 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700">Enviada</Badge>}
                  <span className="ml-auto text-xs text-muted-foreground">{fmtDateTime(d.sentAt)}{d.sentByName ? ` · ${d.sentByName}` : ""}</span>
                  {d.status === "error" && d.error && <p className="w-full text-xs text-red-700">{d.error}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
