"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Panel, PanelContent, PanelDescription, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table/data-table";
import { SucursalSelector } from "@/components/sucursal-selector";
import { useZipCoverage } from "@/hooks/services/inbox/use-inbox";
import { useSubsidiaries } from "@/hooks/services/subsidiaries/use-subsidiaries";
import { addZipCoverage, inboxErrorText, rebuildZipCoverage, setZipCoverageStatus } from "@/lib/services/inbox";
import { ZipCoverageRow } from "@/lib/types/inbox";
import { Subsidiary } from "@/lib/types";
import { toast } from "@/lib/toast";
import { Ban, Check, Loader2, Plus, RefreshCw } from "lucide-react";

const SOURCE: Record<ZipCoverageRow["source"], string> = { historial: "Historial", correo: "Correo confirmado", manual: "Manual" };
const STATUS: Record<ZipCoverageRow["status"], { label: string; cls: string }> = {
  sugerido: { label: "Sugerido", cls: "border-slate-200 bg-slate-50 text-slate-600" },
  confirmado: { label: "Confirmado", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  excluido: { label: "Excluido", cls: "border-red-200 bg-red-50 text-red-700" },
};

/** Configuración → Sucursales → Cobertura (CP): CP por sucursal, compartidos en rojo. */
export function ZipCoveragePanel() {
  const [subsidiaryId, setSubsidiaryId] = useState("");
  const { data, isLoading, mutate } = useZipCoverage(subsidiaryId || undefined);
  const { subsidiaries } = useSubsidiaries();
  const [zip, setZip] = useState("");
  const [zipError, setZipError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nameOf = useMemo(() => {
    const m = new Map<string, string>((subsidiaries ?? []).map((s: Subsidiary) => [String(s.id), String(s.name ?? "")] as [string, string]));
    return (id: string) => m.get(id) ?? "Otra sucursal";
  }, [subsidiaries]);

  async function changeStatus(id: string, status: ZipCoverageRow["status"]) {
    try {
      await setZipCoverageStatus(id, status);
      await mutate();
    } catch (e) {
      toast.error(inboxErrorText(e, "No se pudo actualizar el código postal"));
    }
  }

  async function addZip() {
    if (!/^\d{5}$/.test(zip.trim())) {
      setZipError("Escribe un código postal de 5 dígitos");
      return;
    }
    setZipError(null);
    setBusy(true);
    try {
      await addZipCoverage({ zip: zip.trim(), subsidiaryId });
      setZip("");
      toast.success("Código postal agregado");
      await mutate();
    } catch (e) {
      toast.error(inboxErrorText(e, "No se pudo agregar el código postal"));
    } finally {
      setBusy(false);
    }
  }

  async function rebuild() {
    setBusy(true);
    try {
      const r = await rebuildZipCoverage();
      toast.success(`Cobertura recalculada con los últimos ${r.days} días (${r.pairs} códigos)`);
      await mutate();
    } catch (e) {
      toast.error(inboxErrorText(e, "No se pudo recalcular"));
    } finally {
      setBusy(false);
    }
  }

  const columns: ColumnDef<ZipCoverageRow>[] = [
    { accessorKey: "zip", header: "CP", cell: ({ row }) => <span className="font-mono text-xs">{row.original.zip}</span> },
    { accessorKey: "city", header: "Ciudad", cell: ({ row }) => <span className="text-xs">{row.original.city ?? "—"}</span> },
    { accessorKey: "shipmentCount", header: "Guías (90 días)", cell: ({ row }) => <span className="text-xs tabular-nums">{row.original.shipmentCount}</span> },
    {
      accessorKey: "share",
      header: "De esta sucursal",
      cell: ({ row }) => {
        const pct = Math.round(Number(row.original.share) * 100);
        return <span className={`text-xs tabular-nums ${pct < 70 ? "font-semibold text-red-600" : ""}`}>{pct}%</span>;
      },
    },
    {
      id: "compartido",
      header: "También en",
      cell: ({ row }) =>
        row.original.sharedWith.length ? (
          <span className="text-xs text-red-600">{row.original.sharedWith.map(nameOf).join(", ")}</span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
    { accessorKey: "source", header: "Origen", cell: ({ row }) => <span className="text-xs">{SOURCE[row.original.source]}</span> },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => (
        <Badge variant="outline" className={STATUS[row.original.status].cls}>
          {STATUS[row.original.status].label}
        </Badge>
      ),
    },
    {
      id: "acciones",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          {row.original.status !== "confirmado" && (
            <Button size="icon" variant="ghost" className="h-7 w-7" title="Confirmar" onClick={() => changeStatus(row.original.id, "confirmado")}>
              <Check className="h-4 w-4 text-emerald-600" />
            </Button>
          )}
          {row.original.status !== "excluido" && (
            <Button size="icon" variant="ghost" className="h-7 w-7" title="Excluir" onClick={() => changeStatus(row.original.id, "excluido")}>
              <Ban className="h-4 w-4 text-red-600" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Cobertura por código postal</PanelTitle>
        <PanelDescription>
          Qué códigos postales atiende cada sucursal, según las guías de los últimos 90 días y los correos confirmados. Se usa para saber de qué sucursal es un archivo de FedEx.
        </PanelDescription>
      </PanelHeader>
      <PanelContent className="space-y-3">
        <div className="flex flex-wrap items-start gap-2">
          <div className="w-56">
            <SucursalSelector value={subsidiaryId} onValueChange={(v) => setSubsidiaryId(typeof v === "string" ? v : (v as Subsidiary)?.id ?? "")} />
          </div>
          {subsidiaryId && (
            <div className="flex flex-col">
              <div className="flex gap-1.5">
                <Input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="Agregar CP" className="h-9 w-32" inputMode="numeric" maxLength={5} />
                <Button size="sm" variant="outline" className="gap-1" onClick={addZip} disabled={busy}>
                  <Plus className="h-4 w-4" /> Agregar
                </Button>
              </div>
              {zipError && <span className="mt-1 text-xs text-red-600">{zipError}</span>}
            </div>
          )}
          <Button size="sm" variant="outline" className="ml-auto gap-1.5" onClick={rebuild} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Recalcular
          </Button>
        </div>
        {!subsidiaryId ? (
          <div className="rounded-md border bg-white py-12 text-center text-sm text-slate-400">Selecciona una sucursal para ver sus códigos postales</div>
        ) : isLoading ? (
          <div className="flex h-24 items-center justify-center text-sm text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando…
          </div>
        ) : (
          <DataTable columns={columns} data={data ?? []} autoResetPageIndex={false} hideSelectionCount />
        )}
      </PanelContent>
    </Panel>
  );
}
