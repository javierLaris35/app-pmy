"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList, ReferenceLine,
} from "recharts";
import type { RouteBoardItem } from "@/lib/services/monitoring/route-monitor";
import { severityOf, SEVERITY_HEX, type Severity } from "@/lib/services/monitoring/route-board-severity";
import { fmtTime } from "@/lib/services/monitoring/route-board-format";

const HER_DAY_START_UTC_OFFSET_H = 7; // 00:00 Hermosillo = 07:00 UTC (UTC-7 fijo, sin horario de verano)
// Mismos umbrales que la alerta "long_gap" del backend — para que el color del
// gráfico signifique lo mismo que ya significa en las alertas del detalle.
const GAP_COLOR = (min: number) => (min >= 60 ? "#e11d48" : min >= 30 ? "#d97706" : "#059669");

function shortLabel(item: RouteBoardItem): string {
  const base = item.driverNames || item.routeNames || item.trackingNumber;
  return base.length > 16 ? `${base.slice(0, 15)}…` : base;
}

function EmptyChart({ text }: { text: string }) {
  return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{text}</div>;
}

function BarTooltip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-white p-2.5 text-xs shadow-md">
      <p className="mb-1 font-semibold">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color || p.fill }}>{p.value}{unit}</p>
      ))}
    </div>
  );
}

function TimelineTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const row = payload.find((p: any) => p.dataKey === "duration")?.payload;
  if (!row) return null;
  return (
    <div className="rounded-md border bg-white p-2.5 text-xs shadow-md">
      <p className="mb-1 font-semibold">{row.label}</p>
      <p className="text-muted-foreground">Creada: <strong className="text-foreground">{row.createdLabel}</strong></p>
      <p className="text-muted-foreground">{row.closedLabel ? "Cerrada" : "En curso, hace"}: <strong className="text-foreground">{row.closedLabel || row.durationLabel}</strong></p>
    </div>
  );
}

export function RouteBoardCharts({ items, now, date }: { items: RouteBoardItem[]; now: number; date: string }) {
  const paceData = useMemo(
    () =>
      items
        .filter((it) => it.paceCompletedPerHour != null)
        .map((it) => ({ label: shortLabel(it), value: it.paceCompletedPerHour as number, sev: severityOf(it) }))
        .sort((a, b) => b.value - a.value),
    [items],
  );

  const gapData = useMemo(
    () =>
      items
        .filter((it) => it.avgGapMinutes != null)
        .map((it) => ({ label: shortLabel(it), value: it.avgGapMinutes as number }))
        .sort((a, b) => b.value - a.value),
    [items],
  );

  const progressData = useMemo(
    () =>
      items
        .map((it) => ({
          label: shortLabel(it),
          pct: it.totalStops > 0 ? Math.round((it.visitedStops / it.totalStops) * 100) : 0,
          sev: severityOf(it),
          fraction: `${it.visitedStops}/${it.totalStops}`,
        }))
        .sort((a, b) => a.pct - b.pct),
    [items],
  );

  const timelineData = useMemo(() => {
    const dayStart = new Date(`${date}T${String(HER_DAY_START_UTC_OFFSET_H).padStart(2, "0")}:00:00.000Z`).getTime();
    const raw = items.map((it) => {
      const createdMs = new Date(it.createdAt).getTime();
      const endMs = it.routeClosedAt ? new Date(it.routeClosedAt).getTime() : now;
      const offset = Math.max(0, Math.round((createdMs - dayStart) / 60000));
      const duration = Math.max(3, Math.round((endMs - createdMs) / 60000));
      return {
        label: shortLabel(it),
        offset,
        duration,
        rangeLabel: it.routeClosedAt ? `${fmtTime(it.createdAt)}–${fmtTime(it.routeClosedAt)}` : `${fmtTime(it.createdAt)}–ahora`,
        sev: severityOf(it),
        createdLabel: fmtTime(it.createdAt),
        closedLabel: it.routeClosedAt ? fmtTime(it.routeClosedAt) : null,
        durationLabel: `${Math.floor(duration / 60)}h ${duration % 60}m`,
      };
    });
    return raw.sort((a, b) => a.offset - b.offset);
  }, [items, now, date]);

  const nowOffset = useMemo(() => {
    const dayStart = new Date(`${date}T${String(HER_DAY_START_UTC_OFFSET_H).padStart(2, "0")}:00:00.000Z`).getTime();
    return Math.round((now - dayStart) / 60000);
  }, [now, date]);

  const timeDomain = useMemo(() => {
    if (timelineData.length === 0) return [0, 600] as [number, number];
    const min = Math.min(...timelineData.map((d) => d.offset));
    const max = Math.max(nowOffset, ...timelineData.map((d) => d.offset + d.duration));
    return [Math.max(0, Math.floor(min / 60) * 60 - 30), Math.ceil(max / 60) * 60 + 30] as [number, number];
  }, [timelineData, nowOffset]);

  const timeTicks = useMemo(() => {
    const [min, max] = timeDomain;
    const step = 60; // cada hora
    const ticks: number[] = [];
    for (let t = Math.ceil(min / step) * step; t <= max; t += step) ticks.push(t);
    return ticks;
  }, [timeDomain]);

  const fmtMinutesOfDay = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:00`;

  if (items.length === 0) {
    return <Card><CardContent className="py-16 text-center text-muted-foreground">No hay datos para graficar.</CardContent></Card>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ritmo de entregas</CardTitle>
          <CardDescription>Paradas completadas por hora — compara el avance real de cada chofer.</CardDescription>
        </CardHeader>
        <CardContent className="h-[280px]">
          {paceData.length === 0 ? (
            <EmptyChart text="Aún no hay suficiente avance para calcular ritmo." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paceData} layout="vertical" margin={{ left: 8, right: 28 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} label={{ value: "paradas/h", position: "insideBottom", offset: -2, fontSize: 11 }} />
                <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 11 }} />
                <Tooltip content={<BarTooltip unit=" paradas/h" />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
                  {paceData.map((d, i) => <Cell key={i} fill={SEVERITY_HEX[d.sev]} />)}
                  <LabelList dataKey="value" position="right" style={{ fontSize: 11, fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tiempo promedio entre paradas</CardTitle>
          <CardDescription>Huecos grandes (≥30 min ámbar, ≥60 min rojo) anticipan Local Delay.</CardDescription>
        </CardHeader>
        <CardContent className="h-[280px]">
          {gapData.length === 0 ? (
            <EmptyChart text="Aún no hay al menos 2 paradas visitadas para calcular huecos." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gapData} layout="vertical" margin={{ left: 8, right: 28 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} label={{ value: "minutos", position: "insideBottom", offset: -2, fontSize: 11 }} />
                <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 11 }} />
                <Tooltip content={<BarTooltip unit=" min" />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
                  {gapData.map((d, i) => <Cell key={i} fill={GAP_COLOR(d.value)} />)}
                  <LabelList dataKey="value" position="right" formatter={(v: number) => `${v}m`} style={{ fontSize: 11, fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Progreso por ruta</CardTitle>
          <CardDescription>Porcentaje de paradas entregadas — las menos avanzadas arriba.</CardDescription>
        </CardHeader>
        <CardContent className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={progressData} layout="vertical" margin={{ left: 8, right: 32 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 11 }} />
              <Tooltip content={({ active, payload, label }: any) =>
                !active || !payload?.length ? null : (
                  <div className="rounded-md border bg-white p-2.5 text-xs shadow-md">
                    <p className="mb-1 font-semibold">{label}</p>
                    <p>{payload[0].payload.pct}% completado ({payload[0].payload.fraction})</p>
                  </div>
                )
              } cursor={{ fill: "rgba(0,0,0,0.04)" }} />
              <Bar dataKey="pct" radius={[0, 4, 4, 0]} barSize={16}>
                {progressData.map((d, i) => <Cell key={i} fill={SEVERITY_HEX[d.sev]} />)}
                <LabelList dataKey="pct" position="right" formatter={(v: number) => `${v}%`} style={{ fontSize: 11, fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Línea de tiempo del día</CardTitle>
          <CardDescription>De creación a cierre — la línea punteada marca la hora actual.</CardDescription>
        </CardHeader>
        <CardContent className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timelineData} layout="vertical" margin={{ left: 8, right: 50 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={timeDomain} ticks={timeTicks} tickFormatter={fmtMinutesOfDay} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 11 }} />
              <Tooltip content={<TimelineTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
              <ReferenceLine x={nowOffset} stroke="#0f172a" strokeDasharray="4 3" label={{ value: "ahora", fontSize: 10, position: "insideTopRight" }} />
              <Bar dataKey="offset" stackId="t" fill="transparent" />
              <Bar dataKey="duration" stackId="t" radius={[4, 4, 4, 4]} barSize={16}>
                {timelineData.map((d, i) => <Cell key={i} fill={SEVERITY_HEX[d.sev]} />)}
                <LabelList dataKey="rangeLabel" position="right" style={{ fontSize: 10, fill: "#475569" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
