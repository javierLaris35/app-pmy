"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { SucursalSelector } from "@/components/sucursal-selector"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { 
  CheckIcon, XIcon, Package, AlertTriangle, 
  FileText, ArrowRightLeft, ScanBarcode, LayoutDashboard,
  Clock, CheckCircle2, Download
} from "lucide-react"
import { AppLayout } from "@/components/app-layout"
import { DataTable } from "@/components/data-table/data-table"
import { createSelectColumn, createSortableColumn } from "@/components/data-table/columns"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// Librerías para Excel
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

import type { Collection, Devolution, Subsidiary } from "@/lib/types"
import { useCollections } from "@/hooks/services/collections/use-collections"
import { useDevolutions } from "@/hooks/services/devolutions/use-devolutions"
import { useAuthStore } from "@/store/auth.store"
import UnifiedCollectionReturnForm from "./unified-collection-return-form"
import { formatDateToShortDate } from "@/utils/date.utils"

export default function UpdatedFedExControl() {
  const user = useAuthStore((s) => s.user);
  // 1. Inicializa el estado directamente desde el user si es posible
  const [selectedSucursalId, setSelectedSucursalId] = useState<string | null>(user?.subsidiary?.id ?? null);
  const [selectedSucursalName, setSelectedSucursalName] = useState<string>(user?.subsidiary?.name ?? "");
  const [activeTab, setActiveTab] = useState("recolecciones");
  const [isUnifiedDialogOpen, setIsUnifiedDialogOpen] = useState(false)

  // 2. IMPORTANTE: Pasa el ID como llave. 
  // Si el ID es null o "", el hook no debería hacer fetch o debería dar lista vacía.
  const { collections = [], mutate: mutateCollections } = useCollections(selectedSucursalId || "none");
  const { devolutions = [], mutate: mutateDevolutions } = useDevolutions(selectedSucursalId || "none");

  // 3. Este efecto SOLO para cuando el usuario hace login/logout o cambia su perfil
  useEffect(() => {
    if (user?.subsidiary?.id && !selectedSucursalId) {
      setSelectedSucursalId(user.subsidiary.id);
      setSelectedSucursalName(user.subsidiary.name || "");
    }
  }, [user]); // Quitamos selectedSucursalId de las dependencias para evitar bucles

  // 4. Función que se dispara al cambiar manualmente en el selector
  const handleSucursalChange = (sucursal: Subsidiary | null) => {
    const newId = sucursal?.id ?? null;
    setSelectedSucursalId(newId);
    setSelectedSucursalName(sucursal?.name ?? "");
    
    // Forzamos una revalidación inmediata
    if (newId) {
      mutateCollections();
      mutateDevolutions();
    }
  };

  const refreshData = useCallback(() => {
    mutateCollections()
    mutateDevolutions()
  }, [mutateCollections, mutateDevolutions])

  // --- LÓGICA DE EXPORTACIÓN A EXCEL ---
  const handleExportExcel = async () => {
    const isDev = activeTab === "devoluciones";
    const dataToExport = isDev ? devolutions : collections;
    
    if (dataToExport.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(isDev ? 'Devoluciones' : 'Recolecciones');

      // Configurar Columnas
      worksheet.columns = [
        { header: 'Número de Guía', key: 'trackingNumber', width: 25 },
        { header: 'Fecha Registro', key: 'createdAt', width: 20 },
        { header: isDev ? 'Motivo' : 'Tipo', key: 'extra', width: 30 },
        { header: 'Estado', key: 'status', width: 15 },
      ];

      // Estilo de encabezado (Color Café Institucional)
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '3d2b1f' }
      };

      // Añadir datos
      dataToExport.forEach((item) => {
        worksheet.addRow({
          trackingNumber: item.trackingNumber,
          createdAt: item.createdAt?.split("T")[0] || 'N/A',
          extra: isDev ? (item.reason || 'Sin motivo') : (item.isPickUp ? 'PICK UP' : 'ESTÁNDAR'),
          status: item.status || 'PROCESADO'
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Reporte_FedEx_${activeTab}_${selectedSucursalName}_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success("Excel generado correctamente");
    } catch (error) {
      toast.error("Error al generar el archivo Excel");
      console.error(error);
    }
  };

  // --- COLUMNAS ---
  const collectionColumns = useMemo(() => [
    createSelectColumn<Collection>(),
    createSortableColumn<Collection>("trackingNumber", "Guía", (row) => row.trackingNumber, 
      (v) => <span className="font-mono font-bold text-slate-700">{v}</span>),
    createSortableColumn<Collection>("createdAt", "Fecha", (row) => row.createdAt, 
      (v) => v ? <span>{v.split("T")[0]}</span> : "---"),
    createSortableColumn<Collection>("status", "Estado", (row) => row.status, 
      (v) => <Badge variant={v === "Completada" ? "default" : "secondary"}>{v}</Badge>),
    createSortableColumn<Collection>("isPickUp", "Pick Up", (row) => row.isPickUp, 
      (v) => v ? <CheckCircle2 className="text-emerald-500 w-5 h-5" /> : <XIcon className="text-slate-300 w-4 h-4" />),
  ], [])

  const devolutionColumns = useMemo(() => [
    createSelectColumn<Devolution>(),
    createSortableColumn<Devolution>("trackingNumber", "Guía", (row) => row.trackingNumber, 
      (v) => <span className="font-mono font-bold text-slate-700">{v}</span>),
    createSortableColumn<Devolution>("reason", "Motivo", (row) => row.reason, (v) => <span className="text-xs">{v}</span>),
    createSortableColumn<Devolution>("createdAt", "Fecha", (row) => formatDateToShortDate(row.createdAt), 
      (v) => <span className="text-xs">{v}</span>),
  ], [])

  return (
    <AppLayout>
      <div className="max-w-[1600px] mx-auto space-y-8 p-2">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-tighter text-sm">
              <LayoutDashboard size={16} />
              Panel de Control Operativo
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Devoluciones / Recolecciones</h1>
            <p className="text-slate-500 font-medium">Sucursal activa: <span className="text-slate-900 font-bold">{selectedSucursalName || "Seleccione una..."}</span></p>
          </div>
          
          <div className="w-full md:w-[350px] bg-white p-2 rounded-xl shadow-sm border">
            <SucursalSelector
              value={selectedSucursalId ?? ""}
              returnObject={true}
              onValueChange={(s) => handleSucursalChange(s as Subsidiary)}
            />
          </div>
        </div>

        {/* STATS */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <StatCard title="Recolecciones" value={collections.length} icon={<Package />} color="blue" />
          <StatCard title="Devoluciones" value={devolutions.length} icon={<ArrowRightLeft />} color="emerald" />
          <StatCard title="Pendientes" value={collections.filter(c => c.status !== 'Completada').length} icon={<Clock />} color="amber" />
          <StatCard title="Completadas" value={collections.filter(c => c.status === 'Completada').length} icon={<CheckCircle2 />} color="indigo" />
        </div>

        {/* HERO ACTION */}
        <div className="relative overflow-hidden bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl border-4 border-white">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-primary/20 rounded-full blur-[80px]" />
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-3 text-left">
              <Badge className="bg-primary text-white border-none px-4 py-1">OPERACIÓN EN VIVO</Badge>
              <h3 className="text-3xl font-black">Consola Unificada de Captura</h3>
              <p className="text-slate-400 font-medium max-w-lg">
                Procesa masivamente guías de retorno y recolección para <span className="text-white font-bold">{selectedSucursalName}</span>.
              </p>
            </div>
            <Button 
              size="lg"
              onClick={() => setIsUnifiedDialogOpen(true)} 
              disabled={!selectedSucursalId}
              className="bg-primary hover:bg-primary/90 text-white font-black px-10 py-8 rounded-2xl shadow-xl hover:scale-105 transition-all gap-4 text-lg border-b-4 border-black/20"
            >
              <ScanBarcode className="w-8 h-8" />
              INICIAR ESCANEO
            </Button>
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL / TABLAS */}
        <div className="bg-white rounded-[2rem] shadow-sm border p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4">
              <TabsList className="bg-slate-100 p-1 rounded-xl h-auto gap-1">
                <CustomTabTrigger value="recolecciones" label="Recolecciones" count={collections.length} />
                <CustomTabTrigger value="devoluciones" label="Devoluciones" count={devolutions.length} />
              </TabsList>

              <Button 
                variant="outline"
                onClick={handleExportExcel}
                disabled={!selectedSucursalId || (activeTab === "recolecciones" ? collections.length === 0 : devolutions.length === 0)}
                className="rounded-xl border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 transition-all font-bold gap-2 px-6"
              >
                <Download size={18} />
                Exportar {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </Button>
            </div>

            <TabsContent value="recolecciones" className="mt-0 outline-none">
              {selectedSucursalId ? (
                <DataTable columns={collectionColumns} data={collections} />
              ) : <EmptyState />}
            </TabsContent>

            <TabsContent value="devoluciones" className="mt-0 outline-none">
              {selectedSucursalId ? (
                <DataTable columns={devolutionColumns} data={devolutions} />
              ) : <EmptyState />}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* DIALOGO */}
      <Dialog open={isUnifiedDialogOpen} onOpenChange={setIsUnifiedDialogOpen}>
        <DialogContent className="max-w-[98vw] w-[1500px] h-[98vh] p-0 overflow-hidden border-none bg-transparent">
          <DialogHeader className="sr-only">
            <DialogTitle>Consola Operativa</DialogTitle>
          </DialogHeader>
          <UnifiedCollectionReturnForm
            selectedSubsidiaryId={selectedSucursalId}
            subsidiaryName={selectedSucursalName}
            onClose={() => setIsUnifiedDialogOpen(false)}
            onSuccess={() => {
              setIsUnifiedDialogOpen(false);
              refreshData();
            }}
          />
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}

// COMPONENTES AUXILIARES
function StatCard({ title, value, icon, color }: { title: string, value: number, icon: any, color: string }) {
  const colors: any = {
    blue: "border-l-blue-500 text-blue-600 bg-blue-50/50",
    emerald: "border-l-emerald-500 text-emerald-600 bg-emerald-50/50",
    amber: "border-l-amber-500 text-amber-600 bg-amber-50/50",
    indigo: "border-l-indigo-500 text-indigo-600 bg-indigo-50/50"
  }
  return (
    <Card className={cn("border-none border-l-4 shadow-sm", colors[color])}>
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">{title}</p>
          <div className="text-3xl font-black text-slate-900">{value}</div>
        </div>
        <div className="opacity-80 scale-125">{icon}</div>
      </CardContent>
    </Card>
  )
}

function CustomTabTrigger({ value, label, count }: { value: string, label: string, count: number }) {
  return (
    <TabsTrigger 
      value={value} 
      className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg py-2 px-6 font-bold transition-all"
    >
      <div className="flex items-center gap-3">
        <span className="text-sm">{label}</span>
        <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-200 border-none font-black">{count}</Badge>
      </div>
    </TabsTrigger>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-[400px] text-center p-8 border-4 border-dashed rounded-[2rem] bg-slate-50/50">
      <div className="p-4 bg-white rounded-full shadow-md mb-4 text-slate-300">
        <Package size={48} />
      </div>
      <h3 className="text-xl font-bold text-slate-900">Sin Sucursal Seleccionada</h3>
      <p className="text-slate-500 max-w-xs mx-auto mt-2">
        Por favor, utiliza el selector de arriba para cargar los registros.
      </p>
    </div>
  )
}