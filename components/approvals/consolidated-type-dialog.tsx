"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { AlertTriangle, ArrowLeftRight, ArrowRight, Loader2, Package, Search, Truck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  ApprovalImpact,
  ConsolidatedActionPayload,
  getConsolidatedTypeOptions,
  postApprovalImpact,
  requestApproval,
} from "@/lib/services/approvals";

const MIN_JUSTIFICATION = 10;
type ToType = "carga" | "paquete";

export interface ConsolidatedTypePrefill {
  toType: ToType;
  /** Guías elegidas; vacío = consolidado completo. */
  trackingNumbers?: string[];
  targetConsolidatedId?: string | null;
  destConsNumber?: string | null;
  justification?: string;
}

const money = (n?: number) => (n ?? 0).toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 });
const STATUS = (s: string | null) => (s ?? "").replace(/_/g, " ");

/**
 * Pedir (con justificación y autorización) que un consolidado o algunas de sus guías pasen de
 * paquete a carga F2 o al revés. Se abre desde "Más acciones" del consolidado o desde el aviso
 * del correo en la bandeja (ya lleno).
 */
export function ConsolidatedTypeDialog({
  open,
  onOpenChange,
  consolidated,
  prefill,
  onRequested,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  consolidated: { id: string; consNumber: string; subsidiary?: { id: string; name: string }; subsidiaryName?: string };
  prefill?: ConsolidatedTypePrefill;
  onRequested?: () => void;
}) {
  const { data: options, isLoading: loadingOptions } = useSWR(open ? ["/approvals/type-options", consolidated.id] : null, () =>
    getConsolidatedTypeOptions(consolidated.id),
  );

  const [toType, setToType] = useState<ToType | null>(prefill?.toType ?? null);
  const [mode, setMode] = useState<"todas" | "algunas">(prefill?.trackingNumbers?.length ? "algunas" : "todas");
  const [selected, setSelected] = useState<Set<string>>(new Set(prefill?.trackingNumbers ?? []));
  const [filter, setFilter] = useState("");
  const [isHalfTon, setIsHalfTon] = useState(false);
  const [justification, setJustification] = useState(prefill?.justification ?? "");
  const [touched, setTouched] = useState(false);
  const [impact, setImpact] = useState<ApprovalImpact | null>(null);
  const [impactError, setImpactError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Sin prefill: se propone el único sentido posible.
  useEffect(() => {
    if (toType || !options) return;
    if (options.packages.length && !options.charges.length) setToType("carga");
    else if (options.charges.length && !options.packages.length) setToType("paquete");
  }, [options, toType]);

  const source = useMemo(() => (toType === "carga" ? options?.packages ?? [] : toType === "paquete" ? options?.charges ?? [] : []), [options, toType]);
  const visible = useMemo(() => {
    const q = filter.trim();
    return q ? source.filter((g) => g.trackingNumber.includes(q)) : source;
  }, [source, filter]);

  const payload: ConsolidatedActionPayload | null = useMemo(() => {
    if (!toType) return null;
    if (mode === "algunas" && selected.size === 0) return null;
    return {
      toType,
      ...(mode === "algunas" ? { trackingNumbers: [...selected] } : {}),
      ...(prefill?.targetConsolidatedId ? { targetConsolidatedId: prefill.targetConsolidatedId } : {}),
      ...(prefill?.destConsNumber ? { destConsNumber: prefill.destConsNumber } : {}),
      ...(toType === "carga" && options && !options.hasCharge ? { isHalfTon } : {}),
    };
  }, [toType, mode, selected, prefill, isHalfTon, options]);

  // Impacto (con espera corta para no pedirlo en cada clic de la lista).
  useEffect(() => {
    if (!open) return;
    setImpact(null);
    setImpactError(null);
    if (!payload) return;
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      postApprovalImpact("change_type_consolidado", consolidated.id, payload)
        .then((r) => { if (!cancelled) setImpact(r); })
        .catch((e) => { if (!cancelled) setImpactError(e?.response?.data?.message || "No se pudo calcular el impacto."); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [open, consolidated.id, payload]);

  const justificationError =
    justification.trim().length < MIN_JUSTIFICATION ? `Escribe por qué (mínimo ${MIN_JUSTIFICATION} caracteres).` : null;
  const choiceError = !toType ? "Elige a qué tipo pasa." : mode === "algunas" && selected.size === 0 ? "Marca al menos una guía." : null;

  const submit = async () => {
    setTouched(true);
    if (justificationError || choiceError || impactError || !impact || !payload) return;
    setSending(true);
    try {
      await requestApproval("change_type_consolidado", consolidated.id, { justification: justification.trim(), payload });
      toast.success(`Solicitud enviada${impact.approver?.name ? ` a ${impact.approver.name}` : ""}`);
      onRequested?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo enviar la solicitud");
    } finally {
      setSending(false);
    }
  };

  const toggle = (tn: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(tn); else next.delete(tn);
      return next;
    });
  const allVisibleOn = visible.length > 0 && visible.every((g) => selected.has(g.trackingNumber));
  const s = impact?.summary;
  const subsidiaryName = consolidated.subsidiary?.name ?? consolidated.subsidiaryName ?? "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-700">
            <ArrowLeftRight className="h-5 w-5" /> Cambiar tipo del consolidado
          </DialogTitle>
          <DialogDescription>
            Las guías pasan de paquete a carga F2 o al revés. Las originales quedan dadas de baja con su historial; se crean las nuevas con
            su estatus actual y se ajustan los ingresos y los cobros.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2">
            <div>
              <p className="font-medium">Consolidado {consolidated.consNumber}</p>
              <p className="text-muted-foreground">{subsidiaryName}</p>
            </div>
            {options && (
              <p className="text-right text-xs text-muted-foreground">
                {options.packages.length} paquete(s)
                <br />
                {options.charges.length} guía(s) de carga
              </p>
            )}
          </div>

          {loadingOptions ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando guías…
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>Pasar a</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["carga", "paquete"] as ToType[]).map((t) => {
                    const count = t === "carga" ? options?.packages.length ?? 0 : options?.charges.length ?? 0;
                    const Icon = t === "carga" ? Truck : Package;
                    return (
                      <Button
                        key={t}
                        type="button"
                        variant={toType === t ? "default" : "outline"}
                        className="h-auto justify-start gap-2 py-2"
                        disabled={!count}
                        onClick={() => { setToType(t); setSelected(new Set()); setMode("todas"); }}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-left">
                          <span className="block font-medium">{t === "carga" ? "Carga (F2)" : "Paquete"}</span>
                          <span className={cn("block text-[11px]", toType === t ? "text-white/80" : "text-muted-foreground")}>
                            {count ? `${count} guía(s) ${t === "carga" ? "hoy como paquete" : "hoy como carga"}` : "No hay guías para cambiar"}
                          </span>
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {toType && (
                <div className="space-y-1.5">
                  <Label>¿Qué guías?</Label>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant={mode === "todas" ? "secondary" : "ghost"} onClick={() => setMode("todas")}>
                      Todas ({source.length})
                    </Button>
                    <Button type="button" size="sm" variant={mode === "algunas" ? "secondary" : "ghost"} onClick={() => setMode("algunas")}>
                      Solo algunas{mode === "algunas" ? ` (${selected.size})` : ""}
                    </Button>
                  </div>
                  {mode === "algunas" && (
                    <div className="rounded-md border">
                      <div className="flex items-center gap-2 border-b px-2 py-1.5">
                        <Checkbox
                          checked={allVisibleOn}
                          onCheckedChange={(v) => visible.forEach((g) => toggle(g.trackingNumber, !!v))}
                          aria-label="Marcar todas las visibles"
                        />
                        <Search className="h-3.5 w-3.5 text-muted-foreground" />
                        <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Buscar guía" className="h-7 border-0 px-1 shadow-none focus-visible:ring-0" />
                      </div>
                      <ScrollArea className="h-44">
                        <ul className="divide-y">
                          {visible.map((g) => (
                            <li key={g.trackingNumber}>
                              <label className="flex cursor-pointer items-center gap-2 px-2 py-1 text-xs hover:bg-muted/50">
                                <Checkbox checked={selected.has(g.trackingNumber)} onCheckedChange={(v) => toggle(g.trackingNumber, !!v)} />
                                <span className="font-mono">{g.trackingNumber}</span>
                                <span className="ml-auto capitalize text-muted-foreground">{STATUS(g.status)}</span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              )}

              {toType === "carga" && options && !options.hasCharge && !prefill?.targetConsolidatedId && (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={isHalfTon} onCheckedChange={(v) => setIsHalfTon(!!v)} /> Es carga de 1.5 ton
                </label>
              )}
              {touched && choiceError && <p className="text-xs text-rose-600">{choiceError}</p>}
            </>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Calculando qué cambia…
            </div>
          )}
          {impactError && !loading && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">{impactError}</p>}

          {impact && s && !loading && (
            <div className="space-y-2">
              {impact.change && (
                <p className="flex items-center gap-2 font-medium">
                  {impact.change.from} <ArrowRight className="h-4 w-4 text-muted-foreground" /> {impact.change.to}
                </p>
              )}
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Guías nuevas" value={s.converted ?? 0} />
                <Stat label="Ingresos anulados" value={s.incomesAnnulled} />
                <Stat label="Ingresos nuevos" value={s.incomesCreated ?? 0} />
              </div>
              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                <span className="text-muted-foreground">Ingresos</span>
                <span className="font-semibold">
                  {money(s.amountBefore)}
                  {s.amountAfter !== s.amountBefore && (
                    <>
                      {" "}<ArrowRight className="inline h-3.5 w-3.5 text-muted-foreground" />{" "}
                      <span className={s.amountAfter < s.amountBefore ? "text-rose-600" : "text-emerald-700"}>{money(s.amountAfter)}</span>
                    </>
                  )}
                </span>
              </div>
              {(impact.warnings ?? []).map((w) => (
                <p key={w} className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {w}
                </p>
              ))}
              <p className="text-muted-foreground">
                Autoriza: <span className="font-medium text-foreground">{impact.approver?.name ?? "Administración"}</span>
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>¿Por qué se necesita?</Label>
            <Textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="Ej. FedEx mandó estas guías en la F2; se subieron como paquete dentro del master."
              className="min-h-[72px]"
            />
            {touched && justificationError && <p className="text-xs text-rose-600">{justificationError}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>Cancelar</Button>
          <Button onClick={submit} disabled={sending || loading}>
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Pedir cambio de tipo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-muted/40 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
