"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PmyLoader } from "@/components/ui/pmy-loader";
import { getDispatchChanges, PackageDispatchChange } from "@/lib/services/package-dispatchs";

const STATUS_LABEL: Record<string, string> = {
  en_ruta: "En ruta",
  en_bodega: "En bodega",
  pendiente: "Pendiente",
  recibido_en_bodega: "Recibido en bodega",
};
const statusText = (s: string | null) => (s ? STATUS_LABEL[s] ?? s.replace(/_/g, " ") : "—");

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", { timeZone: "America/Hermosillo", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

/** Historial de guías agregadas/quitadas de una salida: quién, cuándo, qué y por qué. */
export function DispatchChangesList({ dispatchId, refreshKey }: { dispatchId: string; refreshKey: number }) {
  const [rows, setRows] = useState<PackageDispatchChange[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setRows(null);
    setFailed(false);
    getDispatchChanges(dispatchId)
      .then((r) => alive && setRows(r))
      .catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [dispatchId, refreshKey]);

  if (failed) return <p className="py-8 text-center text-sm text-muted-foreground">No se pudo cargar el historial de cambios.</p>;
  if (!rows) return <PmyLoader size="sm" className="min-h-[160px] w-full bg-white py-0" />;
  if (rows.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">Esta salida no ha tenido cambios.</p>;

  return (
    <div className="divide-y rounded-md border">
      {rows.map((c) => (
        <div key={c.id} className="flex items-start gap-3 px-3 py-2 text-xs">
          <span className="w-24 shrink-0 tabular-nums text-muted-foreground">{fmt(c.createdAt)}</span>
          {c.action === "add" ? (
            <Badge variant="outline" className="shrink-0 gap-1 border-emerald-200 text-emerald-700"><Plus className="h-3 w-3" /> Agregó</Badge>
          ) : (
            <Badge variant="outline" className="shrink-0 gap-1 border-red-200 text-red-700"><Minus className="h-3 w-3" /> Quitó</Badge>
          )}
          <span className="w-32 shrink-0 font-mono">{c.trackingNumber}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate" title={c.reason}>“{c.reason}”</p>
            <p className="text-muted-foreground">
              {c.userName} · {statusText(c.previousStatus)} → {statusText(c.newStatus)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
