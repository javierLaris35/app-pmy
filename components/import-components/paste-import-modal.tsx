"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { ColumnDef } from "@tanstack/react-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/data-table/data-table";
import { SucursalSelector } from "@/components/sucursal-selector";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ClipboardPaste, FlaskConical, Info, Check, X, AlertTriangle, DollarSign, Diamond, Plus, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { useSubsidiaries } from "@/hooks/services/subsidiaries/use-subsidiaries";
import {
  uploadShipmentFile,
  previewShipmentFile,
  uploadHighValueShipments,
  uploadF2ChargeShipments,
  UploadPreview,
} from "@/lib/services/shipments";
import {
  buildMappedTable, mergePayments, mergeHighValue, parsePaymentsPaste, parseHvPaste,
  MappedTable, MappedRow, ParsedPayment, ParsedHv,
} from "@/lib/fedex-header-map";

const FEDEX = "#4D148C";
type PasteKind = "master" | "f2";

function parseTsv(raw: string): string[][] {
  return raw.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim().length > 0).map((l) => l.split("\t"));
}

function buildXlsx(fields: { field: string; header: string }[], rows: Record<string, string>[], name: string): File {
  const headers = fields.map((f) => f.header);
  const body = rows.map((r) => fields.map((f) => r[f.field] ?? ""));
  const ws = XLSX.utils.aoa_to_sheet([headers, ...body]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Pegado");
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new File([out], name, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

function CountChip({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "green" | "amber" | "red" | "purple" | "blue" }) {
  const tones: Record<string, string> = {
    neutral: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-rose-100 text-rose-700",
    purple: "bg-purple-100 text-purple-700",
    blue: "bg-sky-100 text-sky-700",
  };
  return (
    <div className={`flex min-w-[92px] flex-col rounded-lg px-3 py-2 ${tones[tone]}`}>
      <span className="text-lg font-bold leading-none">{value}</span>
      <span className="mt-1 text-[11px] font-medium uppercase tracking-wide opacity-80">{label}</span>
    </div>
  );
}

export function PasteImportModal({
  open, onOpenChange, subsidiaryId,
}: { open: boolean; onOpenChange: (o: boolean) => void; subsidiaryId?: string }) {
  const { subsidiaries } = useSubsidiaries();
  const [kind, setKind] = useState<PasteKind>("master");
  const [raw, setRaw] = useState("");
  const [localSubsidiaryId, setLocalSubsidiaryId] = useState<string>(subsidiaryId ?? "");
  const [consNumber, setConsNumber] = useState("");
  const [consDate, setConsDate] = useState("");
  const [isAereo, setIsAereo] = useState(true);
  const [notRemoveCharge, setNotRemoveCharge] = useState(false);
  const [isHalfTon, setIsHalfTon] = useState(false);
  const [sending, setSending] = useState(false);

  // Enriquecimiento acumulado.
  const [paymentsRaw, setPaymentsRaw] = useState("");
  const [hvRaw, setHvRaw] = useState("");
  const [appliedPayments, setAppliedPayments] = useState<ParsedPayment[]>([]);
  const [appliedHv, setAppliedHv] = useState<ParsedHv[]>([]);
  // Pagos sin tipo pendientes de confirmar (¿usar COD por defecto?).
  const [pendingPayments, setPendingPayments] = useState<ParsedPayment[] | null>(null);

  // Preview del backend (solo master/aéreo).
  const [preview, setPreview] = useState<UploadPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setLocalSubsidiaryId(subsidiaryId ?? ""); }, [subsidiaryId]);

  const selectedSub = subsidiaries.find((s: any) => s.id === localSubsidiaryId) as any;
  const halfTonAvailable = Number(selectedSub?.chargeCostHalfTon ?? 0) > 0;
  useEffect(() => { if (!halfTonAvailable && isHalfTon) setIsHalfTon(false); }, [halfTonAvailable, isHalfTon]);

  const baseTable = useMemo(() => buildMappedTable(parseTsv(raw)), [raw]);
  const table: MappedTable | null = useMemo(() => {
    if (!baseTable) return null;
    let t = baseTable;
    if (appliedPayments.length) t = mergePayments(t, appliedPayments);
    if (appliedHv.length) t = mergeHighValue(t, appliedHv);
    return t;
  }, [baseTable, appliedPayments, appliedHv]);

  const hasContent = raw.trim().length > 0;
  const c = table?.counts;

  // Autollenado desde la fila meta del pegado (consNumber / aéreo / fecha).
  const detConsNumber = table?.meta.consNumber;
  const detDate = table?.meta.date;
  const detAereo = table?.meta.aereo;
  useEffect(() => {
    if (detConsNumber && !consNumber.trim()) setConsNumber(detConsNumber);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detConsNumber]);
  useEffect(() => {
    if (detDate && !consDate) setConsDate(detDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detDate]);
  useEffect(() => {
    if (detAereo !== undefined) setIsAereo(detAereo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detAereo]);

  // --- Preview del backend (master) con debounce ---
  useEffect(() => {
    if (kind !== "master" || !table || !table.hasTracking || !localSubsidiaryId || !consNumber || table.rows.length === 0) {
      setPreview(null);
      return;
    }
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(async () => {
      try {
        setPreviewing(true);
        const good = table.rows.filter((r) => !r.missingTracking);
        const file = buildXlsx(table.fields, good.map((r) => r.values), `preview_${Date.now()}.xlsx`);
        const pv = await previewShipmentFile(file, localSubsidiaryId, consNumber, consDate, "fedex");
        setPreview(pv);
      } catch {
        setPreview(null);
      } finally {
        setPreviewing(false);
      }
    }, 600);
    return () => { if (previewTimer.current) clearTimeout(previewTimer.current); };
  }, [kind, table, localSubsidiaryId, consNumber, consDate]);

  const reset = () => {
    setRaw(""); setConsNumber(""); setConsDate(""); setPaymentsRaw(""); setHvRaw("");
    setAppliedPayments([]); setAppliedHv([]); setPreview(null);
  };
  const close = () => { reset(); onOpenChange(false); };

  const commitPayments = (parsed: ParsedPayment[]) => {
    setAppliedPayments((prev) => [...prev, ...parsed]);
    setPaymentsRaw("");
    toast.success(`${parsed.length} pago(s) agregado(s) a la tabla.`);
  };
  const addPayments = () => {
    const parsed = parsePaymentsPaste(paymentsRaw);
    if (!parsed.length) { toast.error("No se detectaron pagos en lo pegado."); return; }
    const typeless = parsed.filter((p) => p.amount !== null && !p.type);
    if (typeless.length > 0) {
      setPendingPayments(parsed); // pregunta si usar COD por defecto
      return;
    }
    commitPayments(parsed);
  };
  // Resuelve el diálogo de "¿usar COD por defecto?".
  const resolvePending = (useCod: boolean) => {
    if (!pendingPayments) return;
    const resolved = pendingPayments.map((p) =>
      p.amount !== null && !p.type && useCod ? { ...p, type: "COD" } : p,
    );
    commitPayments(resolved);
    setPendingPayments(null);
  };
  const addHv = () => {
    const parsed = parseHvPaste(hvRaw);
    if (!parsed.length) { toast.error("No se detectaron guías de alto valor."); return; }
    setAppliedHv((prev) => [...prev, ...parsed]);
    setHvRaw("");
    toast.success(`${parsed.length} guía(s) marcada(s) como Alto Valor.`);
  };

  // Reglas de bloqueo (espejo del wizard de archivos).
  const blockReason = useMemo(() => {
    if (!table || !table.hasTracking) return "Falta la columna de Guía/Tracking en lo pegado.";
    if ((c?.withTracking ?? 0) === 0) return "No hay guías válidas para importar.";
    const needsSub = true;
    if (needsSub && !localSubsidiaryId) return "Selecciona una sucursal.";
    if (kind === "master" && !consNumber.trim()) return "Captura el número de consolidado.";
    if (kind === "master" && preview) {
      if (preview.parseError) return `Archivo inválido: ${preview.parseError}`;
      if (preview.newCount === 0 && preview.recycledCount === 0) return "Todas las guías ya fueron importadas (sin nuevas ni reingresos).";
    }
    return null;
  }, [table, c, localSubsidiaryId, consNumber, kind, preview]);

  const submit = async () => {
    if (!table || blockReason) return;
    setSending(true);
    try {
      const good = table.rows.filter((r) => !r.missingTracking);
      const file = buildXlsx(table.fields, good.map((r) => r.values), `pegado_${kind}_${Date.now()}.xlsx`);
      let result: any;
      if (kind === "master") {
        result = await uploadShipmentFile(file, localSubsidiaryId, consNumber, consDate || undefined, isAereo);
        // Alto Valor: marca las guías HV tras crear los shipments (match por guía+dirección).
        const hvRows = good.filter((r) => r.isHighValue);
        if (hvRows.length) {
          const hvFile = buildXlsx(
            [{ field: "trackingNumber", header: "trackingNumber" }, { field: "recipientAddress", header: "recipientAddress" }],
            hvRows.map((r) => r.values),
            `hv_${Date.now()}.xlsx`,
          );
          try { await uploadHighValueShipments(hvFile, localSubsidiaryId, consNumber, consDate || undefined); }
          catch (e: any) { toast.error(`Se importaron los envíos, pero falló marcar Alto Valor: ${e?.message ?? ""}`); }
        }
      } else {
        result = await uploadF2ChargeShipments(file, localSubsidiaryId, consNumber, consDate || undefined, notRemoveCharge, isHalfTon);
      }
      const saved = result?.saved ?? result?.summary?.migrated ?? result?.savedChargeShipments ?? result?.count ?? "?";
      toast.success(`Importado (${kind === "master" ? "Aéreo/Master" : "F2"}): ${saved} registro(s).`);
      close();
    } catch (e: any) {
      toast.error(e?.message || e?.response?.data?.message || "No se pudo importar el pegado.");
    } finally {
      setSending(false);
    }
  };

  // Columnas de la tabla de "lo que se guardará".
  const columns: ColumnDef<MappedRow>[] = useMemo(() => {
    if (!table) return [];
    // Columna de marcas (íconos $ / diamante) al inicio.
    const marks: ColumnDef<MappedRow> = {
      id: "marks",
      header: "",
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="flex items-center gap-1">
            {r.hasPayment && (
              <span title={r.paymentNoType ? "Cobro (sin tipo)" : "Cobro"} className={`grid h-6 w-6 place-items-center rounded-full ${r.paymentNoType ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                <DollarSign className="h-3.5 w-3.5" />
              </span>
            )}
            {r.isHighValue && (
              <span title="Alto Valor" className="grid h-6 w-6 place-items-center rounded-full bg-purple-100 text-purple-700">
                <Diamond className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
        );
      },
    };
    const cols: ColumnDef<MappedRow>[] = table.fields.map((f) => ({
      accessorFn: (r) => r.values[f.field] ?? "",
      id: f.field,
      header: f.label,
      cell: ({ row }) => {
        const r = row.original;
        const val = r.values[f.field] ?? "";
        if (f.field === "trackingNumber") {
          return (
            <span className={`font-mono font-semibold ${r.missingTracking ? "text-rose-600" : r.duplicateTracking ? "text-amber-600" : "text-gray-900"}`}>
              {val || "— sin guía —"}
              {r.manual && <span className="ml-1 text-[10px] font-normal text-sky-600">(manual)</span>}
            </span>
          );
        }
        if (f.field === "commitDate") {
          return <span className={r.badDate ? "rounded bg-amber-100 px-1 text-amber-700" : "text-gray-700"}>{val || "-"}</span>;
        }
        if (f.field === "cod") {
          return val ? (
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${r.paymentNoType ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
              <DollarSign className="h-3 w-3" /> {val}{r.paymentNoType ? " · sin tipo" : ""}
            </span>
          ) : <span className="text-gray-300">—</span>;
        }
        return <span className="text-gray-700">{val || "-"}</span>;
      },
    }));
    // Columna HV (marca visual con diamante).
    cols.push({
      id: "hv",
      header: "Alto Valor",
      cell: ({ row }) => row.original.isHighValue
        ? <Badge className="gap-1 bg-purple-100 text-purple-700 hover:bg-purple-100"><Diamond className="h-3 w-3" /> HV</Badge>
        : <span className="text-gray-300">—</span>,
    });
    return [marks, ...cols];
  }, [table]);

  // Prioridad: problemas (rojo/ámbar) → HV (morado) → cobro (verde) → normal.
  const rowClassName = (r: MappedRow) => {
    if (r.missingTracking) return "bg-rose-50 hover:bg-rose-100/70";
    if (r.duplicateTracking || r.badDate || r.paymentNoType) return "bg-amber-50 hover:bg-amber-100/70";
    if (r.isHighValue) return "bg-purple-50/70 hover:bg-purple-100/60";
    if (r.hasPayment) return "bg-emerald-50/60 hover:bg-emerald-100/50";
    return undefined;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-[1120px] bg-white max-h-[92vh] flex flex-col overflow-hidden p-0 border-0 shadow-2xl">
        {/* HEADER */}
        <DialogHeader className="flex flex-col gap-3 border-b border-gray-100 p-6 pb-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border" style={{ background: "#f5f0fb", color: FEDEX, borderColor: "#e6dcf5" }}>
              <ClipboardPaste className="h-6 w-6" />
            </div>
            <div className="text-left">
              <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight text-gray-900">
                Pegar datos FedEx
                <Badge variant="outline" className="gap-1 border-amber-300 text-amber-600"><FlaskConical className="h-3 w-3" /> Experimental</Badge>
              </DialogTitle>
              <p className="mt-1 text-sm text-muted-foreground">Copia desde Excel (con encabezados). Se mapea igual que el import de FedEx.</p>
            </div>
          </div>
          {c && (
            <div className="flex flex-wrap gap-2">
              <CountChip label="Guías" value={c.withTracking} />
              <CountChip label="A importar" value={Math.max(0, c.withTracking - c.duplicates)} tone="green" />
              {c.duplicates > 0 && <CountChip label="Duplicadas" value={c.duplicates} tone="amber" />}
              {c.missingTracking > 0 && <CountChip label="Sin guía" value={c.missingTracking} tone="red" />}
              {c.withPayment > 0 && <CountChip label="Con pago" value={c.withPayment} tone="green" />}
              {c.paymentsNoType > 0 && <CountChip label="Pago s/type" value={c.paymentsNoType} tone="amber" />}
              {c.highValue > 0 && <CountChip label="Alto Valor" value={c.highValue} tone="purple" />}
            </div>
          )}
        </DialogHeader>

        {/* BODY */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50/40 p-6 space-y-5">
          {/* Config */}
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold text-gray-700">Tipo</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as PasteKind)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="master">Aéreo / Master</SelectItem>
                  <SelectItem value="f2">F2 / Cargas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold text-gray-700">Sucursal (*)</Label>
              <SucursalSelector
                value={localSubsidiaryId}
                onValueChange={(val) => setLocalSubsidiaryId(typeof val === "string" ? val : Array.isArray(val) ? (val[0] as any)?.id ?? "" : (val as any)?.id ?? "")}
                insideAModal
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold text-gray-700">No. de consolidado {kind === "master" && "(*)"}</Label>
              <Input className="h-9" value={consNumber} onChange={(e) => setConsNumber(e.target.value)} placeholder="Ej. CONS-123" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold text-gray-700">Fecha del consolidado</Label>
              <Input type="date" className="h-9" value={consDate} onChange={(e) => setConsDate(e.target.value)} />
            </div>

            {kind === "master" && (
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Checkbox checked={isAereo} onCheckedChange={(v) => setIsAereo(Boolean(v))} /> Aéreo
              </label>
            )}
            {kind === "f2" && (
              <>
                <div className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2 sm:col-span-2">
                  <div>
                    <Label className="text-sm">Migrar de envíos a cargas</Label>
                    <p className="text-[11px] text-muted-foreground">Encendido = migra guías ya existentes. Apagado = las guarda directo como carga.</p>
                  </div>
                  <Switch checked={!notRemoveCharge} onCheckedChange={(v) => setNotRemoveCharge(!v)} />
                </div>
                {halfTonAvailable && (
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Checkbox checked={isHalfTon} onCheckedChange={(v) => setIsHalfTon(Boolean(v))} /> Carga 1.5 ton
                  </label>
                )}
              </>
            )}
          </div>

          {/* Info + textarea principal */}
          <div className="flex items-start gap-3 rounded-xl border p-4 text-sm" style={{ background: "#f7f3fc", borderColor: "#ece3f8", color: "#3a1163" }}>
            <Info className="mt-0.5 h-5 w-5 shrink-0" style={{ color: FEDEX }} />
            <p className="leading-relaxed">
              Pega las filas <strong>incluyendo el encabezado</strong> (Tracking, Recip Name, Recip Addr…). Se ignoran columnas que no aplican y se conserva el <strong>Pago</strong> si viene. Las filas con problema se resaltan abajo.
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs font-semibold text-gray-700">Pega aquí (TSV desde Excel)</Label>
            <Textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={"Tracking No\tRecip Name\tRecip Addr\tRecip City\tRecip Postal\tCommit Date\n123456789\tJuan Pérez\tCalle 1\tHermosillo\t83000\t8/20/2026"}
              className="min-h-[160px] w-full resize-none whitespace-pre rounded-xl border-gray-200 bg-white p-4 font-mono text-xs shadow-sm"
            />
            {hasContent && !table && (
              <p className="flex items-center gap-1 text-[12px] text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" /> No se detectaron encabezados FedEx. Incluye la fila de títulos (Tracking, Recip Name, …).
              </p>
            )}
            {table && (detConsNumber || detDate || detAereo !== undefined) && (
              <div className="flex flex-wrap items-center gap-2 text-[12px] text-emerald-700">
                <Check className="h-3.5 w-3.5" /> Detectado del pegado:
                {detConsNumber && <Badge variant="secondary" className="text-[11px]">Consolidado {detConsNumber}</Badge>}
                {detAereo !== undefined && <Badge variant="secondary" className="text-[11px]">{detAereo ? "Aéreo" : "Terrestre"}</Badge>}
                {detDate && <Badge variant="secondary" className="text-[11px]">Fecha {detDate}</Badge>}
                <span className="text-muted-foreground">(puedes editarlos arriba)</span>
              </div>
            )}
          </div>

          {/* Preview del backend (master) */}
          {kind === "master" && preview && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex flex-wrap gap-2">
                <CountChip label="Guías" value={preview.withTracking} />
                <CountChip label="Nuevas" value={preview.newCount} tone="green" />
                {preview.recycledCount > 0 && <CountChip label="Reingresos" value={preview.recycledCount} tone="blue" />}
                {preview.alreadyImportedCount > 0 && <CountChip label="Ya import." value={preview.alreadyImportedCount} tone="amber" />}
                {preview.duplicatesInFile > 0 && <CountChip label="Dup. pegado" value={preview.duplicatesInFile} tone="amber" />}
              </div>
              {preview.newCount === 0 && preview.recycledCount === 0 ? (
                <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">Todas las guías ya fueron importadas en este consolidado; no hay nuevas ni reingresos.</p>
              ) : preview.consNumberExists?.isExactMatch ? (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">El consolidado {preview.consNumberExists.consNumber} ya existe. Se agregarán {preview.newCount} nuevas{preview.recycledCount ? ` (+${preview.recycledCount} reingresos)` : ""}; {preview.alreadyImportedCount} ya estaban y se omiten.</p>
              ) : (
                <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{preview.newCount} nuevas{preview.recycledCount ? ` + ${preview.recycledCount} reingresos` : ""} listas para importar.</p>
              )}
            </div>
          )}

          {/* Enriquecimiento (solo master) */}
          {kind === "master" && table && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-100 text-emerald-700"><DollarSign className="h-3.5 w-3.5" /></span>
                    Agregar pagos (manual)
                  </div>
                  {(c?.withPayment ?? 0) > 0 && (
                    <Badge className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><DollarSign className="h-3 w-3" /> {c?.withPayment} con pago{(c?.paymentsNoType ?? 0) > 0 ? ` · ${c?.paymentsNoType} s/tipo` : ""}</Badge>
                  )}
                </div>
                <p className="mb-2 text-[12px] text-muted-foreground">Pega del correo o Excel: guía + monto (y COD/FTC/ROD si aplica). Se cruzan por guía y se marcan.</p>
                <Textarea value={paymentsRaw} onChange={(e) => setPaymentsRaw(e.target.value)} placeholder={"383012036065\tCOD 1250.00\n383011751254\t980"} className="min-h-[90px] resize-none font-mono text-xs" />
                <div className="mt-2 flex items-center gap-2">
                  <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={addPayments} disabled={!paymentsRaw.trim()}><Plus className="mr-1 h-4 w-4" /> Agregar a la tabla</Button>
                  {appliedPayments.length > 0 && (
                    <Button size="sm" variant="ghost" className="text-gray-500" onClick={() => setAppliedPayments([])}><Trash2 className="mr-1 h-4 w-4" /> Limpiar</Button>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-purple-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-purple-100 text-purple-700"><Diamond className="h-3.5 w-3.5" /></span>
                    Agregar Alto Valor (manual)
                  </div>
                  {(c?.highValue ?? 0) > 0 && (
                    <Badge className="gap-1 bg-purple-100 text-purple-700 hover:bg-purple-100"><Diamond className="h-3 w-3" /> {c?.highValue} HV</Badge>
                  )}
                </div>
                <p className="mb-2 text-[12px] text-muted-foreground">Pega las guías de alto valor (con dirección si viene). Se marcan; si no están en la tabla, se agregan.</p>
                <Textarea value={hvRaw} onChange={(e) => setHvRaw(e.target.value)} placeholder={"383012036065\n383011751254"} className="min-h-[90px] resize-none font-mono text-xs" />
                <div className="mt-2 flex items-center gap-2">
                  <Button size="sm" className="bg-purple-600 text-white hover:bg-purple-700" onClick={addHv} disabled={!hvRaw.trim()}><Plus className="mr-1 h-4 w-4" /> Marcar Alto Valor</Button>
                  {appliedHv.length > 0 && (
                    <Button size="sm" variant="ghost" className="text-gray-500" onClick={() => setAppliedHv([])}><Trash2 className="mr-1 h-4 w-4" /> Limpiar</Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tabla de lo que se guardará */}
          {table && table.rows.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-1">
                <p className="text-sm font-semibold text-gray-900">Lo que se guardará ({table.rows.length})</p>
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-rose-100 ring-1 ring-rose-300" /><span className="text-[11px] text-muted-foreground">sin guía</span></span>
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-amber-100 ring-1 ring-amber-300" /><span className="text-[11px] text-muted-foreground">duplicada / fecha / pago sin tipo</span></span>
                <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5 text-emerald-600" /><span className="text-[11px] text-muted-foreground">cobro</span></span>
                <span className="flex items-center gap-1"><Diamond className="h-3.5 w-3.5 text-purple-600" /><span className="text-[11px] text-muted-foreground">alto valor</span></span>
              </div>
              <div className="max-w-full overflow-x-auto">
                <DataTable columns={columns} data={table.rows} searchKey="trackingNumber" rowClassName={rowClassName} autoResetPageIndex={false} />
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <DialogFooter className="flex w-full items-center gap-3 border-t border-gray-100 p-6 sm:justify-between">
          <div className="flex items-center gap-2 text-[12px]">
            {previewing && <span className="text-muted-foreground">Validando…</span>}
            {blockReason && !previewing && <span className="flex items-center gap-1 text-amber-600"><AlertTriangle className="h-3.5 w-3.5" /> {blockReason}</span>}
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={close} disabled={sending} className="text-gray-500 hover:bg-gray-100 hover:text-gray-800"><X className="mr-2 h-4 w-4" /> Cancelar</Button>
            <Button onClick={submit} disabled={sending || !!blockReason} style={{ background: FEDEX }} className="text-white hover:opacity-90">
              {sending ? "Importando…" : "Procesar e importar"}{!sending && <Check className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* ¿Usar COD por defecto cuando el pago no trae tipo? */}
      <AlertDialog open={!!pendingPayments} onOpenChange={(o) => { if (!o) setPendingPayments(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pagos sin tipo</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingPayments?.filter((p) => p.amount !== null && !p.type).length} pago(s) no traen tipo (COD/FTC/ROD). ¿Usar <strong>COD</strong> como tipo por defecto para esos pagos?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => resolvePending(false)}>Dejar sin tipo</AlertDialogCancel>
            <AlertDialogAction onClick={() => resolvePending(true)}>Usar COD por defecto</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
