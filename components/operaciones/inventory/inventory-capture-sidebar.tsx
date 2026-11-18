"use client";

import { AlertCircle, CheckCircle2, Loader2, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PackageInfo } from "@/lib/types";
import type { QuickFilterCounts, QuickFilterKey } from "@/lib/inventory-quick-filters";
import { daysUntilCommit } from "@/components/shared/package-list-item";
import { isDueOn, type AlertDay } from "@/lib/next-operating-day";
import { noDueMark } from "@/lib/inventory-excel-rules";

/** Agrupa de 4 en 4 para leerla de lejos (7945 1234 5678). */
const spaced = (code: string) => code.replace(/(.{4})(?=.)/g, "$1 ");

/**
 * "Última lectura": la guía recién escaneada, en grande y con color, para saber de un vistazo
 * (y de lejos, con el lector en la mano) si entró al inventario o no.
 */
export function LastReadCard({
  code,
  pkg,
  onTransfer,
  alertDay = null,
}: {
  code: string | null;
  pkg: PackageInfo | null;
  onTransfer?: (pkg: PackageInfo) => void;
  /** Día a vigilar cuando mañana no se opera. */
  alertDay?: AlertDay | null;
}) {
  if (!code) {
    return (
      <div className="rounded-xl border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
        Escanea la primera guía para empezar.
      </div>
    );
  }

  const pending = !pkg || pkg.isPendingValidation;
  const offline = !!(pkg as any)?.isOffline;
  const ok = !pending && !offline && !!pkg?.isValid;
  const shown = pkg ? pkg.dhlUniqueId || pkg.trackingNumber : code;

  const tone = pending || offline
    ? "border-border bg-muted/40 text-foreground"
    : ok
      ? "border-green-500 bg-green-50 text-green-900 dark:bg-green-950/40 dark:text-green-100"
      : "border-red-500 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-100";

  const days = ok && !noDueMark(pkg?.status) ? daysUntilCommit(pkg?.commitDateTime) : null;
  const monday = ok && !noDueMark(pkg?.status) && days !== 0 && days !== 1 && isDueOn(pkg?.commitDateTime, alertDay);
  const canTransfer = !!onTransfer && !!pkg && !pkg.isValid && !!pkg.subsidiary && !offline && !pending;

  return (
    <div className={cn("rounded-xl border-2 px-3 py-2.5", tone)} aria-live="polite">
      <div className="flex items-center gap-1.5 text-xs font-medium">
        {pending ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Validando…</>
        ) : offline ? (
          <><AlertCircle className="h-3.5 w-3.5" /> Sin conexión: se valida al volver internet</>
        ) : ok ? (
          <><CheckCircle2 className="h-3.5 w-3.5" /> Última lectura: entra al inventario</>
        ) : (
          <><AlertCircle className="h-3.5 w-3.5" /> Última lectura: no entra</>
        )}
      </div>

      <p className="mt-1 break-all font-mono text-xl font-semibold leading-tight tracking-wide tabular-nums">
        {spaced(shown)}
      </p>

      {ok && pkg && (
        <p className="mt-0.5 truncate text-xs opacity-80">
          {[pkg.recipientName, pkg.recipientZip, (pkg as any).zoneCity || pkg.recipientCity].filter(Boolean).join(" · ")}
        </p>
      )}
      {!ok && !pending && !offline && pkg?.reason && <p className="mt-0.5 text-xs">{pkg.reason}</p>}

      {(ok && (days === 0 || days === 1 || monday || pkg?.payment || pkg?.isCharge)) || canTransfer ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {days === 0 && <Badge className="bg-red-600 text-white hover:bg-red-600">Vence hoy</Badge>}
          {days === 1 && <Badge className="bg-amber-500 text-white hover:bg-amber-500">Vence mañana</Badge>}
          {monday && alertDay && <Badge className="bg-sky-600 text-white hover:bg-sky-600">Vence el {alertDay.weekday}</Badge>}
          {ok && pkg?.payment && <Badge variant="outline">{pkg.payment.type} ${pkg.payment.amount}</Badge>}
          {ok && pkg?.isCharge && <Badge variant="outline">F2 / carga</Badge>}
          {canTransfer && (
            <Button size="sm" variant="outline" className="ml-auto h-7 gap-1 border-red-300 text-red-700" onClick={() => onTransfer!(pkg!)}>
              <ArrowLeftRight className="h-3.5 w-3.5" /> Traspasar
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}

type CounterRow = { key: QuickFilterKey | "valid" | "rejected"; label: string; value: number; tone?: string };

/**
 * Conteos de la captura que también filtran la lista. "Válidos" y "No incluidas" cambian de
 * pestaña; los demás filtran (uno a la vez, tocar de nuevo lo quita).
 */
export function QuickCounters({
  valid,
  rejected,
  counts,
  alertDay,
  active,
  tab,
  onPick,
}: {
  valid: number;
  rejected: number;
  counts: QuickFilterCounts;
  /** Si mañana no se opera: el día que se vigila (agrega su conteo). */
  alertDay: AlertDay | null;
  active: QuickFilterKey | null;
  tab: "valid" | "rejected";
  onPick: (key: QuickFilterKey | "valid" | "rejected") => void;
}) {
  const rows: CounterRow[] = [
    { key: "valid", label: "Válidos", value: valid, tone: "text-green-700 dark:text-green-400" },
    { key: "rejected", label: "No incluidas", value: rejected, tone: rejected ? "text-red-600" : undefined },
    { key: "today", label: "Vencen hoy", value: counts.today, tone: counts.today ? "text-red-600" : undefined },
    { key: "tomorrow", label: "Vencen mañana", value: counts.tomorrow, tone: counts.tomorrow ? "text-amber-600" : undefined },
    ...(alertDay ? [{ key: "nextDay" as const, label: `Vencen el ${alertDay.weekday}`, value: counts.nextDay, tone: counts.nextDay ? "text-sky-600" : undefined }] : []),
    { key: "payment", label: "Con cobro", value: counts.payment },
    { key: "f2", label: "F2 / carga", value: counts.f2 },
    { key: "highValue", label: "Alto valor", value: counts.highValue },
  ];

  const isOn = (k: CounterRow["key"]) =>
    k === "valid" ? tab === "valid" && !active : k === "rejected" ? tab === "rejected" : active === k;

  return (
    <div className="space-y-0.5">
      {rows.map((r) => (
        <Button
          key={r.key}
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={isOn(r.key)}
          onClick={() => onPick(r.key)}
          className={cn(
            "h-8 w-full justify-between px-2 font-normal",
            isOn(r.key) && "bg-muted font-medium",
            r.tone,
          )}
        >
          <span>{r.label}</span>
          <span className="tabular-nums font-semibold">{r.value}</span>
        </Button>
      ))}
      <p className="px-2 pt-1 text-xs text-muted-foreground">Toca un conteo para ver solo esas guías.</p>
    </div>
  );
}
