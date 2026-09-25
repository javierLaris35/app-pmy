"use client";

import { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BoardCard, ExpedienteStage, formatMoney, PRIORITY_LABEL, REQUEST_TYPE_LABEL, STAGE_LABEL, vehicleLabel,
} from "@/lib/types/maintenance";
import { ExpedienteCard, relativeTime, TYPE_CLASS } from "./expediente-card";

export const BOARD_COLUMNS: Array<{ stage: ExpedienteStage; n: number; dot: string; hint: string }> = [
  { stage: "por_revisar", n: 1, dot: "bg-amber-400", hint: "Compras revisa y autoriza" },
  { stage: "cotizando", n: 2, dot: "bg-violet-400", hint: "Pedir y comparar cotizaciones" },
  { stage: "por_autorizar", n: 3, dot: "bg-orange-400", hint: "Autorización de órdenes" },
  { stage: "en_proceso", n: 4, dot: "bg-blue-500", hint: "Enviar al proveedor y recibir" },
  { stage: "terminado", n: 5, dot: "bg-emerald-500", hint: "Últimos 60 días" },
];

/** Quién soy para las vistas "Requieren mi acción". */
export interface ViewerRole { purchaser: boolean; authorizer: boolean }

export type BoardView = "activas" | "mi_accion" | "rechazadas_oc" | "alta" | "terminadas" | "cerradas";

export const BOARD_VIEWS: Array<{ key: BoardView; label: string; test: (c: BoardCard, r: ViewerRole) => boolean }> = [
  { key: "activas", label: "Todas las activas", test: (c) => !["cancelado", "rechazada"].includes(c.stage) },
  {
    key: "mi_accion",
    label: "Requieren mi acción",
    test: (c, r) => (r.purchaser && c.waitingOn === "compras") || (r.authorizer && c.waitingOn === "autorizador"),
  },
  { key: "rechazadas_oc", label: "Órdenes rechazadas", test: (c) => c.rejected },
  { key: "alta", label: "Prioridad alta", test: (c) => c.priority === "alta" && !["terminado", "cancelado", "rechazada"].includes(c.stage) },
  { key: "terminadas", label: "Terminadas", test: (c) => c.stage === "terminado" },
  { key: "cerradas", label: "Rechazadas y canceladas", test: (c) => c.stage === "cancelado" || c.stage === "rechazada" },
];

/** Rail de vistas con contadores (como el Tablero de Soporte). */
export function BoardViewsRail({ cards, active, role, onChange, views = BOARD_VIEWS }: {
  cards: BoardCard[]; active: BoardView; role: ViewerRole; onChange: (v: BoardView) => void; views?: typeof BOARD_VIEWS;
}) {
  return (
    <aside className="w-full shrink-0 space-y-0.5 md:w-52">
      <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">Vistas</p>
      {views.map((v) => {
        const n = cards.filter((c) => v.test(c, role)).length;
        const on = active === v.key;
        return (
          <button
            key={v.key}
            onClick={() => onChange(v.key)}
            className={cn(
              "flex w-full items-center justify-between rounded-md px-3 py-1.5 text-sm transition",
              on ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted",
            )}
          >
            <span className="truncate">{v.label}</span>
            <span className={cn("rounded-full px-1.5 text-xs", on ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>{n}</span>
          </button>
        );
      })}
    </aside>
  );
}

/** Kanban por etapa (sin arrastrar: la etapa cambia con las acciones del expediente). */
export function BoardKanban({ cards, onOpen }: { cards: BoardCard[]; onOpen: (c: BoardCard) => void }) {
  const onlyClosed = cards.length > 0 && cards.every((c) => c.stage === "cancelado" || c.stage === "rechazada");
  const columns = onlyClosed
    ? [
        { stage: "rechazada" as ExpedienteStage, n: 0, dot: "bg-rose-400", hint: "" },
        { stage: "cancelado" as ExpedienteStage, n: 0, dot: "bg-slate-400", hint: "" },
      ]
    : BOARD_COLUMNS;
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {columns.map((col) => {
        const list = cards.filter((c) => c.stage === col.stage);
        return (
          <div key={col.stage} className="flex w-80 shrink-0 flex-col">
            <div className="mb-2 rounded-lg bg-muted/60 px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span className={cn("h-2 w-2 rounded-full", col.dot)} />
                  {col.n > 0 && <span className="text-muted-foreground">{col.n}.</span>}
                  {STAGE_LABEL[col.stage]}
                </span>
                <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">{list.length}</span>
              </div>
              {col.hint && <p className="mt-0.5 pl-4 text-[11px] text-muted-foreground">{col.hint}</p>}
            </div>
            <div className="min-h-[140px] flex-1 space-y-3 rounded-lg p-1">
              {list.map((c) => <ExpedienteCard key={c.id} card={c} onOpen={onOpen} />)}
              {list.length === 0 && (
                <div className="flex h-24 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground/70">Sin solicitudes</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const STAGE_BADGE: Record<ExpedienteStage, string> = {
  por_revisar: "border-amber-200 bg-amber-50 text-amber-700",
  cotizando: "border-violet-200 bg-violet-50 text-violet-700",
  por_autorizar: "border-orange-200 bg-orange-50 text-orange-700",
  en_proceso: "border-blue-200 bg-blue-50 text-blue-700",
  terminado: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rechazada: "border-rose-200 bg-rose-50 text-rose-700",
  cancelado: "border-slate-200 bg-slate-50 text-slate-500",
};

export const StageBadge = ({ stage }: { stage: ExpedienteStage }) => (
  <Badge variant="outline" className={STAGE_BADGE[stage]}>{STAGE_LABEL[stage]}</Badge>
);

/** Vista lista (DataTable). */
export function BoardList({ cards, onOpen }: { cards: BoardCard[]; onOpen: (c: BoardCard) => void }) {
  const columns = useMemo<ColumnDef<BoardCard>[]>(
    () => [
      {
        accessorKey: "folio",
        header: "Folio",
        cell: ({ row }) => (
          <button onClick={() => onOpen(row.original)} className="font-mono text-sm font-medium text-primary hover:underline">{row.original.folio}</button>
        ),
      },
      {
        id: "search",
        accessorFn: (c) => `${c.folio} ${vehicleLabel(c.vehicle)} ${c.description} ${c.subsidiary?.name ?? ""}`,
        header: "Solicitud",
        cell: ({ row }) => (
          <div className="max-w-[320px]">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className={cn("h-5 rounded-md border-0 px-1.5 text-[10px]", TYPE_CLASS[row.original.type])}>
                {REQUEST_TYPE_LABEL[row.original.type]}
              </Badge>
              {row.original.vehicle && <span className="text-sm font-medium">{vehicleLabel(row.original.vehicle)}</span>}
            </div>
            <p className="truncate text-xs text-muted-foreground">{row.original.description}</p>
          </div>
        ),
      },
      { id: "subsidiary", header: "Sucursal", cell: ({ row }) => row.original.subsidiary?.name ?? "—" },
      { id: "stage", header: "Etapa", cell: ({ row }) => <StageBadge stage={row.original.stage} /> },
      { id: "next", header: "Qué sigue", cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.nextStep}</span> },
      { id: "priority", header: "Prioridad", cell: ({ row }) => PRIORITY_LABEL[row.original.priority] },
      {
        id: "amount",
        header: () => <div className="text-right">Monto</div>,
        cell: ({ row }) => {
          const act = row.original.orders.filter((o) => o.status !== "cancelada");
          const a = act.length ? act.reduce((s, o) => s + Number(o.total), 0) : row.original.bestTotal;
          return <div className="text-right tabular-nums">{a !== null && a !== undefined ? formatMoney(a) : "—"}</div>;
        },
      },
      { id: "updated", header: "Actividad", cell: ({ row }) => <span className="text-xs text-muted-foreground">{relativeTime(row.original.updatedAt)}</span> },
    ],
    [onOpen],
  );
  return <DataTable columns={columns} data={cards} searchKey="search" />;
}

export function BoardEmpty({ title, text, onCreate, createLabel }: { title: string; text: string; onCreate?: () => void; createLabel?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
      <ClipboardList className="mb-3 h-10 w-10 text-muted-foreground/50" />
      <p className="font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
      {onCreate && <button onClick={onCreate} className="mt-4 text-sm font-medium text-primary hover:underline">{createLabel ?? "Nueva solicitud"}</button>}
    </div>
  );
}
