"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { ColumnDef } from "@tanstack/react-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/data-table/data-table";
import { SucursalSelector } from "@/components/sucursal-selector";
import { ClipboardPaste, FlaskConical, Info, Check, X, ChevronRight, ChevronLeft, AlertTriangle } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  uploadShipmentFile,
  previewShipmentFile,
  uploadHighValueShipments,
  uploadF2ChargeShipments,
  uploadShipmentPayments,
} from "@/lib/services/shipments";
import { buildMappedTable, MappedTable } from "@/lib/fedex-header-map";

const FEDEX = "#4D148C";

type PasteKind = "master" | "payment" | "high_value" | "f2";

const KIND_LABEL: Record<PasteKind, string> = {
  master: "Aéreo / Master",
  payment: "Cobros (COD)",
  high_value: "Alto Valor",
  f2: "F2 / Cargas",
};

/** Pegado de Excel (TSV) → matriz de celdas. */
function parseTsv(raw: string): string[][] {
  return raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => line.split("\t"));
}

/** Genera el .xlsx (en memoria) a partir de la tabla YA mapeada (columnas canónicas). */
function buildXlsxFile(mapped: MappedTable, name: string): File {
  const headers = mapped.fields.map((f) => f.header);
  const rows = mapped.rows.map((r) => mapped.fields.map((f) => r[f.field] ?? ""));
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Pegado");
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new File([out], name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function StepDot({ active, done, n, label }: { active: boolean; done: boolean; n: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all"
        style={
          done
            ? { background: FEDEX, color: "#fff" }
            : active
            ? { border: `2px solid ${FEDEX}`, color: FEDEX, background: "#f5f0fb" }
            : { border: "2px solid #e5e7eb", color: "#9ca3af", background: "#fff" }
        }
      >
        {done ? <Check className="h-4 w-4" /> : n}
      </div>
      <span className={`text-sm font-medium whitespace-nowrap ${active || done ? "text-gray-900" : "text-gray-400"}`}>{label}</span>
    </div>
  );
}

/**
 * Modal EXPERIMENTAL: pegar datos FedEx desde Excel (en vez de subir archivo).
 * Mismo look/flujo que el wizard de DHL. La tabla se construye IGUAL que el
 * import de FedEx (mismo header-map del backend): mapea por encabezado, ignora
 * columnas irrelevantes y conserva el Pago (COD) si viene. El .xlsx resultante
 * se envía al MISMO endpoint que el flujo por archivo.
 */
export function PasteImportModal({
  open,
  onOpenChange,
  subsidiaryId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  subsidiaryId?: string;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [kind, setKind] = useState<PasteKind>("master");
  const [raw, setRaw] = useState("");
  const [localSubsidiaryId, setLocalSubsidiaryId] = useState<string>(subsidiaryId ?? "");
  const [consNumber, setConsNumber] = useState("");
  const [consDate, setConsDate] = useState("");
  const [isAereo, setIsAereo] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => { setLocalSubsidiaryId(subsidiaryId ?? ""); }, [subsidiaryId]);

  const rawRows = useMemo(() => parseTsv(raw), [raw]);
  const mapped = useMemo(() => buildMappedTable(rawRows), [rawRows]);
  const hasContent = raw.trim().length > 0;

  const needsSubsidiary = kind === "master" || kind === "high_value" || kind === "f2";

  const columns: ColumnDef<Record<string, string>>[] = useMemo(() => {
    if (!mapped) return [];
    return mapped.fields.map((f) => ({
      accessorKey: f.field,
      header: f.label,
      cell: ({ row }) => (
        <span className={f.field === "trackingNumber" ? "font-mono font-semibold text-gray-900" : "text-gray-700"}>
          {row.original[f.field] || "-"}
        </span>
      ),
    }));
  }, [mapped]);

  const reset = () => { setStep(1); setRaw(""); setConsNumber(""); setConsDate(""); };
  const close = () => { reset(); onOpenChange(false); };

  const goNext = () => {
    if (!mapped || !mapped.hasTracking) {
      toast.error("No se detectó la columna de Guía/Tracking. Incluye la fila de encabezados de FedEx.");
      return;
    }
    if (mapped.rows.length === 0) { toast.error("No hay filas con guía para importar."); return; }
    setStep(2);
  };

  const submit = async () => {
    if (!mapped || !mapped.hasTracking) return;
    if (needsSubsidiary && !localSubsidiaryId) { toast.error("Selecciona una sucursal."); return; }

    setSending(true);
    try {
      const file = buildXlsxFile(mapped, `pegado_${kind}_${Date.now()}.xlsx`);
      let result: any;
      if (kind === "master") {
        const pv = await previewShipmentFile(file, localSubsidiaryId, consNumber, consDate, "fedex");
        if (pv.consNumberExists?.isDateConflict) {
          toast.error(`El consolidado ${pv.consNumberExists.consNumber} ya existe con otra fecha.`);
          setSending(false);
          return;
        }
        result = await uploadShipmentFile(file, localSubsidiaryId, consNumber, consDate || undefined, isAereo);
      } else if (kind === "high_value") {
        result = await uploadHighValueShipments(file, localSubsidiaryId, consNumber, consDate || undefined);
      } else if (kind === "f2") {
        result = await uploadF2ChargeShipments(file, localSubsidiaryId, consNumber, consDate || undefined);
      } else {
        result = await uploadShipmentPayments(file, consNumber || undefined);
      }
      const saved = result?.saved ?? result?.count ?? "?";
      toast.success(`Importado (${KIND_LABEL[kind]}): ${saved} registro(s).`);
      close();
    } catch (e: any) {
      toast.error(e?.message || e?.response?.data?.message || "No se pudo importar el pegado.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-[1100px] bg-white max-h-[90vh] flex flex-col overflow-hidden p-0 border-0 shadow-2xl">
        {/* HEADER */}
        <DialogHeader className="flex flex-col gap-4 border-b border-gray-100 p-6 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border" style={{ background: "#f5f0fb", color: FEDEX, borderColor: "#e6dcf5" }}>
              <ClipboardPaste className="h-6 w-6" />
            </div>
            <div className="text-left">
              <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight text-gray-900">
                Pegar datos FedEx
                <Badge variant="outline" className="gap-1 border-amber-300 text-amber-600">
                  <FlaskConical className="h-3 w-3" /> Experimental
                </Badge>
              </DialogTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {mapped?.rows.length ? `${mapped.rows.length} guía(s) detectada(s)` : "Copia desde Excel y pega aquí"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StepDot n={1} label="Pegar" active={step === 1} done={step > 1} />
            <div className="h-[2px] w-8 rounded-full bg-gray-200" />
            <StepDot n={2} label="Revisar e importar" active={step === 2} done={false} />
          </div>
        </DialogHeader>

        {/* BODY */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50/40 p-6">
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <div className="flex items-start gap-3 rounded-xl border p-4 text-sm" style={{ background: "#f7f3fc", borderColor: "#ece3f8", color: "#3a1163" }}>
                <Info className="mt-0.5 h-5 w-5 shrink-0" style={{ color: FEDEX }} />
                <p className="leading-relaxed">
                  Copia las filas desde Excel <strong>incluyendo la fila de encabezados</strong> (Tracking, Recip Name, Recip Addr…). Se mapean las columnas igual que en el import de FedEx: se ignoran las que no aplican y se conserva el <strong>Pago</strong> si viene.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Tipo de datos</Label>
                  <Select value={kind} onValueChange={(v) => setKind(v as PasteKind)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(KIND_LABEL) as PasteKind[]).map((k) => (
                        <SelectItem key={k} value={k}>{KIND_LABEL[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {kind === "master" && (
                  <div className="flex items-end">
                    <label className="flex h-9 items-center gap-2 text-sm font-medium text-gray-700">
                      <Checkbox checked={isAereo} onCheckedChange={(v) => setIsAereo(Boolean(v))} />
                      Aéreo
                    </label>
                  </div>
                )}
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold text-gray-700">Pega aquí (TSV desde Excel)</Label>
                <Textarea
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                  placeholder={"Tracking No\tRecip Name\tRecip Addr\tRecip City\tRecip Postal\tCommit Date\n123456789\tJuan Pérez\tCalle 1\tHermosillo\t83000\t8/20/2026"}
                  className="min-h-[240px] w-full resize-none whitespace-pre rounded-xl border-gray-200 bg-white p-4 font-mono text-xs shadow-sm"
                />
                {hasContent && !mapped && (
                  <p className="flex items-center gap-1 text-[12px] text-amber-600">
                    <AlertTriangle className="h-3.5 w-3.5" /> No se detectaron encabezados FedEx. Incluye la fila de títulos (Tracking, Recip Name, …).
                  </p>
                )}
                {mapped && (
                  <p className="text-[12px] text-muted-foreground">
                    {mapped.rows.length} fila(s) con guía · columnas: {mapped.fields.map((f) => f.label).join(", ")}
                    {mapped.hasPayment ? " · incluye Pago" : ""}
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 2 && mapped && (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-2">
                {needsSubsidiary && (
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Sucursal de destino (*)</Label>
                    <SucursalSelector
                      value={localSubsidiaryId}
                      onValueChange={(val) => setLocalSubsidiaryId(typeof val === "string" ? val : Array.isArray(val) ? (val[0] as any)?.id ?? "" : (val as any)?.id ?? "")}
                      insideAModal
                    />
                  </div>
                )}
                <div className="grid gap-1.5">
                  <Label className="text-xs font-semibold text-gray-700">No. de consolidado</Label>
                  <Input className="h-9" value={consNumber} onChange={(e) => setConsNumber(e.target.value)} placeholder="Ej. CONS-123" />
                </div>
                {needsSubsidiary && (
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Fecha del consolidado</Label>
                    <Input type="date" className="h-9" value={consDate} onChange={(e) => setConsDate(e.target.value)} />
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="text-sm font-semibold text-gray-900">Vista previa ({mapped.rows.length})</p>
                  {mapped.hasPayment && <Badge variant="secondary" className="text-[11px]">Incluye Pago</Badge>}
                </div>
                <div className="max-w-full overflow-x-auto">
                  <DataTable columns={columns} data={mapped.rows} searchKey="trackingNumber" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <DialogFooter className="flex w-full items-center gap-3 border-t border-gray-100 p-6 sm:justify-between">
          <Button variant="ghost" onClick={close} disabled={sending} className="text-gray-500 hover:bg-gray-100 hover:text-gray-800">
            <X className="mr-2 h-4 w-4" /> Cancelar
          </Button>
          <div className="flex gap-3">
            {step === 2 && (
              <Button variant="outline" onClick={() => setStep(1)} disabled={sending}>
                <ChevronLeft className="mr-1.5 h-4 w-4" /> Regresar
              </Button>
            )}
            {step === 1 && (
              <Button onClick={goNext} disabled={!mapped || !mapped.hasTracking} style={{ background: FEDEX }} className="text-white hover:opacity-90">
                Siguiente <ChevronRight className="ml-1.5 h-4 w-4" />
              </Button>
            )}
            {step === 2 && (
              <Button onClick={submit} disabled={sending} style={{ background: FEDEX }} className="text-white hover:opacity-90">
                {sending ? "Importando…" : "Procesar e importar"}
                {!sending && <Check className="ml-2 h-4 w-4" />}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
