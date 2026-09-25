"use client";

import { Fragment, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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

const SOURCE_SHORT: Record<NeedSource, string> = { receta: "Servicio", ficha: "Ficha", palabra: "Lo escribió", manual: "Compras" };
const qty = (n: number) => (Number.isInteger(Number(n)) ? String(Number(n)) : Number(n).toFixed(2));
const money0 = (n: number) => formatMoney(n).replace(/\.00$/, "");

/**
 * "Lo que se necesita" en tabla densa: una pieza/insumo por renglón y sus sugerencias como "pastillas"
 * de una línea (clic = elegir). "Capturar precio" abre una sola línea debajo del renglón.
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
  const inQuoteCount = needs.filter((n) => n.inQuote).length;

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
    <section className="overflow-hidden rounded-xl border bg-card">
      <header className="flex items-center gap-2 border-b px-3 py-2">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <h3 className="text-[13px] font-semibold">Lo que se necesita</h3>
        <span className="text-[11px] text-muted-foreground">
          {needs.length} {needs.length === 1 ? "pieza" : "piezas"}{needs.length ? ` · ${inQuoteCount} en cotización` : ""}
        </span>
        {editable && (
          <div className="ml-auto flex gap-1">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={!!busy} onClick={() => run("recalc", () => recalculateNeeds(requestId), "Lista actualizada", "No se pudo recalcular")}>
              {busy === "recalc" ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1 h-3.5 w-3.5" />} Recalcular
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setAdding((v) => !v)}><Plus className="mr-1 h-3.5 w-3.5" /> Agregar</Button>
          </div>
        )}
      </header>

      {adding && editable && (
        <div className="flex flex-wrap items-center gap-1.5 border-b bg-muted/30 px-3 py-2">
          <ComboField size="sm" className="min-w-[240px] flex-1" label="Pieza o insumo" value={newCat} onChange={setNewCat} options={categoryOptions} modal={false}
            placeholder="Buscar pieza o insumo…" searchPlaceholder="Escribe para buscar…" />
          <TextField size="sm" className="w-24" label="Cantidad" type="number" min={0.01} step="0.01" value={newQty} onChange={(e) => setNewQty(e.target.value)} />
          <Button size="sm" className="h-9" disabled={!newCat || !(Number(newQty) > 0) || busy === "add"}
            onClick={() => run("add", async () => { await addNeed(requestId, { categoryId: newCat!, quantity: Number(newQty) }); setNewCat(null); setNewQty("1"); setAdding(false); }, "Agregado a la lista", "No se pudo agregar")}>
            {busy === "add" && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />} Agregar a la lista
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
      ) : needs.length === 0 ? (
        <p className="px-3 py-4 text-center text-xs text-muted-foreground">
          No se encontraron piezas ni insumos para lo que se pidió.{editable && " Agrégalos con \"Agregar\", o ponle receta al servicio en Mantenimiento → Servicios."}
        </p>
      ) : (
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="w-[26%] px-3 py-1.5 font-semibold">Pieza o insumo</th>
              <th className="px-3 py-1.5 font-semibold">Sugerencias del catálogo</th>
              {editable && <th className="w-16 px-2 py-1.5" />}
            </tr>
          </thead>
          <tbody>
            {needs.map((n) => (
              <Fragment key={n.id}>
                <tr className="border-b last:border-b-0">
                  <td className="px-3 py-1.5 align-middle">
                    <div className="flex flex-wrap items-center gap-x-1.5">
                      <span className="font-semibold">{n.category.name}</span>
                      <span className="text-muted-foreground">× {qty(n.quantity)}{n.unit?.abbreviation ? ` ${n.unit.abbreviation}` : ""}</span>
                      <span className="rounded bg-amber-100 px-1 text-[11px] text-amber-800" title={n.sourceLabel}>{SOURCE_SHORT[n.source]}</span>
                    </div>
                    {n.inQuote && <p className="flex items-center gap-1 text-[11px] text-emerald-700"><Check className="h-3 w-3" /> En cotización de {n.inQuote.supplierName}</p>}
                  </td>
                  <td className="px-3 py-1.5 align-middle">
                    {n.suggestions.length === 0 ? (
                      <span className="text-xs text-muted-foreground">
                        Sin precios en el catálogo{editable && <> · <button type="button" className="font-semibold text-primary hover:underline" onClick={() => setCapturing(n.id)}>Capturar precio</button></>}
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {n.suggestions.map((o) => {
                          const chosen = n.inQuote?.offerProductId === o.productId && n.inQuote?.supplierId === o.supplierId;
                          const label = o.labels.length ? o.labels.map((l) => OFFER_LABEL[l]).join(" · ") : "Otra";
                          return (
                            <button
                              key={o.offerId}
                              type="button"
                              disabled={!editable || !!busy || chosen}
                              onClick={() => pick(n, o)}
                              title={`${o.productName}${o.brand ? ` · ${o.brand}` : ""} — ${o.supplierName}${o.purchases ? ` · comprado ${o.purchases} ${o.purchases === 1 ? "vez" : "veces"}` : ""}`}
                              className={cn(
                                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2 py-0.5 text-xs transition",
                                "enabled:hover:border-primary/40 enabled:hover:bg-primary/5 disabled:cursor-default",
                                chosen && "border-emerald-500 bg-emerald-50",
                              )}
                            >
                              {busy === `pick-${o.offerId}` ? <Loader2 className="h-3 w-3 animate-spin" /> : chosen && <Check className="h-3 w-3 text-emerald-700" />}
                              <span className={cn("text-[11px] font-bold uppercase tracking-wide", chosen ? "text-emerald-700" : o.labels.length ? "text-primary" : "text-muted-foreground")}>{label}</span>
                              <span className="max-w-[140px] truncate">{o.supplierName}</span>
                              <span className="font-semibold tabular-nums">{money0(o.price)}</span>
                              {o.quality ? <StarRating value={o.quality} className="[&_svg]:h-2.5 [&_svg]:w-2.5" /> : null}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </td>
                  {editable && (
                    <td className="px-2 py-1.5 text-right align-middle">
                      <div className="inline-flex">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" title="Capturar precio" aria-label={`Capturar precio de ${n.category.name}`}
                          onClick={() => setCapturing(capturing === n.id ? null : n.id)}>
                          <PencilLine className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" disabled={!!busy} title="Quitar de la lista" aria-label={`Quitar ${n.category.name}`}
                          onClick={() => run(`dismiss-${n.id}`, () => dismissNeed(n.id), "Quitado de la lista", "No se pudo quitar")}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
                {capturing === n.id && editable && (
                  <tr className="border-b">
                    <td colSpan={3} className="p-0">
                      <CapturePriceForm need={n} onCancel={() => setCapturing(null)} onSaved={async () => { setCapturing(null); await onChanged(); }} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
