"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Building2, CalendarDays, Loader2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/lib/toast";
import { useSubsidiaries } from "@/hooks/services/subsidiaries/use-subsidiaries";
import {
  ApprovalImpact,
  ConsolidatedActionPayload,
  ConsolidatedActionType,
  getApprovalImpact,
  requestApproval,
} from "@/lib/services/approvals";

const MIN_JUSTIFICATION = 10;

const COPY: Record<ConsolidatedActionType, { title: string; icon: typeof Trash2; tone: string; button: string; help: string }> = {
  delete_consolidado: {
    title: "Eliminar consolidado",
    icon: Trash2,
    tone: "text-rose-600",
    button: "Pedir eliminación",
    help: "Se dan de baja el consolidado, sus guías y cargas, y se anulan sus ingresos. Las salidas a ruta y cierres que ya pasaron no se tocan.",
  },
  change_subsidiary_consolidado: {
    title: "Cambiar sucursal del consolidado",
    icon: Building2,
    tone: "text-sky-700",
    button: "Pedir cambio de sucursal",
    help: "El consolidado, sus guías, cargas, devoluciones e ingresos pasan a la otra sucursal, y los ingresos se recalculan con su tarifa.",
  },
  change_date_consolidado: {
    title: "Cambiar fecha del consolidado",
    icon: CalendarDays,
    tone: "text-violet-700",
    button: "Pedir cambio de fecha",
    help: "Cambia la fecha del consolidado y de sus cargas; el cobro de la carga se recalcula con las reglas del día nuevo. Los cobros por paquete no cambian.",
  },
};

const money = (n?: number) =>
  (n ?? 0).toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 });

const todayHermosillo = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Hermosillo" }).format(new Date());

/** Diálogo único para pedir (con justificación) borrar / cambiar sucursal / cambiar fecha de un consolidado. */
export function ConsolidatedActionDialog({
  open,
  onOpenChange,
  type,
  consolidated,
  onRequested,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  type: ConsolidatedActionType;
  consolidated: { id: string; consNumber: string; subsidiaryId?: string; subsidiary?: { id: string; name: string }; date?: string };
  onRequested?: () => void;
}) {
  const copy = COPY[type];
  const Icon = copy.icon;
  const currentSubsidiaryId = consolidated.subsidiary?.id ?? consolidated.subsidiaryId;
  const { subsidiaries } = useSubsidiaries();

  const [newSubsidiaryId, setNewSubsidiaryId] = useState("");
  const [newDate, setNewDate] = useState("");
  const [justification, setJustification] = useState("");
  const [touched, setTouched] = useState(false);
  const [impact, setImpact] = useState<ApprovalImpact | null>(null);
  const [impactError, setImpactError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const payload: ConsolidatedActionPayload | null = useMemo(() => {
    if (type === "change_subsidiary_consolidado") return newSubsidiaryId ? { newSubsidiaryId } : null;
    if (type === "change_date_consolidado") return newDate ? { newDate } : null;
    return {};
  }, [type, newSubsidiaryId, newDate]);

  useEffect(() => {
    if (!open) return;
    setImpact(null);
    setImpactError(null);
    if (!payload) return;
    let cancelled = false;
    setLoading(true);
    getApprovalImpact(type, consolidated.id, payload)
      .then((r) => { if (!cancelled) setImpact(r); })
      .catch((e) => { if (!cancelled) setImpactError(e?.response?.data?.message || "No se pudo calcular el impacto."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, type, consolidated.id, payload]);

  const justificationError =
    justification.trim().length < MIN_JUSTIFICATION ? `Escribe por qué (mínimo ${MIN_JUSTIFICATION} caracteres).` : null;
  const targetError =
    type === "change_subsidiary_consolidado" && !newSubsidiaryId
      ? "Elige la sucursal destino."
      : type === "change_date_consolidado" && !newDate
        ? "Elige la fecha nueva."
        : null;

  const submit = async () => {
    setTouched(true);
    if (justificationError || targetError || impactError || !impact) return;
    setSending(true);
    try {
      await requestApproval(type, consolidated.id, { justification: justification.trim(), payload: payload ?? {} });
      toast.success(`Solicitud enviada${impact.approver?.name ? ` a ${impact.approver.name}` : ""}`);
      onRequested?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo enviar la solicitud");
    } finally {
      setSending(false);
    }
  };

  const s = impact?.summary;
  const options = subsidiaries.filter((x: any) => x.id !== currentSubsidiaryId && x.active !== false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${copy.tone}`}>
            <Icon className="h-5 w-5" /> {copy.title}
          </DialogTitle>
          <DialogDescription>{copy.help}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="rounded-lg border bg-muted/40 px-3 py-2">
            <p className="font-medium">Consolidado {consolidated.consNumber}</p>
            <p className="text-muted-foreground">
              {consolidated.subsidiary?.name ?? "—"}
              {consolidated.date ? ` · ${String(consolidated.date).slice(0, 10)}` : ""}
            </p>
          </div>

          {type === "change_subsidiary_consolidado" && (
            <div className="space-y-1.5">
              <Label>Sucursal destino</Label>
              <Select value={newSubsidiaryId} onValueChange={setNewSubsidiaryId}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Elige la sucursal" /></SelectTrigger>
                <SelectContent>
                  {options.map((x: any) => (
                    <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {touched && targetError && <p className="text-xs text-rose-600">{targetError}</p>}
            </div>
          )}

          {type === "change_date_consolidado" && (
            <div className="space-y-1.5">
              <Label>Fecha nueva</Label>
              <Input type="date" className="h-10" value={newDate} max={todayHermosillo()} onChange={(e) => setNewDate(e.target.value)} />
              {touched && targetError && <p className="text-xs text-rose-600">{targetError}</p>}
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Calculando qué cambia…
            </div>
          )}

          {impactError && !loading && (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">{impactError}</p>
          )}

          {impact && s && !loading && (
            <div className="space-y-2">
              {impact.change && (
                <p className="flex items-center gap-2 font-medium">
                  {impact.change.from} <ArrowRight className="h-4 w-4 text-muted-foreground" /> {impact.change.to}
                </p>
              )}
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Guías" value={type === "change_subsidiary_consolidado" ? s.shipments : impact.counts.shipments} />
                <Stat label="Guías de carga" value={impact.counts.charges} />
                <Stat label="Ingresos" value={impact.counts.withIncome} />
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
              placeholder="Ej. Se subió en la sucursal equivocada; lo entregó Vía Larga."
              className="min-h-[80px]"
            />
            {touched && justificationError && <p className="text-xs text-rose-600">{justificationError}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>Cancelar</Button>
          <Button
            variant={type === "delete_consolidado" ? "destructive" : "default"}
            onClick={submit}
            disabled={sending || loading}
          >
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {copy.button}
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
