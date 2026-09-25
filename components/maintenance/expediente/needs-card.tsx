"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Check, Loader2, Plus, RefreshCw, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { useProductCategories } from "@/hooks/services/maintenance/use-maintenance";
import { addNeed, dismissNeed, pickNeedOffer, recalculateNeeds } from "@/lib/services/maintenance";
import { formatMoney, NeedSource, NeedView, OFFER_LABEL, RankedOffer } from "@/lib/types/maintenance";
import { StarRating } from "../shared/star-rating";
import { apiError } from "../shared/confirm-action";
import { SearchableSelect } from "../shared/searchable-select";

const SOURCE_CLASS: Record<NeedSource, string> = {
  receta: "border-sky-200 bg-sky-50 text-sky-700",
  ficha: "border-violet-200 bg-violet-50 text-violet-700",
  palabra: "border-amber-200 bg-amber-50 text-amber-800",
  manual: "border-slate-200 bg-slate-50 text-slate-700",
};
const qty = (n: number) => (Number.isInteger(Number(n)) ? String(Number(n)) : Number(n).toFixed(2));

/**
 * "Lo que se necesita": piezas e insumos propuestos por la receta del servicio, la ficha de la unidad o lo
 * que escribió quien pide; por cada uno, hasta 4 sugerencias del catálogo. "Elegir" la pone en la
 * cotización de ese proveedor con el precio del catálogo (luego se confirma con el proveedor).
 */
export function NeedsCard({ requestId, needs, editable, loading, onChanged }: {
  requestId: string;
  needs: NeedView[];
  /** false cuando ya hay órdenes: solo consulta. */
  editable: boolean;
  loading?: boolean;
  onChanged: () => Promise<unknown> | void;
}) {
  const { categories } = useProductCategories();
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newCat, setNewCat] = useState<string | null>(null);
  const [newQty, setNewQty] = useState("1");

  const inList = useMemo(() => new Set(needs.map((n) => n.category.id)), [needs]);
  const categoryOptions = useMemo(() => categories
    .filter((c) => c.active && (c.kind === "pieza" || c.kind === "insumo") && !inList.has(c.id))
    .map((c) => ({ value: c.id, label: c.name, group: c.kind === "pieza" ? "Piezas" : "Insumos" })), [categories, inList]);

  const run = async (key: string, fn: () => Promise<unknown>, ok?: string, fallback = "No se pudo completar") => {
    setBusy(key);
    try { await fn(); if (ok) toast.success(ok); await onChanged(); } catch (e) { toast.error(apiError(e, fallback)); } finally { setBusy(null); }
  };

  const pick = (n: NeedView, o: RankedOffer) => run(
    `pick-${o.offerId}`, () => pickNeedOffer(n.id, o.offerId),
    `${n.category.name}: se agregó a la cotización de ${o.supplierName}. Confirma precio y existencia con el proveedor.`,
    "No se pudo agregar a la cotización",
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-primary" /> Lo que se necesita</CardTitle>
          <CardDescription>
            {editable
              ? "Sugerencias según el servicio, la ficha de la unidad y lo que escribió quien pide. Elige una y se arma la cotización de ese proveedor."
              : "Piezas e insumos que se cotizaron para esta solicitud."}
          </CardDescription>
        </div>
        {editable && (
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => run("recalc", () => recalculateNeeds(requestId), "Lista actualizada", "No se pudo recalcular")}>
              {busy === "recalc" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />} Recalcular
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAdding((v) => !v)}><Plus className="mr-1.5 h-4 w-4" /> Agregar</Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {adding && editable && (
          <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/30 p-3">
            <div className="min-w-[240px] flex-1">
              <SearchableSelect value={newCat} onChange={setNewCat} options={categoryOptions} modal={false}
                placeholder="Buscar pieza o insumo" searchPlaceholder="Escribe para buscar…" emptyText="No hay coincidencias." />
            </div>
            <Input type="number" min={0.01} step="0.01" value={newQty} onChange={(e) => setNewQty(e.target.value)} className="w-24" aria-label="Cantidad" />
            <Button size="sm" disabled={!newCat || !(Number(newQty) > 0) || busy === "add"}
              onClick={() => run("add", async () => { await addNeed(requestId, { categoryId: newCat!, quantity: Number(newQty) }); setNewCat(null); setNewQty("1"); setAdding(false); }, "Agregado a la lista", "No se pudo agregar")}>
              {busy === "add" && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Agregar a la lista
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center p-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : needs.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No se encontraron piezas ni insumos para lo que se pidió.
            {editable && " Agrégalos con \"Agregar\", o ponle receta al servicio en Mantenimiento → Servicios."}
          </div>
        ) : (
          needs.map((n) => (
            <div key={n.id} className="rounded-lg border p-3">
              <div className="mb-2.5 flex flex-wrap items-center gap-2">
                <p className="font-medium">{n.category.name}</p>
                <span className="text-sm text-muted-foreground">× {qty(n.quantity)} {n.unit?.abbreviation ?? n.unit?.name ?? ""}</span>
                {n.product && <span className="text-xs text-muted-foreground">· preferido: {n.product.name}</span>}
                <Badge variant="outline" className={cn("h-5 text-[10px] font-normal", SOURCE_CLASS[n.source])}>{n.sourceLabel}</Badge>
                {n.inQuote && (
                  <Badge className="h-5 gap-1 bg-emerald-600 text-[10px] hover:bg-emerald-600"><Check className="h-3 w-3" /> En cotización de {n.inQuote.supplierName}</Badge>
                )}
                {editable && (
                  <Button size="icon" variant="ghost" className="ml-auto h-7 w-7 text-muted-foreground" disabled={!!busy} aria-label={`Quitar ${n.category.name}`}
                    title="Quitar de la lista" onClick={() => run(`dismiss-${n.id}`, () => dismissNeed(n.id), "Quitado de la lista", "No se pudo quitar")}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {n.suggestions.length === 0 ? (
                <p className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
                  Sin productos con precio en el catálogo para <b>{n.category.name}</b>.{" "}
                  <Link href="/compras/catalogos" className="text-primary underline-offset-2 hover:underline">Agrega uno en Catálogos</Link>
                  {" "}o captúralo a mano con &quot;Agregar cotización&quot;.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {n.suggestions.map((o) => {
                    const chosen = n.inQuote?.offerProductId === o.productId && n.inQuote?.supplierId === o.supplierId;
                    return (
                      <div key={o.offerId} className={cn("flex flex-col gap-1.5 rounded-md border p-2.5", chosen && "border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500")}>
                        <div className="flex flex-wrap gap-1">
                          {o.labels.length
                            ? o.labels.map((l) => <Badge key={l} variant="outline" className="h-5 border-primary/30 bg-primary/5 text-[10px] text-primary">{OFFER_LABEL[l]}</Badge>)
                            : <Badge variant="outline" className="h-5 text-[10px] text-muted-foreground">Otra opción</Badge>}
                        </div>
                        <p className="line-clamp-2 text-sm font-medium leading-tight">{o.productName}</p>
                        <p className="text-xs text-muted-foreground">{[o.brand, o.supplierName].filter(Boolean).join(" · ")}</p>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold tabular-nums">{formatMoney(o.price)}<span className="text-xs font-normal text-muted-foreground">{o.unitName ? ` /${o.unitName}` : ""}</span></span>
                          {o.quality ? <StarRating value={o.quality} /> : <span className="text-[10px] text-muted-foreground">Sin calificar</span>}
                        </div>
                        {o.purchases > 0 && <p className="text-[11px] text-muted-foreground">Comprado {o.purchases} {o.purchases === 1 ? "vez" : "veces"}</p>}
                        {editable && (
                          <Button size="sm" variant={chosen ? "secondary" : "outline"} className="mt-auto" disabled={!!busy || chosen} onClick={() => pick(n, o)}>
                            {busy === `pick-${o.offerId}` ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : chosen ? <Check className="mr-1.5 h-4 w-4" /> : null}
                            {chosen ? "Elegido" : "Elegir"}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
