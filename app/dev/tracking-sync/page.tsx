"use client";
import { useEffect, useState } from "react";
import { CompareTable } from "@/components/tracking-sync/compare-table";
import {
  compareByTracking,
  compareByRoute,
  compareByConsolidated,
  applyCorrections,
  listRoutesBySubsidiaryDay,
  listConsolidatedsBySubsidiaryDay,
  type CompareResult,
  type PickerOption,
} from "@/lib/services/tracking-sync";
import { getSubsidiaries } from "@/lib/services/subsidiaries";
import type { Subsidiary } from "@/lib/types";

type Mode = "tracking" | "route" | "consolidated";
const today = () => new Date().toISOString().slice(0, 10);

export default function TrackingSyncPage() {
  const [mode, setMode] = useState<Mode>("tracking");
  const [rows, setRows] = useState<CompareResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Por guía
  const [tracking, setTracking] = useState("");

  // Por ruta / consolidado
  const [subs, setSubs] = useState<Subsidiary[]>([]);
  const [subsidiaryId, setSubsidiaryId] = useState("");
  const [day, setDay] = useState(today());
  const [options, setOptions] = useState<PickerOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    getSubsidiaries().then(setSubs).catch(() => setSubs([]));
  }, []);

  const runTracking = async () => {
    if (!tracking.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setRows([await compareByTracking(tracking.trim())]);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const search = async () => {
    if (!subsidiaryId) {
      setError("Elige una sucursal");
      return;
    }
    setSearching(true);
    setError(null);
    setOptions([]);
    setSelectedId("");
    setRows([]);
    try {
      const opts =
        mode === "route"
          ? await listRoutesBySubsidiaryDay(subsidiaryId, day)
          : await listConsolidatedsBySubsidiaryDay(subsidiaryId, day);
      setOptions(opts);
      if (opts.length === 0) setError("Sin resultados para esa sucursal y día");
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Error listando");
    } finally {
      setSearching(false);
    }
  };

  const pick = async (id: string) => {
    setSelectedId(id);
    if (!id) {
      setRows([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setRows(mode === "route" ? await compareByRoute(id) : await compareByConsolidated(id));
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const onApply = async (shipmentIds: string[]) => {
    if (shipmentIds.length === 0) return;
    await applyCorrections(shipmentIds);
    if (mode === "tracking") await runTracking();
    else if (selectedId) await pick(selectedId);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setRows([]);
    setOptions([]);
    setSelectedId("");
    setError(null);
  };

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
            onClick={() => switchMode(m)}
            className={`px-3 py-1.5 rounded-lg text-sm border ${
              mode === m ? "bg-emerald-600 text-white border-emerald-600" : "bg-white"
            }`}
          >
            {m === "tracking" ? "Por guía" : m === "route" ? "Por salida a ruta" : "Por consolidado"}
          </button>
        ))}
      </div>

      {mode === "tracking" ? (
        <div className="flex gap-2">
          <input
            className="border rounded-lg px-3 py-1.5 text-sm w-80"
            placeholder="Número de guía"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runTracking()}
          />
          <button
            onClick={runTracking}
            disabled={loading}
            className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-sm disabled:opacity-50"
          >
            {loading ? "Consultando…" : "Consultar FedEx ahora"}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 items-center">
            <select
              className="border rounded-lg px-3 py-1.5 text-sm"
              value={subsidiaryId}
              onChange={(e) => setSubsidiaryId(e.target.value)}
            >
              <option value="">Sucursal…</option>
              {subs.map((s) => (
                <option key={s.id ?? s.name} value={s.id ?? ""}>
                  {s.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="border rounded-lg px-3 py-1.5 text-sm"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />
            <button
              onClick={search}
              disabled={searching}
              className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-sm disabled:opacity-50"
            >
              {searching ? "Buscando…" : "Buscar"}
            </button>
          </div>
          {options.length > 0 && (
            <select
              className="border rounded-lg px-3 py-1.5 text-sm w-full max-w-xl"
              value={selectedId}
              onChange={(e) => pick(e.target.value)}
            >
              <option value="">{mode === "route" ? "Elige una salida a ruta…" : "Elige un consolidado…"}</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {error && <div className="text-sm text-red-600">{error}</div>}
      {loading && rows.length === 0 && <div className="text-sm text-muted-foreground">Consultando FedEx…</div>}
      {rows.length > 0 && <CompareTable rows={rows} onApply={onApply} />}
    </div>
  );
}
