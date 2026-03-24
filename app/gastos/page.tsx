"use client"

import type React from "react"
import { useState, useEffect, useRef, useMemo } from "react"
import { SucursalSelector } from "@/components/sucursal-selector"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { FileSpreadsheet, FileUp, Plus, Upload, Zap } from "lucide-react"
import { addGasto, updateGasto, getCategorias } from "@/lib/data"
import type { Expense, ExpenseCategory } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"
import { AppLayout } from "@/components/app-layout"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "@radix-ui/react-icons"
import { format, startOfDay, endOfDay } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import * as XLSX from "xlsx"
import { DataTable } from "@/components/data-table/data-table"
import {
  createSelectColumn,
  createSortableColumn,
  createViewColumn,
} from "@/components/data-table/columns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useExpenses, useSaveExpense } from "@/hooks/services/expenses/use-expenses"
import { categoriasGasto } from "@/lib/data" 
import { toast } from "sonner"
import { withAuth } from "@/hoc/withAuth"
import ExcelJS from "exceljs"
import { saveAs } from "file-saver"
import { useAuthStore } from "@/store/auth.store";

const metodosPago = ["Efectivo", "Tarjeta de Crédito", "Tarjeta de Débito", "Transferencia", "Cheque", "Otro"]

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
  }
  return colorMap[categoryName] || "bg-gray-500"
}

function GastosPage() {
  const user = useAuthStore((s) => s.user)

  const [selectedSucursalId, setSelectedSucursalId] = useState<string>("")
  const [categorias, setCategorias] = useState<ExpenseCategory[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [editingGasto, setEditingGasto] = useState<Expense | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const effectiveSubsidiaryId = selectedSucursalId || user?.subsidiary?.id

  const { expenses = [], isLoading, isError, mutate } = useExpenses(effectiveSubsidiaryId)
  const { save, isSaving, isError: isSaveError } = useSaveExpense()

  // Formulario
  const [fecha, setFecha] = useState<Date | undefined>(new Date())
  const [categoriaId, setCategoriaId] = useState("")
  const [monto, setMonto] = useState<number | "">("")
  const [descripcion, setDescripcion] = useState("")
  const [metodoPago, setMetodoPago] = useState("Efectivo")
  const [responsable, setResponsable] = useState("")
  const [notas, setNotas] = useState("")
  const [comprobante, setComprobante] = useState<File | null>(null)

  // Filtros de exportación
  const [exportStartDate, setExportStartDate] = useState<Date | undefined>(undefined)
  const [exportEndDate, setExportEndDate] = useState<Date | undefined>(undefined)
  const [exportCategory, setExportCategory] = useState<string>("todas")

  useEffect(() => {
    const loadCategorias = async () => {
      const res = await getCategorias()
      setCategorias(res || [])
    }
    loadCategorias()
  }, [])

  const gastosComunes = useMemo(() => {
    if (!expenses.length) return []
    const frecuencias: Record<string, Expense & { count: number }> = {}

    expenses.forEach((g) => {
      const key = `${g.category}-${g.description?.toLowerCase().trim()}`
      if (!frecuencias[key]) {
        frecuencias[key] = { ...g, count: 0 }
      }
      frecuencias[key].count++
    })

    return Object.values(frecuencias)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
  }, [expenses])

  const prefillGasto = (plantilla: Expense) => {
    setCategoriaId(plantilla.category)
    setDescripcion(plantilla.description || "")
    setMonto(plantilla.amount)
    setMetodoPago(plantilla.paymentMethod || "Efectivo")
    setResponsable(plantilla.responsible || "")
    setFecha(new Date())
    setNotas("")
    setComprobante(null)
    setEditingGasto(null)
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setEditingGasto(null)
    setFecha(new Date())
    setCategoriaId("")
    setMonto("")
    setDescripcion("")
    setMetodoPago("Efectivo")
    setResponsable("")
    setNotas("")
    setComprobante(null)
  }

  const openNewGastoDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditGastoDialog = (gasto: Expense) => {
    setEditingGasto(gasto)
    setFecha(new Date(gasto.date))
    setCategoriaId(gasto.category)
    setMonto(gasto.amount)
    setDescripcion(gasto.description || "")
    setMetodoPago(gasto.paymentMethod || "Efectivo")
    setResponsable(gasto.responsible || "")
    setNotas(gasto.notes || "")
    setComprobante(null)
    setIsDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!fecha) {
      toast.error("Por favor selecciona una fecha válida")
      return
    }

    if (!categoriaId) {
      toast.error("Por favor selecciona una categoría válida")
      return
    }

    const payload: Expense = {
      subsidiaryId: selectedSucursalId,
      date: fecha,
      category: categoriaId,
      amount: Number(monto),
      description: descripcion,
      paymentMethod: metodoPago,
      responsible: responsable,
      notes: notas,
    }

    save(payload)
    setIsDialogOpen(false)
    mutate()
    toast.success("Se registró con éxito el gasto.")
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setComprobante(e.target.files[0])
    }
  }

  const handleExportExcel = async () => {
  const dataFiltrada = expenses.filter((gasto) => {
    const fechaGasto = new Date(gasto.date)
    const pasaFiltroCategoria = exportCategory === "todas" || gasto.category === exportCategory
    const pasaFiltroFecha = (!exportStartDate || fechaGasto >= startOfDay(exportStartDate)) &&
                            (!exportEndDate || fechaGasto <= endOfDay(exportEndDate))
    return pasaFiltroCategoria && pasaFiltroFecha
  })

  if (dataFiltrada.length === 0) {
    toast.warning("No hay datos que coincidan con estos filtros")
    return
  }

  // 1. Crear el libro y la hoja de trabajo
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "Tu Sistema de Finanzas"
  const worksheet = workbook.addWorksheet("Reporte de Gastos")

  // 2. Definir las columnas con sus anchos específicos y formato de moneda
  worksheet.columns = [
    { header: "Fecha", key: "fecha", width: 15 },
    { header: "Categoría", key: "categoria", width: 20 },
    { header: "Descripción", key: "descripcion", width: 45 },
    { header: "Monto", key: "monto", width: 18, style: { numFmt: '"$"#,##0.00' } },
    { header: "Método de Pago", key: "metodoPago", width: 20 },
    { header: "Responsable", key: "responsable", width: 25 },
    { header: "Notas", key: "notas", width: 40 },
  ]

  // 3. Dar estilo profesional al encabezado
  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 }
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F172A" }, // Un color azul oscuro/slate elegante
  }
  headerRow.alignment = { vertical: "middle", horizontal: "center" }
  headerRow.height = 25

  // 4. Congelar la primera fila y agregar Auto-Filtros
  worksheet.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }]
  worksheet.autoFilter = "A1:G1"

  // 5. Agregar los datos iterando sobre tu arreglo filtrado
  dataFiltrada.forEach((gasto, index) => {
    const row = worksheet.addRow({
      fecha: format(new Date(gasto.date), "dd/MM/yyyy"),
      categoria: gasto.category,
      descripcion: gasto.description,
      monto: gasto.amount,
      metodoPago: gasto.paymentMethod || "No especificado",
      responsable: gasto.responsible || "No especificado",
      notas: gasto.notes || "",
    })

    // Alternar el color de las filas para facilitar la lectura (estilo cebra)
    if (index % 2 === 0) {
      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } }
    }

    // Alinear el texto verticalmente en todas las celdas
    row.alignment = { vertical: "middle", wrapText: true }
  })

  // 6. Agregar bordes tenues a todas las celdas con datos
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      }
    })
  })

  // 7. Generar el archivo y descargarlo
  try {
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    saveAs(blob, `Reporte_Gastos_${selectedSucursalId}_${format(new Date(), "dd-MM-yyyy")}.xlsx`)
    setIsExportDialogOpen(false)
    toast.success("Reporte Excel generado correctamente")
  } catch (error) {
    console.error("Error al generar el Excel:", error)
    toast.error("Hubo un problema al exportar el reporte")
  }
}

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    const reader = new FileReader()

    reader.onload = (e) => {
      const data = e.target?.result
      if (!data) return

      try {
        const workbook = XLSX.read(data, { type: "binary" })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)

        jsonData.forEach((row: any) => {
          const categoria = categorias.find((c) => c.name.toLowerCase() === (row["Categoría"] || "").toLowerCase())

          if (!categoria) {
            console.error(`Categoría no encontrada: ${row["Categoría"]}`)
            return
          }

          let fechaRow: Date
          try {
            const parts = row["Fecha"].split("/")
            fechaRow = new Date(Number.parseInt(parts[2]), Number.parseInt(parts[1]) - 1, Number.parseInt(parts[0]))
          } catch (error) {
            fechaRow = new Date()
          }

          addGasto({
            sucursalId: selectedSucursalId,
            fecha: fechaRow,
            categoriaId: categoria.id,
            categoriaNombre: categoria.name,
            monto: Number.parseFloat(row["Monto"]) || 0,
            descripcion: row["Descripción"] || "",
            metodoPago: row["Método de Pago"] || "Efectivo",
            responsable: row["Responsable"] || "",
            notas: row["Notas"] || "",
          })
        })

        mutate()

        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
        toast.success("Excel importado correctamente")
      } catch (error) {
        console.error("Error al procesar el archivo Excel:", error)
        toast.error("Error al procesar el archivo Excel. Asegúrate de que el formato sea correcto.")
      }
    }

    reader.readAsBinaryString(file)
  }

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
        const cat = categoriasGasto?.find(c => c.name === value)
        return (
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getCategoryColor(value)}`}></div>
            <div className="flex flex-col">
              <span>{value || "Sin categoría"}</span>
              {cat && (
                <span className="text-xs text-gray-500">{cat.description}</span>
              )}
            </div>
          </div>
        )
      }
    ),
    createSortableColumn<Expense>("descripcion", "Descripción", (row) => row.description || "-"),
    createSortableColumn<Expense>(
      "monto",
      "Monto",
      (row) => row.amount,
      (value) => <span className="font-medium">{formatCurrency(value)}</span>,
    ),
    createSortableColumn<Expense>("metodoPago", "Método de Pago", (row) => row.paymentMethod || "No especificado"),
    createSortableColumn<Expense>("responsable", "Responsable", (row) => row.responsible || "No especificado"),
    createViewColumn<Expense>((data) => console.log("Ver detalles", data)),
  ]

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">Gestión de Gastos</h2>
            <p className="text-muted-foreground">Administra los gastos diarios por sucursal</p>
          </div>
          <div className="w-full sm:w-[250px]">
            <SucursalSelector value={selectedSucursalId} onValueChange={setSelectedSucursalId} />
          </div>
        </div>

        {selectedSucursalId && gastosComunes.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              Carga rápida (Gastos frecuentes)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {gastosComunes.map((gasto, i) => (
                <Card 
                  key={i} 
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => prefillGasto(gasto)}
                >
                  <CardContent className="p-4 flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getCategoryColor(gasto.category)}`} />
                      <span className="text-sm font-semibold truncate">{gasto.category}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{gasto.description}</p>
                    <p className="text-sm font-medium mt-1">{formatCurrency(gasto.amount)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
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
                disabled={!selectedSucursalId || expenses.length === 0}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Exportar
              </Button>
              <div className="relative">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImportExcel}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!selectedSucursalId}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Importar Excel
                </Button>
              </div>
              <Button size="sm" onClick={openNewGastoDialog} disabled={!selectedSucursalId}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Gasto
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {selectedSucursalId ? (
              <DataTable columns={columns} data={expenses} />
            ) : (
              <div className="flex h-[200px] items-center justify-center border-2 border-dashed rounded-md">
                <p className="text-muted-foreground">Selecciona una sucursal para gestionar sus gastos</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exportar Gastos</DialogTitle>
            <DialogDescription>Filtra los datos antes de descargar el archivo Excel.</DialogDescription>
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
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha Inicio</Label>
                <Input 
                  type="date" 
                  onChange={(e) => setExportStartDate(e.target.value ? new Date(e.target.value + 'T00:00:00') : undefined)} 
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha Fin</Label>
                <Input 
                  type="date" 
                  onChange={(e) => setExportEndDate(e.target.value ? new Date(e.target.value + 'T23:59:59') : undefined)} 
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleExportExcel}>Descargar Excel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingGasto ? "Editar Gasto" : "Registrar Nuevo Gasto"}</DialogTitle>
            <DialogDescription>Complete el formulario para registrar un nuevo gasto operativo</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="categoria" className="font-medium">
                  Categoría <span className="text-destructive">*</span>
                </Label>
                <Select value={categoriaId} onValueChange={setCategoriaId} required>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((categoria) => (
                      <SelectItem key={categoria.id} value={categoria.name}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getCategoryColor(categoria.name)}`}></div>
                          <span>{categoria.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date" className="font-medium">
                  Fecha <span className="text-destructive">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !fecha && "text-muted-foreground"
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion" className="font-medium">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="monto" className="font-medium">
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
                <Label htmlFor="metodoPago" className="font-medium">
                  Método de Pago <span className="text-destructive">*</span>
                </Label>
                <Select value={metodoPago} onValueChange={setMetodoPago} required>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsable" className="font-medium">
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
              <Label htmlFor="comprobante" className="font-medium">
                Comprobante (opcional)
              </Label>
              <div className="flex items-center gap-2">
                <Input id="comprobante" type="file" className="hidden" onChange={handleFileChange} />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => document.getElementById("comprobante")?.click()}
                >
                  <FileUp className="mr-2 h-4 w-4" />
                  {comprobante ? comprobante.name : "Elegir archivo"}
                </Button>
                {comprobante && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => setComprobante(null)}>
                    <span className="sr-only">Eliminar</span>×
                  </Button>
                )}
              </div>
              {!comprobante && <p className="text-sm text-muted-foreground">No se ha seleccionado ningún archivo</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notas" className="font-medium">
                Notas adicionales
              </Label>
              <Textarea
                id="notas"
                placeholder="Información adicional sobre el gasto (opcional)"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={4}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!selectedSucursalId}>
                {editingGasto ? "Actualizar Gasto" : "Registrar Gasto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}

export default withAuth(GastosPage, "finanzas.gastos")