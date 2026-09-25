"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Award, Check, CircleSlash, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { saveSelection } from "@/lib/services/maintenance";
import { AVAILABILITY_LABEL, Availability, Comparison, ComparisonCell, formatMoney } from "@/lib/types/maintenance";
import { selectionSummary } from "@/lib/compras-comparison";
import { StarRating } from "../shared/star-rating";
import { apiError } from "../shared/confirm-action";

const qty = (n: number) => (Number.isInteger(Number(n)) ? String(Number(n)) : Number(n).toFixed(2));

function availabilityText(c: ComparisonCell) {
  const base = AVAILABILITY_LABEL[c.availability as Availability] ?? "";
  return c.availability === "sobre_pedido" && c.leadTimeDays ? `${base} · ${c.leadTimeDays} d` : base;
}

interface Props {
  requestId: string;
  comparison: Comparison;
  /** Compras puede elegir proveedor por renglón (antes de generar órdenes). */
  editable: boolean;
  onChange: (c: Comparison) => void;
}

/**
 * Comparativo por partida: filas = renglones de la solicitud, columnas = proveedores.
 * Verde = mejor precio con existencia; el recuadro marca lo elegido (de inicio, la propuesta).
 * Elegir aquí solo guarda la selección; las órdenes se generan desde la barra de arriba.
 */
export function ComparisonMatrix({ requestId, comparison, editable, onChange }: Props) {
  const [saving, setSaving] = useState<string | null>(null);
  const summary = selectionSummary(comparison);

  const choose = async (selections: Array<{ requestItemId: string; quoteItemId: string | null }>, key: string) => {
    setSaving(key);
    // Optimista: se pinta de inmediato y se confirma con lo que regresa el servidor.
    const next: Comparison = {
      ...comparison,
      rows: comparison.rows.map((r) => {
        const s = selections.find((x) => x.requestItemId === r.requestItemId);
        return s ? { ...r, selectedQuoteItemId: s.quoteItemId } : r;
      }),
    };
    onChange(next);
    try {
      onChange({ ...(await saveSelection(requestId, selections)), units: comparison.units });
    } catch (e) {
      onChange(comparison);
      toast.error(apiError(e, "No se pudo guardar la elección"));
    } finally {
      setSaving(null);
    }
  };

  /** "Todo con este proveedor": elige su partida en cada renglón que cotizó. */
  const chooseAll = (quoteId: string) =>
    choose(
      comparison.rows.filter((r) => r.cells[quoteId]).map((r) => ({ requestItemId: r.requestItemId, quoteItemId: r.cells[quoteId].quoteItemId })),
      `all-${quoteId}`,
    );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-3">
        <div className="overflow-x-auto rounded-xl border text-[13px]">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-auto min-w-[200px] px-3 py-1.5 align-bottom text-[11px] font-semibold uppercase tracking-wide">Concepto</TableHead>
                <TableHead className="h-auto w-16 px-2 py-1.5 text-center align-bottom text-[11px] font-semibold uppercase tracking-wide">Cant.</TableHead>
                {comparison.quotes.map((q) => (
                  <TableHead key={q.id} className="h-auto min-w-[160px] border-l px-2 py-1.5 text-center">
                    <p className="text-[13px] font-semibold normal-case text-foreground">{q.supplierName}</p>
                    <p className="text-xs font-normal tabular-nums text-muted-foreground">
                      {formatMoney(q.total)} · {q.covered} de {comparison.rows.length}
                    </p>
                    {editable && (
                      <button type="button" disabled={!!saving} onClick={() => chooseAll(q.id)}
                        className="mt-0.5 inline-flex items-center text-xs font-medium text-primary hover:underline disabled:opacity-50">
                        {saving === `all-${q.id}` && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                        Todo con este
                      </button>
                    )}
                  </TableHead>
                ))}
                {editable && <TableHead className="h-auto w-20 border-l px-2 py-1.5 text-center align-bottom text-[11px] font-semibold uppercase tracking-wide">No comprar</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparison.rows.map((row) => {
                const none = row.selectedQuoteItemId === null;
                return (
                  <TableRow key={row.requestItemId} className="align-top">
                    <TableCell className="px-3 py-1 font-medium">{row.description}</TableCell>
                    <TableCell className="py-1 text-center tabular-nums">
                      {qty(row.quantity)}
                      {comparison.units[row.requestItemId] && <span className="ml-1 text-[11px] text-muted-foreground">{comparison.units[row.requestItemId]}</span>}
                    </TableCell>
                    {comparison.quotes.map((q) => {
                      const c = row.cells[q.id];
                      if (!c) {
                        return <TableCell key={q.id} className="border-l py-1 text-center text-[11px] text-muted-foreground">No cotizado</TableCell>;
                      }
                      const best = row.bestQuoteItemId === c.quoteItemId;
                      const selected = row.selectedQuoteItemId === c.quoteItemId;
                      const noStock = c.availability === "no";
                      // Una sola línea: precio · estrellas · existencia · etiquetas (el importe va en el título).
                      const body = (
                        <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5" title={`Importe con impuestos ${formatMoney(c.total)}`}>
                          {selected && <Check className="h-3.5 w-3.5 text-primary" />}
                          <span className="text-[13px] font-semibold tabular-nums">{formatMoney(c.unitPrice)}</span>
                          {c.quality ? <StarRating value={c.quality} className="[&_svg]:h-2.5 [&_svg]:w-2.5" /> : null}
                          {noStock
                            ? <span className="rounded bg-red-50 px-1 text-[11px] font-semibold text-red-700">Sin existencia</span>
                            : <span className="text-[11px] text-muted-foreground">{availabilityText(c)}</span>}
                          {best && <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1 text-[11px] font-semibold text-emerald-700"><Award className="h-2.5 w-2.5" />Mejor</span>}
                        </div>
                      );
                      return (
                        <TableCell key={q.id} className={cn("border-l p-1 text-center", best && "bg-emerald-50/50")}>
                          {editable ? (
                            <button
                              type="button"
                              disabled={!!saving}
                              onClick={() => !selected && choose([{ requestItemId: row.requestItemId, quoteItemId: c.quoteItemId }], row.requestItemId)}
                              className={cn(
                                "w-full rounded-md border border-transparent px-1.5 py-1 transition hover:border-primary/40 hover:bg-primary/5",
                                selected && "border-primary ring-1 ring-primary",
                                noStock && !selected && "opacity-70",
                              )}
                              aria-pressed={selected}
                              aria-label={`Elegir ${q.supplierName} para ${row.description}`}
                            >
                              {body}
                            </button>
                          ) : (
                            <div className={cn("rounded-md border border-transparent px-1.5 py-1", selected && "border-primary")}>{body}</div>
                          )}
                        </TableCell>
                      );
                    })}
                    {editable && (
                      <TableCell className="border-l p-1 text-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon" variant="ghost" className={cn("h-8 w-8", none && "bg-red-50")} disabled={!!saving || none}
                              onClick={() => choose([{ requestItemId: row.requestItemId, quoteItemId: null }], row.requestItemId)}
                              aria-label="No comprar este renglón"
                            >
                              {saving === row.requestItemId ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleSlash className={cn("h-4 w-4", none && "text-destructive")} />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{none ? "Este renglón no se va a comprar" : "No comprar este renglón"}</TooltipContent>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/30 px-3 py-2 text-[13px]">
          {summary.groups.length === 0 ? (
            <span className="text-muted-foreground">No hay nada elegido para comprar.</span>
          ) : (
            <>
              <span className="text-muted-foreground">
                Se {summary.groups.length === 1 ? "generará 1 orden" : `generarán ${summary.groups.length} órdenes`}:
              </span>
              {summary.groups.map((g) => (
                <Badge key={g.quoteId} variant="outline" className="gap-1 bg-background font-normal">
                  <span className="font-medium">{g.supplierName}</span> · {g.count} {g.count === 1 ? "concepto" : "conceptos"} · {formatMoney(g.total)}
                </Badge>
              ))}
              <span className="ml-auto font-semibold tabular-nums">Total {formatMoney(summary.total)}</span>
            </>
          )}
          {summary.skipped > 0 && <span className="w-full text-xs text-muted-foreground">{summary.skipped} {summary.skipped === 1 ? "renglón queda" : "renglones quedan"} sin comprar.</span>}
        </div>
      </div>
    </TooltipProvider>
  );
}
