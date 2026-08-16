"use client";
import { Fragment, useMemo, useState } from "react";
import type { CompareResult } from "@/lib/services/tracking-sync";
import { rowFlag, summarizeCompare } from "@/lib/tracking/compare-summary";
import { correctableShipmentIds } from "@/lib/tracking/apply-selection";

const FLAG_STYLES: Record<string, string> = {
  diverges: "border-l-4 border-red-500 bg-red-50",
  stale: "border-l-4 border-amber-500 bg-amber-50",
  ok: "border-l-4 border-transparent",
};

const fmt = (iso: string | null) => (iso ? iso.slice(0, 16).replace("T", " ") : "—");

export function CompareTable({
  rows,
  onApply,
}: {
  rows: CompareResult[];
  onApply?: (shipmentIds: string[]) => Promise<void>;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [applying, setApplying] = useState(false);
  const summary = summarizeCompare(rows);

  const toggleSel = (tn: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(tn) ? n.delete(tn) : n.add(tn);
      return n;
    });

  const selectedRows = useMemo(() => rows.filter((r) => selected.has(r.trackingNumber)), [rows, selected]);
  const payloadIds = useMemo(() => correctableShipmentIds(rows, [...selected]), [rows, selected]);

  const doApply = async () => {
    if (!onApply || payloadIds.length === 0) return;
    setApplying(true);
    try {
      await onApply(payloadIds);
      setConfirming(false);
      setSelected(new Set());
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {summary.total} guías · <span className="text-red-600 font-medium">{summary.diverging} divergen</span> ·{" "}
          <span className="text-amber-600 font-medium">{summary.stale} desactualizadas vs FedEx</span>
        </div>
        {onApply && (
          <button
            disabled={payloadIds.length === 0}
            onClick={() => setConfirming(true)}
            className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm disabled:opacity-40"
          >
            Corregir seleccionadas ({payloadIds.length})
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              {onApply && <th className="p-2 w-8" />}
              <th className="p-2">Guía</th>
              <th className="p-2">Nuestro estatus</th>
              <th className="p-2">Últ. evento nuestro</th>
              <th className="p-2">Estatus FedEx</th>
              <th className="p-2">Últ. evento FedEx</th>
              <th className="p-2">Faltantes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Fragment key={r.shipmentId || r.trackingNumber}>
                <tr
                  className={`cursor-pointer ${FLAG_STYLES[rowFlag(r)]}`}
                  onClick={() => setOpen((o) => ({ ...o, [r.trackingNumber]: !o[r.trackingNumber] }))}
                >
                  {onApply && (
                    <td className="p-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(r.trackingNumber)}
                        onChange={() => toggleSel(r.trackingNumber)}
                      />
                    </td>
                  )}
                  <td className="p-2 font-mono">{r.trackingNumber}</td>
                  <td className="p-2">{r.ourStatus}</td>
                  <td className="p-2">{fmt(r.ourLastEventAt)}</td>
                  <td className="p-2">{r.error ? <span className="text-slate-400">{r.error}</span> : r.fedexStatus ?? "—"}</td>
                  <td className="p-2">{fmt(r.fedexLastEventAt)}</td>
                  <td className="p-2">{r.missingEvents.length}</td>
                </tr>
                {open[r.trackingNumber] && (
                  <tr>
                    <td colSpan={onApply ? 7 : 6} className="p-3 bg-slate-50">
                      <div className="text-xs font-medium mb-1">Timeline FedEx</div>
                      <ul className="space-y-1">
                        {r.fedexEvents.map((e, i) => (
                          <li key={i} className="text-xs">
                            <span className="font-mono">{fmt(e.occurredAt)}</span> · {e.status}
                            {e.exceptionCode ? ` (${e.exceptionCode})` : ""} · {e.description ?? ""}{" "}
                            {e.location ? `— ${e.location}` : ""}
                          </li>
                        ))}
                        {r.fedexEvents.length === 0 && <li className="text-xs text-slate-400">Sin eventos</li>}
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {confirming && onApply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-5 space-y-3">
            <h3 className="font-semibold">Confirmar corrección</h3>
            <p className="text-sm text-slate-600">
              Esto escribirá el estatus en producción para <b>{payloadIds.length}</b> guía(s).{" "}
              <b>Solo estatus — no genera cobros.</b>
            </p>
            <div className="max-h-60 overflow-y-auto rounded border text-xs">
              <table className="w-full">
                <tbody>
                  {selectedRows
                    .filter((r) => payloadIds.includes(r.shipmentId))
                    .map((r) => (
                      <tr key={r.shipmentId} className="border-b last:border-0">
                        <td className="p-1.5 font-mono">{r.trackingNumber}</td>
                        <td className="p-1.5">{r.ourStatus} → <b>{r.fedexStatus}</b></td>
                        <td className="p-1.5">{r.missingEvents.length} evento(s)</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setConfirming(false)} className="px-3 py-1.5 rounded-lg border text-sm">
                Cancelar
              </button>
              <button
                onClick={doApply}
                disabled={applying}
                className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-sm disabled:opacity-50"
              >
                {applying ? "Aplicando…" : "Aplicar corrección"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
