"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { GroupsView } from "@/components/consolidador/groups-view";
import { IncomeWeekTable } from "@/components/consolidador/income-week-table";
import { SubsidiaryGroup } from "@/components/consolidador/subsidiary-group";
import { formatCurrency } from "@/lib/utils";
import type { ScopeSubsidiary, SubsidiarySummary, ZonePart } from "@/lib/types/consolidador-zone";

type Mode = "route" | "consolidado" | "ingresos";
const MODES: [Mode, string][] = [["route", "Por ruta"], ["consolidado", "Por consolidado"], ["ingresos", "Ingresos"]];

interface Props {
  /** Sucursales a mostrar (la sola, la del foco o todas las de la zona). */
  subsidiaries: ScopeSubsidiary[];
  summary: ZonePart<SubsidiarySummary>[];
  from: string;
  to: string;
  active: boolean;
  onChanged: () => void;
}

/**
 * Pestaña Detalle: lo de siempre (por ruta, por consolidado, ingresos). En zona, una sección por
 * sucursal; cada una carga al abrirla.
 */
export function DetailTab({ subsidiaries, summary, from, to, active, onChanged }: Props) {
  const [mode, setMode] = useState<Mode>("route");
  const one = subsidiaries.length === 1;
  const body = (id: string) =>
    mode === "ingresos" ? (
      <IncomeWeekTable subsidiaryId={id} from={from} to={to} onChanged={onChanged} compact={!one} />
    ) : (
      <div className={one ? "" : "p-2"}>
        <GroupsView mode={mode} subsidiaryId={id} from={from} to={to} active={active} onFixed={onChanged} />
      </div>
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="inline-flex h-8 w-fit items-center rounded-md border bg-white p-0.5" role="group" aria-label="Ver detalle">
        {MODES.map(([key, label]) => (
          <Button key={key} size="sm" variant={mode === key ? "default" : "ghost"} className="h-7 px-2.5 text-xs" aria-pressed={mode === key} onClick={() => setMode(key)}>
            {label}
          </Button>
        ))}
      </div>
      {!subsidiaries.length ? (
        <div className="rounded-md border bg-white py-16 text-center text-sm text-slate-400">Elige una zona o una sucursal para comenzar</div>
      ) : one ? (
        body(subsidiaries[0].id)
      ) : (
        subsidiaries.map((s, i) => {
          const sum = summary.find((p) => p.subsidiaryId === s.id)?.data;
          return (
            <SubsidiaryGroup
              key={`${mode}-${s.id}`}
              name={s.name}
              defaultOpen={i === 0}
              subtitle={sum ? `${formatCurrency(sum.incomeTotal)} · ${sum.packages} paquetes · ${sum.charges} cargas` : undefined}
            >
              {body(s.id)}
            </SubsidiaryGroup>
          );
        })
      )}
    </div>
  );
}
