"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { LoaderWithOverlay } from "@/components/loader";
import { AppLayout } from "@/components/app-layout";
import { OperationHeader } from "@/components/shared/operation-header";
import { 
  Package, CheckCircle2, Layers3, AlertTriangle, Clock, RefreshCcwIcon, FileDown,
  Warehouse, CornerDownLeft, Ban, HelpCircle, TrendingUp
} from "lucide-react";
import { SucursalSelector } from "@/components/sucursal-selector";
import { useConsolidated } from "@/hooks/services/consolidateds/use-consolidated";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getFedexStatus } from "@/lib/services/consolidated";
import { withAuth } from "@/hoc/withAuth";
import { columns } from "./columns";
import { useAuthStore } from "@/store/auth.store";

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

  const effectiveSubsidiaryId = selectedSucursalId || user?.subsidiary?.id;

  const { consolidateds, isLoading, mutate } = useConsolidated(
    effectiveSubsidiaryId, dateRange.from, dateRange.to
  );

  useEffect(() => {
    mutate();
  }, [dateRange.from, dateRange.to, selectedSucursalId, mutate]);

  const handleDateChange = (type: 'from' | 'to', value: string) => {
    setDateRange(prev => ({ ...prev, [type]: value }));
  };

  if (!consolidateds || isLoading) return <LoaderWithOverlay overlay transparent text="Cargando..." className="rounded-lg"/>;

  // --- CÁLCULO DE KPIS VISUALES ---
  let totalShipments = 0; let totalPOD = 0; let totalDEX03 = 0; let totalDEX07 = 0;
  let totalDEX08 = 0; let totalBodega = 0; let totalEnRuta = 0; let totalPendiente = 0; let totalDevueltos = 0;

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
    totalDevueltos += counts.totalDevueltos || counts.devueltos || 0;
  });

  const completedConsolidateds = consolidateds.filter(c => c.status === "completo").length;

  const handleUpdateFedexStatus = async () => {
    await getFedexStatus(selectedSucursalId, dateRange.from, dateRange.to);
    mutate();
  };

  // --- EXPORTACIÓN A EXCEL ARREGLADA ---
  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Sistema de Logística";
    workbook.created = new Date();

    const wsResumen = workbook.addWorksheet("Resumen Ejecutivo", { views: [{ showGridLines: false }] });
    const wsDetalle = workbook.addWorksheet("Detalle Operativo");
    const wsPendientes = workbook.addWorksheet("Paquetes Pendientes");

    // ==========================================
    // HOJA 3: PENDIENTES
    // ==========================================
    wsPendientes.columns = [
      { header: "Consolidado ID", key: "cId", width: 20 },
      { header: "Tracking", key: "tracking", width: 20 },
      { header: "Estatus Actual", key: "status", width: 20 },
      { header: "Carrier", key: "carrier", width: 15 }
    ];

    // Llenar hoja de pendientes
    consolidateds.forEach(c => {
      c.pendingShipments?.forEach(p => {
        wsPendientes.addRow({
          cId: c.consNumber,
          tracking: p.tracking,
          status: p.status,
          carrier: p.carrier
        });
      });
    });

    // Estilos de hoja 3
    wsPendientes.getRow(1).fill = { type: 'pattern', pattern:'solid', fgColor:{ argb:'FF1E293B' } };
    wsPendientes.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    // ==========================================
    // HOJA 2: DETALLE
    // ==========================================
    wsDetalle.columns = [
      { header: "Código Consolidado", key: "codigo", width: 22 },
      { header: "Empresa", key: "empresa", width: 15 },
      { header: "Sucursal", key: "sucursal", width: 25 },
      { header: "Estado", key: "estado", width: 18 },
      { header: "POD (Entregado)", key: "pod", width: 15 },
      { header: "DEX03", key: "dex03", width: 12 },
      { header: "DEX07", key: "dex07", width: 12 },
      { header: "DEX08", key: "dex08", width: 12 },
      { header: "En Bodega", key: "bodega", width: 14 },
      { header: "En Ruta", key: "enRuta", width: 14 },
      { header: "Pendiente", key: "pendiente", width: 14 },
      { header: "Devueltos", key: "devueltos", width: 14 },
      { header: "Total Paquetes", key: "total", width: 18 },
    ];

    wsDetalle.getRow(1).height = 30;
    wsDetalle.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    consolidateds.forEach(c => {
      const counts = c.shipmentCounts || {};
      const targetRowIndex = wsDetalle.rowCount + 1; // FIX: Índice exacto de la nueva fila

      wsDetalle.addRow({
        codigo: c.consNumber || c.code || c.id,
        empresa: c.carrier || "N/A",
        sucursal: c.subsidiary?.name || "N/A",
        estado: c.status || (c.isConsolidatedComplete ? "completo" : "incompleto"),
        pod: counts.entregado || 0,
        dex03: counts.dex03 || 0,
        dex07: counts.dex07 || 0,
        dex08: counts.dex08 || 0,
        bodega: counts.en_bodega || 0,
        enRuta: counts.en_ruta || 0,
        pendiente: counts.pendiente || 0,
        devueltos: counts.totalDevueltos || counts.devueltos || 0,
        // FIX: La suma ahora apunta a su propia fila, evitando arrastre duplicador (SUM(E2:L2), SUM(E3:L3), etc)
        total: { formula: `SUM(E${targetRowIndex}:M${targetRowIndex})`, result: counts.total || 0 }
      });
    });

    // Fila de Totales
    const lastRowIndex = wsDetalle.rowCount + 1;
    const totalsRow = wsDetalle.getRow(lastRowIndex);
    totalsRow.getCell(1).value = "TOTAL GENERAL";
    
    // 1. Sumamos las columnas individuales del 5 (E) al 12 (L)
    for (let col = 5; col <= 12; col++) {
      const colLetter = wsDetalle.getColumn(col).letter;
      const cell = totalsRow.getCell(col);
      cell.value = { formula: `SUM(${colLetter}2:${colLetter}${lastRowIndex - 1})` };
      cell.font = { bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
    }

    // 2. CORRECCIÓN: Para el Total General (Columna 13 / M), 
    // en lugar de sumar la columna M, sumamos la fila de totales actual
    // de E a L. Esto garantiza el cuadre matemático exacto.
    const cellTotal = totalsRow.getCell(13);
    cellTotal.value = { formula: `SUM(E${lastRowIndex}:L${lastRowIndex})` };
    cellTotal.font = { bold: true };
    cellTotal.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };

    // ==========================================
    // HOJA 1: DASHBOARD
    // ==========================================
    wsResumen.columns = [{ width: 4 }, { width: 28 }, { width: 28 }, { width: 28 }, { width: 28 }];

    wsResumen.mergeCells('B2:E2');
    wsResumen.getCell('B2').value = "DASHBOARD OPERATIVO Y CUADRE EXACTO";
    wsResumen.getCell('B2').font = { size: 15, bold: true, color: { argb: "FF0F172A" } };

    const detailSheet = "'Detalle Operativo'";
    
    const kpisGrid = [
      { r: 5, cStart: 'B', cEnd: 'B', title: "TOTAL DE ENVÍOS", formula: `=${detailSheet}!M${lastRowIndex}`, color: "FF0F172A" },
      { r: 5, cStart: 'C', cEnd: 'C', title: "ENTREGADOS (POD)", formula: `=${detailSheet}!E${lastRowIndex}`, color: "FF059669" },
      { r: 5, cStart: 'D', cEnd: 'D', title: "DEVUELTOS A FEDEX", formula: `=${detailSheet}!L${lastRowIndex}`, color: "FFE11D48" },
      { r: 5, cStart: 'E', cEnd: 'E', title: "TOTAL EN BODEGA", formula: `=${detailSheet}!I${lastRowIndex}`, color: "FF475569" },
      
      { r: 9, cStart: 'B', cEnd: 'B', title: "DEX03 (DIR. INCORRECTA)", formula: `=${detailSheet}!F${lastRowIndex}`, color: "FFD97706" },
      { r: 9, cStart: 'C', cEnd: 'C', title: "DEX07 (RECHAZADO)", formula: `=${detailSheet}!G${lastRowIndex}`, color: "FFDC2626" },
      { r: 9, cStart: 'D', cEnd: 'D', title: "DEX08 (NO DISPONIBLE)", formula: `=${detailSheet}!H${lastRowIndex}`, color: "FFCA8A04" },
      { r: 9, cStart: 'E', cEnd: 'E', title: "PENDIENTE / EN RUTA", formula: `=${detailSheet}!K${lastRowIndex}+${detailSheet}!J${lastRowIndex}`, color: "FF7C3AED" },
    ];

    kpisGrid.forEach(kpi => {
      wsResumen.mergeCells(`${kpi.cStart}${kpi.r}:${kpi.cEnd}${kpi.r}`);
      const tCell = wsResumen.getCell(`${kpi.cStart}${kpi.r}`);
      tCell.value = kpi.title;
      tCell.font = { bold: true, size: 9, color: { argb: "FF475569" } };
      tCell.alignment = { horizontal: "center", vertical: "middle" };
      tCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };

      wsResumen.mergeCells(`${kpi.cStart}${kpi.r + 1}:${kpi.cEnd}${kpi.r + 2}`);
      const vCell = wsResumen.getCell(`${kpi.cStart}${kpi.r + 1}`);
      vCell.value = { formula: kpi.formula, result: 0 };
      vCell.font = { bold: true, size: 20, color: { argb: kpi.color } };
      vCell.alignment = { horizontal: "center", vertical: "middle" };
      vCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    });

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

              <div className="w-[190px]">
                <SucursalSelector value={selectedSucursalId} onValueChange={setSelectedSucursalId} />
              </div>

              <Input id="fromDate" type="date" className="h-9 w-[150px]" value={dateRange.from} onChange={(e) => handleDateChange('from', e.target.value)} />
              <Input id="toDate" type="date" className="h-9 w-[150px]" value={dateRange.to} onChange={(e) => handleDateChange('to', e.target.value)} min={dateRange.from} />
            </div>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-slate-900 p-4 rounded-xl text-white shadow-sm border border-slate-700">
            <div className="flex justify-between mb-2"><span className="text-xs uppercase text-slate-400">Total Envíos</span><Package className="h-5 w-5 text-slate-300" /></div>
            <div className="text-3xl font-extrabold">{totalShipments}</div>
          </div>
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
            <div className="flex justify-between mb-2"><span className="text-xs uppercase text-emerald-800">Entregados (POD)</span><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div>
            <div className="text-3xl font-extrabold text-emerald-900">{totalPOD}</div>
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
        </div>

        <DataTable columns={columns} data={consolidateds} searchKey="subsidiary.name" />
      </div>
    </AppLayout>
  );
}

export default withAuth(ConsolidatedWithKpis, 'bodega.consolidados');