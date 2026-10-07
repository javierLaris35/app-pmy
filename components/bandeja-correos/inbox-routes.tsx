"use client";

import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getInboxRoutes } from "@/lib/services/inbox";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Route } from "lucide-react";

interface Props {
  from: string;
  to: string;
  subsidiaryId?: string;
  active: boolean;
}

const shortDay = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "UTC" });

/** Rutas locales (364, 365…): cuántos días llegó su archivo por correo y cuántos se subió, revisado por guías. */
export function InboxRoutes({ from, to, subsidiaryId, active }: Props) {
  const { data } = useSWR(active ? ["/inbox/routes", from, to, subsidiaryId ?? ""] : null, () => getInboxRoutes({ from, to, subsidiaryId }));
  const routes = data?.routes ?? [];
  if (!routes.length) return null;
  const missing = routes.filter((r) => r.missingDays.length > 0).length;

  return (
    <section className="rounded-md border bg-white">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2">
        <Route className="h-4 w-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-800">Rutas locales</h3>
        <span className="text-xs text-slate-500">Días que llegó el archivo de cada ruta contra días que se subió (revisado guía por guía)</span>
        <span className={cn("ml-auto text-xs", missing ? "font-medium text-red-600" : "text-emerald-700")}>
          {missing ? `${missing} ruta(s) con días sin subir` : "Todas las rutas se subieron"}
        </span>
      </header>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-8 px-4 text-xs">Ruta</TableHead>
            <TableHead className="h-8 px-2 text-xs">Días que llegó</TableHead>
            <TableHead className="h-8 px-2 text-xs">Días subida</TableHead>
            <TableHead className="h-8 px-2 text-xs">Se sube como</TableHead>
            <TableHead className="h-8 px-2 text-xs">Sucursal</TableHead>
            <TableHead className="h-8 px-2 text-xs">Último consolidado</TableHead>
            <TableHead className="h-8 px-4 text-xs">Sin subir</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {routes.map((r) => (
            <TableRow key={r.route} className={cn(r.missingDays.length > 0 && "bg-red-50/50")}>
              <TableCell className="px-4 py-1.5 font-mono text-sm font-semibold text-slate-800">{r.route}</TableCell>
              <TableCell className="px-2 py-1.5 text-xs tabular-nums">
                {r.daysReceived} <span className="text-slate-400">· {r.guides} guías</span>
              </TableCell>
              <TableCell className="px-2 py-1.5 text-xs tabular-nums">
                {r.daysUploaded}
                {r.daysPartial > 0 && <span className="text-teal-700"> (+{r.daysPartial} en parte)</span>}
              </TableCell>
              <TableCell className="px-2 py-1.5 text-xs">
                <div className="flex gap-1">
                  {r.asPackage > 0 && (
                    <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                      paquete · {r.asPackage} d
                    </Badge>
                  )}
                  {r.asCharge > 0 && (
                    <Badge variant="outline" className="border-sky-200 px-1.5 py-0 text-[10px] text-sky-700">
                      carga · {r.asCharge} d
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="px-2 py-1.5 text-xs text-slate-700">
                {r.subsidiaries.map((s) => `${s.name}${r.subsidiaries.length > 1 ? ` (${s.days} d)` : ""}`).join(" · ") || "—"}
              </TableCell>
              <TableCell className="px-2 py-1.5 text-xs">
                {r.last ? (
                  <>
                    <span className="font-mono text-slate-700">{r.last.consNumber ?? "—"}</span>
                    <span className="text-slate-400"> · {shortDay(r.last.day)}</span>
                  </>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="px-4 py-1.5 text-xs">
                {r.missingDays.length ? (
                  <span className="inline-flex items-center gap-1 font-medium text-red-600">
                    <AlertTriangle className="h-3.5 w-3.5" /> {r.missingDays.map(shortDay).join(", ")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Ninguno
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
