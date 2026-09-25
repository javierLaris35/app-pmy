"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileDown, Mail, MessageCircle, Paperclip, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { deleteQuote, getQuoteAttachmentBlob, openBlob } from "@/lib/services/maintenance";
import { useAuthStore } from "@/store/auth.store";
import { comparisonPdfBlob } from "../pdf/render-compras-pdf";
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
  const user = useAuthStore((st) => st.user);
  const pdf = async () => {
    if (!comparison || !comparison.rows.length) { toast.error("Todavía no hay conceptos cotizados para comparar."); return; }
    const preparedBy = [user?.name, user?.lastName].filter(Boolean).join(" ") || user?.email || "Compras";
    try { openBlob(await comparisonPdfBlob(request, comparison, preparedBy)); } catch { toast.error("No se pudo generar el PDF del comparativo. Intenta de nuevo."); }
  };

  return (
    <Card className="rounded-xl shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 border-b px-3 py-2">
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
      <CardContent className="space-y-2.5 p-3">
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

            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-1.5 font-semibold">Proveedor</th>
                    <th className="px-3 py-1.5 font-semibold">Conceptos</th>
                    <th className="px-3 py-1.5 font-semibold">Fecha</th>
                    <th className="px-3 py-1.5 font-semibold">Vigencia</th>
                    <th className="px-3 py-1.5 font-semibold">Estado</th>
                    <th className="px-3 py-1.5 text-right font-semibold">Total</th>
                    <th className="w-24 px-2 py-1.5" />
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q) => (
                    <tr key={q.id} className="border-b last:border-b-0 hover:bg-muted/30">
                      <td className="px-3 py-1.5 font-medium">{q.supplier?.name}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {q.items.length}{Number(q.ieps ?? 0) > 0 && <span className="ml-1 text-xs">· IEPS {formatMoney(q.ieps)}</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-muted-foreground">{fmtDate(q.quoteDate)}</td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-muted-foreground">{q.validUntil ? fmtDate(q.validUntil) : "—"}</td>
                      <td className="px-3 py-1.5">
                        {q.fromCatalog ? (
                          <span className="whitespace-nowrap rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800" title="Se armó con precios del catálogo">Por confirmar</span>
                        ) : q.status === "ganadora" ? (
                          <span className="whitespace-nowrap rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700">Con orden</span>
                        ) : q.status === "descartada" ? (
                          <span className="whitespace-nowrap rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">No elegida</span>
                        ) : (
                          <span className="whitespace-nowrap rounded bg-sky-100 px-1.5 py-0.5 text-[11px] font-medium text-sky-700">Capturada</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{formatMoney(q.total)}</td>
                      <td className="px-2 py-1 text-right">
                        <div className="inline-flex">
                          {q.attachmentName && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" title={q.attachmentName} aria-label="Ver archivo del proveedor"
                              onClick={async () => { try { openBlob(await getQuoteAttachmentBlob(q.id)); } catch (e) { toast.error(apiError(e, "No se pudo abrir el archivo")); } }}>
                              <Paperclip className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {editable && (
                            <>
                              <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Editar cotización" title="Editar" onClick={() => onEdit(q)}>
                                <Pencil className="h-3.5 w-3.5" />
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
                                trigger={<Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" aria-label="Eliminar cotización" title="Eliminar"><Trash2 className="h-3.5 w-3.5" /></Button>}
                              />
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {dispatches && dispatches.length > 0 && (
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Cotizaciones pedidas</p>
            <ul className="divide-y rounded-xl border text-[13px]">
              {dispatches.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-1.5">
                  {d.channel === "whatsapp" ? <MessageCircle className="h-4 w-4 text-emerald-600" /> : <Mail className="h-4 w-4 text-sky-600" />}
                  <span className="font-medium">{d.supplier?.name ?? "Proveedor"}</span>
                  <span className="text-muted-foreground">{d.destination}</span>
                  {d.status === "error"
                    ? <Badge variant="outline" className="h-5 border-red-200 bg-red-50 text-[11px] text-red-700">No se envió</Badge>
                    : <Badge variant="outline" className="h-5 border-emerald-200 bg-emerald-50 text-[11px] text-emerald-700">Enviada</Badge>}
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
