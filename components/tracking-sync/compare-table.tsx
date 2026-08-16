"use client";
import { Fragment, useMemo, useState } from "react";
import type { CompareResult } from "@/lib/services/tracking-sync";
import { rowFlag, summarizeCompare } from "@/lib/tracking/compare-summary";
import { correctableShipmentIds } from "@/lib/tracking/apply-selection";
import { filterCompareRows, type CompareFilter } from "@/lib/tracking/filter-compare";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ROW_CLASS: Record<string, string> = {
  diverges: "bg-destructive/5 hover:bg-destructive/10",
  stale: "bg-amber-500/5 hover:bg-amber-500/10",
  ok: "",
};

const fmt = (iso: string | null) => (iso ? iso.slice(0, 16).replace("T", " ") : "—");

function StatusCell({ r }: { r: CompareResult }) {
  if (r.error) return <span className="text-muted-foreground">{r.error}</span>;
  if (!r.fedexStatus) return <span className="text-muted-foreground">—</span>;
  return <Badge variant={r.diverges ? "destructive" : "secondary"}>{r.fedexStatus}</Badge>;
}

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
  const [flag, setFlag] = useState<CompareFilter["flag"]>("all");
  const [query, setQuery] = useState("");
  const summary = summarizeCompare(rows);
  const visible = useMemo(() => filterCompareRows(rows, { flag, query }), [rows, flag, query]);

  const FLAG_LABELS: Record<CompareFilter["flag"], string> = {
    all: `Todas (${summary.total})`,
    diverges: `Divergentes (${summary.diverging})`,
    stale: `Desactualizadas (${summary.stale})`,
  };

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{summary.total} guías</span>
          <Badge variant="destructive">{summary.diverging} divergen</Badge>
          <Badge variant="outline" className="border-amber-500 text-amber-600">
            {summary.stale} desactualizadas vs FedEx
          </Badge>
        </div>
        {onApply && (
          <Button variant="destructive" size="sm" disabled={payloadIds.length === 0} onClick={() => setConfirming(true)}>
            Corregir seleccionadas ({payloadIds.length})
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {(["all", "diverges", "stale"] as CompareFilter["flag"][]).map((f) => (
            <Button key={f} size="sm" variant={flag === f ? "default" : "outline"} onClick={() => setFlag(f)}>
              {FLAG_LABELS[f]}
            </Button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="w-56 pl-8"
            placeholder="Buscar guía…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {onApply && <TableHead className="w-8" />}
              <TableHead>Guía</TableHead>
              <TableHead>Nuestro estatus</TableHead>
              <TableHead>Últ. evento nuestro</TableHead>
              <TableHead>Estatus FedEx</TableHead>
              <TableHead>Últ. evento FedEx</TableHead>
              <TableHead className="text-right">Faltantes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={onApply ? 7 : 6} className="text-center text-sm text-muted-foreground py-6">
                  Sin guías que coincidan con el filtro.
                </TableCell>
              </TableRow>
            )}
            {visible.map((r) => (
              <Fragment key={r.shipmentId || r.trackingNumber}>
                <TableRow
                  className={`cursor-pointer ${ROW_CLASS[rowFlag(r)]}`}
                  onClick={() => setOpen((o) => ({ ...o, [r.trackingNumber]: !o[r.trackingNumber] }))}
                >
                  {onApply && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(r.trackingNumber)}
                        onCheckedChange={() => toggleSel(r.trackingNumber)}
                        aria-label={`Seleccionar ${r.trackingNumber}`}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-mono">{r.trackingNumber}</TableCell>
                  <TableCell>{r.ourStatus}</TableCell>
                  <TableCell>{fmt(r.ourLastEventAt)}</TableCell>
                  <TableCell><StatusCell r={r} /></TableCell>
                  <TableCell>{fmt(r.fedexLastEventAt)}</TableCell>
                  <TableCell className="text-right">{r.missingEvents.length}</TableCell>
                </TableRow>
                {open[r.trackingNumber] && (
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableCell colSpan={onApply ? 7 : 6}>
                      <div className="text-xs font-medium mb-1">Timeline FedEx</div>
                      <ul className="space-y-1">
                        {r.fedexEvents.map((e, i) => (
                          <li key={i} className="text-xs text-muted-foreground">
                            <span className="font-mono">{fmt(e.occurredAt)}</span> · {e.status}
                            {e.exceptionCode ? ` (${e.exceptionCode})` : ""} · {e.description ?? ""}{" "}
                            {e.location ? `— ${e.location}` : ""}
                          </li>
                        ))}
                        {r.fedexEvents.length === 0 && <li className="text-xs text-muted-foreground">Sin eventos</li>}
                      </ul>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar corrección</DialogTitle>
            <DialogDescription>
              Esto escribirá el estatus en producción para <b>{payloadIds.length}</b> guía(s).{" "}
              <b>Solo estatus — no genera cobros.</b>
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto rounded border">
            <Table>
              <TableBody>
                {selectedRows
                  .filter((r) => payloadIds.includes(r.shipmentId))
                  .map((r) => (
                    <TableRow key={r.shipmentId}>
                      <TableCell className="font-mono text-xs">{r.trackingNumber}</TableCell>
                      <TableCell className="text-xs">
                        {r.ourStatus} → <b>{r.fedexStatus}</b>
                      </TableCell>
                      <TableCell className="text-xs text-right">{r.missingEvents.length} evento(s)</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={doApply} disabled={applying}>
              {applying ? "Aplicando…" : "Aplicar corrección"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
