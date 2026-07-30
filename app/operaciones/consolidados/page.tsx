"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { LoaderWithOverlay } from "@/components/loader";
import { AppLayout } from "@/components/app-layout";
import { OperationHeader } from "@/components/shared/operation-header";
import {
  Package, CheckCircle2, Layers3, AlertTriangle, Clock, RefreshCcwIcon, FileDown,
  Warehouse, CornerDownLeft, Ban, HelpCircle, TrendingUp, Gem, DollarSign, MapPin, PackageCheck
} from "lucide-react";
import { SucursalSelector } from "@/components/sucursal-selector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useZones } from "@/hooks/services/zones/use-zones";
import { useConsolidated } from "@/hooks/services/consolidateds/use-consolidated";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getFedexStatus } from "@/lib/services/consolidated";
import { withAuth } from "@/hoc/withAuth";
import { columns } from "./columns";
import { useAuthStore } from "@/store/auth.store";
import { formatShortDate } from "@/utils/date.utils";

import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

function ConsolidatedWithKpis() {
  const user = useAuthStore((s) => s.user);

  const today = new Date();
  const startDayOfMonth = format(startOfMonth(today), "yyyy-MM-dd");
  const endDayOfMonth = format(endOfMonth(today), "yyyy-MM-dd");
  const [selectedSucursalId, setSelectedSucursalId] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: startDayOfMonth,
    to: endDayOfMonth,
  });

  // Alcance del reporte: por sucursal / por zona / todas las sucursales.
  const role = String(user?.role || "").toLowerCase();
  const isGlobal = ["superadmin", "superamin", "owner"].includes(role);
  const [scopeMode, setScopeMode] = useState<"sucursal" | "zona" | "todas">("sucursal");
  const [selectedZoneId, setSelectedZoneId] = useState<string | undefined>(undefined);
  const { zones } = useZones();

  const effectiveSubsidiaryId = selectedSucursalId || user?.subsidiary?.id;

  // Construye el scope que consume el hook según el modo elegido.
  const scope = useMemo(() => {
    if (scopeMode === "todas") return {};
    if (scopeMode === "zona") return { zoneId: selectedZoneId };
    return { subsidiaryId: effectiveSubsidiaryId };
  }, [scopeMode, selectedZoneId, effectiveSubsidiaryId]);

  const { consolidateds, isLoading, mutate } = useConsolidated(
    scope, dateRange.from, dateRange.to
  );

  useEffect(() => {
    mutate();
  }, [dateRange.from, dateRange.to, scopeMode, selectedSucursalId, selectedZoneId, mutate]);

  const handleDateChange = (type: 'from' | 'to', value: string) => {
    setDateRange(prev => ({ ...prev, [type]: value }));
  };

  if (!consolidateds || isLoading) return <LoaderWithOverlay overlay transparent text="Cargando..." className="rounded-lg"/>;

  // --- CÁLCULO DE KPIS VISUALES ---
  let totalShipments = 0; let totalPOD = 0; let totalDEX03 = 0; let totalDEX07 = 0;
  let totalDEX08 = 0; let totalBodega = 0; let totalEnRuta = 0; let totalPendiente = 0; let totalDevueltos = 0;
  let totalHighValue = 0; let totalCobros = 0; let totalOcurre = 0; let totalPodPlusDexs = 0; let totalPendMov = 0;

  consolidateds.forEach(c => {
    const counts = c.shipmentCounts || {};
    totalShipments += counts.total || 0;
    totalPOD += counts.entregado || 0;
    totalDEX03 += counts.dex03 || 0;
    totalDEX07 += counts.dex07 || 0;
    totalDEX08 += counts.dex08 || 0;
    totalBodega += counts.en_bodega || 0;
    totalEnRuta += counts.en_ruta || 0;
    totalPendiente += counts.pendiente || 0;
    totalDevueltos += counts.totalDevueltos || 0;
    totalHighValue += counts.countHighValue || 0;
    totalCobros += counts.countCobros || 0;
    totalOcurre += counts.ocurre || 0;
    totalPodPlusDexs += counts.podPlusDexs || 0;
    totalPendMov += counts.guiasPendientesDeMov || 0;
  });

  // Cerrado/Abierto lo determina el backend (estatusCuadre); fallback a isConsolidatedComplete.
  const isCerrado = (c: typeof consolidateds[number]) =>
    (c.estatusCuadre ? c.estatusCuadre === "cerrado" : c.isConsolidatedComplete);
  const completedConsolidateds = consolidateds.filter(isCerrado).length;

  const handleUpdateFedexStatus = async () => {
    await getFedexStatus(selectedSucursalId, dateRange.from, dateRange.to);
    mutate();
  };

  // --- EXPORTACIÓN A EXCEL: CUADRE OPERATIVO (layout manual) ---
  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Sistema de Logística";
    workbook.created = new Date();

    const ws = workbook.addWorksheet("Cuadre Operativo");
    const wsPendientes = workbook.addWorksheet("Paquetes Pendientes");

    // ==========================================
    // HOJA 1: CUADRE OPERATIVO (columnas del CONS CABO)
    // ==========================================
    ws.columns = [
      { header: "CONSOLIDADO", key: "consolidado", width: 24 },
      { header: "FECHA", key: "fecha", width: 13 },
      { header: "NORMAL", key: "normal", width: 10 },
      { header: "HV", key: "hv", width: 8 },
      { header: "COBROS", key: "cobros", width: 10 },
      { header: "F2", key: "f2", width: 8 },
      { header: "TOTAL CARGA", key: "totalCarga", width: 13 },
      { header: "POD", key: "pod", width: 9 },
      { header: "DEX 07", key: "dex07", width: 9 },
      { header: "DEX 03", key: "dex03", width: 9 },
      { header: "DEX 08", key: "dex08", width: 9 },
      { header: "OCURRE", key: "ocurre", width: 9 },
      { header: "POD + DEXS", key: "podDexs", width: 12 },
      { header: "GUIAS PTES DE MOV", key: "ptes", width: 18 },
      { header: "ESTATUS", key: "estatus", width: 12 },
    ];

    ws.getRow(1).height = 26;
    ws.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    });

    // Acumuladores para la fila de TOTAL.
    const t = { normal: 0, hv: 0, cobros: 0, f2: 0, totalCarga: 0, pod: 0, dex07: 0, dex03: 0, dex08: 0, ocurre: 0, podDexs: 0, ptes: 0 };

    consolidateds.forEach(c => {
      const k = c.shipmentCounts || ({} as NonNullable<typeof c.shipmentCounts>);
      const row = {
        normal: k.countNormal || 0,
        hv: k.countHighValue || 0,
        cobros: k.countCobros || 0,
        f2: k.countF2 || 0,
        totalCarga: k.totalCargas || 0,
        pod: k.entregado || 0,
        dex07: k.dex07 || 0,
        dex03: k.dex03 || 0,
        dex08: k.dex08 || 0,
        ocurre: k.ocurre || 0,
        podDexs: k.podPlusDexs || 0,
        ptes: k.guiasPendientesDeMov || 0,
      };
      (Object.keys(t) as (keyof typeof t)[]).forEach(key => { t[key] += (row as any)[key] || 0; });

      const added = ws.addRow({
        consolidado: c.consNumber || c.code || c.id,
        fecha: c.date ? formatShortDate(c.date as unknown as string) : "",
        ...row,
        estatus: isCerrado(c) ? "CERRADO" : "ABIERTO",
      });
      // Resalta el estatus.
      const estatusCell = added.getCell(15);
      const cerrado = isCerrado(c);
      estatusCell.font = { bold: true, color: { argb: cerrado ? "FF059669" : "FFB45309" } };
      estatusCell.alignment = { horizontal: "center" };
    });

    // Fila de TOTAL.
    const totalRow = ws.addRow({
      consolidado: "TOTAL",
      fecha: "",
      normal: t.normal, hv: t.hv, cobros: t.cobros, f2: t.f2, totalCarga: t.totalCarga,
      pod: t.pod, dex07: t.dex07, dex03: t.dex03, dex08: t.dex08, ocurre: t.ocurre,
      podDexs: t.podDexs, ptes: t.ptes, estatus: "",
    });
    totalRow.eachCell(cell => {
      cell.font = { bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
    });

    // ==========================================
    // HOJA 2: PENDIENTES (utilidad, sin cambios de fondo)
    // ==========================================
    wsPendientes.columns = [
      { header: "Consolidado", key: "cId", width: 24 },
      { header: "Tracking", key: "tracking", width: 20 },
      { header: "Estatus Actual", key: "status", width: 20 },
      { header: "Carrier", key: "carrier", width: 15 }
    ];
    consolidateds.forEach(c => {
      c.pendingShipments?.forEach(p => {
        wsPendientes.addRow({ cId: c.consNumber, tracking: p.tracking, status: p.status, carrier: p.carrier });
      });
    });
    wsPendientes.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    wsPendientes.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Cuadre_Operativo_${dateRange.from}_al_${dateRange.to}.xlsx`);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <OperationHeader
          icon={Layers3}
          title="Consolidados"
          description="Resumen de consolidaciones y cuadre de operaciones"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9 bg-slate-900 text-white" onClick={handleExportExcel}>
                    <FileDown className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Exportar Dashboard y Detalles</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="secondary" size="icon" className="h-9 w-9 bg-emerald-500 text-white" onClick={handleUpdateFedexStatus}>
                    <RefreshCcwIcon className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Actualizar estatus de FedEx</TooltipContent>
              </Tooltip>

              {/* Alcance del reporte: sucursal / zona / todas */}
              <Select value={scopeMode} onValueChange={(v) => setScopeMode(v as typeof scopeMode)}>
                <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sucursal">Por sucursal</SelectItem>
                  <SelectItem value="zona">Por zona</SelectItem>
                  {isGlobal && <SelectItem value="todas">Todas las sucursales</SelectItem>}
                </SelectContent>
              </Select>

              {scopeMode === "sucursal" && (
                <div className="w-[190px]">
                  <SucursalSelector value={selectedSucursalId} onValueChange={(v) => setSelectedSucursalId(v as string)} />
                </div>
              )}

              {scopeMode === "zona" && (
                <Select value={selectedZoneId} onValueChange={setSelectedZoneId}>
                  <SelectTrigger className="h-9 w-[190px]"><SelectValue placeholder="Seleccionar zona..." /></SelectTrigger>
                  <SelectContent>
                    {zones.map((z) => (
                      <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Input id="fromDate" type="date" className="h-9 w-[150px]" value={dateRange.from} onChange={(e) => handleDateChange('from', e.target.value)} />
              <Input id="toDate" type="date" className="h-9 w-[150px]" value={dateRange.to} onChange={(e) => handleDateChange('to', e.target.value)} min={dateRange.from} />
            </div>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-slate-900 p-4 rounded-xl text-white shadow-sm border border-slate-700">
            <div className="flex justify-between mb-2"><span className="text-xs uppercase text-slate-400">Total Carga</span><Package className="h-5 w-5 text-slate-300" /></div>
            <div className="text-3xl font-extrabold">{totalShipments}</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
            <div className="flex justify-between mb-2"><span className="text-xs uppercase text-purple-800">Alto Valor</span><Gem className="h-5 w-5 text-purple-600" /></div>
            <div className="text-3xl font-extrabold text-purple-900">{totalHighValue}</div>
          </div>
          <div className="bg-lime-50 p-4 rounded-xl border border-lime-200">
            <div className="flex justify-between mb-2"><span className="text-xs uppercase text-lime-800">Cobros</span><DollarSign className="h-5 w-5 text-lime-600" /></div>
            <div className="text-3xl font-extrabold text-lime-900">{totalCobros}</div>
          </div>
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
            <div className="flex justify-between mb-2"><span className="text-xs uppercase text-emerald-800">Entregados (POD)</span><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div>
            <div className="text-3xl font-extrabold text-emerald-900">{totalPOD}</div>
          </div>
          <div className="bg-cyan-50 p-4 rounded-xl border border-cyan-200">
            <div className="flex justify-between mb-2"><span className="text-xs uppercase text-cyan-800">Ocurre</span><MapPin className="h-5 w-5 text-cyan-600" /></div>
            <div className="text-3xl font-extrabold text-cyan-900">{totalOcurre}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-xl border border-green-200">
            <div className="flex justify-between mb-2"><span className="text-xs uppercase text-green-800">POD + DEXs</span><PackageCheck className="h-5 w-5 text-green-600" /></div>
            <div className="text-3xl font-extrabold text-green-900">{totalPodPlusDexs}</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
            <div className="flex justify-between mb-2"><span className="text-xs uppercase text-orange-800">Ptes. de Mov.</span><Clock className="h-5 w-5 text-orange-600" /></div>
            <div className="text-3xl font-extrabold text-orange-900">{totalPendMov}</div>
          </div>
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
            <div className="flex justify-between mb-2"><span className="text-xs uppercase text-amber-800">DEX 03</span><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
            <div className="text-3xl font-extrabold text-amber-900">{totalDEX03}</div>
          </div>
          <div className="bg-rose-50 p-4 rounded-xl border border-rose-200">
            <div className="flex justify-between mb-2"><span className="text-xs uppercase text-rose-800">DEX 07</span><Ban className="h-5 w-5 text-rose-600" /></div>
            <div className="text-3xl font-extrabold text-rose-900">{totalDEX07}</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
            <div className="flex justify-between mb-2"><span className="text-xs uppercase text-yellow-800">DEX 08</span><HelpCircle className="h-5 w-5 text-yellow-600" /></div>
            <div className="text-3xl font-extrabold text-yellow-900">{totalDEX08}</div>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex justify-between mb-2"><span className="text-xs uppercase text-slate-700">En Bodega</span><Warehouse className="h-5 w-5 text-slate-600" /></div>
            <div className="text-3xl font-extrabold text-slate-800">{totalBodega}</div>
          </div>
          <div className="bg-violet-50 p-4 rounded-xl border border-violet-200">
            <div className="flex justify-between mb-2"><span className="text-xs uppercase text-violet-800">En Ruta</span><Clock className="h-5 w-5 text-violet-600" /></div>
            <div className="text-3xl font-extrabold text-violet-900">{totalEnRuta}</div>
          </div>
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200">
            <div className="flex justify-between mb-2"><span className="text-xs uppercase text-indigo-800">Pendientes</span><TrendingUp className="h-5 w-5 text-indigo-600" /></div>
            <div className="text-3xl font-extrabold text-indigo-900">{totalPendiente}</div>
          </div>
          <div className="bg-red-50 p-4 rounded-xl border border-red-200">
            <div className="flex justify-between mb-2"><span className="text-xs uppercase text-red-800">Devueltos</span><CornerDownLeft className="h-5 w-5 text-red-600" /></div>
            <div className="text-3xl font-extrabold text-red-900">{totalDevueltos}</div>
          </div>
          <div className="bg-teal-50 p-4 rounded-xl border border-teal-200">
            <div className="flex justify-between mb-2"><span className="text-xs uppercase text-teal-800">Consolidados</span><Layers3 className="h-5 w-5 text-teal-600" /></div>
            <div className="text-3xl font-extrabold text-teal-900">{consolidateds.length}</div>
          </div>
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
            <div className="flex justify-between mb-2"><span className="text-xs uppercase text-emerald-800">Cerrados</span><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div>
            <div className="text-3xl font-extrabold text-emerald-900">{completedConsolidateds}<span className="text-base font-bold text-emerald-700/60"> / {consolidateds.length}</span></div>
          </div>
        </div>

        <DataTable columns={columns} data={consolidateds} searchKey="subsidiary.name" />
      </div>
    </AppLayout>
  );
}

export default withAuth(ConsolidatedWithKpis, 'bodega.consolidados');