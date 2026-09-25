"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Concepto</TableHead>
                <TableHead className="w-20 text-center">Cant.</TableHead>
                {comparison.quotes.map((q) => (
                  <TableHead key={q.id} className="min-w-[170px] border-l text-center">
                    <div className="flex flex-col items-center gap-1 py-1.5">
                      <span className="font-semibold text-foreground">{q.supplierName}</span>
                      {editable && (
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" disabled={!!saving} onClick={() => chooseAll(q.id)}>
                          {saving === `all-${q.id}` && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                          Todo con este
                        </Button>
                      )}
                    </div>
                  </TableHead>
                ))}
                {editable && <TableHead className="w-24 border-l text-center">No comprar</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparison.rows.map((row) => {
                const none = row.selectedQuoteItemId === null;
                return (
                  <TableRow key={row.requestItemId} className="align-top">
                    <TableCell className="font-medium">{row.description}</TableCell>
                    <TableCell className="text-center tabular-nums">
                      {qty(row.quantity)}
                      {comparison.units[row.requestItemId] && <span className="block text-xs text-muted-foreground">{comparison.units[row.requestItemId]}</span>}
                    </TableCell>
                    {comparison.quotes.map((q) => {
                      const c = row.cells[q.id];
                      if (!c) {
                        return <TableCell key={q.id} className="border-l text-center text-xs text-muted-foreground">No cotizado</TableCell>;
                      }
                      const best = row.bestQuoteItemId === c.quoteItemId;
                      const selected = row.selectedQuoteItemId === c.quoteItemId;
                      const noStock = c.availability === "no";
                      const body = (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="font-semibold tabular-nums">{formatMoney(c.unitPrice)}</span>
                          <span className="text-xs tabular-nums text-muted-foreground">Importe {formatMoney(c.total)}</span>
                          {noStock ? (
                            <Badge variant="outline" className="h-5 border-red-200 bg-red-50 text-[10px] text-red-700">Sin existencia</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">{availabilityText(c)}</span>
                          )}
                          {c.quality ? <StarRating value={c.quality} /> : null}
                          <div className="flex gap-1">
                            {best && <Badge variant="outline" className="h-5 gap-1 border-emerald-300 bg-emerald-50 text-[10px] text-emerald-700"><Award className="h-3 w-3" /> Mejor precio</Badge>}
                            {selected && <Badge className="h-5 gap-1 text-[10px]"><Check className="h-3 w-3" /> Elegido</Badge>}
                          </div>
                        </div>
                      );
                      return (
                        <TableCell key={q.id} className={cn("border-l p-1.5 text-center", best && "bg-emerald-50/50")}>
                          {editable ? (
                            <button
                              type="button"
                              disabled={!!saving}
                              onClick={() => !selected && choose([{ requestItemId: row.requestItemId, quoteItemId: c.quoteItemId }], row.requestItemId)}
                              className={cn(
                                "w-full rounded-md border border-transparent p-2 transition hover:border-primary/40 hover:bg-primary/5",
                                selected && "border-primary ring-1 ring-primary",
                                noStock && !selected && "opacity-70",
                              )}
                              aria-pressed={selected}
                              aria-label={`Elegir ${q.supplierName} para ${row.description}`}
                            >
                              {body}
                            </button>
                          ) : (
                            <div className={cn("rounded-md border border-transparent p-2", selected && "border-primary")}>{body}</div>
                          )}
                        </TableCell>
                      );
                    })}
                    {editable && (
                      <TableCell className="border-l p-1.5 text-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon" variant={none ? "secondary" : "ghost"} disabled={!!saving || none}
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
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2} className="font-semibold">Total cotizado (con impuestos)</TableCell>
                {comparison.quotes.map((q) => (
                  <TableCell key={q.id} className="border-l text-center">
                    <span className="font-semibold tabular-nums">{formatMoney(q.total)}</span>
                    <span className="block text-xs font-normal text-muted-foreground">cubre {q.covered} de {comparison.rows.length}</span>
                  </TableCell>
                ))}
                {editable && <TableCell className="border-l" />}
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
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
