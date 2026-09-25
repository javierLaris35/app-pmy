"use client";

import { useEffect, useMemo, useState } from "react";
import { ColumnDef, Row } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { useProducts } from "@/hooks/services/maintenance/use-maintenance";
import { deleteProduct } from "@/lib/services/maintenance";
import { bestOffer, KIND_LABEL, Product } from "@/lib/types/compras";
import { formatMoney } from "@/lib/types/maintenance";
import { ProductFormDialog } from "./product-form-dialog";
import { apiError, ConfirmAction } from "../shared/confirm-action";
import { StarRating } from "../shared/star-rating";

const KIND_CLASS = {
  pieza: "border-sky-200 bg-sky-50 text-sky-700",
  insumo: "border-violet-200 bg-violet-50 text-violet-700",
  servicio: "border-amber-200 bg-amber-50 text-amber-700",
  equipo: "border-slate-200 bg-slate-50 text-slate-600",
} as const;

/** Detalle expandible: todos los proveedores del producto, del más barato al más caro. */
function OffersDetail({ row }: { row: Row<Product> }) {
  const offers = [...row.original.offers].sort((a, b) => Number(a.price) - Number(b.price));
  if (!offers.length) return <p className="px-4 py-3 text-sm text-muted-foreground">Sin precios de proveedores todavía.</p>;
  return (
    <div className="grid gap-2 px-4 py-3 sm:grid-cols-2 lg:grid-cols-3">
      {offers.map((o, i) => (
        <div key={o.id} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2">
          <div>
            <p className="text-sm font-medium">{o.supplier?.name}{i === 0 && offers.length > 1 && <Badge variant="outline" className="ml-2 border-emerald-300 text-emerald-700">Más barato</Badge>}</p>
            <StarRating value={o.quality} />
          </div>
          <div className="text-right">
            <p className="font-semibold tabular-nums">{formatMoney(o.price)}</p>
            <p className="text-xs text-muted-foreground">{o.unit?.name ?? "—"}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** `createSignal` lo incrementa el header ("Nuevo producto") para abrir el alta. */
export function ProductsTab({ createSignal = 0 }: { createSignal?: number }) {
  const { products, mutate } = useProducts({ includeInactive: true });
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { if (createSignal > 0) { setEditing(null); setOpen(true); } }, [createSignal]);

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      {
        id: "expand",
        cell: ({ row }) => (
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => row.toggleExpanded()} aria-label="Ver proveedores">
            {row.getIsExpanded() ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        ),
      },
      {
        id: "search",
        accessorFn: (p) => `${p.name} ${p.partNumber ?? ""} ${p.brand ?? ""} ${p.category?.name ?? ""}`,
        header: "Producto",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">
              {[row.original.brand, row.original.partNumber && `No. parte ${row.original.partNumber}`].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>
        ),
      },
      {
        id: "category",
        accessorFn: (p) => p.category?.kind ?? "",
        header: "Categoría",
        filterFn: (row, id, value: string[]) => !value?.length || value.includes(String(row.getValue(id))),
        cell: ({ row }) => row.original.category ? (
          <div className="flex flex-col items-start gap-1">
            <Badge variant="outline" className={KIND_CLASS[row.original.category.kind]}>{KIND_LABEL[row.original.category.kind]}</Badge>
            <span className="text-xs text-muted-foreground">{row.original.category.name}</span>
          </div>
        ) : <span className="text-muted-foreground">—</span>,
      },
      { id: "unit", header: "Unidad", cell: ({ row }) => row.original.unit?.name ?? "—" },
      {
        id: "best",
        header: () => <div className="text-right">Mejor precio</div>,
        cell: ({ row }) => {
          const b = bestOffer(row.original);
          return b ? (
            <div className="text-right">
              <p className="font-semibold tabular-nums">{formatMoney(b.price)}</p>
              <p className="text-xs text-muted-foreground">{b.supplier?.name}</p>
            </div>
          ) : <div className="text-right text-muted-foreground">—</div>;
        },
      },
      {
        id: "quality",
        header: "Mejor calidad",
        cell: ({ row }) => {
          const q = Math.max(0, ...row.original.offers.map((o) => Number(o.quality ?? 0)));
          return q ? <StarRating value={q} /> : <span className="text-muted-foreground">—</span>;
        },
      },
      { id: "suppliers", header: "Proveedores", cell: ({ row }) => <span className="tabular-nums">{row.original.offers.length}</span> },
      {
        id: "actions",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button size="icon" variant="ghost" onClick={() => { setEditing(row.original); setOpen(true); }} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
            <ConfirmAction
              destructive
              title="¿Eliminar producto?"
              description={`"${row.original.name}" ya no aparecerá para solicitudes nuevas. Lo ya cotizado no cambia.`}
              confirmLabel="Eliminar"
              onConfirm={async () => {
                try { await deleteProduct(row.original.id); toast.success("Producto eliminado"); mutate(); }
                catch (e) { toast.error(apiError(e, "No se pudo eliminar")); }
              }}
              trigger={<Button size="icon" variant="ghost" className="text-destructive" aria-label="Eliminar"><Trash2 className="h-4 w-4" /></Button>}
            />
          </div>
        ),
      },
    ],
    [mutate],
  );

  const kindOptions = (Object.keys(KIND_LABEL) as Array<keyof typeof KIND_LABEL>).map((k) => ({ label: KIND_LABEL[k], value: k }));

  return (
    <div className="space-y-3">
      <DataTable columns={columns} data={products} searchKey="search" filters={[{ columnId: "category", title: "Categoría", options: kindOptions }]} renderSubComponent={OffersDetail} />
      <ProductFormDialog open={open} onOpenChange={setOpen} product={editing} onSaved={() => mutate()} />
    </div>
  );
}
