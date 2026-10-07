"use client";

import { AlertTriangle, CalendarClock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { UploadCommitCheck } from "@/lib/services/shipments";

const day = (iso: string) => {
  try { return format(parseISO(iso), "EEE dd-MMM", { locale: es }); } catch { return iso; }
};

/**
 * Avisos de vencimiento que calcula el backend al validar un archivo (subida por Excel).
 * Mismo criterio que el pegado: sin fecha, fecha/hora que no se entiende, vencen antes del
 * consolidado o muy lejos, y el conteo por día para compararlo contra lo esperado.
 */
export function CommitPreviewNotice({ check, consDate }: { check?: UploadCommitCheck | null; consDate?: string }) {
  if (!check) return null;
  const lines: string[] = [];
  if (check.fechaInvalida > 0) lines.push(`${check.fechaInvalida} guía(s) con una fecha de vencimiento que no se entiende.`);
  if (check.horaInvalida > 0) lines.push(`${check.horaInvalida} guía(s) con una hora que no se entiende (se usarán las 18:00).`);
  if (check.sinFecha > 0) lines.push(`${check.sinFecha} guía(s) sin fecha de vencimiento: se tomará la de FedEx; si no la tiene, vencen hoy a las 18:00.`);
  if (check.antesDelConsolidado > 0) lines.push(`${check.antesDelConsolidado} guía(s) vencen antes de la fecha del consolidado: llegarían ya vencidas.`);
  if (check.muyLejanas > 0) lines.push(`${check.muyLejanas} guía(s) vencen más de 30 días después del consolidado: revisa que el día y el mes no estén volteados.`);
  if (check.ambiguas > 0) lines.push(`${check.ambiguas} guía(s) con fecha que puede leerse de dos formas (día/mes).`);

  return (
    <div className="space-y-1.5">
      {lines.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-0.5 leading-tight">
            {lines.map((l, i) => <div key={i}>{l}</div>)}
            <div className="text-[11px] text-amber-700">Corrige el archivo y vuelve a seleccionarlo, o usa <b>Pegar FedEx</b> para corregirlas en la tabla.</div>
          </div>
        </div>
      )}
      {check.byDay.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-background p-2">
          <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="mr-1 text-[11px] font-semibold">Vencimientos por día</span>
          {check.byDay.map((d) => (
            <span key={d.day} className={`rounded-full px-2 py-0.5 text-[11px] ${consDate && d.day < consDate ? "bg-amber-100 text-amber-800" : d.day === consDate ? "bg-sky-100 text-sky-800" : "bg-muted text-foreground"}`}>
              <b>{day(d.day)}</b> · {d.count}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
