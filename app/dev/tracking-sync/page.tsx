"use client";
import { useState } from "react";
import { CompareTable } from "@/components/tracking-sync/compare-table";
import {
  compareByTracking,
  compareByRoute,
  compareByConsolidated,
  applyCorrections,
  type CompareResult,
} from "@/lib/services/tracking-sync";

type Mode = "tracking" | "route" | "consolidated";

export default function TrackingSyncPage() {
  const [mode, setMode] = useState<Mode>("tracking");
  const [value, setValue] = useState("");
  const [rows, setRows] = useState<CompareResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!value.trim()) return;
    setLoading(true);
    setError(null);
    try {
      if (mode === "tracking") setRows([await compareByTracking(value.trim())]);
      else if (mode === "route") setRows(await compareByRoute(value.trim()));
      else setRows(await compareByConsolidated(value.trim()));
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Error consultando");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const onApply = async (shipmentIds: string[]) => {
    if (shipmentIds.length === 0) return;
    await applyCorrections(shipmentIds);
    await run(); // refresca la comparación para reflejar el nuevo estado
  };

  const placeholder =
    mode === "tracking" ? "Número de guía" : mode === "route" ? "ID de salida a ruta" : "ID de consolidado/devolución";

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Sincronización FedEx (experimental)</h1>
        <p className="text-sm text-muted-foreground">
          Compara nuestro estatus contra FedEx en vivo. Corrección manual (solo estatus, no genera cobros).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["tracking", "route", "consolidated"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setRows([]);
            }}
            className={`px-3 py-1.5 rounded-lg text-sm border ${
              mode === m ? "bg-emerald-600 text-white border-emerald-600" : "bg-white"
            }`}
          >
            {m === "tracking" ? "Por guía" : m === "route" ? "Por salida a ruta" : "Por devolución/consolidado"}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="border rounded-lg px-3 py-1.5 text-sm w-80"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
        />
        <button
          onClick={run}
          disabled={loading}
          className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-sm disabled:opacity-50"
        >
          {loading ? "Consultando…" : "Consultar FedEx ahora"}
        </button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {rows.length > 0 && <CompareTable rows={rows} onApply={onApply} />}
    </div>
  );
}
