"use client";

import { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney, PurchaseOrderItem } from "@/lib/types/maintenance";
import { itemAmount, totals } from "@/lib/maintenance-money";

export type ItemsMode = "view" | "edit" | "authorize";

interface Props {
  items: PurchaseOrderItem[];
  mode: ItemsMode;
  onChange?: (items: PurchaseOrderItem[]) => void;
}

/**
 * Partidas de la orden.
 * - view: solo lectura (las no aprobadas se ven tachadas).
 * - edit: quien captura (borrador) agrega/quita/edita.
 * - authorize: el autorizador palomea qué aprueba y puede ajustar cantidad/precio.
 */
export function OrderItemsTable({ items, mode, onChange }: Props) {
  const t = useMemo(() => totals(items, true), [items]);
  const patch = (idx: number, p: Partial<PurchaseOrderItem>) => onChange?.(items.map((it, i) => (i === idx ? { ...it, ...p } : it)));
  const editable = mode !== "view";

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {mode === "authorize" && <TableHead className="w-20">Aprobar</TableHead>}
            <TableHead>Concepto</TableHead>
            <TableHead className="w-28 text-right">Cant.</TableHead>
            <TableHead className="w-36 text-right">P. unitario</TableHead>
            <TableHead className="w-36 text-right">Importe</TableHead>
            {mode === "edit" && <TableHead className="w-10" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((it, idx) => {
            const off = it.approved === false;
            return (
              <TableRow key={it.id ?? idx} className={cn(off && "bg-muted/40")}>
                {mode === "authorize" && (
                  <TableCell>
                    <Checkbox checked={!off} onCheckedChange={(v) => patch(idx, { approved: v === true })} aria-label="Aprobar partida" />
                  </TableCell>
                )}
                <TableCell className={cn(off && "text-muted-foreground line-through")}>
                  {mode === "edit" ? (
                    <Input value={it.description} onChange={(e) => patch(idx, { description: e.target.value })} />
                  ) : (
                    it.description
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {editable ? (
                    <Input type="number" min={0.01} step="0.01" className="text-right" value={it.quantity}
                      onChange={(e) => patch(idx, { quantity: Number(e.target.value) })} disabled={off} />
                  ) : (
                    Number(it.quantity)
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {editable ? (
                    <Input type="number" min={0} step="0.01" className="text-right" value={it.unitPrice}
                      onChange={(e) => patch(idx, { unitPrice: Number(e.target.value) })} disabled={off} />
                  ) : (
                    formatMoney(it.unitPrice)
                  )}
                </TableCell>
                <TableCell className={cn("text-right tabular-nums", off && "text-muted-foreground line-through")}>
                  {formatMoney(itemAmount(it))}
                </TableCell>
                {mode === "edit" && (
                  <TableCell>
                    <Button size="icon" variant="ghost" className="text-destructive" disabled={items.length === 1}
                      onClick={() => onChange?.(items.filter((_, i) => i !== idx))} aria-label="Quitar partida">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="flex flex-col gap-3 border-t p-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {mode === "edit" && (
            <Button type="button" variant="outline" size="sm" className="gap-1"
              onClick={() => onChange?.([...items, { description: "", quantity: 1, unitPrice: 0, taxRate: 0.16, approved: true }])}>
              <Plus className="h-4 w-4" /> Agregar partida
            </Button>
          )}
          {mode === "authorize" && (
            <p className="text-xs text-muted-foreground">Solo las partidas palomeadas se envían al proveedor.</p>
          )}
        </div>
        <dl className="grid min-w-[220px] grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Subtotal</dt><dd className="text-right tabular-nums">{formatMoney(t.subtotal)}</dd>
          <dt className="text-muted-foreground">IVA</dt><dd className="text-right tabular-nums">{formatMoney(t.tax)}</dd>
          <dt className="font-semibold">Total</dt><dd className="text-right font-semibold tabular-nums">{formatMoney(t.total)}</dd>
        </dl>
      </div>
    </div>
  );
}
