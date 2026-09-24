"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Paperclip, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { deleteQuote, getQuoteAttachmentBlob, openBlob } from "@/lib/services/maintenance";
import { formatMoney, MaintenanceQuote, MaintenanceRequest } from "@/lib/types/maintenance";
import { apiError, ConfirmAction } from "../shared/confirm-action";
import { QuoteComparison } from "../requests/quote-comparison";

const fmtDate = (d?: string | null) => (d ? new Date(`${d.slice(0, 10)}T12:00:00Z`).toLocaleDateString("es-MX") : "—");

/**
 * Paso 2: cotizaciones y comparativo (elegir = mandar a autorizar). "Agregar cotización" vive en el
 * header de la pantalla; aquí quedan las acciones por fila (ver archivo, editar, eliminar).
 */
export function QuotesStep({ request, editable, onChanged, onChoose, onEdit }: {
  request: MaintenanceRequest;
  /** false cuando ya hay orden (se muestran solo como consulta). */
  editable: boolean;
  onChanged: () => void;
  onChoose?: (q: MaintenanceQuote) => Promise<unknown>;
  onEdit: (q: MaintenanceQuote) => void;
}) {
  const quotes = request.quotes ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Cotizaciones</CardTitle>
        <CardDescription>
          {editable
            ? "Captura lo que cotizó cada proveedor con \"Agregar cotización\" (arriba). Te recomendamos al menos dos para comparar."
            : "Cotizaciones capturadas para este mantenimiento."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {quotes.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Aún no hay cotizaciones. Pide precio a tus proveedores y captúralas con &quot;Agregar cotización&quot;.
          </div>
        ) : (
          <>
            <ul className="divide-y rounded-lg border">
              {quotes.map((q) => (
                <li key={q.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-medium">
                      {q.supplier?.name}
                      {q.status === "ganadora" && <Badge className="h-5 text-[10px]">Elegida</Badge>}
                      {q.status === "descartada" && <Badge variant="outline" className="h-5 text-[10px] text-muted-foreground">No elegida</Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {q.items.length} {q.items.length === 1 ? "concepto" : "conceptos"} · {fmtDate(q.quoteDate)}
                      {q.validUntil && ` · vigente al ${fmtDate(q.validUntil)}`}
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

            <div>
              <p className="mb-2 text-sm font-medium">Comparativo</p>
              <QuoteComparison quotes={quotes} onChoose={editable ? onChoose : undefined} chooseLabel="Elegir y mandar a autorizar" />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
