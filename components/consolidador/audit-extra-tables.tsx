"use client";

import React, { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ReasonButton } from "@/components/consolidador/reason-button";
import { ScopedTables } from "@/components/consolidador/scoped-tables";
import { createManualIncome, deleteIncome, prefetchFedex } from "@/lib/services/consolidador";
import { errorText } from "@/lib/consolidador/zone-merge";
import { toast } from "@/lib/toast";
import { cn, formatCurrency } from "@/lib/utils";
import type {
  ChargeGuideRow,
  ChargeGuidesReport,
  CollectionAuditRow,
  CollectionsAuditReport,
  NoVanReport,
  NoVanRow,
  ZonePart,
} from "@/lib/types/consolidador-zone";

type WithSub<R> = R & { subsidiaryId: string; subsidiaryName: string; expectedCost: number };

const ddmm = (d: string | null | undefined) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : "—");
const hhmm = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", timeZone: "America/Hermosillo" }) : "";
const Mono = ({ children }: { children: React.ReactNode }) => <span className="font-mono text-xs">{children}</span>;
const Pill = ({ tone, children }: { tone: "ok" | "bad" | "warn" | "muted"; children: React.ReactNode }) => (
  <span
    className={cn(
      "inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium",
      tone === "ok" && "bg-emerald-50 text-emerald-700",
      tone === "bad" && "bg-rose-50 text-rose-700",
      tone === "warn" && "bg-amber-50 text-amber-700",
      tone === "muted" && "border bg-slate-50 text-slate-500",
    )}
  >
    {children}
  </span>
);

const withSub = <T extends { expectedCost?: number }, R>(rows: R[], d: T, p: ZonePart<T>): WithSub<R>[] =>
  rows.map((r) => ({ ...r, subsidiaryId: p.subsidiaryId, subsidiaryName: p.subsidiaryName, expectedCost: Number(d.expectedCost ?? 0) }));

/** "Verificar con FedEx": consulta por bloques de 25 y deja la respuesta en caché del servidor. */
function VerifyFedexButton({ trackings, onDone }: { trackings: string[]; onDone: () => void }) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const run = async () => {
    const list = [...new Set(trackings)];
    setProgress({ done: 0, total: list.length });
    let failed = 0;
    try {
      for (let i = 0; i < list.length; i += 25) {
        const r = await prefetchFedex(list.slice(i, i + 25));
        failed += r.failed;
        setProgress({ done: Math.min(i + 25, list.length), total: list.length });
      }
      if (failed) toast.error(`FedEx no respondió para ${failed} guía(s)`);
      onDone();
    } catch (e) {
      toast.error(errorText(e, "No se pudo consultar FedEx"));
    } finally {
      setProgress(null);
    }
  };
  return (
    <div className="flex items-center gap-2">
      {progress && <Progress value={(progress.done / Math.max(1, progress.total)) * 100} className="h-1.5 w-32" />}
      <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={run} disabled={!!progress || !trackings.length}>
        <ShieldCheck className="h-3.5 w-3.5" /> {progress ? `FedEx ${progress.done}/${progress.total}` : "Verificar con FedEx"}
      </Button>
    </div>
  );
}

// ───────────────────────── Cargas (paquete + carga) ─────────────────────────

export function ChargeGuidesTable({ parts, onChanged }: { parts: ZonePart<ChargeGuidesReport>[]; onChanged: () => void }) {
  const [onlyDoubles, setOnlyDoubles] = useState(true);
  const columns = useMemo<ColumnDef<WithSub<ChargeGuideRow>>[]>(
    () => [
      { accessorKey: "trackingNumber", header: "Guía", cell: ({ row }) => <Mono>{row.original.trackingNumber}</Mono> },
      { accessorKey: "consNumber", header: "Carga", cell: ({ row }) => <Mono>{row.original.consNumber ?? "—"}</Mono> },
      {
        id: "uploaded",
        header: "Subida",
        cell: ({ row }) => <span className="text-xs text-slate-600">{[row.original.uploadedBy, ddmm(row.original.chargeDay), hhmm(row.original.uploadedAt)].filter(Boolean).join(" · ")}</span>,
      },
      {
        id: "twin",
        header: "También como paquete",
        cell: ({ row }) => (row.original.twin ? <span className="text-xs"><Mono>{row.original.twin.consNumber ?? "—"}</Mono> · {ddmm(row.original.twin.consDay)}</span> : <span className="text-xs text-slate-400">No</span>),
      },
      {
        id: "income",
        header: "Cobro del paquete",
        cell: ({ row }) =>
          row.original.packageIncome ? <Pill tone="warn">Cobrado {formatCurrency(row.original.packageIncome.cost)}</Pill> : row.original.isDouble ? <Pill tone="muted">Sin cobro</Pill> : null,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) =>
          row.original.packageIncome ? (
            <ReasonButton
              label="Anular cobro del paquete"
              onConfirm={async (reason) => {
                try {
                  await deleteIncome(row.original.packageIncome!.incomeId, reason);
                  toast.success(`Cobro del paquete anulado: ${row.original.trackingNumber}`);
                  onChanged();
                } catch (e) {
                  toast.error(errorText(e, "No se pudo anular el cobro"));
                }
              }}
            />
          ) : null,
      },
    ],
    [onChanged],
  );
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">Guías de las cargas (F2 / 1.5 ton) de la semana. Si también están como paquete y el paquete se cobró, se cobró dos veces.</p>
        <div className="inline-flex h-7 items-center rounded-md border p-0.5">
          {([[true, "Solo dobles"], [false, "Todas"]] as const).map(([v, l]) => (
            <Button key={l} size="sm" variant={onlyDoubles === v ? "default" : "ghost"} className="h-6 px-2 text-[11px]" onClick={() => setOnlyDoubles(v)}>
              {l}
            </Button>
          ))}
        </div>
      </div>
      <ScopedTables
        parts={parts}
        columns={columns}
        rows={(d, p) => withSub(onlyDoubles ? d.rows.filter((r) => r.isDouble) : d.rows, d as any, p as any)}
        subtitle={(d) => `${d.charges.length} cargas · ${d.totals.doubles} dobles${d.totals.overcharged ? ` · ${formatCurrency(d.totals.overchargedAmount)} de más` : ""}`}
        empty={onlyDoubles ? "Ninguna guía está como paquete y como carga esta semana." : "No hay cargas esta semana."}
      />
    </div>
  );
}

// ───────────────────────── Recolecciones ─────────────────────────

const COLLECTION_LABEL: Record<CollectionAuditRow["status"], [string, "ok" | "bad" | "warn" | "muted"]> = {
  cobrada: ["Cobrada", "ok"],
  sin_cobro: ["Sin cobro", "bad"],
  no_cobra_315: ["No cobra (31.5)", "muted"],
  duplicada: ["Cobrada dos veces", "warn"],
};

export function CollectionsAuditTable({ parts, onChanged }: { parts: ZonePart<CollectionsAuditReport>[]; onChanged: () => void }) {
  const columns = useMemo<ColumnDef<WithSub<CollectionAuditRow>>[]>(
    () => [
      { accessorKey: "trackingNumber", header: "Guía", cell: ({ row }) => <Mono>{row.original.trackingNumber}</Mono> },
      { id: "registered", header: "Registrada", cell: ({ row }) => <span className="text-xs">{ddmm(row.original.day)} {hhmm(row.original.registeredAt)}</span> },
      {
        id: "fedex",
        header: "FedEx recogido",
        cell: ({ row }) =>
          !row.original.fedexChecked ? <span className="text-xs text-slate-400">Sin verificar</span> : row.original.fedexPickedUpDay ? <span className="text-xs">{ddmm(row.original.fedexPickedUpDay)}</span> : <span className="text-xs text-rose-600">FedEx no la tiene</span>,
      },
      { accessorKey: "routeLabel", header: "Ruta", cell: ({ row }) => <span className="text-xs text-slate-600">{row.original.routeLabel ?? "—"}</span> },
      {
        accessorKey: "status",
        header: "Cobro",
        cell: ({ row }) => {
          const [l, t] = COLLECTION_LABEL[row.original.status];
          return <Pill tone={t}>{row.original.status === "cobrada" ? `${l} ${formatCurrency(row.original.amount)}` : l}</Pill>;
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) =>
          row.original.status === "sin_cobro" && row.original.fedexPickedUpDay ? (
            <ReasonButton
              label="Generar cobro"
              onConfirm={async (reason) => {
                try {
                  await createManualIncome({ subsidiaryId: row.original.subsidiaryId, kind: "recoleccion", trackingNumber: row.original.trackingNumber, cost: row.original.expectedCost, date: row.original.day, reason });
                  toast.success(`Cobro generado: ${row.original.trackingNumber}`);
                  onChanged();
                } catch (e: any) {
                  toast.error(e?.response?.status === 409 ? "Ya tiene cobro" : errorText(e, "No se pudo generar el cobro"));
                }
              }}
            />
          ) : null,
      },
    ],
    [onChanged],
  );
  const trackings = parts.flatMap((p) => p.data?.rows.filter((r) => !r.fedexChecked).map((r) => r.trackingNumber) ?? []);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500">Recolecciones registradas en la semana, su cobro y si FedEx las marcó como recogidas.</p>
        <VerifyFedexButton trackings={trackings} onDone={onChanged} />
      </div>
      <ScopedTables
        parts={parts}
        columns={columns}
        rows={(d, p) => withSub(d.rows, d, p)}
        subtitle={(d) => `${d.totals.registered} recolecciones · ${d.totals.withoutCharge} sin cobro`}
        empty="No hay recolecciones registradas esta semana."
      />
    </div>
  );
}

// ───────────────────────── No VAN ─────────────────────────

const NOVAN_LABEL: Record<NoVanRow["status"], [string, "ok" | "bad" | "warn" | "muted"]> = {
  cobrada: ["Cobrada", "ok"],
  sin_cobro: ["Sin cobro", "bad"],
  no_cobra_315: ["No cobra (31.5)", "muted"],
  en_transito: ["Aún no cobra", "muted"],
  sin_verificar: ["Sin verificar", "muted"],
  es_paquete: ["Ya existe como paquete", "muted"],
};

export function NoVanTable({ parts, onChanged }: { parts: ZonePart<NoVanReport>[]; onChanged: () => void }) {
  const columns = useMemo<ColumnDef<WithSub<NoVanRow>>[]>(
    () => [
      { accessorKey: "trackingNumber", header: "Guía", cell: ({ row }) => <Mono>{row.original.trackingNumber}</Mono> },
      {
        id: "route",
        header: "Ruta / cierre",
        cell: ({ row }) => <span className="text-xs text-slate-600">{[ddmm(row.original.routeDay), row.original.driver, hhmm(row.original.closedAt)].filter(Boolean).join(" · ")}{row.original.is315 ? " · 31.5" : ""}</span>,
      },
      { accessorKey: "fedexLabel", header: "FedEx hoy", cell: ({ row }) => <span className="text-xs">{row.original.fedexLabel ?? <span className="text-slate-400">Sin verificar</span>}</span> },
      {
        accessorKey: "status",
        header: "Cobro",
        cell: ({ row }) => {
          const [l, t] = NOVAN_LABEL[row.original.status];
          return <Pill tone={t}>{l}</Pill>;
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) =>
          row.original.status === "sin_cobro" && row.original.suggestedKind && row.original.routeDay ? (
            <ReasonButton
              label="Generar cobro"
              onConfirm={async (reason) => {
                try {
                  await createManualIncome({ subsidiaryId: row.original.subsidiaryId, kind: row.original.suggestedKind!, trackingNumber: row.original.trackingNumber, cost: row.original.expectedCost, date: row.original.routeDay!, reason });
                  toast.success(`Cobro generado: ${row.original.trackingNumber}`);
                  onChanged();
                } catch (e: any) {
                  toast.error(e?.response?.status === 409 ? "Ya tiene cobro" : errorText(e, "No se pudo generar el cobro"));
                }
              }}
            />
          ) : null,
      },
    ],
    [onChanged],
  );
  const trackings = parts.flatMap((p) => p.data?.rows.filter((r) => !r.fedexLabel && r.status !== "es_paquete").map((r) => r.trackingNumber) ?? []);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500">Guías que el chofer reportó en el cierre y que no venían en los archivos. No existen como paquete, por eso se revisan aparte.</p>
        <VerifyFedexButton trackings={trackings} onDone={onChanged} />
      </div>
      <ScopedTables
        parts={parts}
        columns={columns}
        rows={(d, p) => withSub(d.rows, d, p)}
        subtitle={(d) => `${d.totals.total} No VAN · ${d.totals.withoutCharge} sin cobro`}
        empty="No hubo No VAN esta semana."
      />
    </div>
  );
}
