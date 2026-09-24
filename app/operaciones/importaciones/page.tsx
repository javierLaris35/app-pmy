"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { OperationHeader } from "@/components/shared/operation-header";
import { withAuth } from "@/hoc/withAuth";
import { FileSpreadsheet, Download, Loader2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SucursalSelector } from "@/components/sucursal-selector";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { formatDate } from "@/utils/date.utils";
import { useSubsidiaries } from "@/hooks/services/subsidiaries/use-subsidiaries";
import {
  ImportFileItem,
  IMPORT_KIND_LABEL,
  ImportFileKind,
  listImportFiles,
  downloadImportFile,
} from "@/lib/services/import-files";

function ImportacionesPage() {
  const { subsidiaries } = useSubsidiaries();
  const [items, setItems] = useState<ImportFileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");
  const [subsidiaryId, setSubsidiaryId] = useState<string | undefined>(undefined);
  const [kind, setKind] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>(today);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listImportFiles({
        subsidiaryId,
        kind: kind === "all" ? undefined : kind,
        from: from || undefined,
        to: to || undefined,
      });
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [subsidiaryId, kind, from, to]);

  const subName = (id: string | null) => subsidiaries.find((s) => s.id === id)?.name ?? "—";

  const handleDownload = async (f: ImportFileItem) => {
    setBusyId(f.id);
    try { await downloadImportFile(f); } finally { setBusyId(null); }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <OperationHeader
          icon={FileSpreadsheet}
          title="Importaciones"
          description="Archivos originales que se subieron de FedEx"
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={load} aria-label="Actualizar lista">
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
          }
        />

        {/* Filtros de consulta */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-56">
            <SucursalSelector value={subsidiaryId ?? ""} onValueChange={(v) => setSubsidiaryId(v as string)} />
          </div>
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {(Object.keys(IMPORT_KIND_LABEL) as ImportFileKind[]).map((k) => (
                <SelectItem key={k} value={k}>{IMPORT_KIND_LABEL[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" className="h-9 w-[150px]" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" className="h-9 w-[150px]" value={to} onChange={(e) => setTo(e.target.value)} min={from} />
        </div>

        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Archivo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Consolidado</TableHead>
                <TableHead className="text-right">Filas</TableHead>
                <TableHead>Subió</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Descargar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </TableCell>
                </TableRow>
              )}
              {!loading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    Sin archivos para los filtros seleccionados.
                  </TableCell>
                </TableRow>
              )}
              {!loading && items.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.originalName}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-[11px]">{IMPORT_KIND_LABEL[f.kind] ?? f.kind}</Badge></TableCell>
                  <TableCell>{subName(f.subsidiaryId)}</TableCell>
                  <TableCell className="text-muted-foreground">{f.consNumber ?? "—"}</TableCell>
                  <TableCell className="text-right">{f.rowCount ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{f.uploadedByName ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(String(f.createdAt))}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" disabled={busyId === f.id} onClick={() => handleDownload(f)}>
                      {busyId === f.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}

export default withAuth(ImportacionesPage, "bodega.consolidados");
