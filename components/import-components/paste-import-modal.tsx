"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, ClipboardPaste, FlaskConical } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  uploadShipmentFile,
  previewShipmentFile,
  uploadHighValueShipments,
  uploadF2ChargeShipments,
  uploadShipmentPayments,
} from "@/lib/services/shipments";

type PasteKind = "master" | "payment" | "high_value" | "f2";

const KIND_LABEL: Record<PasteKind, string> = {
  master: "Aéreo / Master",
  payment: "Cobros (COD)",
  high_value: "Alto Valor",
  f2: "F2 / Cargas",
};

/** Convierte el pegado de Excel (TSV) en una matriz de celdas. */
function parseTsv(raw: string): string[][] {
  return raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => line.split("\t"));
}

function buildXlsxFile(rows: string[][], name: string): File {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Pegado");
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new File([out], name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/**
 * Modal EXPERIMENTAL: pega datos copiados desde Excel (en vez de subir archivo).
 * El pegado se convierte a un .xlsx en memoria y se envía al MISMO endpoint que
 * el flujo por archivo (misma preview/validación/enriquecimiento FedEx).
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
  const [kind, setKind] = useState<PasteKind>("master");
  const [raw, setRaw] = useState("");
  const [consNumber, setConsNumber] = useState("");
  const [consDate, setConsDate] = useState("");
  const [isAereo, setIsAereo] = useState(true);
  const [sending, setSending] = useState(false);

  const rows = useMemo(() => parseTsv(raw), [raw]);
  const preview = rows.slice(0, 10);
  const dataRowCount = Math.max(0, rows.length - 1); // primera fila = encabezados

  const needsSubsidiary = kind === "master" || kind === "high_value" || kind === "f2";

  const reset = () => { setRaw(""); setConsNumber(""); setConsDate(""); };

  const submit = async () => {
    if (rows.length < 2) { toast.error("Pega al menos una fila de encabezados y una de datos."); return; }
    if (needsSubsidiary && !subsidiaryId) { toast.error("Selecciona una sucursal primero."); return; }
    setSending(true);
    try {
      const file = buildXlsxFile(rows, `pegado_${kind}_${Date.now()}.xlsx`);
      let result: any;
      if (kind === "master") {
        // Misma preview que el flujo por archivo antes de guardar.
        const pv = await previewShipmentFile(file, subsidiaryId!, consNumber, consDate, "fedex");
        if (pv.consNumberExists?.isDateConflict) {
          toast.error(`El consolidado ${pv.consNumberExists.consNumber} ya existe con otra fecha.`);
          setSending(false);
          return;
        }
        result = await uploadShipmentFile(file, subsidiaryId!, consNumber, consDate || undefined, isAereo);
      } else if (kind === "high_value") {
        result = await uploadHighValueShipments(file, subsidiaryId!, consNumber, consDate || undefined);
      } else if (kind === "f2") {
        result = await uploadF2ChargeShipments(file, subsidiaryId!, consNumber, consDate || undefined);
      } else {
        result = await uploadShipmentPayments(file, consNumber || undefined);
      }
      const saved = result?.saved ?? result?.count ?? "?";
      toast.success(`Importado (${KIND_LABEL[kind]}): ${saved} registro(s).`);
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || e?.response?.data?.message || "No se pudo importar el pegado.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPaste className="h-5 w-5" /> Pegar datos FedEx
            <Badge variant="outline" className="ml-1 gap-1 border-amber-300 text-amber-600">
              <FlaskConical className="h-3 w-3" /> Experimental
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Copia las filas desde Excel (con su encabezado) y pégalas aquí. El sistema arma el archivo y lo procesa igual que una carga normal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Tipo de datos</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as PasteKind)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(KIND_LABEL) as PasteKind[]).map((k) => (
                    <SelectItem key={k} value={k}>{KIND_LABEL[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">No. de consolidado</Label>
              <Input className="h-9" value={consNumber} onChange={(e) => setConsNumber(e.target.value)} placeholder="CONS-…" />
            </div>
            {needsSubsidiary && (
              <div>
                <Label className="text-xs">Fecha del consolidado</Label>
                <Input type="date" className="h-9" value={consDate} onChange={(e) => setConsDate(e.target.value)} />
              </div>
            )}
            {kind === "master" && (
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={isAereo} onChange={(e) => setIsAereo(e.target.checked)} />
                  Aéreo
                </label>
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs">Pega aquí (TSV desde Excel)</Label>
            <Textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder="Tracking\tDestinatario\tDirección\t…&#10;123456789\tJuan Pérez\tCalle 1\t…"
              className="min-h-[160px] font-mono text-xs"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {rows.length > 0 ? `${dataRowCount} fila(s) de datos detectada(s) (1 de encabezados).` : "Sin datos pegados."}
            </p>
          </div>

          {preview.length > 0 && (
            <div className="max-h-52 overflow-auto rounded-lg border">
              <table className="w-full text-[11px]">
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={i} className={i === 0 ? "bg-muted font-semibold" : "border-t"}>
                      {r.map((c, j) => <td key={j} className="whitespace-nowrap px-2 py-1">{c}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>Cancelar</Button>
          <Button onClick={submit} disabled={sending || rows.length < 2}>
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Procesar e importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
