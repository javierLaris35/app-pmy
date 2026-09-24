"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Award, FileCheck2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney, MaintenanceQuote } from "@/lib/types/maintenance";
import { ConfirmAction } from "../shared/confirm-action";

interface Props {
  quotes: MaintenanceQuote[];
  /** Si se pasa, muestra "Elegir y crear orden" por proveedor. */
  onChoose?: (quote: MaintenanceQuote) => Promise<unknown>;
  chooseLabel?: string;
}

/** Comparativo lado a lado: columnas = proveedores, filas = conceptos (agrupados por servicio o descripción). */
export function QuoteComparison({ quotes, onChoose, chooseLabel = "Elegir" }: Props) {
  const { rows, cheapestId } = useMemo(() => {
    const keyOf = (i: MaintenanceQuote["items"][number]) => i.serviceId || i.description.trim().toLowerCase();
    const map = new Map<string, { label: string; byQuote: Record<string, { qty: number; amount: number }> }>();
    for (const q of quotes) {
      for (const i of q.items) {
        const k = keyOf(i);
        const entry = map.get(k) ?? { label: i.service?.name ?? i.description, byQuote: {} };
        const prev = entry.byQuote[q.id] ?? { qty: 0, amount: 0 };
        entry.byQuote[q.id] = { qty: prev.qty + Number(i.quantity), amount: prev.amount + Number(i.amount ?? Number(i.quantity) * Number(i.unitPrice)) };
        map.set(k, entry);
      }
    }
    const cheapest = quotes.length ? quotes.reduce((a, b) => (Number(b.total) < Number(a.total) ? b : a)) : null;
    return { rows: [...map.values()], cheapestId: cheapest?.id };
  }, [quotes]);

  if (!quotes.length) return null;

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[220px]">Concepto</TableHead>
            {quotes.map((q) => (
              <TableHead key={q.id} className={cn("min-w-[170px] text-right", q.id === cheapestId && "bg-emerald-50/60")}>
                <div className="flex flex-col items-end gap-1 py-1">
                  <span className="font-semibold text-foreground">{q.supplier?.name ?? "Proveedor"}</span>
                  {q.id === cheapestId && quotes.length > 1 && (
                    <Badge variant="outline" className="gap-1 border-emerald-300 bg-emerald-50 text-emerald-700">
                      <Award className="h-3 w-3" /> Más económica
                    </Badge>
                  )}
                  {q.status === "ganadora" && <Badge className="bg-primary">Elegida</Badge>}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.label}>
              <TableCell className="font-medium">{r.label}</TableCell>
              {quotes.map((q) => {
                const cell = r.byQuote[q.id];
                return (
                  <TableCell key={q.id} className={cn("text-right tabular-nums", q.id === cheapestId && "bg-emerald-50/40")}>
                    {cell ? (
                      <>
                        {formatMoney(cell.amount)}
                        {cell.qty !== 1 && <span className="block text-xs text-muted-foreground">{cell.qty} u.</span>}
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">No cotizado</span>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="font-semibold">Total con IVA</TableCell>
            {quotes.map((q) => (
              <TableCell key={q.id} className={cn("text-right text-base font-semibold tabular-nums", q.id === cheapestId && "bg-emerald-50/60")}>
                {formatMoney(q.total)}
              </TableCell>
            ))}
          </TableRow>
          {onChoose && (
            <TableRow>
              <TableCell />
              {quotes.map((q) => (
                <TableCell key={q.id} className="text-right">
                  <ConfirmAction
                    title={`¿Elegir a ${q.supplier?.name ?? "este proveedor"}?`}
                    description={`Se crea la orden de compra por ${formatMoney(q.total)} y se manda a autorización. Las demás cotizaciones quedan como no elegidas.`}
                    confirmLabel={chooseLabel}
                    onConfirm={() => onChoose(q)}
                    trigger={
                      <Button size="sm" className="gap-1">
                        <FileCheck2 className="h-4 w-4" /> {chooseLabel}
                      </Button>
                    }
                  />
                </TableCell>
              ))}
            </TableRow>
          )}
        </TableFooter>
      </Table>
    </div>
  );
}
