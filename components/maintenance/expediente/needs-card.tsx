"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, PencilLine, Plus, RefreshCw, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { useProductCategories } from "@/hooks/services/maintenance/use-maintenance";
import { addNeed, dismissNeed, pickNeedOffer, recalculateNeeds } from "@/lib/services/maintenance";
import { formatMoney, NeedSource, NeedView, OFFER_LABEL, RankedOffer } from "@/lib/types/maintenance";
import { ComboField, TextField } from "@/components/ui/field";
import { StarRating } from "../shared/star-rating";
import { apiError } from "../shared/confirm-action";
import { CapturePriceForm } from "./capture-price-form";

const SOURCE_CLASS: Record<NeedSource, string> = {
  receta: "border-sky-200 bg-sky-50 text-sky-700",
  ficha: "border-violet-200 bg-violet-50 text-violet-700",
  palabra: "border-amber-200 bg-amber-50 text-amber-800",
  manual: "border-slate-200 bg-slate-50 text-slate-600",
};
const qty = (n: number) => (Number.isInteger(Number(n)) ? String(Number(n)) : Number(n).toFixed(2));

/**
 * "Lo que se necesita": piezas e insumos propuestos por la receta del servicio, la ficha de la unidad o lo
 * que escribió quien pide; por cada uno, hasta 4 sugerencias del catálogo o "Capturar precio" a mano
 * (sin tener que darlo de alta antes). Todo termina en la cotización de cada proveedor.
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
  const [capturing, setCapturing] = useState<string | null>(null);

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
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 p-4 pb-3">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-primary" /> Lo que se necesita</CardTitle>
          <CardDescription className="text-xs">
            {editable
              ? "Elige una sugerencia o captura el precio que te dio el proveedor; se arma la cotización de cada uno."
              : "Piezas e insumos que se cotizaron para esta solicitud."}
          </CardDescription>
        </div>
        {editable && (
          <div className="flex shrink-0 gap-1.5">
            <Button size="sm" variant="ghost" className="h-8" disabled={!!busy} onClick={() => run("recalc", () => recalculateNeeds(requestId), "Lista actualizada", "No se pudo recalcular")}>
              {busy === "recalc" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />} Recalcular
            </Button>
            <Button size="sm" variant="outline" className="h-8" onClick={() => setAdding((v) => !v)}><Plus className="mr-1 h-3.5 w-3.5" /> Agregar</Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2.5 p-4 pt-0">
        {adding && editable && (
          <div className="flex flex-wrap items-start gap-2 rounded-xl border bg-muted/30 p-3">
            <ComboField className="min-w-[240px] flex-1" label="Pieza o insumo" value={newCat} onChange={setNewCat} options={categoryOptions} modal={false}
              placeholder="Buscar pieza o insumo" searchPlaceholder="Escribe para buscar…" />
            <TextField className="w-28" label="Cantidad" type="number" min={0.01} step="0.01" value={newQty} onChange={(e) => setNewQty(e.target.value)} />
            <Button className="h-12 rounded-xl" disabled={!newCat || !(Number(newQty) > 0) || busy === "add"}
              onClick={() => run("add", async () => { await addNeed(requestId, { categoryId: newCat!, quantity: Number(newQty) }); setNewCat(null); setNewQty("1"); setAdding(false); }, "Agregado a la lista", "No se pudo agregar")}>
              {busy === "add" && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Agregar a la lista
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center p-5"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : needs.length === 0 ? (
          <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
            No se encontraron piezas ni insumos para lo que se pidió.
            {editable && " Agrégalos con \"Agregar\", o ponle receta al servicio en Mantenimiento → Servicios."}
          </div>
        ) : (
          needs.map((n) => (
            <div key={n.id} className="rounded-xl border p-2.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-sm font-semibold">{n.category.name}</p>
                <span className="text-xs text-muted-foreground">× {qty(n.quantity)} {n.unit?.abbreviation ?? n.unit?.name ?? ""}</span>
                {n.product && <span className="text-xs text-muted-foreground">· preferido: {n.product.name}</span>}
                <Badge variant="outline" className={cn("h-5 px-1.5 text-[10px] font-normal", SOURCE_CLASS[n.source])}>{n.sourceLabel}</Badge>
                {n.inQuote && (
                  <Badge className="h-5 gap-1 bg-emerald-600 px-1.5 text-[10px] hover:bg-emerald-600"><Check className="h-3 w-3" /> En cotización de {n.inQuote.supplierName}</Badge>
                )}
                {editable && (
                  <div className="ml-auto flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setCapturing(capturing === n.id ? null : n.id)}>
                      <PencilLine className="mr-1 h-3.5 w-3.5" /> Capturar precio
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" disabled={!!busy} aria-label={`Quitar ${n.category.name}`}
                      title="Quitar de la lista" onClick={() => run(`dismiss-${n.id}`, () => dismissNeed(n.id), "Quitado de la lista", "No se pudo quitar")}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {capturing === n.id && editable && (
                <div className="mt-2.5">
                  <CapturePriceForm need={n} onCancel={() => setCapturing(null)} onSaved={async () => { setCapturing(null); await onChanged(); }} />
                </div>
              )}

              {n.suggestions.length === 0 ? (
                capturing !== n.id && (
                  <p className="mt-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    Aún no hay precios de <b>{n.category.name}</b> en el catálogo.
                    {editable && <> Usa <b>Capturar precio</b> con lo que te diga el proveedor; al generar las órdenes podrás guardarlo en el catálogo.</>}
                  </p>
                )
              ) : (
                <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {n.suggestions.map((o) => {
                    const chosen = n.inQuote?.offerProductId === o.productId && n.inQuote?.supplierId === o.supplierId;
                    return (
                      <div key={o.offerId} className={cn("flex flex-col gap-1 rounded-lg border p-2", chosen && "border-emerald-500 bg-emerald-50/60")}>
                        <div className="flex flex-wrap gap-1">
                          {o.labels.length
                            ? o.labels.map((l) => <span key={l} className="rounded bg-primary/10 px-1.5 py-px text-[10px] font-medium text-primary">{OFFER_LABEL[l]}</span>)
                            : <span className="rounded bg-muted px-1.5 py-px text-[10px] text-muted-foreground">Otra opción</span>}
                        </div>
                        <p className="truncate text-[13px] font-medium leading-tight" title={o.productName}>{o.productName}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{[o.brand, o.supplierName].filter(Boolean).join(" · ")}</p>
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-[13px] font-semibold tabular-nums">{formatMoney(o.price)}<span className="text-[10px] font-normal text-muted-foreground">{o.unitName ? ` /${o.unitName}` : ""}</span></span>
                          {o.quality ? <StarRating value={o.quality} /> : <span className="text-[10px] text-muted-foreground">Sin calificar</span>}
                        </div>
                        {editable && (
                          <Button size="sm" variant={chosen ? "ghost" : "outline"} className={cn("mt-0.5 h-7 text-xs", chosen && "text-emerald-700 hover:text-emerald-700")}
                            disabled={!!busy || chosen} onClick={() => pick(n, o)}>
                            {busy === `pick-${o.offerId}` ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : chosen ? <Check className="mr-1 h-3.5 w-3.5" /> : null}
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
