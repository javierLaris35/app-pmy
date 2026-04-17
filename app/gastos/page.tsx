"use client";

import type React from "react";
import { useState, useEffect, useRef, useMemo } from "react";
import { SucursalSelector } from "@/components/sucursal-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  FileSpreadsheet,
  FileUp,
  Plus,
  Upload,
  Zap,
  Truck,
  Fuel,
  Wrench,
  Car,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { addGasto, updateGasto, getCategorias } from "@/lib/data";
import type { Expense, ExpenseCategory, Vehicles } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { AppLayout } from "@/components/app-layout";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "@radix-ui/react-icons";
import { format, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { DataTable } from "@/components/data-table/data-table";
import {
  createSelectColumn,
  createSortableColumn,
  createViewColumn,
} from "@/components/data-table/columns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useExpenses,
  useSaveExpense,
} from "@/hooks/services/expenses/use-expenses";
import { categoriasGasto } from "@/lib/data";
import { toast } from "sonner";
import { withAuth } from "@/hoc/withAuth";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { useAuthStore } from "@/store/auth.store";
import { UnidadSelector } from "@/components/selectors/unidad-selector";
import { Loader } from "@/components/loader";
import { upload } from "@/lib/services/expenses";

const metodosPago = [
  "Efectivo",
  "Tarjeta de Crédito",
  "Tarjeta de Débito",
  "Transferencia",
  "Cheque",
  "Otro",
];

// NUEVO: Array de periodos
const periodosPago = ["Único", "Diario", "Semanal", "Mensual", "Anual"];

// Categorías que requieren selección de vehículo
const VEHICLE_CATEGORIES = [
  "Combustible",
  "Mantenimiento",
  "Peajes",
  "Seguros",
];

// Plantillas de gastos rápidos predefinidos
const plantillasRapidas = [
  {
    id: "t1",
    nombre: "Tanque Lleno",
    categoria: "Combustible",
    descripcion: "Carga de combustible",
    montoSugerido: 1500,
    icon: Fuel,
    requireVehicle: true,
  },
  {
    id: "t2",
    nombre: "Cambio de Aceite",
    categoria: "Mantenimiento",
    descripcion: "Cambio de aceite y filtros",
    montoSugerido: 800,
    icon: Wrench,
    requireVehicle: true,
  },
  {
    id: "t3",
    nombre: "Peaje Autopista",
    categoria: "Peajes",
    descripcion: "Peaje de autopista",
    montoSugerido: 250,
    icon: Car,
    requireVehicle: true,
  },
  {
    id: "t4",
    nombre: "Servicio Mayor",
    categoria: "Mantenimiento",
    descripcion: "Servicio de mantenimiento mayor",
    montoSugerido: 5000,
    icon: Truck,
    requireVehicle: true,
  },
];

const getCategoryColor = (categoryName: string): string => {
  const colorMap: Record<string, string> = {
    Nómina: "bg-green-500",
    Renta: "bg-blue-500",
    Recarga: "bg-purple-500",
    Peajes: "bg-orange-500",
    Servicios: "bg-cyan-500",
    Combustible: "bg-red-500",
    "Otros gastos": "bg-gray-500",
    Mantenimiento: "bg-yellow-500",
    Impuestos: "bg-amber-500",
    Seguros: "bg-violet-500",
  };
  return colorMap[categoryName] || "bg-gray-500";
};

function GastosPage() {
  const user = useAuthStore((s) => s.user);

  const [selectedSucursalId, setSelectedSucursalId] = useState<string>("");
  const [categorias, setCategorias] = useState<ExpenseCategory[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [editingGasto, setEditingGasto] = useState<Expense | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // NUEVOS ESTADOS PARA EL MODAL DE IMPORTACIÓN
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importTipo, setImportTipo] = useState("combustibles");
  const [importFile, setImportFile] = useState<File | null>(null);

  const effectiveSubsidiaryId = selectedSucursalId || user?.subsidiary?.id;

  const {
    expenses,
    isLoading,
    isError,
    mutate,
  } = useExpenses(effectiveSubsidiaryId);

  const { save, isSaving, isError: isSaveError } = useSaveExpense();

  // Formulario
  const [fecha, setFecha] = useState<Date | undefined>(new Date());
  const [categoriaId, setCategoriaId] = useState("");
  const [monto, setMonto] = useState<number | "">("");
  const [descripcion, setDescripcion] = useState("");
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [periodoPago, setPeriodoPago] = useState("Único"); // <-- NUEVO
  const [responsable, setResponsable] = useState("");
  const [notas, setNotas] = useState("");
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [vehiculoId, setVehiculoId] = useState<string>("");
  const [selectedVehiculo, setSelectedVehiculo] = useState<Vehicles | undefined>(null);

  // Determinar si la categoría seleccionada requiere vehículo
  const requiresVehicle = VEHICLE_CATEGORIES.includes(categoriaId);

  // Filtros de exportación
  const [exportStartDate, setExportStartDate] = useState<Date | undefined>(
    undefined,
  );
  const [exportEndDate, setExportEndDate] = useState<Date | undefined>(
    undefined,
  );
  const [exportCategory, setExportCategory] = useState<string>("todas");

  useEffect(() => {
    const loadCategorias = async () => {
      const res = await getCategorias();
      setCategorias(res || []);
    };
    loadCategorias();
  }, []);

  const gastosComunes = useMemo(() => {
    if (!expenses || !expenses.length) return [];
    const frecuencias: Record<string, Expense & { count: number }> = {};

    expenses.forEach((g) => {
      const key = `${g.category}-${g.description?.toLowerCase().trim()}`;
      if (!frecuencias[key]) {
        frecuencias[key] = { ...g, count: 0 };
      }
      frecuencias[key].count++;
    });

    return Object.values(frecuencias)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [expenses]);
  
  if (!expenses || isLoading) {
    return <Loader />;
  }

  const prefillGasto = (plantilla: Expense) => {
    setCategoriaId(plantilla.category);
    setDescripcion(plantilla.description || "");
    setMonto(plantilla.amount);
    setMetodoPago(plantilla.paymentMethod || "Efectivo");
    setPeriodoPago(plantilla.frequency || "Único"); // <-- NUEVO
    setResponsable(plantilla.responsible || "");
    setFecha(new Date());
    setNotas("");
    setComprobante(null);
    setVehiculoId((plantilla as any).vehiculoId || "");
    setEditingGasto(null);
    setIsDialogOpen(true);
  };

  // Prefill desde plantilla rápida predefinida
  const prefillFromTemplate = (template: (typeof plantillasRapidas)[0]) => {
    setCategoriaId(template.categoria);
    setDescripcion(template.descripcion);
    setMonto(template.montoSugerido);
    setMetodoPago("Efectivo");
    setPeriodoPago("Único"); // <-- NUEVO
    setResponsable("");
    setFecha(new Date());
    setNotas("");
    setComprobante(null);
    setVehiculoId("");
    setEditingGasto(null);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingGasto(null);
    setFecha(new Date());
    setCategoriaId("");
    setMonto("");
    setDescripcion("");
    setMetodoPago("Efectivo");
    setPeriodoPago("Único"); // <-- NUEVO
    setResponsable("");
    setNotas("");
    setComprobante(null);
    setVehiculoId("");
    setSelectedVehiculo(undefined);
  };

  const openNewGastoDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditGastoDialog = (gasto: Expense) => {
    setEditingGasto(gasto);
    setFecha(new Date(gasto.date));
    setCategoriaId(gasto.category);
    setMonto(gasto.amount);
    setDescripcion(gasto.description || "");
    setMetodoPago(gasto.paymentMethod || "Efectivo");
    setPeriodoPago(gasto.frequency || "Único"); // <-- NUEVO
    setResponsable(gasto.responsible || "");
    setNotas(gasto.notes || "");
    setComprobante(null);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fecha) {
      toast.error("Por favor selecciona una fecha válida");
      return;
    }

    if (!categoriaId) {
      toast.error("Por favor selecciona una categoría válida");
      return;
    }

    if (requiresVehicle && !selectedVehiculo) {
      toast.error("Esta categoría requiere seleccionar un vehículo");
      return;
    }

    const payload: Expense = {
      subsidiaryId: effectiveSubsidiaryId,
      date: fecha,
      category: categoriaId,
      amount: Number(monto),
      description:
        requiresVehicle && selectedVehiculo
          ? `${descripcion} - ${selectedVehiculo.plateNumber} (${selectedVehiculo.brand} ${selectedVehiculo.model})`
          : descripcion,
      paymentMethod: metodoPago,
      frequency: periodoPago, // <-- NUEVO
      responsible: responsable,
      vehicleId: requiresVehicle ? selectedVehiculo?.id : null,
      notes:
        requiresVehicle && selectedVehiculo
          ? `Vehículo: ${selectedVehiculo.name} | ${notas}`.trim()
          : notas,
    };

    save(payload);
    setIsDialogOpen(false);
    mutate();
    toast.success("Se registró con éxito el gasto.");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setComprobante(e.target.files[0]);
    }
  };

  const handleExportExcel = async () => {
    const dataFiltrada = expenses.filter((gasto) => {
      const fechaGasto = new Date(gasto.date);
      const pasaFiltroCategoria =
        exportCategory === "todas" || gasto.category === exportCategory;
      const pasaFiltroFecha =
        (!exportStartDate || fechaGasto >= startOfDay(exportStartDate)) &&
        (!exportEndDate || fechaGasto <= endOfDay(exportEndDate));
      return pasaFiltroCategoria && pasaFiltroFecha;
    });

    if (dataFiltrada.length === 0) {
      toast.warning("No hay datos que coincidan con estos filtros");
      return;
    }

    // 1. Crear el libro y la hoja de trabajo
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Tu Sistema de Finanzas";
    const worksheet = workbook.addWorksheet("Reporte de Gastos");

    // 2. Definir las columnas con sus anchos específicos y formato de moneda
    worksheet.columns = [
      { header: "Fecha", key: "fecha", width: 15 },
      { header: "Categoría", key: "categoria", width: 20 },
      { header: "Descripción", key: "descripcion", width: 45 },
      {
        header: "Monto",
        key: "monto",
        width: 18,
        style: { numFmt: '"$"#,##0.00' },
      },
      { header: "Método de Pago", key: "metodoPago", width: 20 },
      { header: "Frecuencia", key: "periodoPago", width: 15 }, // <-- NUEVO
      { header: "Responsable", key: "responsable", width: 25 },
      { header: "Notas", key: "notas", width: 40 },
    ];

    // 3. Dar estilo profesional al encabezado
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F172A" }, // Un color azul oscuro/slate elegante
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 25;

    // 4. Congelar la primera fila y agregar Auto-Filtros
    worksheet.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];
    worksheet.autoFilter = "A1:H1"; // <-- ACTUALIZADO RANGO

    // 5. Agregar los datos iterando sobre tu arreglo filtrado
    dataFiltrada.forEach((gasto, index) => {
      const row = worksheet.addRow({
        fecha: format(new Date(gasto.date), "dd/MM/yyyy"),
        categoria: gasto.category,
        descripcion: gasto.description,
        monto: gasto.amount,
        metodoPago: gasto.paymentMethod || "No especificado",
        periodoPago: gasto.frequency || "Único", // <-- NUEVO
        responsable: gasto.responsible || "No especificado",
        notas: gasto.notes || "",
      });

      // Alternar el color de las filas para facilitar la lectura (estilo cebra)
      if (index % 2 === 0) {
        row.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
        };
      }

      // Alinear el texto verticalmente en todas las celdas
      row.alignment = { vertical: "middle", wrapText: true };
    });

    // 6. Agregar bordes tenues a todas las celdas con datos
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
      });
    });

    // 7. Generar el archivo y descargarlo
    try {
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(
        blob,
        `Reporte_Gastos_${effectiveSubsidiaryId}_${format(new Date(), "dd-MM-yyyy")}.xlsx`,
      );
      setIsExportDialogOpen(false);
      toast.success("Reporte Excel generado correctamente");
    } catch (error) {
      console.error("Error al generar el Excel:", error);
      toast.error("Hubo un problema al exportar el reporte");
    }
  };

  // NUEVA FUNCIÓN DE IMPORTACIÓN QUE SE EJECUTA DESDE EL MODAL
  const handleExecuteImport = async () => {
    if (!importFile) {
      toast.error("Por favor selecciona un archivo Excel");
      return;
    }

    if (!effectiveSubsidiaryId) {
      toast.error("Falta el identificador de la sucursal");
      return;
    }

    try {
      // 1. Preparamos el archivo y los datos adicionales para enviarlos al backend
      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("subsidiaryId", effectiveSubsidiaryId);
      
      // Opcional: Le mandamos el "tipo" al backend (ej. "combustibles") por si necesita 
      // aplicar lógica inteligente allá al no encontrar la columna "Categoría".
      formData.append("tipo", importTipo); 

      // 2. Llamamos a tu método upload 
      // (Asegúrate de tener importado 'upload' desde expenses.ts en la parte superior de tu archivo)
      await upload(formData);

      // 3. Refrescamos la tabla de gastos, cerramos el modal y limpiamos el estado
      mutate();
      setImportFile(null);
      setIsImportDialogOpen(false);
      toast.success("Excel subido e importado correctamente");

    } catch (error) {
      console.error("Error al subir el archivo Excel:", error);
      toast.error("Hubo un problema al procesar el archivo en el servidor.");
    }
  };

  const columns = [
    createSelectColumn<Expense>(),
    createSortableColumn<Expense>(
      "fecha",
      "Fecha",
      (row) => row.date,
      (value) => format(new Date(value), "dd/MM/yyyy", { locale: es }),
    ),
    createSortableColumn<Expense>(
      "category",
      "Categoría",
      (row) => row.category ?? "",
      (value) => {
        const cat = categoriasGasto?.find((c) => c.name === value);
        return (
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${getCategoryColor(value)}`}
            ></div>
            <div className="flex flex-col">
              <span>{value || "Sin categoría"}</span>
              {cat && (
                <span className="text-xs text-gray-500">{cat.description}</span>
              )}
            </div>
          </div>
        );
      },
    ),
    createSortableColumn<Expense>(
      "descripcion",
      "Descripción",
      (row) => row.description || "-",
    ),
    createSortableColumn<Expense>(
      "monto",
      "Monto",
      (row) => row.amount,
      (value) => <span className="font-medium">{formatCurrency(value)}</span>,
    ),
    createSortableColumn<Expense>(
      "metodoPago",
      "Método de Pago",
      (row) => row.paymentMethod || "No especificado",
    ),
    createSortableColumn<Expense>(
      "frequency",
      "Frecuencia", // <-- NUEVA COLUMNA EN LA TABLA
      (row) => row.frequency || "Único",
    ),
    createSortableColumn<Expense>(
      "responsable",
      "Responsable",
      (row) => row.responsible || "No especificado",
    ),
    createViewColumn<Expense>((data) => openEditGastoDialog(data)), // <-- Restaurado el click
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">
              Gestión de Gastos
            </h2>
            <p className="text-muted-foreground">
              Administra los gastos diarios por sucursal
            </p>
          </div>
          <div className="w-full sm:w-[250px]">
            <SucursalSelector
              value={effectiveSubsidiaryId}
              onValueChange={setSelectedSucursalId}
            />
          </div>
        </div>

        {effectiveSubsidiaryId && (
          <div className="space-y-4">
            {/* Plantillas rápidas predefinidas */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Acciones rápidas
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <TooltipProvider delayDuration={300}>
                  {plantillasRapidas.map((template) => {
                    const IconComponent = template.icon;
                    return (
                      <Tooltip key={template.id}>
                        <TooltipTrigger asChild>
                          <Card
                            className="group relative overflow-hidden cursor-pointer border-border/50 bg-background/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-primary/30 hover:bg-background"
                            onClick={() => prefillFromTemplate(template)}
                          >
                            <div
                              className={`absolute -right-6 -top-6 w-20 h-20 rounded-full blur-2xl opacity-10 transition-opacity duration-300 group-hover:opacity-30 ${getCategoryColor(template.categoria)}`}
                            />

                            <CardContent className="p-4 relative z-10 flex flex-col h-full justify-between gap-4">
                              <div className="flex justify-between items-start w-full gap-2">
                                <div
                                  className={`p-2.5 rounded-xl ${getCategoryColor(template.categoria)} bg-opacity-10 group-hover:bg-opacity-20 transition-colors shadow-sm`}
                                >
                                  <IconComponent className="h-5 w-5 text-foreground" />
                                </div>
                                <Badge
                                  variant="secondary"
                                  className="font-semibold bg-secondary/60 backdrop-blur-sm shrink-0"
                                >
                                  {formatCurrency(template.montoSugerido)}
                                </Badge>
                              </div>

                              <div className="space-y-1 mt-1">
                                <h4 className="text-sm font-semibold leading-tight tracking-tight text-foreground line-clamp-1">
                                  {template.nombre}
                                </h4>
                                <p className="text-xs text-muted-foreground font-medium">
                                  {template.categoria}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          <p className="font-medium">{template.descripcion}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </TooltipProvider>
              </div>
            </div>

            {/* Gastos frecuentes basados en historial */}
            {gastosComunes.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Zap className="h-4 w-4 text-green-500" />
                  Gastos frecuentes (basado en tu historial)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {gastosComunes.map((gasto, i) => (
                    <Card
                      key={i}
                      className="group cursor-pointer border-border/50 bg-accent/10 transition-all duration-300 hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5"
                      onClick={() => prefillGasto(gasto)}
                    >
                      <CardContent className="p-4 flex flex-col h-full justify-between min-h-[120px]">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-2.5 h-2.5 rounded-full ring-2 ring-offset-1 ring-offset-background ${getCategoryColor(gasto.category)}`}
                              />
                              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {gasto.category}
                              </span>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-[10px] font-bold bg-background/50 h-5 px-1.5 shrink-0"
                            >
                              {gasto.count}x
                            </Badge>
                          </div>

                          <h4
                            className="text-sm font-medium leading-snug line-clamp-2 text-foreground"
                            title={gasto.description}
                          >
                            {gasto.description || "Gasto sin descripción"}
                          </h4>
                        </div>

                        <div className="flex items-end justify-between mt-4 pt-3 border-t border-border/40">
                          <span className="text-lg font-bold tracking-tight text-foreground">
                            {formatCurrency(gasto.amount)}
                          </span>
                          <div className="flex items-center text-xs font-medium text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-primary transition-all duration-300">
                            <Plus className="h-3 w-3 mr-0.5" />
                            <span>Repetir</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
            <CardTitle>Historial de Gastos</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExportDialogOpen(true)}
                disabled={!effectiveSubsidiaryId || expenses.length === 0}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Exportar
              </Button>

              {/* BOTÓN ACTUALIZADO PARA ABRIR EL MODAL DE IMPORTACIÓN */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setImportFile(null);
                  setImportTipo("combustibles");
                  setIsImportDialogOpen(true);
                }}
                disabled={!effectiveSubsidiaryId}
              >
                <Upload className="mr-2 h-4 w-4" />
                Importar Excel
              </Button>

              <Button
                size="sm"
                onClick={openNewGastoDialog}
                disabled={!effectiveSubsidiaryId}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Gasto
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {effectiveSubsidiaryId ? (
              <DataTable columns={columns} data={expenses} />
            ) : (
              <div className="flex h-[200px] items-center justify-center border-2 border-dashed rounded-md">
                <p className="text-muted-foreground">
                  Selecciona una sucursal para gestionar sus gastos
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exportar Gastos</DialogTitle>
            <DialogDescription>
              Filtra los datos antes de descargar el archivo Excel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={exportCategory} onValueChange={setExportCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las categorías</SelectItem>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha Inicio</Label>
                <Input
                  type="date"
                  onChange={(e) =>
                    setExportStartDate(
                      e.target.value
                        ? new Date(e.target.value + "T00:00:00")
                        : undefined,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha Fin</Label>
                <Input
                  type="date"
                  onChange={(e) =>
                    setExportEndDate(
                      e.target.value
                        ? new Date(e.target.value + "T23:59:59")
                        : undefined,
                    )
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsExportDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleExportExcel}>Descargar Excel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- NUEVO MODAL DE IMPORTACIÓN --- */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Gastos</DialogTitle>
            <DialogDescription>
              Selecciona el tipo de gastos y el archivo Excel a importar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Gastos</Label>
              <Select value={importTipo} onValueChange={setImportTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="combustibles">Combustibles</SelectItem>
                  {/* Aquí puedes agregar más opciones en el futuro */}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Archivo Excel</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="import-file"
                  type="file"
                  accept=".xlsx, .xls"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setImportFile(e.target.files[0]);
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start overflow-hidden text-ellipsis"
                  onClick={() => document.getElementById("import-file")?.click()}
                >
                  <FileUp className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {importFile ? importFile.name : "Seleccionar archivo .xlsx"}
                  </span>
                </Button>
                {importFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setImportFile(null)}
                    className="shrink-0"
                  >
                    <span className="sr-only">Eliminar</span>×
                  </Button>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsImportDialogOpen(false);
                setImportFile(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleExecuteImport} disabled={!importFile}>
              Importar Archivo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingGasto ? "Editar Gasto" : "Registrar Nuevo Gasto"}
            </DialogTitle>
            <DialogDescription>
              Complete el formulario para registrar un nuevo gasto operativo
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* --- SECCIÓN 1: INFORMACIÓN PRINCIPAL --- */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-primary border-b pb-2">Información Principal</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="space-y-2">
                  <Label htmlFor="categoria" className="font-medium text-xs uppercase text-muted-foreground">
                    Categoría <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={categoriaId}
                    onValueChange={setCategoriaId}
                    required
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((categoria) => (
                        <SelectItem key={categoria.id} value={categoria.name}>
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${getCategoryColor(categoria.name)}`}
                            ></div>
                            <span>{categoria.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date" className="font-medium text-xs uppercase text-muted-foreground">
                    Fecha <span className="text-destructive">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !fecha && "text-muted-foreground",
                        )}
                      >
                        {fecha ? (
                          format(fecha, "dd/MM/yyyy")
                        ) : (
                          <span>Seleccione una fecha</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={fecha}
                        onSelect={setFecha}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        captionLayout="dropdown"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monto" className="font-medium text-xs uppercase text-muted-foreground">
                    Monto (MXN) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="monto"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={monto}
                    onChange={(e) => setMonto(Number(e.target.value) || "")}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descripcion" className="font-medium text-xs uppercase text-muted-foreground">
                    Descripción <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="descripcion"
                    placeholder="Descripción del gasto"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* --- SECCIÓN VEHÍCULO (CONDICIONAL) --- */}
            {requiresVehicle && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-primary border-b pb-2">Asignación de Vehículo</h4>
                <div className="space-y-2">
                  <Label className="font-medium text-xs uppercase text-muted-foreground flex items-center gap-2">
                    Vehículo <span className="text-destructive">*</span>
                  </Label>
                  <UnidadSelector
                    value={selectedVehiculo || ({} as Vehicles)}
                    subsidiaryId={effectiveSubsidiaryId}
                    onSelectionChange={setSelectedVehiculo}
                    placeholder="Selecciona el vehículo asociado a este gasto..."
                  />
                  {selectedVehiculo && (
                    <div className="flex items-center gap-2 p-3 bg-accent/50 rounded-lg border mt-2">
                      <Truck className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {selectedVehiculo.name} - {selectedVehiculo.brand}{" "}
                          {selectedVehiculo.model}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedVehiculo.kms?.toLocaleString()} km
                          {selectedVehiculo.planeNumber &&
                            ` • No. Placa: ${selectedVehiculo.planeNumber}`}
                        </p>
                      </div>
                      <Badge
                        variant={
                          selectedVehiculo.status === "active"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {selectedVehiculo.status}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- SECCIÓN 2: DETALLES DE PAGO --- */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-primary border-b pb-2">Detalles de Pago</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="space-y-2">
                  <Label htmlFor="metodoPago" className="font-medium text-xs uppercase text-muted-foreground">
                    Método de Pago <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={metodoPago}
                    onValueChange={setMetodoPago}
                    required
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona un método de pago" />
                    </SelectTrigger>
                    <SelectContent>
                      {metodosPago.map((metodo) => (
                        <SelectItem key={metodo} value={metodo}>
                          {metodo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="periodoPago" className="font-medium text-xs uppercase text-muted-foreground">
                    Frecuencia / Periodo <span className="text-destructive">*</span>
                  </Label>
                  <Select value={periodoPago} onValueChange={setPeriodoPago} required>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona un periodo" />
                    </SelectTrigger>
                    <SelectContent>
                      {periodosPago.map((periodo) => (
                        <SelectItem key={periodo} value={periodo}>
                          {periodo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* --- SECCIÓN 3: INFORMACIÓN ADICIONAL --- */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-primary border-b pb-2">Información Adicional</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="space-y-2">
                  <Label htmlFor="responsable" className="font-medium text-xs uppercase text-muted-foreground">
                    Responsable
                  </Label>
                  <Input
                    id="responsable"
                    placeholder="Nombre del responsable (opcional)"
                    value={responsable}
                    onChange={(e) => setResponsable(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comprobante" className="font-medium text-xs uppercase text-muted-foreground">
                    Comprobante (opcional)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="comprobante"
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start overflow-hidden text-ellipsis"
                      onClick={() =>
                        document.getElementById("comprobante")?.click()
                      }
                    >
                      <FileUp className="mr-2 h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {comprobante ? comprobante.name : "Elegir archivo"}
                      </span>
                    </Button>
                    {comprobante && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setComprobante(null)}
                        className="shrink-0"
                      >
                        <span className="sr-only">Eliminar</span>×
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notas" className="font-medium text-xs uppercase text-muted-foreground">
                  Notas adicionales
                </Label>
                <Textarea
                  id="notas"
                  placeholder="Información adicional sobre el gasto (opcional)"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={!effectiveSubsidiaryId} className="gap-2">
                {editingGasto ? "Actualizar Gasto" : "Registrar Gasto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

export default withAuth(GastosPage, "finanzas.gastos");